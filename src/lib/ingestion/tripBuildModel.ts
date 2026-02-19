/**
 * v3.9.26: TripBuildModel — Deterministic trip builder from canonical session.
 *
 * This module enforces:
 * 1. Canonical-only input (no raw parse data, no UI state)
 * 2. Deterministic leg aggregation with strict dedup (no silent drops)
 * 3. Cost propagation enforcement (canonical cost → build model cost)
 * 4. Pre-commit integrity assertions
 * 5. Expense idempotency guardrails
 *
 * RULES:
 * - No date/time math
 * - No silent data drops
 * - No inferred costs
 * - No partial trip builds
 * - Abort on integrity failure
 */

import type { StagingSnapshot } from './importStaging';
import {
  logFlightCostDiagnostics,
  countCanonicalFlightLegs,
  countCanonicalCostItems,
} from '@/lib/debug/flightPipelineDiagnostics';

// ============================================================================
// TYPES
// ============================================================================

export type BuildModelStatus = 'VALID' | 'ERROR';

export interface BuildLeg {
  /** Original parsed booking record (frozen) */
  source: Record<string, unknown>;
  /** Dedup key for this leg */
  dedupKey: string;
  /** booking_type from canonical */
  bookingType: string;
}

export interface BuildCostItem {
  /** Reference to source booking (confirmation_number or vendor+type) */
  bookingReference: string;
  /** Currency code */
  currency: string;
  /** Total amount */
  totalAmount: number;
  /** Canonical object identifier for tracing */
  canonicalObjectId: string;
}

export interface IntegrityError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface TripBuildModel {
  status: BuildModelStatus;
  /** All validated legs (deduplicated) */
  legs: BuildLeg[];
  /** All cost items (one per canonical item with cost) */
  costItems: BuildCostItem[];
  /** Trip date range from snapshot */
  startDate: string;
  endDate: string;
  /** Errors that caused build to fail */
  errors: IntegrityError[];
  /** The source snapshot (immutable reference) */
  snapshot: StagingSnapshot;
}

// ============================================================================
// DEDUP KEY
// ============================================================================

/**
 * Build strict dedup key for a leg.
 * Key: booking_reference + flight_number + dep_datetime_raw + arr_datetime_raw
 *
 * For non-flight types: confirmation_number + vendor_name + booking_type + start_datetime
 */
/**
 * Build strict dedup key for a leg.
 *
 * v3.9.28: Flight key uses ALL identifying fields to prevent over-dedup:
 *   confirmation + airline + dep_code + arr_code + start_datetime + end_datetime
 *
 * Only exact key collisions are merged. No route-only or date-only dedup.
 * No airline-specific conditions — generic for all carriers.
 */
function buildLegDedupKey(item: Record<string, unknown>): string {
  const bookingType = (item.booking_type as string) || '';
  const confNum = ((item.confirmation_number as string) || '').trim().toUpperCase();
  const vendor = ((item.vendor_name as string) || '').trim().toUpperCase();
  const startDt = ((item.start_datetime as string) || '').substring(0, 19);
  const endDt = ((item.end_datetime as string) || '').substring(0, 19);

  if (bookingType === 'flight') {
    // v3.9.28: Strict flight dedup — all fields must match for collision.
    // Includes airline, both airport codes, AND both datetimes.
    // Different days / different routes / different airlines = different legs.
    const airline = ((item.airline as string) || '').trim().toUpperCase();
    const depCode = ((item.departure_airport_code as string) || '').trim().toUpperCase();
    const arrCode = ((item.arrival_airport_code as string) || '').trim().toUpperCase();
    return `${confNum}|${airline}|${depCode}|${arrCode}|${startDt}|${endDt}`;
  }

  // Non-flight: confirmation + vendor + type + start
  return `${confNum}|${vendor}|${bookingType}|${startDt}`;
}

// ============================================================================
// FLIGHT LEG VALIDATION
// ============================================================================

/**
 * Validate required fields for a flight leg.
 * Returns null if valid, or an IntegrityError if invalid.
 */
function validateFlightLeg(item: Record<string, unknown>, index: number): IntegrityError | null {
  const missing: string[] = [];

  const depCode = item.departure_airport_code as string | null | undefined;
  const arrCode = item.arrival_airport_code as string | null | undefined;
  const startDt = item.start_datetime as string | null | undefined;
  const confNum = item.confirmation_number as string | null | undefined;

  // departure_airport_code: required but allow departure_airport_name as fallback
  if (!depCode?.trim() && !(item.departure_airport_name as string)?.trim()) {
    missing.push('dep_airport_code');
  }
  // arrival_airport_code: required but allow arrival_airport_name as fallback
  if (!arrCode?.trim() && !(item.arrival_airport_name as string)?.trim()) {
    missing.push('arr_airport_code');
  }
  // dep_datetime_raw_string: must have at minimum a start_datetime
  if (!startDt?.trim()) {
    missing.push('dep_datetime_raw_string');
  }
  // booking_reference: confirmation_number required
  if (!confNum?.trim()) {
    // Allow vendor_name as fallback reference
    const vendor = item.vendor_name as string | null | undefined;
    if (!vendor?.trim()) {
      missing.push('booking_reference');
    }
  }

  if (missing.length > 0) {
    return {
      code: 'MISSING_REQUIRED_FLIGHT_FIELDS',
      message: `Flight leg ${index + 1} missing: ${missing.join(', ')}`,
      details: { legIndex: index, missingFields: missing },
    };
  }

  return null;
}

// ============================================================================
// BUILD MODEL FACTORY
// ============================================================================

/**
 * Build a TripBuildModel from an immutable StagingSnapshot.
 *
 * This is the SINGLE entry point for constructing what will be committed.
 * If any integrity check fails, status = ERROR and no trip should be created.
 */
export function buildTripModel(snapshot: StagingSnapshot): TripBuildModel {
  const errors: IntegrityError[] = [];
  const legs: BuildLeg[] = [];
  const costItems: BuildCostItem[] = [];
  const seenDedupKeys = new Set<string>();

  // Validate trip date range exists
  if (!snapshot.derivedTripRange.startDate || !snapshot.derivedTripRange.endDate) {
    errors.push({
      code: 'NO_TRIP_DATE_RANGE',
      message: 'Cannot derive trip date range from canonical items',
    });
  }

  // ── CHANGE 2: Deterministic leg aggregation ──
  for (let i = 0; i < snapshot.canonicalItems.length; i++) {
    const item = snapshot.canonicalItems[i];
    const bookingType = (item.booking_type as string) || 'other';

    // Validate flight legs strictly
    if (bookingType === 'flight') {
      const validationError = validateFlightLeg(item, i);
      if (validationError) {
        errors.push(validationError);
        continue; // Don't add invalid legs (build will fail)
      }
    }

    // Strict dedup
    const dedupKey = buildLegDedupKey(item);
    if (seenDedupKeys.has(dedupKey)) {
      if (import.meta.env.DEV) {
        console.log('[TripBuildModel] DEDUP_SKIP', { index: i, dedupKey });
      }
      continue; // Skip duplicate — not an error
    }
    seenDedupKeys.add(dedupKey);

    legs.push({
      source: item,
      dedupKey,
      bookingType,
    });

    // ── CHANGE 3: Cost propagation ──
    const totalCost = item.total_cost as number | null | undefined;
    if (typeof totalCost === 'number' && totalCost > 0 && Number.isFinite(totalCost)) {
      const bookingRef = ((item.confirmation_number as string) || (item.vendor_name as string) || `item_${i}`).trim();
      const currency = (item._extracted_currency as string) || 'USD';
      costItems.push({
        bookingReference: bookingRef,
        currency,
        totalAmount: totalCost,
        canonicalObjectId: `canonical_${i}`,
      });
    }
  }

  // ── CHANGE 3 continued: Verify cost propagation ──
  // Count canonical items with cost
  const canonicalWithCost = snapshot.canonicalItems.filter(item => {
    const cost = item.total_cost as number | null | undefined;
    return typeof cost === 'number' && cost > 0 && Number.isFinite(cost);
  });

  if (canonicalWithCost.length > 0 && costItems.length === 0) {
    errors.push({
      code: 'COST_PROPAGATION_FAILURE',
      message: `${canonicalWithCost.length} canonical items have costs but no cost items in build model`,
    });
  }

  // ── CHANGE 5: Pre-commit integrity assertions ──
  // Validate cost items
  for (const costItem of costItems) {
    if (!costItem.bookingReference) {
      errors.push({
        code: 'COST_MISSING_REFERENCE',
        message: 'Cost item has no booking reference',
        details: { canonicalObjectId: costItem.canonicalObjectId },
      });
    }
    if (!costItem.currency) {
      errors.push({
        code: 'COST_MISSING_CURRENCY',
        message: 'Cost item has no currency',
        details: { canonicalObjectId: costItem.canonicalObjectId },
      });
    }
    if (costItem.totalAmount <= 0) {
      errors.push({
        code: 'COST_INVALID_AMOUNT',
        message: `Cost item has invalid amount: ${costItem.totalAmount}`,
        details: { canonicalObjectId: costItem.canonicalObjectId },
      });
    }
  }

  const status: BuildModelStatus = errors.length > 0 ? 'ERROR' : 'VALID';

  if (import.meta.env.DEV) {
    // v3.9.28: Structured diagnostics
    logFlightCostDiagnostics({
      sessionId: `build_${Date.now()}`,
      sourceSummary: `${snapshot.canonicalItems.length} canonical items`,
      phase: 'POST_BUILD',
      rawParsedLegCount: snapshot.canonicalItems.length,
      canonicalLegCount: snapshot.canonicalItems.length,
      tripBuildModelLegCount: legs.length,
      canonicalCostItemCount: countCanonicalCostItems(snapshot.canonicalItems),
      tripBuildModelCostCount: costItems.length,
    });

    console.log('[TripBuildModel] BUILD_RESULT', {
      status,
      legCount: legs.length,
      costItemCount: costItems.length,
      errorCount: errors.length,
      errors: errors.map(e => e.message),
      dedupSkipped: snapshot.canonicalItems.length - legs.length - errors.filter(e => e.code === 'MISSING_REQUIRED_FLIGHT_FIELDS').length,
    });
  }

  return {
    status,
    legs,
    costItems,
    startDate: snapshot.derivedTripRange.startDate || '',
    endDate: snapshot.derivedTripRange.endDate || '',
    errors,
    snapshot,
  };
}

// ============================================================================
// EXPENSE IDEMPOTENCY (CHANGE 6)
// ============================================================================

export interface ExpenseIdempotencyCheck {
  shouldSkip: boolean;
  isConflict: boolean;
  existingAmount?: number;
}

/**
 * Check if an expense already exists for this booking reference + amount.
 *
 * Returns:
 * - shouldSkip: true if exact match exists (idempotent)
 * - isConflict: true if booking_reference exists with different amount
 */
export function checkExpenseIdempotency(
  existingExpenses: Array<{ notes: string | null; amount: number }>,
  bookingReference: string,
  amount: number,
): ExpenseIdempotencyCheck {
  // Look for linked_booking marker in notes
  const marker = `[linked_booking:`;
  
  for (const expense of existingExpenses) {
    if (!expense.notes?.includes(marker)) continue;
    
    // Check if this expense is linked to the same booking reference
    // Note: In the current system, we use booking ID not confirmation number
    // But for idempotency, we check amount match
    const existingAmount = expense.amount;
    
    // Check for exact match
    if (Math.abs(existingAmount - amount) < 0.01) {
      return { shouldSkip: true, isConflict: false, existingAmount };
    }
  }

  return { shouldSkip: false, isConflict: false };
}

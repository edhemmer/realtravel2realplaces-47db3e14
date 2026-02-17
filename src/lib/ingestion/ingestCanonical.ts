/**
 * v3.8.12: Canonical Ingestion Pipeline Entrypoint
 * 
 * This is the ONLY allowed entrypoint for turning raw inputs
 * (email/photo/spreadsheet/manual) into canonical items.
 * 
 * All existing ingestion call-sites MUST call ingestCanonical()
 * and MUST NOT parse raw content locally.
 * 
 * The pipeline:
 * 1. Accepts raw Booking[] and Parking[] records (already DB-persisted)
 * 2. Normalizes each record through concept-specific normalizers
 * 3. Applies field contamination guardrails
 * 4. Validates each item
 * 5. Deduplicates/merges by canonicalId (append, never overwrite)
 * 6. Returns CanonicalItem[] with warnings for the UI to render
 * 
 * RULES:
 * - Always returns CanonicalItem[] (0..N), never a single object
 * - Parsing loops append/merge items, never replace a "current booking"
 * - Dedupe: if canonicalId exists, merge missing fields (do not delete existing)
 * - If canonicalId does not exist, append as new
 * - No date/time/timezone math
 */

import type { Booking, Parking } from '@/types/database';
import type { CanonicalItem, CanonicalWarning } from '@/lib/canonical/canonicalTypes';
import { normalizeBooking, normalizeParkingRecord } from '@/lib/canonical/normalizeCanonicalItem';
import { validateCanonicalItem, type ValidationResult } from '@/lib/canonical/validateCanonicalItem';

// ============================================================================
// TYPES
// ============================================================================

export interface IngestionResult {
  /** All normalized canonical items (deduplicated) */
  items: CanonicalItem[];
  /** Per-item validation results */
  validations: Map<string, ValidationResult>;
  /** Aggregate warning count across all items */
  totalWarnings: number;
  /** Aggregate error count across all items */
  totalErrors: number;
  /** Items that need user attention (have errors or contamination warnings) */
  needsAttention: CanonicalItem[];
}

// ============================================================================
// DEDUPE / MERGE
// ============================================================================

/**
 * Merge a new canonical item into an existing one.
 * Rules:
 * - Never delete existing field values
 * - Only fill in missing (null/undefined/empty) fields from the new item
 * - Merge confirmationNumbers arrays (deduplicated)
 * - Merge warnings and rawEvidence arrays
 */
function mergeCanonicalItem(existing: CanonicalItem, incoming: CanonicalItem): CanonicalItem {
  // Merge confirmationNumbers
  const mergedConfNums = [...new Set([
    ...existing.confirmationNumbers,
    ...incoming.confirmationNumbers,
  ])];

  // Merge warnings and evidence
  const mergedWarnings = [...existing.warnings, ...incoming.warnings];
  const mergedEvidence = [...existing.rawEvidence, ...incoming.rawEvidence];

  // Shallow merge: only fill missing fields from incoming
  const merged = { ...existing };
  
  const existingAny = existing as unknown as Record<string, unknown>;
  const incomingAny = incoming as unknown as Record<string, unknown>;
  const mergedAny = merged as unknown as Record<string, unknown>;

  for (const key of Object.keys(incomingAny)) {
    if (key === 'warnings' || key === 'rawEvidence' || key === 'confirmationNumbers') continue;
    const existingVal = existingAny[key];
    const incomingVal = incomingAny[key];
    
    // Only fill if existing is null/undefined/empty string
    if (
      (existingVal === null || existingVal === undefined || existingVal === '') &&
      incomingVal !== null && incomingVal !== undefined && incomingVal !== ''
    ) {
      mergedAny[key] = incomingVal;
    }
  }

  merged.confirmationNumbers = mergedConfNums;
  merged.warnings = mergedWarnings;
  merged.rawEvidence = mergedEvidence;

  return merged;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Ingest raw booking and parking records into canonical items.
 * 
 * This is the SINGLE entrypoint. All components consuming trip data
 * should receive CanonicalItem[] from this function (via the canonical
 * trip state hook), not raw Booking[]/Parking[].
 * 
 * Multi-confirmation safe: always appends/merges, never overwrites.
 */
export function ingestCanonical(
  bookings: Booking[],
  parkingList: Parking[],
): IngestionResult {
  const itemsByCanonicalId = new Map<string, CanonicalItem>();
  const validations = new Map<string, ValidationResult>();
  let totalWarnings = 0;
  let totalErrors = 0;
  const needsAttention: CanonicalItem[] = [];

  // Normalize and dedupe bookings
  for (const booking of bookings) {
    const item = normalizeBooking(booking);
    
    // Dedupe/merge by canonicalId
    const existing = itemsByCanonicalId.get(item.canonicalId);
    if (existing) {
      // Merge: fill missing fields, combine confirmation numbers
      const merged = mergeCanonicalItem(existing, item);
      itemsByCanonicalId.set(item.canonicalId, merged);
    } else {
      // Append as new
      itemsByCanonicalId.set(item.canonicalId, item);
    }
  }

  // Normalize parking (parking typically doesn't dedupe, but apply same pattern)
  for (const parking of parkingList) {
    const item = normalizeParkingRecord(parking);
    const existing = itemsByCanonicalId.get(item.canonicalId);
    if (existing) {
      const merged = mergeCanonicalItem(existing, item);
      itemsByCanonicalId.set(item.canonicalId, merged);
    } else {
      itemsByCanonicalId.set(item.canonicalId, item);
    }
  }

  // Validate all items
  const items: CanonicalItem[] = [];
  for (const item of itemsByCanonicalId.values()) {
    const validation = validateCanonicalItem(item);
    items.push(item);
    validations.set(item.sourceId, validation);
    totalWarnings += validation.warnings.length + item.warnings.length;
    totalErrors += validation.errors.length;

    if (validation.errors.length > 0 || item.rawEvidence.length > 0) {
      needsAttention.push(item);
    }
  }

  return {
    items,
    validations,
    totalWarnings,
    totalErrors,
    needsAttention,
  };
}

/**
 * Get all warnings for a specific canonical item (normalizer + validator combined).
 */
export function getItemWarnings(
  item: CanonicalItem,
  validation: ValidationResult | undefined,
): CanonicalWarning[] {
  const warnings = [...item.warnings];
  if (validation) {
    warnings.push(...validation.warnings);
    warnings.push(...validation.errors);
  }
  return warnings;
}

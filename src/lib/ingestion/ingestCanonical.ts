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
 * 5. Returns CanonicalItem[] with warnings for the UI to render
 */

import type { Booking, Parking } from '@/types/database';
import type { CanonicalItem, CanonicalWarning } from '@/lib/canonical/canonicalTypes';
import { normalizeBooking, normalizeParkingRecord } from '@/lib/canonical/normalizeCanonicalItem';
import { validateCanonicalItem, type ValidationResult } from '@/lib/canonical/validateCanonicalItem';

// ============================================================================
// TYPES
// ============================================================================

export interface IngestionResult {
  /** All normalized canonical items */
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
// PUBLIC API
// ============================================================================

/**
 * Ingest raw booking and parking records into canonical items.
 * 
 * This is the SINGLE entrypoint. All components consuming trip data
 * should receive CanonicalItem[] from this function (via the canonical
 * trip state hook), not raw Booking[]/Parking[].
 */
export function ingestCanonical(
  bookings: Booking[],
  parkingList: Parking[],
): IngestionResult {
  const items: CanonicalItem[] = [];
  const validations = new Map<string, ValidationResult>();
  let totalWarnings = 0;
  let totalErrors = 0;
  const needsAttention: CanonicalItem[] = [];

  // Normalize bookings
  for (const booking of bookings) {
    const item = normalizeBooking(booking);
    const validation = validateCanonicalItem(item);

    items.push(item);
    validations.set(item.sourceId, validation);
    totalWarnings += validation.warnings.length + item.warnings.length;
    totalErrors += validation.errors.length;

    if (validation.errors.length > 0 || item.rawEvidence.length > 0) {
      needsAttention.push(item);
    }
  }

  // Normalize parking
  for (const parking of parkingList) {
    const item = normalizeParkingRecord(parking);
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

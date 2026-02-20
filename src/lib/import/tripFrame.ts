/**
 * v4.1.0: Trip Frame Computation from Import Batch
 *
 * Computes the trip start/end dates from ALL confirmations in a batch.
 * Uses toOrderingDate for internal comparison — never for display.
 *
 * RULES:
 * - Iterate over EVERY confirmation + EVERY flight leg
 * - Trip start = earliest valid ordering Date
 * - Trip end = latest valid ordering Date
 * - If no valid dates → return null
 * - No timezone math — toOrderingDate uses Date.UTC internally
 */

import type { ImportBatch, ParsedConfirmation } from './types';
import { toOrderingDate } from '@/lib/dates/dateRecognition';

// ============================================================================
// TYPES
// ============================================================================

export interface TripFrameResult {
  startDate: Date;
  endDate: Date;
}

// ============================================================================
// CORE
// ============================================================================

/**
 * Compute the trip frame (start/end) from an entire ImportBatch.
 *
 * Examines:
 * - Each confirmation's startDate/endDate (pre-parsed ordering dates)
 * - Each confirmation's rawStartString/rawEndString (fallback via toOrderingDate)
 * - For FLIGHT confirmations, each leg's departureDate/arrivalDate and raw strings
 *
 * Returns null if no valid dates are found across the entire batch.
 */
export function computeTripFrame(batch: ImportBatch): TripFrameResult | null {
  return computeTripFrameFromConfirmations(batch.items);
}

/**
 * Compute trip frame from an array of parsed confirmations.
 * Extracted as a separate function for testability.
 */
export function computeTripFrameFromConfirmations(
  confirmations: ParsedConfirmation[],
): TripFrameResult | null {
  let earliest: Date | null = null;
  let latest: Date | null = null;

  function consider(d: Date | null): void {
    if (!d || !isValidDate(d)) return;
    if (!earliest || d.getTime() < earliest.getTime()) earliest = d;
    if (!latest || d.getTime() > latest.getTime()) latest = d;
  }

  for (const conf of confirmations) {
    // Confirmation-level dates
    consider(conf.startDate);
    consider(conf.endDate);

    // Fallback: try raw strings
    if (!conf.startDate && conf.rawStartString) {
      consider(toOrderingDate(conf.rawStartString));
    }
    if (!conf.endDate && conf.rawEndString) {
      consider(toOrderingDate(conf.rawEndString));
    }

    // Flight legs
    for (const leg of conf.legs) {
      consider(leg.departureDate);
      consider(leg.arrivalDate);

      // Fallback: try raw strings for legs
      if (!leg.departureDate && leg.rawDepartureString) {
        consider(toOrderingDate(leg.rawDepartureString));
      }
      if (!leg.arrivalDate && leg.rawArrivalString) {
        consider(toOrderingDate(leg.rawArrivalString));
      }
    }
  }

  if (!earliest || !latest) return null;

  return { startDate: earliest, endDate: latest };
}

// ============================================================================
// HELPERS
// ============================================================================

function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Convert a trip frame result to YYYY-MM-DD string tokens for DB storage.
 * Uses UTC to prevent timezone shifts.
 */
export function tripFrameToDateTokens(frame: TripFrameResult): {
  startDateToken: string;
  endDateToken: string;
} {
  return {
    startDateToken: dateToToken(frame.startDate),
    endDateToken: dateToToken(frame.endDate),
  };
}

function dateToToken(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

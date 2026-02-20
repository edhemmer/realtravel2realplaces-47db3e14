/**
 * v3.9.80: Canonical Trip Window — Single Source of Truth
 *
 * This module is the ONE canonical way to determine the trip window
 * (start/end dates) from any set of imported confirmations or bookings.
 *
 * All consumers (Import Wizard, trip header, future flows) MUST use this.
 *
 * Internally delegates to:
 *   - confirmationAdapter (ParsedBooking → ParsedConfirmation)
 *   - computeTripFrameFromConfirmations (the engine)
 *   - tripFrameToDateTokens (Date → YYYY-MM-DD)
 *
 * RULES:
 * - NO timezone math, NO locale formatting
 * - NO ad-hoc date derivation — everything flows through computeTripFrame
 * - Returns null dates if the engine cannot determine a frame
 */

import type { ImportBatch } from './types';
import { adaptParsedBatchToConfirmations } from './confirmationAdapter';
import { computeTripFrame, computeTripFrameFromConfirmations, tripFrameToDateTokens } from './tripFrame';

// ============================================================================
// TYPES
// ============================================================================

export interface TripWindow {
  startDate: string | null; // YYYY-MM-DD token or null
  endDate: string | null;   // YYYY-MM-DD token or null
}

// ============================================================================
// CORE
// ============================================================================

/**
 * Compute trip window from a full ImportBatch.
 * Delegates entirely to computeTripFrame — no overrides.
 */
export function computeTripWindowFromBatch(batch: ImportBatch): TripWindow {
  const frame = computeTripFrame(batch);
  if (!frame) return { startDate: null, endDate: null };
  const tokens = tripFrameToDateTokens(frame);
  return { startDate: tokens.startDateToken, endDate: tokens.endDateToken };
}

/**
 * v3.9.80: Compute trip window from raw parsed booking records.
 *
 * This is the wizard-facing entry point. It:
 * 1. Adapts raw parsed records → ParsedConfirmation[] (via confirmationAdapter)
 * 2. Calls computeTripFrameFromConfirmations (the engine)
 * 3. Returns YYYY-MM-DD tokens
 *
 * This replaces the old computeWizardTripWindow which operated on
 * ParsedBooking[] and only examined top-level start_datetime/end_datetime,
 * missing individual flight leg dates.
 */
export function computeTripWindowFromParsedBookings(
  parsedBookings: Array<Record<string, unknown>>,
): TripWindow {
  if (!parsedBookings || parsedBookings.length === 0) {
    return { startDate: null, endDate: null };
  }

  const confirmations = adaptParsedBatchToConfirmations(parsedBookings);
  const frame = computeTripFrameFromConfirmations(confirmations);
  if (!frame) return { startDate: null, endDate: null };

  const tokens = tripFrameToDateTokens(frame);
  return { startDate: tokens.startDateToken, endDate: tokens.endDateToken };
}

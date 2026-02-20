/**
 * v3.9.70: Trip Frame Computation from Import Batch
 *
 * Computes the trip start/end dates from ALL confirmations in a batch.
 * Uses toOrderingDate for internal comparison — never for display.
 *
 * v3.9.70: Now uses buildCanonicalItinerary to aggregate flights, lodging,
 * and car rentals for frame computation. Ensures all booking types contribute
 * to the trip frame.
 *
 * RULES:
 * - Iterate over EVERY flight leg, lodging stay, and car rental
 * - Trip start = earliest valid ordering Date
 * - Trip end = latest valid ordering Date
 * - If no valid dates → return null
 * - No timezone math — toOrderingDate uses Date.UTC internally
 */

import type { ImportBatch, ParsedConfirmation } from './types';
import { buildCanonicalItinerary } from './itineraryEngine';
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
 * Returns null if no valid dates are found across the entire batch.
 */
export function computeTripFrame(batch: ImportBatch): TripFrameResult | null {
  return computeTripFrameFromConfirmations(batch.items);
}

/**
 * Compute trip frame from an array of parsed confirmations.
 * v3.9.70: Uses buildCanonicalItinerary for structured aggregation of
 * flights, lodgings, and car rentals, plus fallback for other types.
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

  function considerRaw(raw: string | null | undefined): void {
    if (!raw) return;
    consider(toOrderingDate(raw));
  }

  // v3.9.70: Use canonical itinerary for structured aggregation
  const itinerary = buildCanonicalItinerary(confirmations);

  // Flight legs
  for (const cf of itinerary.flights) {
    const leg = cf.leg;
    consider(leg.departureDate);
    consider(leg.arrivalDate);
    if (!leg.departureDate) considerRaw(leg.rawDepartureString);
    if (!leg.arrivalDate) considerRaw(leg.rawArrivalString);
  }

  // Lodging stays
  for (const stay of itinerary.lodgings) {
    considerRaw(stay.rawCheckInString);
    considerRaw(stay.rawCheckOutString);
  }

  // Car rentals
  for (const car of itinerary.cars) {
    considerRaw(car.rawPickupString);
    considerRaw(car.rawDropoffString);
  }

  // Fallback: confirmation-level pre-parsed ordering dates for ALL types
  // These may be set by the adapter even when raw strings are also present
  for (const conf of confirmations) {
    consider(conf.startDate);
    consider(conf.endDate);
    if (!conf.startDate) considerRaw(conf.rawStartString);
    if (!conf.endDate) considerRaw(conf.rawEndString);
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

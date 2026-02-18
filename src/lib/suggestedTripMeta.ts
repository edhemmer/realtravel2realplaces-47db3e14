/**
 * v3.9.31: Canonical SuggestedTripMeta Resolver
 *
 * Single source of truth for auto-filling trip identity (name, destination, dates)
 * from the full merged/deduped booking set in the Create Trip flow.
 *
 * RULES:
 * - Runs ONLY after merge/dedupe/enrich is complete
 * - Uses the FULL aggregated flight legs across the import session
 * - Does not source from email subjects, payment metadata, or per-email AI trip objects
 * - No timezone math, no date conversions — raw string ordering only
 * - Destination fields only filled when deterministically known (no guessing)
 */

import { getAirportByCode, type Airport } from '@/lib/airportData';
import { getSuggestedTripDates } from '@/hooks/useTripDateSync';
import { validateConfirmationAlignment, isFrameResolved, type TripFrameMode } from '@/lib/tripFrameResolver';
import { parseISO } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export interface SuggestedTripMeta {
  /** Earliest flight departure or booking start (YYYY-MM-DD) */
  suggestedStart: Date | null;
  /** Latest flight arrival or booking end (YYYY-MM-DD) */
  suggestedEnd: Date | null;
  /** Origin city/IATA for trip naming */
  suggestedOrigin: string | null;
  /** Destination city/IATA for trip naming */
  suggestedDestination: string | null;
  /** Auto-generated trip name: "Origin → Destination Trip" */
  suggestedTripName: string | null;
  /** Destination fields when deterministically known */
  suggestedDestinationFields: {
    city: string | null;
    state: string | null;
    country: string | null;
  };
  /** Whether the meta is fully resolved and ready for auto-fill */
  isReady: boolean;
}

// ============================================================================
// BOOKING INTERFACE (minimal subset needed)
// ============================================================================

interface MetaBooking {
  booking_type: string;
  start_datetime: string;
  end_datetime?: string;
  departure_airport_code?: string | null;
  arrival_airport_code?: string | null;
  vendor_name?: string;
  from_location?: string | null;
  to_location?: string | null;
}

// ============================================================================
// CORE RESOLVER
// ============================================================================

/**
 * Build suggested trip metadata from the full merged booking set.
 *
 * @param bookings - ALL merged/deduped bookings from the import session
 * @param mode - Travel mode selected by user
 * @returns SuggestedTripMeta with all derivable fields
 */
export function buildSuggestedTripMeta(
  bookings: MetaBooking[],
  mode: TripFrameMode
): SuggestedTripMeta {
  const empty: SuggestedTripMeta = {
    suggestedStart: null,
    suggestedEnd: null,
    suggestedOrigin: null,
    suggestedDestination: null,
    suggestedTripName: null,
    suggestedDestinationFields: { city: null, state: null, country: null },
    isReady: false,
  };

  if (bookings.length === 0) return empty;

  // ── 1. Derive dates from full booking set ──────────────────────────
  let suggestedStart: Date | null = null;
  let suggestedEnd: Date | null = null;

  const alignment = validateConfirmationAlignment(bookings, mode);

  if (alignment.aligned && alignment.frame && isFrameResolved(alignment.frame)) {
    try { suggestedStart = parseISO(alignment.frame.startDate); } catch {}
    try { suggestedEnd = parseISO(alignment.frame.endDate); } catch {}
  } else {
    // Fallback to simple min/max across all bookings
    const suggestedDates = getSuggestedTripDates(bookings);
    if (suggestedDates.start_date) {
      try { suggestedStart = parseISO(suggestedDates.start_date); } catch {}
    }
    if (suggestedDates.end_date) {
      try { suggestedEnd = parseISO(suggestedDates.end_date); } catch {}
    }
  }

  // ── 2. Derive origin + destination from flight endpoints ───────────
  const flights = bookings.filter(b => b.booking_type === 'flight');

  let suggestedOrigin: string | null = null;
  let suggestedDestination: string | null = null;
  let destAirport: Airport | undefined = undefined;

  if (flights.length > 0) {
    // Sort flights chronologically
    const sortedFlights = [...flights].sort((a, b) =>
      (a.start_datetime || '').localeCompare(b.start_datetime || '')
    );

    const firstDepCode = sortedFlights[0]?.departure_airport_code?.trim().toUpperCase() || null;
    const lastArrCode = sortedFlights[sortedFlights.length - 1]?.arrival_airport_code?.trim().toUpperCase() || null;

    // Set origin
    if (firstDepCode) {
      const originAirport = getAirportByCode(firstDepCode);
      suggestedOrigin = originAirport?.city || firstDepCode;
    }

    // Determine destination
    if (lastArrCode && firstDepCode && lastArrCode === firstDepCode) {
      // Round-trip detected: last arrival == origin
      // Find turnaround point — the arrival just before the return path begins.
      // Walk legs forward; the return path starts when a leg's arrival matches origin.
      let turnaroundCode: string | null = null;

      for (let i = 0; i < sortedFlights.length; i++) {
        const arrCode = sortedFlights[i]?.arrival_airport_code?.trim().toUpperCase() || null;
        if (i > 0 && arrCode === firstDepCode) {
          // This leg returns to origin — turnaround is previous leg's arrival
          turnaroundCode = sortedFlights[i - 1]?.arrival_airport_code?.trim().toUpperCase() || null;
          break;
        }
      }

      // Fallback: midpoint leg's arrival (for symmetrical itineraries)
      if (!turnaroundCode) {
        const midIdx = Math.floor(sortedFlights.length / 2) - 1;
        const safeMid = Math.max(0, Math.min(midIdx, sortedFlights.length - 1));
        turnaroundCode = sortedFlights[safeMid]?.arrival_airport_code?.trim().toUpperCase() || null;
      }

      if (turnaroundCode) {
        destAirport = getAirportByCode(turnaroundCode);
        suggestedDestination = destAirport?.city || turnaroundCode;
      }
    } else if (lastArrCode) {
      // One-way or open-jaw
      destAirport = getAirportByCode(lastArrCode);
      suggestedDestination = destAirport?.city || lastArrCode;
    } else {
      // Fallback: first flight's arrival
      const firstArrCode = sortedFlights[0]?.arrival_airport_code?.trim().toUpperCase() || null;
      if (firstArrCode) {
        destAirport = getAirportByCode(firstArrCode);
        suggestedDestination = destAirport?.city || firstArrCode;
      }
    }
  }

  // ── 3. Build trip name ─────────────────────────────────────────────
  let suggestedTripName: string | null = null;
  if (suggestedOrigin && suggestedDestination) {
    suggestedTripName = `${suggestedOrigin} → ${suggestedDestination} Trip`;
  } else if (suggestedDestination) {
    suggestedTripName = `${suggestedDestination} Trip`;
  }

  // ── 4. Build destination fields (only when deterministic) ──────────
  const suggestedDestinationFields = {
    city: destAirport?.city || null,
    state: destAirport?.state || null,
    country: destAirport?.country || null,
  };

  return {
    suggestedStart,
    suggestedEnd,
    suggestedOrigin,
    suggestedDestination,
    suggestedTripName,
    suggestedDestinationFields,
    isReady: !!(suggestedStart && suggestedEnd),
  };
}

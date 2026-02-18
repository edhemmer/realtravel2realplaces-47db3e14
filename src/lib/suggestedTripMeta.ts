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
    // Sort flights by start_datetime to find first departure and last arrival
    const sortedFlights = [...flights].sort((a, b) => {
      const da = a.start_datetime || '';
      const db = b.start_datetime || '';
      return da.localeCompare(db);
    });

    // Origin = first flight's departure
    const firstFlight = sortedFlights[0];
    const firstDepCode = (firstFlight as any).departure_airport_code?.trim().toUpperCase();

    // Destination = last flight's arrival (final leg endpoint)
    // For a round-trip, this is the return arrival. For one-way chains,
    // we want the farthest destination, which is trickier.
    // Strategy: find the last flight's arrival airport.
    const lastFlight = sortedFlights[sortedFlights.length - 1];
    const lastArrCode = (lastFlight as any).arrival_airport_code?.trim().toUpperCase();

    // For a round trip where last arrival == first departure,
    // the destination is the first arrival or the mid-point.
    // Better heuristic: find the arrival of the first outbound leg.
    const firstArrCode = (firstFlight as any).arrival_airport_code?.trim().toUpperCase();

    if (firstDepCode) {
      const originAirport = getAirportByCode(firstDepCode);
      suggestedOrigin = originAirport?.city || firstDepCode;
    }

    // Determine destination:
    // If round-trip (last arrival == first departure), destination = first arrival
    // Otherwise, destination = last arrival
    if (lastArrCode && firstDepCode && lastArrCode === firstDepCode && firstArrCode) {
      // Round trip detected — destination is first flight's arrival
      destAirport = getAirportByCode(firstArrCode);
      suggestedDestination = destAirport?.city || firstArrCode;
    } else if (lastArrCode) {
      destAirport = getAirportByCode(lastArrCode);
      suggestedDestination = destAirport?.city || lastArrCode;
    } else if (firstArrCode) {
      destAirport = getAirportByCode(firstArrCode);
      suggestedDestination = destAirport?.city || firstArrCode;
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

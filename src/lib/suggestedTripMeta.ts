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
import { resolveIata } from '@/lib/airports/resolveIata';
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

  /**
   * Helper: resolve an airport code from explicit code field,
   * falling back to resolveIata on the location text field.
   */
  function resolveAirportCode(code: string | null | undefined, locationText: string | null | undefined): string | null {
    const trimmed = code?.trim().toUpperCase();
    if (trimmed && trimmed.length >= 2) return trimmed;
    // Fallback: try to extract IATA from location text
    if (locationText) {
      const resolution = resolveIata(locationText);
      if (resolution.code) return resolution.code;
    }
    return null;
  }

  /**
   * Helper: get display city from code or location text.
   */
  function resolveCity(code: string | null, locationText: string | null | undefined): { city: string | null; airport: Airport | undefined } {
    if (code) {
      const ap = getAirportByCode(code);
      if (ap) return { city: ap.city, airport: ap };
      return { city: code, airport: undefined };
    }
    // Use raw location text as city name (cleaned up)
    if (locationText) {
      // Try resolveIata for a clean city name
      const resolution = resolveIata(locationText);
      if (resolution.code) {
        const ap = getAirportByCode(resolution.code);
        if (ap) return { city: ap.city, airport: ap };
      }
      // Use raw text, trimmed
      return { city: locationText.trim(), airport: undefined };
    }
    return { city: null, airport: undefined };
  }

  if (flights.length > 0) {
    // Sort flights chronologically
    const sortedFlights = [...flights].sort((a, b) =>
      (a.start_datetime || '').localeCompare(b.start_datetime || '')
    );

    const firstFlight = sortedFlights[0];
    const lastFlight = sortedFlights[sortedFlights.length - 1];

    const firstDepCode = resolveAirportCode(firstFlight?.departure_airport_code, firstFlight?.from_location);
    const lastArrCode = resolveAirportCode(lastFlight?.arrival_airport_code, lastFlight?.to_location);

    // Set origin
    if (firstDepCode || firstFlight?.from_location) {
      const resolved = resolveCity(firstDepCode, firstFlight?.from_location);
      suggestedOrigin = resolved.city;
    }

    // Determine destination
    if (lastArrCode && firstDepCode && lastArrCode === firstDepCode) {
      // Round-trip detected: last arrival == origin
      // Find turnaround point — the arrival just before the return path begins.
      let turnaroundCode: string | null = null;
      let turnaroundLocationText: string | null = null;

      for (let i = 0; i < sortedFlights.length; i++) {
        const arrCode = resolveAirportCode(sortedFlights[i]?.arrival_airport_code, sortedFlights[i]?.to_location);
        if (i > 0 && arrCode === firstDepCode) {
          turnaroundCode = resolveAirportCode(sortedFlights[i - 1]?.arrival_airport_code, sortedFlights[i - 1]?.to_location);
          turnaroundLocationText = sortedFlights[i - 1]?.to_location || null;
          break;
        }
      }

      // Fallback: midpoint leg's arrival (for symmetrical itineraries)
      if (!turnaroundCode) {
        const midIdx = Math.floor(sortedFlights.length / 2) - 1;
        const safeMid = Math.max(0, Math.min(midIdx, sortedFlights.length - 1));
        turnaroundCode = resolveAirportCode(sortedFlights[safeMid]?.arrival_airport_code, sortedFlights[safeMid]?.to_location);
        turnaroundLocationText = sortedFlights[safeMid]?.to_location || null;
      }

      if (turnaroundCode || turnaroundLocationText) {
        const resolved = resolveCity(turnaroundCode, turnaroundLocationText);
        destAirport = resolved.airport;
        suggestedDestination = resolved.city;
      }
    } else if (lastArrCode || lastFlight?.to_location) {
      // One-way or open-jaw
      const resolved = resolveCity(lastArrCode, lastFlight?.to_location);
      destAirport = resolved.airport;
      suggestedDestination = resolved.city;
    } else {
      // Fallback: first flight's arrival
      const firstArrCode = resolveAirportCode(firstFlight?.arrival_airport_code, firstFlight?.to_location);
      if (firstArrCode || firstFlight?.to_location) {
        const resolved = resolveCity(firstArrCode, firstFlight?.to_location);
        destAirport = resolved.airport;
        suggestedDestination = resolved.city;
      }
    }
  }

  // ── 2b. Fallback: derive from non-flight bookings (stays, etc.) ────
  if (!suggestedDestination && bookings.length > 0) {
    // Try to find a stay or activity with a location
    const nonFlights = bookings.filter(b => b.booking_type !== 'flight');
    for (const b of nonFlights) {
      const loc = b.to_location || b.from_location;
      if (loc) {
        const resolution = resolveIata(loc);
        if (resolution.code) {
          const ap = getAirportByCode(resolution.code);
          if (ap) {
            destAirport = ap;
            suggestedDestination = ap.city;
            break;
          }
        }
        // Use raw location text
        suggestedDestination = loc.trim();
        break;
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

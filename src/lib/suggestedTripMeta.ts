/**
 * v3.9.45: Canonical SuggestedTripMeta Resolver
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
 *
 * v3.9.45 CHANGES:
 * - Deterministic fallback chain: lodging → flights → locations → raw text
 * - Always populate suggestedDestinationFields.city when destination is known
 * - Airport name → IATA → city resolution via resolveIata
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
  departure_airport_name?: string | null;
  arrival_airport_name?: string | null;
  vendor_name?: string;
  from_location?: string | null;
  to_location?: string | null;
  // Lodging fields
  property_name?: string | null;
  address?: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Helper: resolve an airport code from explicit code field,
 * falling back to resolveIata on the airport name or location text field.
 */
function resolveAirportCode(
  code: string | null | undefined,
  airportName: string | null | undefined,
  locationText: string | null | undefined
): string | null {
  const trimmed = code?.trim().toUpperCase();
  if (trimmed && trimmed.length >= 2) return trimmed;
  // Fallback: try airport name first (more specific than location text)
  if (airportName) {
    const resolution = resolveIata(airportName);
    if (resolution.code) return resolution.code;
  }
  // Fallback: try to extract IATA from location text
  if (locationText) {
    const resolution = resolveIata(locationText);
    if (resolution.code) return resolution.code;
  }
  return null;
}

/**
 * Helper: get display city from code, airport name, or location text.
 */
function resolveCity(
  code: string | null,
  airportName: string | null | undefined,
  locationText: string | null | undefined
): { city: string | null; state: string | null; country: string | null; airport: Airport | undefined } {
  if (code) {
    const ap = getAirportByCode(code);
    if (ap) return { city: ap.city, state: ap.state || null, country: ap.country, airport: ap };
    return { city: code, state: null, country: null, airport: undefined };
  }
  // Try airport name → resolveIata → airport data
  if (airportName) {
    const resolution = resolveIata(airportName);
    if (resolution.code) {
      const ap = getAirportByCode(resolution.code);
      if (ap) return { city: ap.city, state: ap.state || null, country: ap.country, airport: ap };
    }
  }
  // Try location text → resolveIata → airport data
  if (locationText) {
    const resolution = resolveIata(locationText);
    if (resolution.code) {
      const ap = getAirportByCode(resolution.code);
      if (ap) return { city: ap.city, state: ap.state || null, country: ap.country, airport: ap };
    }
    // Use raw text, trimmed
    return { city: locationText.trim(), state: null, country: null, airport: undefined };
  }
  return { city: null, state: null, country: null, airport: undefined };
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
  }
  
  // Always try fallback if dates not resolved
  if (!suggestedStart || !suggestedEnd) {
    const suggestedDates = getSuggestedTripDates(bookings);
    if (suggestedDates.start_date && !suggestedStart) {
      try { suggestedStart = parseISO(suggestedDates.start_date); } catch {}
    }
    if (suggestedDates.end_date && !suggestedEnd) {
      try { suggestedEnd = parseISO(suggestedDates.end_date); } catch {}
    }
  }

  // ── 2. Destination resolution — deterministic fallback chain ───────
  // Priority: A) Lodging → B) Flights → C) to_location/from_location → D) raw text

  let suggestedOrigin: string | null = null;
  let suggestedDestination: string | null = null;
  let destFields: { city: string | null; state: string | null; country: string | null } = { city: null, state: null, country: null };

  // ── 2A. Lodging destination (most specific) ────────────────────────
  const stays = bookings.filter(b => b.booking_type === 'stay');
  if (stays.length > 0) {
    for (const stay of stays) {
      // Try to_location first, then address
      const locText = stay.to_location || stay.address;
      if (locText) {
        const resolution = resolveIata(locText);
        if (resolution.code) {
          const ap = getAirportByCode(resolution.code);
          if (ap) {
            suggestedDestination = ap.city;
            destFields = { city: ap.city, state: ap.state || null, country: ap.country };
            break;
          }
        }
        // Use raw location text as city
        suggestedDestination = locText.trim();
        destFields = { city: locText.trim(), state: null, country: null };
        break;
      }
    }
  }

  // ── 2B. Flight endpoint resolution ─────────────────────────────────
  const flights = bookings.filter(b => b.booking_type === 'flight');

  if (flights.length > 0) {
    // Sort flights chronologically
    const sortedFlights = [...flights].sort((a, b) =>
      (a.start_datetime || '').localeCompare(b.start_datetime || '')
    );

    const firstFlight = sortedFlights[0];
    const lastFlight = sortedFlights[sortedFlights.length - 1];

    const firstDepCode = resolveAirportCode(firstFlight?.departure_airport_code, firstFlight?.departure_airport_name, firstFlight?.from_location);
    const lastArrCode = resolveAirportCode(lastFlight?.arrival_airport_code, lastFlight?.arrival_airport_name, lastFlight?.to_location);

    // Set origin from first departure
    if (firstDepCode || firstFlight?.departure_airport_name || firstFlight?.from_location) {
      const resolved = resolveCity(firstDepCode, firstFlight?.departure_airport_name, firstFlight?.from_location);
      suggestedOrigin = resolved.city;
    }

    // Determine destination from flights only if not already resolved from lodging
    if (!suggestedDestination) {
      if (lastArrCode && firstDepCode && lastArrCode === firstDepCode) {
        // Round-trip detected: last arrival == origin
        // Find turnaround point
        let turnaroundCode: string | null = null;
        let turnaroundAirportName: string | null = null;
        let turnaroundLocationText: string | null = null;

        for (let i = 0; i < sortedFlights.length; i++) {
          const arrCode = resolveAirportCode(sortedFlights[i]?.arrival_airport_code, sortedFlights[i]?.arrival_airport_name, sortedFlights[i]?.to_location);
          if (i > 0 && arrCode === firstDepCode) {
            turnaroundCode = resolveAirportCode(sortedFlights[i - 1]?.arrival_airport_code, sortedFlights[i - 1]?.arrival_airport_name, sortedFlights[i - 1]?.to_location);
            turnaroundAirportName = sortedFlights[i - 1]?.arrival_airport_name || null;
            turnaroundLocationText = sortedFlights[i - 1]?.to_location || null;
            break;
          }
        }

        // Fallback: midpoint leg's arrival
        if (!turnaroundCode) {
          const midIdx = Math.floor(sortedFlights.length / 2) - 1;
          const safeMid = Math.max(0, Math.min(midIdx, sortedFlights.length - 1));
          turnaroundCode = resolveAirportCode(sortedFlights[safeMid]?.arrival_airport_code, sortedFlights[safeMid]?.arrival_airport_name, sortedFlights[safeMid]?.to_location);
          turnaroundAirportName = sortedFlights[safeMid]?.arrival_airport_name || null;
          turnaroundLocationText = sortedFlights[safeMid]?.to_location || null;
        }

        if (turnaroundCode || turnaroundAirportName || turnaroundLocationText) {
          const resolved = resolveCity(turnaroundCode, turnaroundAirportName, turnaroundLocationText);
          suggestedDestination = resolved.city;
          destFields = { city: resolved.city, state: resolved.state, country: resolved.country };
        }
      } else if (lastArrCode || lastFlight?.arrival_airport_name || lastFlight?.to_location) {
        // One-way or open-jaw
        const resolved = resolveCity(lastArrCode, lastFlight?.arrival_airport_name, lastFlight?.to_location);
        suggestedDestination = resolved.city;
        destFields = { city: resolved.city, state: resolved.state, country: resolved.country };
      } else {
        // Fallback: first flight's arrival
        const firstArrCode = resolveAirportCode(firstFlight?.arrival_airport_code, firstFlight?.arrival_airport_name, firstFlight?.to_location);
        if (firstArrCode || firstFlight?.arrival_airport_name || firstFlight?.to_location) {
          const resolved = resolveCity(firstArrCode, firstFlight?.arrival_airport_name, firstFlight?.to_location);
          suggestedDestination = resolved.city;
          destFields = { city: resolved.city, state: resolved.state, country: resolved.country };
        }
      }
    } else if (!suggestedOrigin) {
      // We have destination from lodging but no origin — still try to get origin from flights
      // (already handled above)
    }
  }

  // ── 2C. Fallback: to_location / from_location from any booking ─────
  if (!suggestedDestination && bookings.length > 0) {
    const nonFlights = bookings.filter(b => b.booking_type !== 'flight');
    for (const b of nonFlights) {
      const loc = b.to_location || b.from_location || b.address;
      if (loc) {
        const resolution = resolveIata(loc);
        if (resolution.code) {
          const ap = getAirportByCode(resolution.code);
          if (ap) {
            suggestedDestination = ap.city;
            destFields = { city: ap.city, state: ap.state || null, country: ap.country };
            break;
          }
        }
        // Use raw location text
        suggestedDestination = loc.trim();
        destFields = { city: loc.trim(), state: null, country: null };
        break;
      }
    }
  }

  // ── 2D. Ensure destFields.city is always set when destination is known ──
  if (suggestedDestination && !destFields.city) {
    destFields.city = suggestedDestination;
  }

  // ── 3. Build trip name ─────────────────────────────────────────────
  let suggestedTripName: string | null = null;
  if (suggestedOrigin && suggestedDestination) {
    suggestedTripName = `${suggestedOrigin} → ${suggestedDestination} Trip`;
  } else if (suggestedDestination) {
    suggestedTripName = `${suggestedDestination} Trip`;
  } else if (destFields.country) {
    suggestedTripName = `Trip to ${destFields.country}`;
  }
  // Never generate placeholder text — return null if nothing resolved

  // ── 4. Build destination fields ────────────────────────────────────
  const suggestedDestinationFields = {
    city: destFields.city,
    state: destFields.state,
    country: destFields.country,
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

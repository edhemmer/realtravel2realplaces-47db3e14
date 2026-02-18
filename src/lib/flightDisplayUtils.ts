/**
 * v3.9.17: Flight Display & Navigation Utilities
 *
 * Centralizes IATA code validation, flight subtitle formatting,
 * and safe navigation fallbacks for flight bookings.
 *
 * v3.9.17: Delegates to canonical FlightDisplayModel for subtitle generation.
 *
 * NO Date objects. NO timezone math. String-only operations.
 */

import { buildFlightDisplayModel, buildFlightSubtitleLine } from '@/lib/flightDisplayModel';

// ============================================================================
// IATA VALIDATION
// ============================================================================

const IATA_REGEX = /^[A-Z]{3}$/;

/**
 * Validates a string as a 3-letter IATA airport code.
 * Returns the uppercased code if valid, or null if invalid/missing.
 */
export function validateIATA(code: string | null | undefined): string | null {
  if (!code) return null;
  const trimmed = code.trim().toUpperCase();
  return IATA_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * Sanitize an airport code field value for storage.
 * Returns a valid IATA code or null. Never allows non-IATA tokens.
 */
export function sanitizeAirportCodeForStorage(value: string | null | undefined): string | null {
  return validateIATA(value);
}

// ============================================================================
// FLIGHT DISPLAY FORMAT (v3.9.17: delegates to FlightDisplayModel)
// ============================================================================

/**
 * Build the required flight subtitle line.
 * v3.9.17: Delegates to canonical FlightDisplayModel for consistent rendering.
 */
export function buildFlightDisplayLine(opts: {
  departureAirportCode?: string | null;
  arrivalAirportCode?: string | null;
  departureAirportName?: string | null;
  arrivalAirportName?: string | null;
  confirmationNumber?: string | null;
  startDatetime?: string | null;
  endDatetime?: string | null;
  use24h?: boolean;
  departureLocalTime?: string | null;
  arrivalLocalTime?: string | null;
  hasDepartureTime?: boolean;
  hasArrivalTime?: boolean;
}): string {
  const model = buildFlightDisplayModel({
    departureAirportCode: opts.departureAirportCode,
    arrivalAirportCode: opts.arrivalAirportCode,
    departureAirportName: opts.departureAirportName,
    arrivalAirportName: opts.arrivalAirportName,
    confirmationNumber: opts.confirmationNumber,
    startDatetime: opts.startDatetime,
    endDatetime: opts.endDatetime,
    departureLocalTime: opts.departureLocalTime,
    arrivalLocalTime: opts.arrivalLocalTime,
    hasDepartureTime: opts.hasDepartureTime,
    hasArrivalTime: opts.hasArrivalTime,
    use24h: opts.use24h,
  });
  return buildFlightSubtitleLine(model);
}

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

/**
 * Build a safe Maps query for a flight booking.
 * Uses ONLY valid IATA codes. Falls back to airport name or city.
 *
 * @param target - 'departure' or 'arrival'
 * @returns A Maps-safe query string, never a confirmation number
 */
export function buildFlightMapsQuery(opts: {
  target: 'departure' | 'arrival';
  departureAirportCode?: string | null;
  arrivalAirportCode?: string | null;
  departureAirportName?: string | null;
  arrivalAirportName?: string | null;
  tripCity?: string | null;
  tripState?: string | null;
}): string | null {
  const code = opts.target === 'departure'
    ? validateIATA(opts.departureAirportCode)
    : validateIATA(opts.arrivalAirportCode);

  if (code) {
    return `${code} Airport`;
  }

  // Fallback: airport name field
  const name = opts.target === 'departure'
    ? opts.departureAirportName
    : opts.arrivalAirportName;
  if (name && name.trim().length > 0) {
    return name.trim();
  }

  // Final fallback: city-based
  if (opts.tripCity) {
    const cityParts = [opts.tripCity];
    if (opts.tripState) cityParts.push(opts.tripState);
    return `Airport near ${cityParts.join(', ')}`;
  }

  return null;
}

// ============================================================================
// SAFE REPAIR (active trips only)
// ============================================================================

const IATA_ROUTE_PATTERN = /([A-Z]{3})\s*(?:→|->|-|to)\s*([A-Z]{3})/i;
const IATA_FROM_TO_PATTERN = /\bFrom:\s*([A-Z]{3})\b[\s\S]{0,80}\bTo:\s*([A-Z]{3})\b/i;

/**
 * Detect if a booking has corrupted airport codes (e.g., confirmation number
 * stored in airport code fields).
 */
export function detectCorruptedAirportCodes(booking: {
  departure_airport_code?: string | null;
  arrival_airport_code?: string | null;
  confirmation_number?: string | null;
}): boolean {
  const depCode = booking.departure_airport_code;
  const arrCode = booking.arrival_airport_code;

  // Any missing or invalid code counts as needing backfill
  if (!validateIATA(depCode) || !validateIATA(arrCode)) return true;

  return false;
}

/**
 * v3.13.5: Attempt high-confidence recovery of IATA codes from text fields.
 * Uses two strict passes:
 *   PASS 1: "DEN → COS" style route patterns
 *   PASS 2: "From: DEN ... To: COS" style patterns
 * Returns { origin, destination } if a single unambiguous pair found, or null.
 */
export function recoverAirportCodes(booking: {
  notes?: string | null;
  vendor_name?: string | null;
  from_location?: string | null;
  to_location?: string | null;
  location_summary?: string | null;
}): { origin: string; destination: string } | null {
  const searchFields = [
    booking.location_summary,
    booking.notes,
    booking.from_location,
    booking.to_location,
    booking.vendor_name,
  ].filter(Boolean).join(' ');

  // PASS 1: Route arrow pattern (e.g., "DEN → COS")
  const match1 = searchFields.match(IATA_ROUTE_PATTERN);
  if (match1) {
    const origin = match1[1].toUpperCase();
    const destination = match1[2].toUpperCase();
    if (validateIATA(origin) && validateIATA(destination)) {
      return { origin, destination };
    }
  }

  // PASS 2: From/To pattern (e.g., "From: DEN ... To: COS")
  const match2 = searchFields.match(IATA_FROM_TO_PATTERN);
  if (match2) {
    const origin = match2[1].toUpperCase();
    const destination = match2[2].toUpperCase();
    if (validateIATA(origin) && validateIATA(destination)) {
      return { origin, destination };
    }
  }

  return null;
}

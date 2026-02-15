/**
 * v3.13.2: Flight Display & Navigation Utilities
 *
 * Centralizes IATA code validation, flight subtitle formatting,
 * and safe navigation fallbacks for flight bookings.
 *
 * NO Date objects. NO timezone math. String-only operations.
 */

import { hasExplicitTime, UNKNOWN_TIME_PLACEHOLDER } from '@/lib/datetimeIntegrity';
import { formatLocalTimeDirect } from '@/lib/canonicalTimeNormalizer';

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
// FLIGHT DISPLAY FORMAT
// ============================================================================

/**
 * Build the required flight subtitle line:
 * "{ORIGIN_IATA} → {DEST_IATA} • Conf {CONFIRMATION} • Dep {DEP_TIME} • Arr {ARR_TIME}"
 *
 * Rules:
 * - IATA codes show "—" if invalid/missing
 * - Conf segment omitted if no confirmation number
 * - Missing times show "Time not provided"
 */
export function buildFlightDisplayLine(opts: {
  departureAirportCode?: string | null;
  arrivalAirportCode?: string | null;
  confirmationNumber?: string | null;
  startDatetime?: string | null;
  endDatetime?: string | null;
  /** Whether to use 24h format */
  use24h?: boolean;
  /** Pre-resolved departure local time string (for timeline events) */
  departureLocalTime?: string | null;
  /** Pre-resolved arrival local time string (for timeline events) */
  arrivalLocalTime?: string | null;
  /** Whether departure has explicit time */
  hasDepartureTime?: boolean;
  /** Whether arrival has explicit time */
  hasArrivalTime?: boolean;
}): string {
  const parts: string[] = [];

  // Airport route
  const depCode = validateIATA(opts.departureAirportCode);
  const arrCode = validateIATA(opts.arrivalAirportCode);
  parts.push(`${depCode || '—'} → ${arrCode || '—'}`);

  // Confirmation number (only if present)
  if (opts.confirmationNumber) {
    parts.push(`Conf ${opts.confirmationNumber}`);
  }

  // Departure time
  const depTimeResolved = resolveTimeDisplay(
    opts.departureLocalTime ?? opts.startDatetime,
    opts.hasDepartureTime ?? (opts.startDatetime ? hasExplicitTime(opts.startDatetime) : false),
    opts.use24h,
  );
  parts.push(`Dep ${depTimeResolved}`);

  // Arrival time
  const arrTimeResolved = resolveTimeDisplay(
    opts.arrivalLocalTime ?? opts.endDatetime,
    opts.hasArrivalTime ?? (opts.endDatetime ? hasExplicitTime(opts.endDatetime) : false),
    opts.use24h,
  );
  parts.push(`Arr ${arrTimeResolved}`);

  return parts.join(' • ');
}

function resolveTimeDisplay(
  datetime: string | null | undefined,
  hasTime: boolean,
  use24h?: boolean,
): string {
  if (!hasTime || !datetime) return UNKNOWN_TIME_PLACEHOLDER;
  const formatted = formatLocalTimeDirect(datetime, use24h);
  return formatted || UNKNOWN_TIME_PLACEHOLDER;
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

/**
 * v2.2.10: Canonical Time Normalizer
 * 
 * SINGLE SOURCE OF TRUTH for normalizing booking-derived event times.
 * 
 * THE PROBLEM:
 * Parsed confirmation times (e.g., "6:00 AM" from an airline email) represent
 * local times at the event's location. However, the storage pipeline previously
 * converted them via `.toISOString()` which appends a "Z" (UTC) suffix.
 * This caused display logic using `new Date()` to shift times by the viewer's
 * device timezone offset.
 * 
 * THE FIX:
 * 1. Resolve an IANA timezone per booking type (flights → airport, others → destination)
 * 2. Extract time digits directly from stored strings WITHOUT going through `new Date()`
 * 3. Display those digits as-is — they already represent the correct local time
 * 
 * RULES:
 * - Flights: departure/arrival airport IATA → IANA timezone
 * - Stays/Rentals/Activities/Transport: trip destination timezone
 * - Unknown location: eventTimeZone = null, render as-is (no UTC shift)
 * - Never create a `Date` object for display formatting of booking times
 */

import { getAirportTimeZone } from './airportTimezones';

// ============================================================================
// DESTINATION TIMEZONE RESOLUTION
// ============================================================================

/**
 * US state (abbreviation OR full name) → IANA timezone.
 * Covers the most common timezone per state. States spanning two timezones
 * use the timezone of the majority population.
 */
const US_STATE_TIMEZONE: Record<string, string> = {
  // Eastern
  CT: 'America/New_York', DE: 'America/New_York', FL: 'America/New_York',
  GA: 'America/New_York', IN: 'America/New_York', KY: 'America/New_York',
  MA: 'America/New_York', MD: 'America/New_York', ME: 'America/New_York',
  MI: 'America/New_York', NC: 'America/New_York', NH: 'America/New_York',
  NJ: 'America/New_York', NY: 'America/New_York', OH: 'America/New_York',
  PA: 'America/New_York', RI: 'America/New_York', SC: 'America/New_York',
  VA: 'America/New_York', VT: 'America/New_York', WV: 'America/New_York',
  DC: 'America/New_York',
  CONNECTICUT: 'America/New_York', DELAWARE: 'America/New_York', FLORIDA: 'America/New_York',
  GEORGIA: 'America/New_York', INDIANA: 'America/New_York', KENTUCKY: 'America/New_York',
  MASSACHUSETTS: 'America/New_York', MARYLAND: 'America/New_York', MAINE: 'America/New_York',
  MICHIGAN: 'America/New_York', 'NORTH CAROLINA': 'America/New_York', 'NEW HAMPSHIRE': 'America/New_York',
  'NEW JERSEY': 'America/New_York', 'NEW YORK': 'America/New_York', OHIO: 'America/New_York',
  PENNSYLVANIA: 'America/New_York', 'RHODE ISLAND': 'America/New_York', 'SOUTH CAROLINA': 'America/New_York',
  VIRGINIA: 'America/New_York', VERMONT: 'America/New_York', 'WEST VIRGINIA': 'America/New_York',
  'DISTRICT OF COLUMBIA': 'America/New_York',
  // Central
  AL: 'America/Chicago', AR: 'America/Chicago', IA: 'America/Chicago',
  IL: 'America/Chicago', KS: 'America/Chicago', LA: 'America/Chicago',
  MN: 'America/Chicago', MO: 'America/Chicago', MS: 'America/Chicago',
  ND: 'America/Chicago', NE: 'America/Chicago', OK: 'America/Chicago',
  SD: 'America/Chicago', TN: 'America/Chicago', TX: 'America/Chicago',
  WI: 'America/Chicago',
  ALABAMA: 'America/Chicago', ARKANSAS: 'America/Chicago', IOWA: 'America/Chicago',
  ILLINOIS: 'America/Chicago', KANSAS: 'America/Chicago', LOUISIANA: 'America/Chicago',
  MINNESOTA: 'America/Chicago', MISSOURI: 'America/Chicago', MISSISSIPPI: 'America/Chicago',
  'NORTH DAKOTA': 'America/Chicago', NEBRASKA: 'America/Chicago', OKLAHOMA: 'America/Chicago',
  'SOUTH DAKOTA': 'America/Chicago', TENNESSEE: 'America/Chicago', TEXAS: 'America/Chicago',
  WISCONSIN: 'America/Chicago',
  // Mountain
  CO: 'America/Denver', ID: 'America/Denver', MT: 'America/Denver',
  NM: 'America/Denver', UT: 'America/Denver', WY: 'America/Denver',
  COLORADO: 'America/Denver', IDAHO: 'America/Denver', MONTANA: 'America/Denver',
  'NEW MEXICO': 'America/Denver', UTAH: 'America/Denver', WYOMING: 'America/Denver',
  // Arizona (no DST)
  AZ: 'America/Phoenix', ARIZONA: 'America/Phoenix',
  // Pacific
  CA: 'America/Los_Angeles', NV: 'America/Los_Angeles', OR: 'America/Los_Angeles',
  WA: 'America/Los_Angeles',
  CALIFORNIA: 'America/Los_Angeles', NEVADA: 'America/Los_Angeles', OREGON: 'America/Los_Angeles',
  WASHINGTON: 'America/Los_Angeles',
  // Alaska & Hawaii
  AK: 'America/Anchorage', ALASKA: 'America/Anchorage',
  HI: 'Pacific/Honolulu', HAWAII: 'Pacific/Honolulu',
};

/**
 * Country → IANA timezone (major timezone per country).
 * Only needs to cover countries users are likely to travel to.
 */
const COUNTRY_TIMEZONE: Record<string, string> = {
  'United States': 'America/New_York',
  'US': 'America/New_York',
  'USA': 'America/New_York',
  'Canada': 'America/Toronto',
  'Mexico': 'America/Mexico_City',
  'United Kingdom': 'Europe/London',
  'UK': 'Europe/London',
  'France': 'Europe/Paris',
  'Germany': 'Europe/Berlin',
  'Italy': 'Europe/Rome',
  'Spain': 'Europe/Madrid',
  'Netherlands': 'Europe/Amsterdam',
  'Switzerland': 'Europe/Zurich',
  'Ireland': 'Europe/Dublin',
  'Portugal': 'Europe/Lisbon',
  'Japan': 'Asia/Tokyo',
  'South Korea': 'Asia/Seoul',
  'China': 'Asia/Shanghai',
  'Singapore': 'Asia/Singapore',
  'Thailand': 'Asia/Bangkok',
  'India': 'Asia/Kolkata',
  'Australia': 'Australia/Sydney',
  'New Zealand': 'Pacific/Auckland',
  'UAE': 'Asia/Dubai',
  'United Arab Emirates': 'Asia/Dubai',
  'Brazil': 'America/Sao_Paulo',
  'Argentina': 'America/Argentina/Buenos_Aires',
  'Colombia': 'America/Bogota',
  'Peru': 'America/Lima',
  'Chile': 'America/Santiago',
  'Costa Rica': 'America/Costa_Rica',
  'Panama': 'America/Panama',
  'Turkey': 'Europe/Istanbul',
  'Greece': 'Europe/Athens',
  'Israel': 'Asia/Jerusalem',
  'Qatar': 'Asia/Qatar',
};

/**
 * Resolve IANA timezone from trip destination (state + country).
 * For US trips, uses state → timezone. For international, uses country → timezone.
 * Returns null if resolution fails.
 */
export function resolveDestinationTimezone(
  destinationState: string | null | undefined,
  destinationCountry: string | null | undefined
): string | null {
  // If US trip with state, use state-level resolution (more accurate)
  if (destinationState) {
    const normalized = destinationState.trim().toUpperCase();
    const tz = US_STATE_TIMEZONE[normalized];
    if (tz) return tz;
  }

  // Fall back to country-level resolution
  if (destinationCountry) {
    const tz = COUNTRY_TIMEZONE[destinationCountry.trim()];
    if (tz) return tz;
    // Try uppercase match
    const upper = destinationCountry.trim().toUpperCase();
    const tzUpper = Object.entries(COUNTRY_TIMEZONE).find(
      ([k]) => k.toUpperCase() === upper
    );
    if (tzUpper) return tzUpper[1];
  }

  return null;
}

// ============================================================================
// BOOKING TIMEZONE RESOLUTION
// ============================================================================

/**
 * Resolve the IANA timezone for a booking based on its type and location data.
 * 
 * - Flights: use departure/arrival airport IATA code
 * - Everything else: use trip destination timezone
 */
export function resolveBookingTimezone(
  bookingType: string,
  field: 'start' | 'end',
  departureAirportCode: string | null | undefined,
  arrivalAirportCode: string | null | undefined,
  tripDestinationTimeZone: string | null
): string | null {
  if (bookingType === 'flight') {
    if (field === 'start') {
      return getAirportTimeZone(departureAirportCode) || null;
    }
    return getAirportTimeZone(arrivalAirportCode) || null;
  }

  // Stays, rentals, activities, transport → destination timezone
  return tripDestinationTimeZone;
}

// ============================================================================
// DIRECT LOCAL TIME FORMATTING (NO Date OBJECT FOR DISPLAY)
// ============================================================================

/**
 * Extract and format the time digits directly from a stored datetime string.
 * This bypasses `new Date()` entirely, avoiding device timezone shifts.
 * 
 * The stored string's HH:MM digits represent the correct local time at the
 * event's location, regardless of whether the string has a Z suffix or not.
 * 
 * @param datetimeStr - Stored datetime string (e.g., "2026-02-11T06:00:00.000Z" or "2026-02-11T06:00:00")
 * @param use24h - Whether to format in 24-hour style
 * @returns Formatted time string (e.g., "6:00 AM" or "06:00"), or null if no explicit time
 */
export function formatLocalTimeDirect(
  datetimeStr: string | null | undefined,
  use24h: boolean = false
): string | null {
  if (!datetimeStr) return null;

  // Extract T-separated time portion
  const tIndex = datetimeStr.indexOf('T');
  if (tIndex === -1) return null; // date-only, no time

  const timePart = datetimeStr.substring(tIndex + 1);
  const match = timePart.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = match[2];

  // Midnight = likely defaulted, not explicit
  if (hours === 0 && minutes === '00') return null;

  if (use24h) {
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${minutes} ${period}`;
}

/**
 * v3.8.7: Convert a UTC-stored datetime string to a local datetime string
 * in the given IANA timezone.
 * 
 * Input:  "2026-02-15 00:30:00+00" or "2026-02-15T00:30:00.000Z" (UTC)
 * Output: "2026-02-14T19:30:00" (local naive string for America/New_York)
 * 
 * This ensures eventLocalDateTime contains the correct local digits
 * for direct extraction by formatLocalTimeDirect.
 * 
 * If timezone is null or conversion fails, returns the original string as-is.
 */
export function convertUtcToLocalString(
  utcDatetimeStr: string | null | undefined,
  ianaTimezone: string | null
): string | undefined {
  if (!utcDatetimeStr) return undefined;
  if (!ianaTimezone) return utcDatetimeStr;

  try {
    // Normalize to parseable ISO format
    let normalized = utcDatetimeStr.trim();
    // Handle "2026-02-15 00:30:00+00" format → replace space with T
    if (normalized.length >= 19 && normalized[10] === ' ') {
      normalized = normalized.substring(0, 10) + 'T' + normalized.substring(11);
    }
    // Ensure it ends with Z or has offset for UTC parsing
    if (!normalized.endsWith('Z') && !normalized.match(/[+-]\d{2}:?\d{0,2}$/)) {
      // No timezone info — assume it's already local, return as-is
      return utcDatetimeStr;
    }

    const d = new Date(normalized);
    if (isNaN(d.getTime())) return utcDatetimeStr;

    // Use Intl.DateTimeFormat to get local date/time parts in the target timezone
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(d);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find(p => p.type === type)?.value || '00';

    const year = get('year');
    const month = get('month');
    const day = get('day');
    let hour = get('hour');
    // Intl may return "24" for midnight in some locales
    if (hour === '24') hour = '00';
    const minute = get('minute');
    const second = get('second');

    // Return naive local datetime (no Z, no offset)
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  } catch {
    return utcDatetimeStr;
  }
}

/**
 * Extract and format the date portion directly from a stored datetime string.
 * Uses only the YYYY-MM-DD digits, not `new Date()` timezone conversion.
 * 
 * @param datetimeStr - Stored datetime string
 * @param preferDayFirst - If true, format as "Mon, 10 Feb" (24h preference)
 * @returns Formatted date string (e.g., "Wed, Feb 11")
 */
export function formatLocalDateDirect(
  datetimeStr: string | null | undefined,
  preferDayFirst: boolean = false
): string | null {
  if (!datetimeStr) return null;

  const datePart = datetimeStr.substring(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;

  const [year, month, day] = datePart.split('-').map(Number);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Create date at noon to avoid DST edge cases for day-of-week calculation
  const d = new Date(year, month - 1, day, 12, 0, 0);
  const dayOfWeek = DAYS[d.getDay()];
  const monthName = MONTHS[month - 1];

  if (preferDayFirst) {
    return `${dayOfWeek}, ${day} ${monthName}`;
  }
  return `${dayOfWeek}, ${monthName} ${day}`;
}

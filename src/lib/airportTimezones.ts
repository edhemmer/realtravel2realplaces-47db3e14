/**
 * v2.2.4: Airport Timezone Resolver
 * 
 * Maps IATA airport codes to IANA timezone identifiers.
 * Used to ensure flight times display in the correct local timezone
 * regardless of the viewer's device timezone.
 * 
 * SINGLE SOURCE OF TRUTH for airport → timezone resolution.
 */

/**
 * Static mapping of IATA codes to IANA timezone identifiers.
 * Covers all airports in airportData.ts plus common additions.
 */
const AIRPORT_TIMEZONES: Record<string, string> = {
  // ---- US Eastern (America/New_York) ----
  ATL: 'America/New_York',
  JFK: 'America/New_York',
  LGA: 'America/New_York',
  EWR: 'America/New_York',
  MCO: 'America/New_York',
  MIA: 'America/New_York',
  FLL: 'America/New_York',
  TPA: 'America/New_York',
  BOS: 'America/New_York',
  PHL: 'America/New_York',
  CLT: 'America/New_York',
  BWI: 'America/New_York',
  DCA: 'America/New_York',
  IAD: 'America/New_York',
  DTW: 'America/New_York',
  CLE: 'America/New_York',
  PIT: 'America/New_York',
  CVG: 'America/New_York',
  JAX: 'America/New_York',
  RSW: 'America/New_York',
  PBI: 'America/New_York',
  BUF: 'America/New_York',
  PVD: 'America/New_York',
  BDL: 'America/New_York',
  ORF: 'America/New_York',
  RIC: 'America/New_York',
  RDU: 'America/New_York',
  CMH: 'America/New_York',
  IND: 'America/New_York',

  // ---- US Central (America/Chicago) ----
  ORD: 'America/Chicago',
  MDW: 'America/Chicago',
  DFW: 'America/Chicago',
  DAL: 'America/Chicago',
  IAH: 'America/Chicago',
  HOU: 'America/Chicago',
  MSP: 'America/Chicago',
  MSY: 'America/Chicago',
  MCI: 'America/Chicago',
  STL: 'America/Chicago',
  MKE: 'America/Chicago',
  BNA: 'America/Chicago',
  MEM: 'America/Chicago',
  SAT: 'America/Chicago',
  AUS: 'America/Chicago',
  OKC: 'America/Chicago',

  // ---- US Mountain (America/Denver) ----
  DEN: 'America/Denver',
  SLC: 'America/Denver',
  ABQ: 'America/Denver',
  COS: 'America/Denver',
  BOI: 'America/Denver',
  ELP: 'America/Denver',

  // ---- US Arizona (America/Phoenix – no DST) ----
  PHX: 'America/Phoenix',
  TUS: 'America/Phoenix',

  // ---- US Pacific (America/Los_Angeles) ----
  LAX: 'America/Los_Angeles',
  SFO: 'America/Los_Angeles',
  SEA: 'America/Los_Angeles',
  SAN: 'America/Los_Angeles',
  PDX: 'America/Los_Angeles',
  OAK: 'America/Los_Angeles',
  SJC: 'America/Los_Angeles',
  SMF: 'America/Los_Angeles',
  SNA: 'America/Los_Angeles',
  ONT: 'America/Los_Angeles',
  BUR: 'America/Los_Angeles',
  LGB: 'America/Los_Angeles',
  LAS: 'America/Los_Angeles',

  // ---- US Hawaii (Pacific/Honolulu) ----
  HNL: 'Pacific/Honolulu',

  // ---- US Alaska (America/Anchorage) ----
  ANC: 'America/Anchorage',

  // ---- Europe ----
  LHR: 'Europe/London',
  LGW: 'Europe/London',
  CDG: 'Europe/Paris',
  ORY: 'Europe/Paris',
  FRA: 'Europe/Berlin',
  MUC: 'Europe/Berlin',
  AMS: 'Europe/Amsterdam',
  MAD: 'Europe/Madrid',
  BCN: 'Europe/Madrid',
  FCO: 'Europe/Rome',
  MXP: 'Europe/Rome',
  ZRH: 'Europe/Zurich',
  DUB: 'Europe/Dublin',
  LIS: 'Europe/Lisbon',

  // ---- Asia-Pacific ----
  NRT: 'Asia/Tokyo',
  HND: 'Asia/Tokyo',
  ICN: 'Asia/Seoul',
  PEK: 'Asia/Shanghai',
  PVG: 'Asia/Shanghai',
  HKG: 'Asia/Hong_Kong',
  SIN: 'Asia/Singapore',
  BKK: 'Asia/Bangkok',
  DEL: 'Asia/Kolkata',
  BOM: 'Asia/Kolkata',
  SYD: 'Australia/Sydney',
  MEL: 'Australia/Melbourne',

  // ---- Middle East ----
  DXB: 'Asia/Dubai',
  DOH: 'Asia/Qatar',
  IST: 'Europe/Istanbul',

  // ---- Americas (non-US) ----
  YYZ: 'America/Toronto',
  YVR: 'America/Vancouver',
  YUL: 'America/Toronto',
  MEX: 'America/Mexico_City',
  CUN: 'America/Cancun',
  GRU: 'America/Sao_Paulo',
  EZE: 'America/Argentina/Buenos_Aires',
  BOG: 'America/Bogota',
  LIM: 'America/Lima',
  SCL: 'America/Santiago',
  PTY: 'America/Panama',
  SJO: 'America/Costa_Rica',
};

/**
 * Get the IANA timezone for a given IATA airport code.
 * 
 * @param iataCode - 3-letter IATA airport code (e.g., "ATL", "DEN")
 * @param fallbackTimezone - Optional fallback if code is unknown (defaults to undefined)
 * @returns IANA timezone string (e.g., "America/New_York") or undefined if unknown
 */
export function getAirportTimeZone(
  iataCode: string | null | undefined,
  fallbackTimezone?: string
): string | undefined {
  if (!iataCode) return fallbackTimezone;
  
  const normalized = iataCode.trim().toUpperCase();
  const tz = AIRPORT_TIMEZONES[normalized];
  
  if (!tz) {
    if (typeof console !== 'undefined' && import.meta.env?.DEV) {
      console.warn(`[airportTimezones] Unknown IATA code: "${normalized}" — using fallback`);
    }
    return fallbackTimezone;
  }
  
  return tz;
}

/**
 * Format a Date-like datetime string as a local time in the given IANA timezone.
 * Returns a display-ready time string (e.g., "6:00 AM") that will NOT shift
 * based on the viewer's device timezone.
 * 
 * @param datetimeStr - ISO datetime string (e.g., "2026-02-11T06:00:00")
 * @param timezone - IANA timezone (e.g., "America/New_York")
 * @param use24h - Whether to use 24-hour format
 * @returns Formatted time string, or null if input is invalid
 */
export function formatTimeInTimezone(
  datetimeStr: string | null | undefined,
  timezone: string,
  use24h: boolean = false
): string | null {
  if (!datetimeStr) return null;
  
  try {
    const date = new Date(datetimeStr);
    if (isNaN(date.getTime())) return null;
    
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: use24h ? '2-digit' : 'numeric',
      minute: '2-digit',
      hour12: !use24h,
    });
  } catch {
    return null;
  }
}

/**
 * Format a Date-like datetime string as a local date in the given IANA timezone.
 * Returns a display-ready date string that will NOT shift based on the viewer's device timezone.
 * 
 * @param datetimeStr - ISO datetime string
 * @param timezone - IANA timezone
 * @returns Formatted date string (e.g., "Wed, Feb 11"), or null if invalid
 */
export function formatDateInTimezone(
  datetimeStr: string | null | undefined,
  timezone: string
): string | null {
  if (!datetimeStr) return null;
  
  try {
    const date = new Date(datetimeStr);
    if (isNaN(date.getTime())) return null;
    
    return date.toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

/**
 * v3.11.2: Canonical Time Types
 * 
 * Type definitions for the no-math time compliance system.
 * All date/time values in the app are represented as branded string types.
 * No Date objects, no epoch math, no timezone conversions.
 */

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DT_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

/**
 * Date-only string in YYYY-MM-DD format.
 * Used for trip dates, expense dates, and any date without a time component.
 */
export type DateOnly = string; // "YYYY-MM-DD"

/**
 * Local datetime string in YYYY-MM-DDTHH:mm format (or YYYY-MM-DDTHH:mm:ss).
 * Represents wall-clock time at the event's location.
 * No timezone suffix — digits are the truth.
 */
export type LocalDateTime = string; // "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"

/**
 * IANA timezone identifier (e.g., "America/Denver", "Europe/London").
 * Stored alongside LocalDateTime when timezone context is needed.
 */
export type TimeZoneId = string; // IANA timezone string

/**
 * HH:MM time string (24h format).
 */
export type TimeHHMM = string; // "HH:MM"

/**
 * Canonical trip display status derived from date-only string comparison.
 * Independent of trip_state (which is a server-side lifecycle value).
 */
export type TripDisplayStatus = 'FUTURE' | 'ACTIVE' | 'PAST';

// ============================================================================
// TYPE CONSTRUCTORS / VALIDATORS
// ============================================================================

/**
 * Validate and return a DateOnly string. Returns null if invalid.
 * Use this at boundaries where raw strings enter the system.
 */
export function asDateOnly(str: string | null | undefined): DateOnly | null {
  if (!str) return null;
  const d = str.substring(0, 10);
  return DATE_ONLY_RE.test(d) ? d : null;
}

/**
 * Validate and return a LocalDateTime string. Returns null if invalid.
 * Strips timezone suffixes (Z, +00:00, etc.) to preserve local digits.
 */
export function asLocalDateTime(str: string | null | undefined): LocalDateTime | null {
  if (!str) return null;
  if (!LOCAL_DT_RE.test(str)) return null;
  // Strip timezone suffix — keep only YYYY-MM-DDTHH:mm(:ss)
  const stripped = str
    .replace(/Z$/, '')
    .replace(/[+-]\d{2}:\d{2}$/, '')
    .replace(/[+-]\d{2}$/, '');
  // Normalize space separator to T
  return stripped.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/, '$1T$2');
}

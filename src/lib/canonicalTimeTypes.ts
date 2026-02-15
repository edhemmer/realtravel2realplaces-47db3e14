/**
 * v3.11.1: Canonical Time Types
 * 
 * Type definitions for the no-math time compliance system.
 * All date/time values in the app are represented as branded string types.
 * No Date objects, no epoch math, no timezone conversions.
 */

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

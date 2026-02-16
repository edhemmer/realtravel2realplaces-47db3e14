/**
 * v3.11.1: Canonical Time Policy Module
 * 
 * SINGLE SOURCE OF TRUTH for all date/time operations in the app.
 * 
 * RULES:
 * - No Date() objects for user/parsed times
 * - No parseISO() for logic or comparison
 * - No epoch millisecond math
 * - No timezone conversions
 * - All comparisons are string-based (lexicographic on YYYY-MM-DD / YYYY-MM-DDTHH:mm)
 * - Minute math uses integer arithmetic on extracted digits
 * 
 * All modules performing date/time logic MUST use these functions.
 */

import type { DateOnly, LocalDateTime, TimeHHMM, TripDisplayStatus, TripLifecycle, TripLifecyclePhase, TripLifecycleSubstate } from './canonicalTimeTypes';

// Re-export types and constructors for convenience
export type { DateOnly, LocalDateTime, TimeHHMM, TripDisplayStatus, TripLifecycle, TripLifecyclePhase, TripLifecycleSubstate };
export { asDateOnly, asLocalDateTime } from './canonicalTimeTypes';
export type { TimeZoneId } from './canonicalTimeTypes';

// ============================================================================
// DATE-ONLY OPERATIONS (YYYY-MM-DD)
// ============================================================================

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate a DateOnly string.
 */
export function isValidDateOnly(d: string): boolean {
  return DATE_ONLY_REGEX.test(d);
}

/**
 * Extract the YYYY-MM-DD portion from any datetime string.
 * Returns null if invalid.
 */
export function extractDateOnly(dt: string | null | undefined): DateOnly | null {
  if (!dt) return null;
  const d = dt.substring(0, 10);
  return DATE_ONLY_REGEX.test(d) ? d : null;
}

/**
 * Compare two DateOnly strings.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareDateOnly(a: DateOnly, b: DateOnly): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Get today's date as a DateOnly string.
 * This is the ONLY place new Date() is used — to read the device clock.
 */
export function getTodayDateOnly(): DateOnly {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get current local time as a LocalDateTime string (YYYY-MM-DD HH:MM).
 * This is the ONLY place new Date() is used — to read the device clock.
 */
export function getNowLocalDateTime(): LocalDateTime {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

// ============================================================================
// LOCAL DATETIME OPERATIONS (YYYY-MM-DDTHH:mm)
// ============================================================================

/**
 * Extract HH:MM from a LocalDateTime or stored datetime string.
 * Supports both T-separated and space-separated formats.
 */
export function extractTimeHHMM(dt: string | null | undefined): TimeHHMM | null {
  if (!dt) return null;
  const spaceMatch = dt.match(/^\d{4}-\d{2}-\d{2}\s+(\d{2}:\d{2})/);
  if (spaceMatch) return spaceMatch[1];
  const tMatch = dt.match(/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/);
  if (tMatch) return tMatch[1];
  return null;
}

/**
 * Compare two LocalDateTime strings lexicographically.
 * Works for both "YYYY-MM-DDTHH:mm" and "YYYY-MM-DD HH:mm" formats.
 */
export function compareLocalDateTime(a: LocalDateTime, b: LocalDateTime): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Convert HH:MM to total minutes. String-based, no Date().
 */
export function timeToMinutes(time: TimeHHMM): number {
  return parseInt(time.substring(0, 2)) * 60 + parseInt(time.substring(3, 5));
}

/**
 * Convert total minutes back to HH:MM string.
 * Clamps to 00:00–23:59 range.
 */
export function minutesToTime(totalMins: number): TimeHHMM {
  const clamped = Math.max(0, Math.min(totalMins, 1439));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Add minutes to a LocalDateTime string using pure integer math.
 * Returns a new LocalDateTime string. Handles day rollover within a single day
 * (clamps at 23:59 for positive, 00:00 for negative).
 */
export function addMinutesLocal(localDt: LocalDateTime, minutes: number): LocalDateTime {
  const dateStr = localDt.substring(0, 10);
  const time = extractTimeHHMM(localDt);
  if (!time) return localDt;
  const totalMins = timeToMinutes(time) + minutes;
  return `${dateStr}T${minutesToTime(totalMins)}`;
}

/**
 * Calculate minutes between two HH:MM time strings.
 * Returns target - now (positive if target is in the future).
 */
export function minutesUntil(nowTime: TimeHHMM, targetTime: TimeHHMM): number {
  return timeToMinutes(targetTime) - timeToMinutes(nowTime);
}

/**
 * Subtract minutes from a HH:MM string. Clamps at 00:00.
 */
export function subtractMinutes(time: TimeHHMM, minutes: number): TimeHHMM {
  const totalMins = timeToMinutes(time) - minutes;
  return minutesToTime(Math.max(0, totalMins));
}

// ============================================================================
// DISPLAY FORMATTING (string-based, no Date())
// ============================================================================

/**
 * Format a DateOnly string for display (e.g., "Feb 10" or "Feb 10, 2026").
 * Uses a local Date at noon ONLY for day-of-week calculation — not for time logic.
 */
export function formatDateOnly(dateOnly: DateOnly, options?: { includeYear?: boolean; includeDayOfWeek?: boolean }): string {
  if (!isValidDateOnly(dateOnly)) return dateOnly;
  
  const [yearStr, monthStr, dayStr] = dateOnly.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const day = parseInt(dayStr);
  
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  let result = `${MONTHS[month - 1]} ${day}`;
  
  if (options?.includeDayOfWeek) {
    // Only use Date for day-of-week derivation, at noon to avoid DST issues
    const d = new Date(year, month - 1, day, 12, 0, 0);
    result = `${DAYS[d.getDay()]}, ${result}`;
  }
  
  if (options?.includeYear) {
    result += `, ${year}`;
  }
  
  return result;
}

/**
 * Format a LocalDateTime's time portion for display.
 * Returns "H:MM AM/PM" for 12h or "HH:MM" for 24h.
 * Returns null if no explicit time present.
 */
export function formatLocalDateTime(localDt: LocalDateTime, use24h: boolean = false): string | null {
  const time = extractTimeHHMM(localDt);
  if (!time) return null;
  
  const h = parseInt(time.substring(0, 2));
  const m = time.substring(3, 5);
  
  // Midnight = likely defaulted, not explicit
  if (h === 0 && m === '00') return null;
  
  if (use24h) return time;
  
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

/**
 * Format a DateOnly range for display.
 * Handles same-month, same-year, and cross-year cases.
 * No parseISO — pure string extraction.
 */
export function formatDateRange(startDate: DateOnly, endDate: DateOnly): string {
  if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate)) return `${startDate} – ${endDate}`;
  
  const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
  const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  if (sYear === eYear) {
    if (sMonth === eMonth) {
      return `${MONTHS[sMonth - 1]} ${sDay}–${eDay}, ${sYear}`;
    }
    return `${MONTHS[sMonth - 1]} ${sDay} – ${MONTHS[eMonth - 1]} ${eDay}, ${eYear}`;
  }
  
  return `${MONTHS[sMonth - 1]} ${sDay}, ${sYear} – ${MONTHS[eMonth - 1]} ${eDay}, ${eYear}`;
}

/**
 * Calculate duration in days between two DateOnly strings.
 * Pure integer math on YYYY-MM-DD components.
 */
export function daysBetween(startDate: DateOnly, endDate: DateOnly): number {
  if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate)) return 0;
  
  // Use Date at noon only for day count — no time logic
  const [sY, sM, sD] = startDate.split('-').map(Number);
  const [eY, eM, eD] = endDate.split('-').map(Number);
  const start = new Date(sY, sM - 1, sD, 12, 0, 0);
  const end = new Date(eY, eM - 1, eD, 12, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// TRIP STATUS (string-based, no Date() for logic)
// ============================================================================

/**
 * Determine canonical trip display status from date-only strings.
 * 
 * FUTURE: start_date > today
 * ACTIVE: start_date <= today <= end_date
 * PAST: end_date < today
 * 
 * Uses pure string comparison on YYYY-MM-DD — no Date objects.
 */
export function getTripDisplayStatus(
  startDate: DateOnly,
  endDate: DateOnly,
  today?: DateOnly
): TripDisplayStatus {
  const todayStr = today ?? getTodayDateOnly();
  
  if (startDate > todayStr) return 'FUTURE';
  if (endDate < todayStr) return 'PAST';
  return 'ACTIVE';
}

// ============================================================================
// CANONICAL LIFECYCLE (v4.0.0 — 14-day pre-trip activation window)
// ============================================================================

/** Pre-trip activation window in days */
const PRE_TRIP_WINDOW_DAYS = 14;

/**
 * Resolve the canonical trip lifecycle phase and substate.
 * 
 * Rules (evaluated in order):
 * 1. COMPLETED: today > endDate
 * 2. ACTIVE (IN_TRIP): startDate <= today <= endDate
 * 3. ACTIVE (PRE_TRIP): today < startDate AND daysUntilStart <= 14
 * 4. UPCOMING: daysUntilStart > 14
 * 
 * Uses daysBetween() for day calculation (noon-based, DST-safe).
 * Lifecycle is derived ONLY from trip dates — never from timeline events,
 * sorting order, or UI state.
 */
export function resolveCanonicalLifecycle(
  startDate: DateOnly,
  endDate: DateOnly,
  today?: DateOnly
): TripLifecycle {
  const todayStr = today ?? getTodayDateOnly();
  const daysUntilStart = daysBetween(todayStr, startDate);

  // 1. COMPLETED: today is past end date
  if (endDate < todayStr) {
    return { phase: 'COMPLETED', substate: null, daysUntilStart };
  }

  // 2. ACTIVE (IN_TRIP): today is within trip range
  if (startDate <= todayStr && endDate >= todayStr) {
    return { phase: 'ACTIVE', substate: 'IN_TRIP', daysUntilStart };
  }

  // 3. ACTIVE (PRE_TRIP): trip starts within 14 days
  if (daysUntilStart >= 0 && daysUntilStart <= PRE_TRIP_WINDOW_DAYS) {
    return { phase: 'ACTIVE', substate: 'PRE_TRIP', daysUntilStart };
  }

  // 4. UPCOMING: trip is more than 14 days away
  return { phase: 'UPCOMING', substate: null, daysUntilStart };
}

/**
 * Check if a DateOnly is today.
 */
export function isToday(dateOnly: DateOnly, today?: DateOnly): boolean {
  return dateOnly === (today ?? getTodayDateOnly());
}

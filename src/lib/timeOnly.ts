/**
 * v3.12.2: Canonical Time-Only Comparison Helper
 *
 * Single source of truth for time-of-day comparisons.
 * NO Date objects. NO Intl. NO timezone math. NO date-fns.
 *
 * Supported formats:
 *   - 'HH:MM' 24-hour (e.g., '06:05', '18:13')
 *   - 'H:MM AM/PM' 12-hour (e.g., '6:05 AM', '12:00 PM')
 *
 * These are the ONLY formats already used in the app for explicit times.
 *
 * Sanity expectations (not executed at runtime):
 *   timeToMinutes('06:00') => 360
 *   timeToMinutes('18:13') => 1093
 *   timeToMinutes('6:05 AM') => 365
 *   timeToMinutes('12:00 PM') => 720
 *   timeToMinutes('12:00 AM') => 0
 *   isAfterNow('06:00', '05:59') => true
 *   isAfterNow('09:05', '10:00') => false
 *   isAfterNow('12:00 PM', '11:59') => true
 *   isAfterNow('bad', '10:00') => false
 *   isAfterNow('10:00', 'bad') => false
 */

// 24h pattern: HH:MM (strict 2-digit hour)
const RE_24H = /^(\d{1,2}):(\d{2})$/;

// 12h pattern: H:MM AM/PM
const RE_12H = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

/**
 * Returns true only if the value is a string matching a supported explicit time format.
 */
export function isTimeOnlyString(timeStr: unknown): timeStr is string {
  if (typeof timeStr !== 'string' || timeStr.length === 0) return false;
  return RE_24H.test(timeStr) || RE_12H.test(timeStr);
}

/**
 * Converts an explicit time string to minutes since midnight [0..1439].
 * Returns null if the string is not a supported explicit time.
 *
 * Pure integer arithmetic — no Date, no Intl.
 */
export function timeToMinutes(timeStr: string): number | null {
  if (typeof timeStr !== 'string' || timeStr.length === 0) return null;

  // Try 12h first (more specific pattern)
  const match12 = RE_12H.exec(timeStr);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (period === 'AM') {
      h = h === 12 ? 0 : h;
    } else {
      h = h === 12 ? 12 : h + 12;
    }
    return h * 60 + m;
  }

  // Try 24h
  const match24 = RE_24H.exec(timeStr);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  return null;
}

/**
 * Compares two explicit time strings.
 * Returns -1 if a < b, 0 if equal or non-comparable, 1 if a > b.
 * If either side is null/unparseable, returns 0 (no guessing).
 */
export function compareTimeOnly(a: string, b: string): -1 | 0 | 1 {
  const mA = timeToMinutes(a);
  const mB = timeToMinutes(b);
  if (mA == null || mB == null) return 0;
  if (mA < mB) return -1;
  if (mA > mB) return 1;
  return 0;
}

/**
 * Returns true only if both strings parse to valid times AND timeStr is strictly after nowStr.
 * If either is null/unparseable, returns false (no guessing).
 */
export function isAfterNow(timeStr: string, nowStr: string): boolean {
  const mTime = timeToMinutes(timeStr);
  const mNow = timeToMinutes(nowStr);
  if (mTime == null || mNow == null) return false;
  return mTime > mNow;
}

/**
 * v2.2.0: Datetime Integrity Utilities
 * 
 * GLOBAL BOOKING DATE & TIME INTEGRITY RULES:
 * 
 * 1. DATES ARE ABSOLUTE AUTHORITY
 *    - Confirmation dates are never altered
 *    - No adding or subtracting days
 *    - Timezone logic must never change the calendar date
 * 
 * 2. TIMES ARE EXPLICIT ONLY
 *    - Only store times that are explicitly stated
 *    - Never infer, guess, or default times
 *    - Store null when time is not provided
 * 
 * 3. DISPLAY RULES
 *    - Show actual time when present
 *    - Show --:-- in red when time is null/missing
 */

import { format, parseISO } from 'date-fns';

/**
 * v2.2.0: Unknown time placeholder constant
 * Used consistently across all UI components
 */
export const UNKNOWN_TIME_PLACEHOLDER = '--:--';

/**
 * Check if a datetime string has an explicit time component.
 * 
 * Returns false for:
 * - Date-only strings (YYYY-MM-DD)
 * - Midnight times that were likely defaulted (00:00:00)
 * - Null/undefined values
 * 
 * Returns true for:
 * - ISO strings with non-midnight times
 * - Any time that appears to be explicitly set
 */
export function hasExplicitTime(datetime: string | null | undefined): boolean {
  if (!datetime) return false;
  
  // If it's just a date (YYYY-MM-DD format with no time)
  if (/^\d{4}-\d{2}-\d{2}$/.test(datetime)) {
    return false;
  }
  
  // Parse the datetime and check if time is midnight (likely defaulted)
  try {
    const parsed = parseISO(datetime);
    const hours = parsed.getHours();
    const minutes = parsed.getMinutes();
    const seconds = parsed.getSeconds();
    
    // If time is exactly midnight, assume it was defaulted (no explicit time)
    // This is the most common pattern for "no time specified"
    if (hours === 0 && minutes === 0 && seconds === 0) {
      // Check if the original string contains a time component
      // ISO strings with explicit time have 'T' followed by time
      if (datetime.includes('T')) {
        const timePart = datetime.split('T')[1];
        // If time part starts with 00:00:00 or 00:00, it's likely defaulted
        if (timePart?.startsWith('00:00:00') || timePart?.startsWith('00:00')) {
          return false;
        }
      }
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * v2.2.0: Check if a datetime string is date-only (no time component)
 */
export function isDateOnly(datetime: string | null | undefined): boolean {
  if (!datetime) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(datetime);
}

/**
 * v2.2.0: Normalize a datetime for storage, preserving the original date
 * 
 * CRITICAL: This function ensures that timezone conversions never alter
 * the calendar date from the original confirmation.
 * 
 * If the input has an explicit time, it's stored with that time.
 * If the input has no time (date-only), it's stored as date-only to prevent
 * timezone drift when reading back.
 */
export function normalizeDatetimeForStorage(datetime: string | null | undefined): string | null {
  if (!datetime) return null;
  
  // If it's already date-only, keep it that way
  if (isDateOnly(datetime)) {
    return datetime;
  }
  
  // For datetime strings, parse and validate
  try {
    const parsed = parseISO(datetime);
    if (isNaN(parsed.getTime())) return null;
    
    // Check if this has an explicit time
    if (hasExplicitTime(datetime)) {
      // v2.2.10: Store as naive local datetime, NOT UTC.
      // The time digits from the source represent local time at the event's location.
      // Strip any timezone suffix and return YYYY-MM-DDTHH:MM:SS format.
      const tIndex = datetime.indexOf('T');
      if (tIndex !== -1) {
        const datePart = datetime.substring(0, 10);
        const timePart = datetime.substring(tIndex + 1)
          .replace(/Z$/, '')
          .replace(/[+-]\d{2}:\d{2}$/, '')
          .substring(0, 8);
        return `${datePart}T${timePart}`;
      }
      // Fallback: format without UTC conversion
      return format(parsed, "yyyy-MM-dd'T'HH:mm:ss");
    } else {
      // No explicit time - store as date-only to prevent timezone issues
      return format(parsed, 'yyyy-MM-dd');
    }
  } catch {
    return null;
  }
}

/**
 * v2.2.0: Parse a stored datetime for display, preserving the original date
 * 
 * When reading back a stored datetime:
 * - Date-only strings are parsed at local midnight (no drift)
 * - Datetime strings are converted properly
 * 
 * Returns the Date object for formatting in UI.
 */
export function parseDatetimeForDisplay(datetime: string | null | undefined): Date | null {
  if (!datetime) return null;
  
  try {
    // For date-only strings, parse at local midnight to prevent drift
    if (isDateOnly(datetime)) {
      // Append T00:00:00 to interpret as local time, not UTC
      return parseISO(`${datetime}T00:00:00`);
    }
    
    // For full datetime strings, parse normally
    return parseISO(datetime);
  } catch {
    return null;
  }
}

/**
 * Format a datetime for display, respecting unknown times.
 * 
 * @param datetime - ISO datetime string
 * @param options - Formatting options
 * @returns Formatted date string, or date with "Time not specified" if time is unknown
 */
export function formatDatetimeSafe(
  datetime: string | null | undefined,
  options: {
    showDateOnly?: boolean;
    dateFormat?: string;
    timeFormat?: string;
  } = {}
): { date: string; time: string | null; hasTime: boolean } {
  if (!datetime) {
    return { date: '', time: null, hasTime: false };
  }
  
  const {
    dateFormat = 'MMM d',
    timeFormat = 'h:mm a'
  } = options;
  
  try {
    const parsed = parseDatetimeForDisplay(datetime);
    if (!parsed) return { date: '', time: null, hasTime: false };
    
    const dateStr = format(parsed, dateFormat);
    const hasTime = hasExplicitTime(datetime);
    
    return {
      date: dateStr,
      time: hasTime ? format(parsed, timeFormat) : null,
      hasTime
    };
  } catch {
    return { date: '', time: null, hasTime: false };
  }
}

/**
 * Check if a booking/parking record has valid datetime for TripEvent creation.
 * 
 * TripEvents should only be created when we have a valid, explicit datetime.
 * This prevents creating events with guessed or defaulted times.
 */
export function isValidForTripEvent(datetime: string | null | undefined): boolean {
  if (!datetime) return false;
  
  // Must have an explicit time (not midnight default)
  return hasExplicitTime(datetime);
}

/**
 * Get display-friendly time string, or fallback message.
 * 
 * @param datetime - ISO datetime string
 * @param fallback - Message to show when time is unknown (default: "--:--")
 * @returns Time string or fallback message
 */
export function getTimeDisplay(
  datetime: string | null | undefined,
  fallback: string = UNKNOWN_TIME_PLACEHOLDER
): string {
  if (!datetime) return fallback;
  
  const { time, hasTime } = formatDatetimeSafe(datetime);
  return hasTime && time ? time : fallback;
}

/**
 * v2.2.0: Extract just the date portion from a datetime, preserving the original date
 * 
 * This is used when we need the date for display but want to avoid
 * any timezone-related date shifts.
 */
export function extractDateForDisplay(datetime: string | null | undefined): string {
  if (!datetime) return '';
  
  // If date-only, return as-is
  if (isDateOnly(datetime)) {
    try {
      const parsed = parseDatetimeForDisplay(datetime);
      return parsed ? format(parsed, 'MMM d') : '';
    } catch {
      return '';
    }
  }
  
  // For full datetime, parse and extract date
  try {
    const parsed = parseDatetimeForDisplay(datetime);
    return parsed ? format(parsed, 'MMM d') : '';
  } catch {
    return '';
  }
}

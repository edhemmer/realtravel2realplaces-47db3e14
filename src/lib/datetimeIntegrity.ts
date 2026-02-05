/**
 * v2.0.6: Datetime Integrity Utilities
 * 
 * Strict rules for datetime handling:
 * - Never infer or guess times
 * - Display "Time not specified" when time is unknown
 * - Only create TripEvents when valid datetime exists
 */

import { format, parseISO } from 'date-fns';

 /**
  * v2.1.8: Unknown time placeholder constant
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
    const parsed = parseISO(datetime);
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

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
 * 
 * v2.2.4: hasExplicitTime now uses direct string digit extraction
 * instead of parseISO + getHours to avoid browser timezone shifts.
 */
// v3.11.2: Removed parseISO import — all logic uses string extraction

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
  
  // v2.2.4: Extract hours/minutes directly from the string digits.
  // NEVER use new Date() or parseISO() here — that applies the browser's
  // timezone offset and can turn a valid time (e.g., 05:00 UTC) into
  // midnight in UTC-5, incorrectly marking it as "no explicit time".
  const tIndex = datetime.indexOf('T');
  if (tIndex === -1) return false;
  
  const timePart = datetime.substring(tIndex + 1);
  const match = timePart.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return false;
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  
  // Midnight (00:00:00) is assumed to be a default, not an explicit time
  if (hours === 0 && minutes === 0 && seconds === 0) {
    return false;
  }
  
  return true;
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
  
  // v3.11.2: Pure string extraction — no parseISO, no Date objects
  const datePart = datetime.substring(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  
  if (hasExplicitTime(datetime)) {
    // Strip timezone suffix and return YYYY-MM-DDTHH:MM:SS format
    const tIndex = datetime.indexOf('T');
    if (tIndex !== -1) {
      const timePart = datetime.substring(tIndex + 1)
        .replace(/Z$/, '')
        .replace(/[+-]\d{2}:\d{2}$/, '')
        .replace(/[+-]\d{2}$/, '')
        .substring(0, 8);
      return `${datePart}T${timePart}`;
    }
    // Space-separated format
    const spaceMatch = datetime.match(/^\d{4}-\d{2}-\d{2}\s+(\d{2}:\d{2}(?::\d{2})?)/);
    if (spaceMatch) {
      const t = spaceMatch[1].length === 5 ? `${spaceMatch[1]}:00` : spaceMatch[1];
      return `${datePart}T${t}`;
    }
    return null;
  } else {
    // No explicit time - store as date-only
    return datePart;
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
export function parseDatetimeForDisplay(datetime: string | null | undefined): string | null {
  if (!datetime) return null;
  
  // v3.11.2: Return the normalized string — no Date object needed.
  // Callers that need formatted output should use canonicalTimePolicy or displayFormats.
  const datePart = datetime.substring(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  
  if (isDateOnly(datetime)) {
    return datetime;
  }
  
  // Return as normalized LocalDateTime string
  return normalizeDatetimeForStorage(datetime);
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
  
  try {
    // v2.2.4: Extract date directly from the string digits to avoid timezone shift.
    const datePart = datetime.substring(0, 10);
    const dateMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) return { date: '', time: null, hasTime: false };
    
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = parseInt(dateMatch[2], 10);
    const day = parseInt(dateMatch[3], 10);
    const dateStr = `${MONTHS[month - 1]} ${day}`;
    
    const explicitTime = hasExplicitTime(datetime);
    
    // Extract time directly from string digits
    let timeStr: string | null = null;
    if (explicitTime) {
      const tIndex = datetime.indexOf('T');
      if (tIndex !== -1) {
        const timeMatch = datetime.substring(tIndex + 1).match(/^(\d{2}):(\d{2})/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2];
          const period = hours >= 12 ? 'PM' : 'AM';
          const h12 = hours % 12 || 12;
          timeStr = `${h12}:${minutes} ${period}`;
        }
      }
    }
    
    return {
      date: dateStr,
      time: timeStr,
      hasTime: explicitTime
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
  
  // v2.2.4: Extract date directly from string digits — no Date() timezone shift.
  const datePart = datetime.substring(0, 10);
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  return `${MONTHS[month - 1]} ${day}`;
}

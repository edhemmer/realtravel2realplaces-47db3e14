/**
 * v2.6.3: Shared datetime parsing utilities for edge functions
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Pre-compiled regex patterns (cached at module load)
 * - Short-circuit evaluations for common cases
 * - Minimal object creation in hot paths
 * - Single-pass string operations where possible
 * 
 * INTEGRITY: These utilities preserve parsing output accuracy
 * while reducing redundant computation.
 */

// Pre-compiled regex patterns for performance (avoid repeated compilation)
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MIDNIGHT_TIME_REGEX = /^00:00(?::00)?/;
const ISO_DATE_SPLIT_CHAR = 'T';

/**
 * Check if a datetime string is date-only (YYYY-MM-DD format)
 * Uses pre-compiled regex for performance
 */
export function isDateOnly(dt: string): boolean {
  return DATE_ONLY_REGEX.test(dt);
}

/**
 * Fast check if a datetime string contains a 'T' separator
 * Inlined for performance in hot paths
 */
export function hasTimeSeparator(dt: string): boolean {
  return dt.includes(ISO_DATE_SPLIT_CHAR);
}

/**
 * Extract date portion from a datetime string
 * Optimized for minimal allocations
 */
export function extractDatePortion(dt: string): string {
  // Short-circuit: already date-only
  if (dt.length === 10 && DATE_ONLY_REGEX.test(dt)) {
    return dt;
  }
  
  // Find T separator (faster than split for single extraction)
  const tIndex = dt.indexOf(ISO_DATE_SPLIT_CHAR);
  if (tIndex === 10) {
    return dt.substring(0, 10);
  }
  
  // Fallback for non-standard formats
  return dt.substring(0, 10);
}

/**
 * Check if time portion indicates midnight (likely defaulted, not explicit)
 */
export function isMidnightTime(timePart: string): boolean {
  return MIDNIGHT_TIME_REGEX.test(timePart);
}

/**
 * v2.6.3: Optimized datetime normalization for edge function post-processing
 * 
 * PERFORMANCE: 
 * - Short-circuits for null/empty and date-only strings
 * - Avoids Date object creation when possible
 * - Uses pre-compiled regex
 * 
 * LOGIC: Identical to previous implementation
 * - Date-only strings pass through unchanged
 * - Datetimes with midnight times become date-only (prevents false times)
 * - Datetimes with explicit times are normalized to ISO format
 * 
 * @param dt - Raw datetime string from AI parser
 * @returns Normalized datetime string or null
 */
export function normalizeDatetime(dt: string | null | undefined): string | null {
  // Fast path: null/undefined
  if (!dt) return null;
  
  // Fast path: empty or whitespace-only
  if (!dt.trim()) return null;
  
  // Fast path: already date-only (YYYY-MM-DD)
  if (dt.length === 10 && DATE_ONLY_REGEX.test(dt)) {
    return dt;
  }
  
  // Check for T separator to determine if datetime or date
  const tIndex = dt.indexOf(ISO_DATE_SPLIT_CHAR);
  
  // No T separator - might be date-only with different length
  if (tIndex === -1) {
    // Try to extract YYYY-MM-DD from start
    if (dt.length >= 10) {
      const datePart = dt.substring(0, 10);
      if (DATE_ONLY_REGEX.test(datePart)) {
        return datePart;
      }
    }
    // Invalid format
    return null;
  }
  
  // Has T separator - extract parts
  const datePart = dt.substring(0, tIndex);
  const timePart = dt.substring(tIndex + 1);
  
  // Validate date part
  if (!DATE_ONLY_REGEX.test(datePart)) {
    return null;
  }
  
  // Check if time is midnight (likely defaulted)
  if (isMidnightTime(timePart)) {
    return datePart; // Store as date-only
  }
  
  // Has explicit non-midnight time - validate and normalize
  try {
    const parsed = new Date(dt);
    if (isNaN(parsed.getTime())) return null;
    
    const hours = parsed.getHours();
    const minutes = parsed.getMinutes();
    const seconds = parsed.getSeconds();
    
    // Double-check for midnight after parsing (handles timezone edge cases)
    if (hours === 0 && minutes === 0 && seconds === 0) {
      return datePart;
    }
    
    // Return full ISO datetime
    return parsed.toISOString();
  } catch {
    return null;
  }
}

/**
 * v2.6.3: Normalize receipt date (always date-only)
 * Optimized short-circuit path for common case
 */
export function normalizeReceiptDate(dt: string | null | undefined): string | null {
  if (!dt) return null;
  
  // Fast path: already date-only
  if (dt.length === 10 && DATE_ONLY_REGEX.test(dt)) {
    return dt;
  }
  
  // Extract date portion
  return extractDatePortion(dt);
}

/**
 * v2.6.3: Batch normalize booking datetimes
 * Processes array in single pass with minimal allocations
 */
export function normalizeBatchDatetimes<T extends Record<string, unknown>>(
  bookings: T[],
  dateFields: (keyof T)[]
): T[] {
  if (!bookings || bookings.length === 0) return bookings;
  
  return bookings.map(booking => {
    const normalized = { ...booking };
    for (const field of dateFields) {
      const value = booking[field];
      if (typeof value === 'string') {
        (normalized as Record<string, unknown>)[field as string] = normalizeDatetime(value);
      }
    }
    return normalized;
  });
}

/**
 * v2.6.3: Clean "null" strings to actual null values
 * Common post-processing step for AI responses
 */
export function cleanNullStrings(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value === "null" || value === "NULL") {
      obj[key] = null;
    }
  }
}

/**
 * v2.6.3: Validate booking has required service dates
 * Short-circuit evaluation for receipt-only detection
 */
export function hasServiceDates(booking: {
  start_datetime?: string | null;
  end_datetime?: string | null;
  booking_type?: string | null;
}): boolean {
  // Must have at least start_datetime
  if (!booking.start_datetime) return false;
  
  // For stays, must also have end_datetime
  if (booking.booking_type === 'stay' && !booking.end_datetime) {
    return false;
  }
  
  return true;
}

/**
 * v4.4.0: Shared datetime parsing utilities for edge functions
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Pre-compiled regex patterns (cached at module load)
 * - Short-circuit evaluations for common cases
 * - Minimal object creation in hot paths
 * - Single-pass string operations where possible
 * 
 * v4.4.0: RAW TIME PRESERVATION + NON-CRASHING MIXED FORMAT SUPPORT
 * - extractRawTimeToken(): captures verbatim time string from any datetime
 * - normalizeDatetime(): handles 24h variants (HH.mm, HHhmm) without throwing
 * - tryDeriveIsoTime(): best-effort derivation of HH:mm from mixed formats
 * 
 * INTEGRITY: These utilities preserve parsing output accuracy
 * while reducing redundant computation.
 */

// Pre-compiled regex patterns for performance (avoid repeated compilation)
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MIDNIGHT_TIME_REGEX = /^00:00(?::00)?/;
const ISO_DATE_SPLIT_CHAR = 'T';

// Time token patterns (for raw extraction)
const TIME_12H_RE = /(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
const TIME_24H_COLON_RE = /(\d{1,2}:\d{2})/;
const TIME_24H_DOT_RE = /(\d{1,2}\.\d{2})/;
const TIME_24H_H_RE = /(\d{1,2}[hH]\d{2})/;

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

// ============================================================================
// RAW TIME TOKEN EXTRACTION (v4.4.0)
// ============================================================================

/**
 * Extract the raw time token from a datetime string, exactly as it appears.
 * Does NOT normalize or convert — returns the verbatim time portion.
 * 
 * Supported inputs:
 * - ISO: "2026-02-11T06:00:00" → "06:00"
 * - 12h embedded: "Departs 6:00 AM" → "6:00 AM"
 * - 24h dot: "23.10" → "23.10"
 * - 24h h-sep: "23h10" → "23h10"
 * - Date-only: "2026-02-11" → null
 */
export function extractRawTimeToken(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;

  // ISO datetime: extract HH:mm from after T
  const tIndex = s.indexOf('T');
  if (tIndex === 10 && s.length > 11) {
    const timePart = s.substring(tIndex + 1);
    const match = timePart.match(/^(\d{2}:\d{2})/);
    if (match) {
      // v4.5.0: Do NOT suppress midnight — 00:00 IS a valid flight time.
      // The AI prompt now enforces date-only when no explicit time exists,
      // so if we have a T-separated datetime, the time was explicit.
      return match[1];
    }
  }

  // 12h pattern in free text
  const m12 = TIME_12H_RE.exec(s);
  if (m12) return m12[1].trim();

  // 24h colon
  const m24 = TIME_24H_COLON_RE.exec(s);
  if (m24 && !DATE_ONLY_REGEX.test(s)) return m24[1];

  // 24h dot
  const mDot = TIME_24H_DOT_RE.exec(s);
  if (mDot) return mDot[1];

  // 24h h-separator
  const mH = TIME_24H_H_RE.exec(s);
  if (mH) return mH[1];

  return null;
}

/**
 * v4.4.0: Try to derive a machine-usable HH:mm from a raw time token.
 * Returns null if derivation is not confident (unparseable, out of range).
 * 
 * NEVER throws. NEVER crashes.
 */
export function tryDeriveIsoTime(rawToken: string | null | undefined): string | null {
  if (!rawToken) return null;
  const s = rawToken.trim();
  if (!s) return null;

  // 12h: "6:00 AM", "11:10 PM"
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const m = parseInt(m12[2], 10);
    const period = m12[3].toUpperCase();
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // 24h colon: "23:10", "06:00"
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const m = parseInt(m24[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return null; // out of range (e.g., 25:99)
  }

  // 24h dot: "23.10"
  const mDot = s.match(/^(\d{1,2})\.(\d{2})$/);
  if (mDot) {
    const h = parseInt(mDot[1], 10);
    const m = parseInt(mDot[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return null;
  }

  // 24h h-separator: "23h10"
  const mH = s.match(/^(\d{1,2})[hH](\d{2})$/);
  if (mH) {
    const h = parseInt(mH[1], 10);
    const m = parseInt(mH[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return null;
  }

  return null;
}

/**
 * v4.4.0: Optimized datetime normalization for edge function post-processing
 * 
 * PERFORMANCE: 
 * - Short-circuits for null/empty and date-only strings
 * - Avoids Date object creation when possible
 * - Uses pre-compiled regex
 * 
 * NEVER THROWS. Invalid formats return null.
 * 
 * LOGIC:
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
  const trimmed = dt.trim();
  if (!trimmed) return null;
  
  // Fast path: already date-only (YYYY-MM-DD)
  if (trimmed.length === 10 && DATE_ONLY_REGEX.test(trimmed)) {
    return trimmed;
  }
  
  // Check for T separator to determine if datetime or date
  const tIndex = trimmed.indexOf(ISO_DATE_SPLIT_CHAR);
  
  // No T separator - might be date-only with different length
  if (tIndex === -1) {
    // Try to extract YYYY-MM-DD from start
    if (trimmed.length >= 10) {
      const datePart = trimmed.substring(0, 10);
      if (DATE_ONLY_REGEX.test(datePart)) {
        return datePart;
      }
    }
    // Invalid format — do NOT throw
    return null;
  }
  
  // Has T separator - extract parts
  const datePart = trimmed.substring(0, tIndex);
  const timePart = trimmed.substring(tIndex + 1);
  
  // Validate date part
  if (!DATE_ONLY_REGEX.test(datePart)) {
    return null;
  }
  
  // v4.5.0: Do NOT strip midnight times — the AI prompt now enforces
  // date-only format when no explicit time exists. If we receive a
  // T-separated datetime with 00:00, the time was explicitly extracted.
  
  // v2.2.4: Validate and normalize using string digits ONLY.
  // NEVER use new Date() here — that applies the Deno server's timezone,
  // which can shift times and incorrectly detect midnight.
  // The time digits from the parser represent local time at the event's location.
  
  // Strip any trailing timezone info (Z, +00:00) to keep it naive.
  const cleanTime = timePart.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '').substring(0, 8);
  
  // Validate the time portion has valid digits
  const timeMatch = cleanTime.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!timeMatch) {
    // v4.4.0: Instead of returning null (which would lose the date),
    // return date-only so downstream can still use the date portion
    return datePart;
  }

  // Validate ranges
  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  if (hours > 23 || minutes > 59) {
    return datePart; // Invalid time, preserve date
  }
  
  return `${datePart}T${cleanTime}`;
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

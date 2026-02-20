/**
 * v3.9.60: Date Format Recognition for Import Ordering
 *
 * Recognizes common date formats from airline/hotel confirmations
 * and converts them to a ParsedDate for INTERNAL ORDERING ONLY.
 *
 * RULES:
 * - NO timezone math, NO locale formatting
 * - parsedDateToOrderingDate uses Date.UTC so environment TZ doesn't shift
 * - The ordering Date is NEVER used for display — raw strings are preserved
 * - If format is unrecognized → return null (never crash)
 *
 * v3.9.60: EU CARRIER DATE HARDENING
 * - Full weekday prefix stripping (Mon, Monday, Thu, Thursday, etc.)
 * - Trailing timezone annotations stripped (CET, CEST, UTC, GMT, +01:00, etc.)
 * - Parenthesized annotations stripped ((local time), etc.)
 * - Full month name support (March, September, etc.)
 * - Day/month/year numeric with optional seconds (11/03/2026 06:10:30)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedDate {
  year: number;
  month: number;  // 1-12
  day: number;    // 1-31
  hour: number;   // 0-23
  minute: number; // 0-59
}

// ============================================================================
// MONTH LOOKUP
// ============================================================================

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

// ============================================================================
// PREPROCESSING (v3.9.60)
// ============================================================================

/**
 * Strip leading weekday tokens: "Mon, ", "Monday, ", "Thu ", "Thursday, " etc.
 * Handles both abbreviated and full weekday names with optional comma.
 */
const WEEKDAY_PREFIX_RE = /^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun),?\s+/i;

/**
 * Strip trailing timezone abbreviations and offset annotations:
 * CET, CEST, UTC, GMT, EST, PST, +01:00, +0100, -05:00, (local time), etc.
 */
/**
 * Strip trailing timezone abbreviations (3+ uppercase letters to avoid stripping AM/PM).
 * Also strip offset annotations like +01:00, +0100.
 */
const TRAILING_TZ_RE = /\s+(?:[A-Z]{3,5}|[+-]\d{2}:?\d{2})$/;
const TRAILING_PAREN_RE = /\s*\([^)]*\)\s*$/;
const ISO_OFFSET_RE = /[+-]\d{2}:?\d{2}$/;

/**
 * Preprocess a raw datetime string before pattern matching.
 * Strips weekday prefixes, timezone suffixes, and parenthesized annotations.
 */
function preprocess(raw: string): string {
  let s = raw.trim();

  // Strip leading weekday
  s = s.replace(WEEKDAY_PREFIX_RE, '');

  // Strip trailing parenthesized annotation (e.g. "(local time)")
  s = s.replace(TRAILING_PAREN_RE, '');

  // Strip trailing timezone offset from ISO strings (+01:00)
  s = s.replace(ISO_OFFSET_RE, '');

  // Strip trailing timezone abbreviation (CET, CEST, UTC, etc.)
  s = s.replace(TRAILING_TZ_RE, '');

  // Strip trailing comma if leftover
  s = s.replace(/,\s*$/, '');

  return s.trim();
}

// ============================================================================
// FORMAT RECOGNITION
// ============================================================================

/**
 * Recognize a date format from a raw string and extract components.
 *
 * Supported formats (after preprocessing):
 * - "2026-03-26T12:45" or "2026-03-26T12:45:00"  (ISO)
 * - "2026-03-26"                                  (ISO date only)
 * - "26 Mar 2026 12:45"                           (day-first named month)
 * - "26 March 2026 12:45"                         (day-first full month)
 * - "March 26, 2026 12:45 PM"                     (US named month)
 * - "03/26/2026 12:45 PM"                         (US numeric)
 * - "26/03/2026 12:45"                            (day-first numeric)
 * - "11/03/2026 06:10:30"                         (day-first numeric with seconds)
 * - "03-26-2026 12:45"                            (US dashes)
 *
 * With optional prefixes/suffixes (stripped in preprocessing):
 * - "Thu, 11 Mar 2026 06:10 CET"
 * - "Monday, 24 March 2026, 21:45 CEST"
 * - "11/03/2026 06:10 (local time)"
 * - "2026-03-11T06:10+01:00"
 *
 * Returns null if no pattern matches.
 */
export function recognizeDateFormat(raw: string | undefined | null): ParsedDate | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;

  // v3.9.60: Preprocess to strip weekday, TZ, annotations
  const cleaned = preprocess(s);

  let parsed: ParsedDate | null = null;

  // 1. ISO: "2026-03-26T12:45:00" or "2026-03-26T12:45" or "2026-03-26"
  parsed = tryISO(cleaned);
  if (parsed) return parsed;

  // 2. Named month day-first: "26 Mar 2026 12:45" / "26th March 2026 14:30" / "26 March 2026"
  parsed = tryNamedDMY(cleaned);
  if (parsed) return parsed;

  // 3. Named month US: "March 26, 2026 12:45 PM" / "Mar 26 2026"
  parsed = tryNamedMDY(cleaned);
  if (parsed) return parsed;

  // 4. US numeric: "03/26/2026 12:45 PM" or "03-26-2026 12:45"
  parsed = tryNumericMDY(cleaned);
  if (parsed) return parsed;

  // 5. Day-first numeric: "26/03/2026 12:45" or "11/03/2026 06:10:30"
  // Heuristic: if first number > 12, it's day-first
  parsed = tryNumericDMY(cleaned);
  if (parsed) return parsed;

  return null;
}

/**
 * Convert a ParsedDate to a Date object for ORDERING ONLY.
 * Uses Date.UTC to prevent environment timezone shifts.
 */
export function parsedDateToOrderingDate(p: ParsedDate): Date {
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0));
}

/**
 * Convenience: raw string → ordering Date (or null).
 * Calls recognizeDateFormat + parsedDateToOrderingDate.
 */
export function toOrderingDate(raw: string | undefined | null): Date | null {
  const parsed = recognizeDateFormat(raw);
  if (!parsed) return null;
  return parsedDateToOrderingDate(parsed);
}

// ============================================================================
// INTERNAL PARSERS
// ============================================================================

function tryISO(s: string): ParsedDate | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return {
    year: parseInt(m[1], 10),
    month: parseInt(m[2], 10),
    day: parseInt(m[3], 10),
    hour: m[4] ? parseInt(m[4], 10) : 0,
    minute: m[5] ? parseInt(m[5], 10) : 0,
  };
}

function tryNamedDMY(s: string): ParsedDate | null {
  // "26 Mar 2026 12:45" / "26th March 2026 14:30" / "26 March 2026"
  const m = s.match(
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (!m) return null;
  const monthNum = MONTH_MAP[m[2].toLowerCase()];
  if (!monthNum) return null;
  const { hour, minute } = extractTime(s, m[4], m[5]);
  return {
    year: parseInt(m[3], 10),
    month: monthNum,
    day: parseInt(m[1], 10),
    hour,
    minute,
  };
}

function tryNamedMDY(s: string): ParsedDate | null {
  // "March 26, 2026 12:45 PM" / "Mar 26 2026" / "March 26th, 2026"
  const m = s.match(
    /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (!m) return null;
  const monthNum = MONTH_MAP[m[1].toLowerCase()];
  if (!monthNum) return null;
  const { hour, minute } = extractTime(s, m[4], m[5]);
  return {
    year: parseInt(m[3], 10),
    month: monthNum,
    day: parseInt(m[2], 10),
    hour,
    minute,
  };
}

function tryNumericMDY(s: string): ParsedDate | null {
  // "03/26/2026 12:45 PM" or "03-26-2026 12:45"
  const m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  // If first number <= 12, treat as month (US convention)
  if (a > 12) return null; // Not US format — fall through to DMY
  const { hour, minute } = extractTime(s, m[4], m[5]);
  return {
    year: parseInt(m[3], 10),
    month: a,
    day: b,
    hour,
    minute,
  };
}

function tryNumericDMY(s: string): ParsedDate | null {
  // "26/03/2026 12:45" or "11/03/2026 06:10:30" — only if first number > 12
  const m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  if (a <= 12) return null; // Ambiguous, handled by MDY
  const { hour, minute } = extractTime(s, m[4], m[5]);
  return {
    year: parseInt(m[3], 10),
    month: b,
    day: a,
    hour,
    minute,
  };
}

/**
 * Extract hour/minute from matched groups + handle AM/PM suffix.
 */
function extractTime(
  fullString: string,
  hourStr: string | undefined,
  minuteStr: string | undefined,
): { hour: number; minute: number } {
  if (!hourStr || !minuteStr) return { hour: 0, minute: 0 };
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  // Check for AM/PM
  const pmMatch = fullString.match(/(\d{1,2}:\d{2})\s*(AM|PM)/i);
  if (pmMatch) {
    const period = pmMatch[2].toUpperCase();
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
  }

  return { hour, minute };
}

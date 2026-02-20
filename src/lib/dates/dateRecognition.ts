/**
 * v4.1.0: Date Format Recognition for Import Ordering
 *
 * Recognizes common date formats from airline/hotel confirmations
 * and converts them to a ParsedDate for INTERNAL ORDERING ONLY.
 *
 * RULES:
 * - NO timezone math, NO locale formatting
 * - parsedDateToOrderingDate uses Date.UTC so environment TZ doesn't shift
 * - The ordering Date is NEVER used for display — raw strings are preserved
 * - If format is unrecognized → return null (never crash)
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
// FORMAT RECOGNITION
// ============================================================================

/**
 * Recognize a date format from a raw string and extract components.
 *
 * Supported formats:
 * - "2026-03-26T12:45" or "2026-03-26T12:45:00"  (ISO)
 * - "2026-03-26"                                  (ISO date only)
 * - "26 Mar 2026 12:45"                           (day-first named month)
 * - "March 26, 2026 12:45 PM"                     (US named month)
 * - "03/26/2026 12:45 PM"                         (US numeric)
 * - "26/03/2026 12:45"                            (day-first numeric)
 * - "03-26-2026 12:45"                            (US dashes)
 *
 * Returns null if no pattern matches.
 */
export function recognizeDateFormat(raw: string | undefined | null): ParsedDate | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;

  // Strip leading day-of-week (Mon, Tue, Wed, etc.)
  const stripped = s.replace(/^[A-Za-z]{2,3},?\s+/, '');

  let parsed: ParsedDate | null = null;

  // 1. ISO: "2026-03-26T12:45:00" or "2026-03-26T12:45" or "2026-03-26"
  parsed = tryISO(stripped);
  if (parsed) return parsed;

  // 2. Named month day-first: "26 Mar 2026 12:45" / "26th March 2026"
  parsed = tryNamedDMY(stripped);
  if (parsed) return parsed;

  // 3. Named month US: "March 26, 2026 12:45 PM" / "Mar 26 2026"
  parsed = tryNamedMDY(stripped);
  if (parsed) return parsed;

  // 4. US numeric: "03/26/2026 12:45 PM" or "03-26-2026 12:45"
  parsed = tryNumericMDY(stripped);
  if (parsed) return parsed;

  // 5. Day-first numeric: "26/03/2026 12:45"
  // Heuristic: if first number > 12, it's day-first
  parsed = tryNumericDMY(stripped);
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
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/
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
    /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/
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
  const m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
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
  // "26/03/2026 12:45" — only if first number > 12
  const m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
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

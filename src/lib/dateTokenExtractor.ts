/**
 * v3.9.37: Deterministic Date Token Extractor
 *
 * Extracts YYYY-MM-DD date tokens from various airline/booking date formats.
 * No JS Date construction from local strings. No timezone conversion.
 * Pure string parsing only.
 *
 * Supported formats:
 * - ISO-like: 2026-03-11, 2026-03-11T10:30:00
 * - US numeric: 03/11/2026, 03-11-2026
 * - Named month: March 20, 2026 / March 20th, 2026 / 20 March 2026 / 20 Mar 2026
 * - Day-prefixed: Wed 11 Mar 2026, Thu, March 11 2026
 */

// ============================================================================
// MONTH LOOKUP
// ============================================================================

const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// ============================================================================
// CORE EXTRACTOR
// ============================================================================

/**
 * Extract a YYYY-MM-DD date token from a raw date/datetime string.
 *
 * Rules:
 * - No JS Date instantiation from user strings
 * - No timezone conversion
 * - Returns null if no recognizable date pattern found
 * - For ambiguous numeric dates (e.g., 03/11/2026), defaults to MM/DD/YYYY (US)
 */
export function toDateTokenFromString(s: string | null | undefined): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;

  // 1. ISO-like: YYYY-MM-DD (with optional time suffix)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // 2. Named month patterns (case-insensitive)
  // "March 20, 2026" / "March 20th, 2026" / "Mar 20, 2026"
  const namedMDY = trimmed.match(
    /\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/
  );
  if (namedMDY) {
    const monthStr = namedMDY[1].toLowerCase();
    const mm = MONTH_MAP[monthStr];
    if (mm) {
      const day = parseInt(namedMDY[2], 10);
      return `${namedMDY[3]}-${mm}-${pad2(day)}`;
    }
  }

  // "20 March 2026" / "20 Mar 2026" / "20th March 2026"
  const namedDMY = trimmed.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})\b/
  );
  if (namedDMY) {
    const monthStr = namedDMY[2].toLowerCase();
    const mm = MONTH_MAP[monthStr];
    if (mm) {
      const day = parseInt(namedDMY[1], 10);
      return `${namedDMY[3]}-${mm}-${pad2(day)}`;
    }
  }

  // "Wed 11 Mar 2026" / "Thu, March 11 2026" (day-of-week prefix)
  const dayPrefixed = trimmed.match(
    /^[A-Za-z]{2,3},?\s+(.+)$/
  );
  if (dayPrefixed) {
    const rest = dayPrefixed[1].trim();
    const recursive = toDateTokenFromString(rest);
    if (recursive) return recursive;
  }

  // 3. Numeric: MM/DD/YYYY or MM-DD-YYYY (US default)
  const numericSlash = trimmed.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  if (numericSlash) {
    const a = parseInt(numericSlash[1], 10);
    const b = parseInt(numericSlash[2], 10);
    const year = numericSlash[3];
    // Default: MM/DD/YYYY (US)
    return `${year}-${pad2(a)}-${pad2(b)}`;
  }

  // 4. Numeric: DD/MM/YYYY won't be distinguished without context
  //    (handled by the US default above per spec)

  return null;
}

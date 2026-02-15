/**
 * v3.8.5: Deterministic Date/Time Extraction
 * 
 * Regex-based extraction of dates and times from free text.
 * No AI, no guessing. Only explicit patterns are matched.
 */

// ============================================================================
// DATE PATTERNS
// ============================================================================

const MONTH_NAMES: Record<string, string> = {
  january: '01', jan: '01',
  february: '02', feb: '02',
  march: '03', mar: '03',
  april: '04', apr: '04',
  may: '05',
  june: '06', jun: '06',
  july: '07', jul: '07',
  august: '08', aug: '08',
  september: '09', sep: '09', sept: '09',
  october: '10', oct: '10',
  november: '11', nov: '11',
  december: '12', dec: '12',
};

/**
 * Extract the first date found in text, returning YYYY-MM-DD or null.
 * Supports:
 * - YYYY-MM-DD
 * - MM/DD/YYYY, MM/DD/YY, MM-DD-YYYY
 * - Month DD, YYYY (e.g., "February 15, 2024")
 * - DD Month YYYY (e.g., "15 February 2024")
 */
export function extractDate(text: string): string | null {
  if (!text) return null;

  // ISO format: YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return formatDate(y, m, d);
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const slashMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (slashMatch) {
    let [, m, d, y] = slashMatch;
    if (y.length === 2) y = `20${y}`;
    return formatDate(y, m, d);
  }

  // Month DD, YYYY (e.g., "Feb 15, 2024" or "February 15 2024")
  const monthNameFirst = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})[\s,]+(\d{4})\b/i
  );
  if (monthNameFirst) {
    const [, monthName, d, y] = monthNameFirst;
    const m = MONTH_NAMES[monthName.toLowerCase()];
    if (m) return formatDate(y, m, d);
  }

  // DD Month YYYY (e.g., "15 February 2024")
  const dayFirst = text.match(
    /\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{4})\b/i
  );
  if (dayFirst) {
    const [, d, monthName, y] = dayFirst;
    const m = MONTH_NAMES[monthName.toLowerCase()];
    if (m) return formatDate(y, m, d);
  }

  return null;
}

/**
 * Extract the first time found in text, returning HH:mm (24h) or null.
 * Supports:
 * - h:mm AM/PM, hh:mm AM/PM
 * - HH:mm (24h)
 */
export function extractTime(text: string): string | null {
  if (!text) return null;

  // 12h format: 9:30 AM, 12:00 PM, etc.
  const ampmMatch = text.match(/\b(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)\b/i);
  if (ampmMatch) {
    let [, h, min, period] = ampmMatch;
    let hour = parseInt(h, 10);
    const isPM = period.toLowerCase().startsWith('p');
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${min}`;
  }

  // 24h format: 14:30, 09:00
  const h24Match = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (h24Match) {
    const [, h, min] = h24Match;
    return `${h.padStart(2, '0')}:${min}`;
  }

  return null;
}

// ============================================================================
// INTERNAL
// ============================================================================

function formatDate(y: string, m: string, d: string): string | null {
  const year = parseInt(y, 10);
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2099) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

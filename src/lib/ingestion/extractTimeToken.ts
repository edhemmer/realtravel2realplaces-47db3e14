/**
 * v3.9.33: Airline-Agnostic Time Token Extraction
 *
 * Returns the raw time substring if a clear time is present, else null.
 * No Date parsing; string in, string out.
 *
 * Supports:
 * - 12-hour: "11:10 PM", "6:00 AM", "3:30 a.m."
 * - 24-hour: "23:05", "06:45", "14:30"
 *
 * Used by display components to render verbatim airline times.
 * MUST NOT reformat, convert, or apply any math.
 */

// 12-hour with AM/PM (e.g., "11:10 PM", "6:00 AM", "3:30 a.m.")
const TWELVE_HR_RE = /\b(0?[1-9]|1[0-2]):[0-5][0-9]\s?(?:AM|PM|a\.m\.|p\.m\.)\b/i;

// 24-hour HH:MM, 00–23 (e.g., "23:05", "06:45")
const TWENTY_FOUR_HR_RE = /\b([01][0-9]|2[0-3]):[0-5][0-9]\b/;

/**
 * Extract the first time token from a line of text.
 * Returns the raw substring exactly as found, or null.
 *
 * No Date parsing. No conversion. String only.
 */
export function extractTimeToken(line: string): string | null {
  if (!line) return null;

  // 12-hour match first (more specific due to AM/PM suffix)
  const m12 = line.match(TWELVE_HR_RE);
  if (m12) return m12[0];

  // 24-hour match
  const m24 = line.match(TWENTY_FOUR_HR_RE);
  if (m24) return m24[0];

  return null;
}

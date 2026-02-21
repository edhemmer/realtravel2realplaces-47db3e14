/**
 * v3.9.42: Canonical Flight Time Display Helper
 *
 * SINGLE SOURCE OF TRUTH for rendering flight departure/arrival times.
 *
 * RAW STRING ENFORCEMENT CONTRACT:
 * - When rawTime is provided and non-empty, it is returned EXACTLY as-is.
 *   No Date() construction, no formatting, no 12h↔24h conversion,
 *   no timezone logic, no locale logic.
 * - rawTime is "trusted display text" originating from confirmation parsing.
 * - Only when rawTime is absent does the fallback extract HH:mm digits
 *   from an ISO datetime string.
 * - Midnight (00:00) IS a valid flight time and is NOT suppressed.
 *
 * Accepts either:
 * - A raw time string (HH:mm, "11:10 PM", "23:05") from canonical fields
 * - An ISO datetime string (YYYY-MM-DDTHH:mm:ss) from DB booking fields
 *
 * When given an ISO string, extracts the HH:mm digits and returns them.
 */

const FALLBACK = '--:--';

/**
 * Extract a displayable time string from a raw time field or ISO datetime.
 *
 * Priority:
 * 1. If `rawTime` is provided and non-empty, return it verbatim.
 * 2. If `isoDatetime` is provided, extract HH:mm digits from the T portion.
 * 3. Otherwise return "--:--".
 *
 * This helper does NOT suppress midnight — flights can depart/arrive at 00:00.
 * This helper does NOT convert between 12h and 24h — it returns what it gets.
 */
export function getFlightTimeLabel(
  rawTime?: string | null,
  isoDatetime?: string | null
): string {
  // 1. Raw time string takes priority (from canonical departLocalTime / arriveLocalTime)
  if (rawTime && rawTime.trim().length > 0) {
    const trimmed = rawTime.trim();
    // If rawTime is actually a full datetime string (contains date), extract time portion
    const tIdx = trimmed.indexOf('T');
    if (tIdx !== -1 && tIdx > 4) {
      const afterT = trimmed.substring(tIdx + 1);
      const m = afterT.match(/^(\d{2}:\d{2})/);
      if (m) return m[1];
    }
    // Handle space-separated datetime: "2026-03-11 23:10:00+00"
    const spaceMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}\s+(\d{2}:\d{2})/);
    if (spaceMatch) return spaceMatch[1];
    return trimmed;
  }

  // 2. Extract from ISO or space-separated datetime string (from DB start_datetime / end_datetime)
  if (isoDatetime) {
    const dt = isoDatetime.trim();
    // T-separated: "2026-03-14T19:00:00"
    const tIndex = dt.indexOf('T');
    if (tIndex !== -1) {
      const timePart = dt.substring(tIndex + 1);
      const match = timePart.match(/^(\d{2}:\d{2})/);
      if (match) return match[1];
    }
    // Space-separated: "2026-03-14 19:00:00+00"
    const spaceMatch = dt.match(/^\d{4}-\d{2}-\d{2}\s+(\d{2}:\d{2})/);
    if (spaceMatch) return spaceMatch[1];
  }

  return FALLBACK;
}

/**
 * Convenience: get departure time label for a flight.
 *
 * @param rawDepartureTime - departLocalTime or dep_time_raw_string (HH:mm or "11:10 PM")
 * @param startDatetime - ISO start_datetime from DB booking row
 */
export function getDepartureTimeLabel(
  rawDepartureTime?: string | null,
  startDatetime?: string | null
): string {
  return getFlightTimeLabel(rawDepartureTime, startDatetime);
}

/**
 * Convenience: get arrival time label for a flight.
 *
 * @param rawArrivalTime - arriveLocalTime or arr_time_raw_string (HH:mm or "11:10 PM")
 * @param endDatetime - ISO end_datetime from DB booking row
 */
export function getArrivalTimeLabel(
  rawArrivalTime?: string | null,
  endDatetime?: string | null
): string {
  return getFlightTimeLabel(rawArrivalTime, endDatetime);
}

/**
 * Check if a flight time is available (not the fallback placeholder).
 * Use this for styling decisions (e.g., red text for missing times).
 */
export function hasFlightTime(
  rawTime?: string | null,
  isoDatetime?: string | null
): boolean {
  return getFlightTimeLabel(rawTime, isoDatetime) !== FALLBACK;
}

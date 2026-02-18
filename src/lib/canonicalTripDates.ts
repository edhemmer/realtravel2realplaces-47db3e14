/**
 * v3.9.34: Canonical Trip Date Range Derivation
 *
 * THE single source of truth for computing a trip's start/end date range
 * from any set of parsed bookings. All ingestion paths (Email Import,
 * Bookings upload, wizard auto-fill, backend defaults) MUST call
 * deriveTripDateRange() rather than implementing local date logic.
 *
 * RULES:
 * - No timezone math. No JS Date construction from local strings.
 * - Compare date tokens (YYYY-MM-DD strings) deterministically.
 * - Flights: earliest departure token → latest arrival token (fallback to departure).
 * - Stays: check-in (start) → check-out (end).
 * - All other types: start_datetime → end_datetime tokens.
 * - Single dated item: start = end = that item's date.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DateRangeBooking {
  booking_type: string;
  start_datetime?: string | null;
  end_datetime?: string | null;
}

export interface TripDateRange {
  /** Earliest date token (YYYY-MM-DD) across all items, or null */
  startDate: string | null;
  /** Latest date token (YYYY-MM-DD) across all items, or null */
  endDate: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract YYYY-MM-DD date portion from a datetime string.
 * Works with ISO, "YYYY-MM-DD", "YYYY-MM-DDTHH:mm", etc.
 * Returns null if not extractable.
 */
export function extractDateToken(dt: string | null | undefined): string | null {
  if (!dt) return null;
  const trimmed = dt.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

// ============================================================================
// CORE
// ============================================================================

/**
 * Derive the trip date range from a set of bookings.
 *
 * @param bookings - Any array of objects with booking_type, start_datetime, end_datetime
 * @returns { startDate, endDate } as YYYY-MM-DD strings (or null if no dates found)
 */
export function deriveTripDateRange(bookings: DateRangeBooking[]): TripDateRange {
  let earliest: string | null = null;
  let latest: string | null = null;

  for (const b of bookings) {
    const startToken = extractDateToken(b.start_datetime);
    const endToken = extractDateToken(b.end_datetime);

    // Start candidates
    if (startToken) {
      if (!earliest || startToken < earliest) earliest = startToken;
      if (!latest || startToken > latest) latest = startToken;
    }

    // End candidates
    if (endToken) {
      if (!latest || endToken > latest) latest = endToken;
      // Also consider end as potential earliest (e.g., stay with only end_datetime)
      if (!earliest || endToken < earliest) {
        // Only use end as earliest if no start is available for this item
        if (!startToken) earliest = endToken;
      }
    }
  }

  return { startDate: earliest, endDate: latest };
}

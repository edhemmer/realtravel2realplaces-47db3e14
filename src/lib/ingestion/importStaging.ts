/**
 * v3.9.40: Canonical Import Staging + Immutable Snapshot
 *
 * Temporary holding area produced immediately after parsing and before
 * trip creation.  This is the SINGLE source for trip-creation inputs
 * (dates, destination, name) during any import flow.
 *
 * v3.9.40 adds StagingSnapshot — an immutable object frozen at Continue
 * time that locks the exact set of items + derived range used for create.
 *
 * RULES:
 * - No timezone math.  No JS Date from local-time strings.
 * - Date tokens are YYYY-MM-DD strings compared lexicographically.
 * - Trip frame derived deterministically: earliest token → latest token.
 * - parsedItems are passed through unchanged to timeline writes.
 */

import { extractDateToken, deriveTripDateRange, type TripDateRange } from '@/lib/canonicalTripDates';
import { toDateTokenFromString } from '@/lib/dateTokenExtractor';
import { buildSuggestedTripMeta, type SuggestedTripMeta } from '@/lib/suggestedTripMeta';

// ============================================================================
// TYPES
// ============================================================================

export interface TripFrame {
  /** Earliest date token (YYYY-MM-DD) across all items, or null */
  startDate: string | null;
  /** Latest date token (YYYY-MM-DD) across all items, or null */
  endDate: string | null;
}

export interface ParsedImportStaging {
  /** Unique session identifier */
  sessionId: string;
  /** All parsed items (flights, stays, cars, etc.) — preserved as-is */
  parsedItems: Array<Record<string, unknown>>;
  /** Extracted date-only tokens from all parsedItems */
  dateTokens: string[];
  /** Trip frame derived from dateTokens (earliest + latest) */
  tripFrame: TripFrame;
  /** Suggested trip metadata (name, destination, etc.) */
  meta: SuggestedTripMeta;
}

/**
 * v3.9.40: Immutable snapshot frozen at Continue time.
 * This is the ONLY object used for trip creation — no re-derivation.
 */
export interface StagingSnapshot {
  /** The parsed items that will be written to timeline (frozen copy) */
  canonicalItems: Array<Record<string, unknown>>;
  /** Date tokens extracted from canonicalItems */
  dateTokens: string[];
  /** Trip frame derived from dateTokens (start = min, end = max) */
  derivedTripRange: TripFrame;
  /** Suggested trip metadata */
  meta: SuggestedTripMeta;
  /** Dev-only leg token audit entries */
  legTokenAudit: LegTokenAuditEntry[];
}

/** v3.9.40: Dev-only per-leg token audit */
export interface LegTokenAuditEntry {
  airline: string | null;
  from: string | null;
  to: string | null;
  rawDeparture: string | null;
  rawArrival: string | null;
  departureDateToken: string | null;
  arrivalDateToken: string | null;
}

// ============================================================================
// DATE TOKEN EXTRACTION
// ============================================================================

/**
 * Extract all date-only tokens (YYYY-MM-DD) from parsed booking items.
 *
 * Rules per booking_type:
 * - flight: departure + arrival date tokens (fallback arrival → departure)
 * - stay:   start (check-in) + end (check-out) date tokens
 * - car_rental / transport / activity / other: start + end date tokens
 *
 * Ignores times entirely. Never constructs JS Date objects.
 */
export function extractDateTokensFromParsedItems(
  items: Array<Record<string, unknown>>,
): string[] {
  const tokens: string[] = [];

  for (const item of items) {
    // Try ISO extraction first, then broad format extraction as fallback
    const startToken = extractDateToken(item.start_datetime as string | null | undefined)
      || toDateTokenFromString(item.start_datetime as string | null | undefined);
    const endToken = extractDateToken(item.end_datetime as string | null | undefined)
      || toDateTokenFromString(item.end_datetime as string | null | undefined);

    if (startToken) tokens.push(startToken);

    if (endToken) {
      tokens.push(endToken);
    }
  }

  // Deduplicate and sort deterministically
  return [...new Set(tokens)].sort();
}

// ============================================================================
// TRIP FRAME DERIVATION
// ============================================================================

/**
 * Derive trip frame (start + end dates) from a set of date tokens.
 *
 * - startDate = lexicographically smallest token
 * - endDate   = lexicographically largest token
 *
 * Tokens MUST be YYYY-MM-DD format for correct lexicographic comparison.
 * This is guaranteed by extractDateToken().
 */
export function deriveTripFrameFromDateTokens(tokens: string[]): TripFrame {
  if (tokens.length === 0) return { startDate: null, endDate: null };

  const sorted = [...tokens].sort();
  return {
    startDate: sorted[0],
    endDate: sorted[sorted.length - 1],
  };
}

// ============================================================================
// LEG TOKEN AUDIT (v3.9.40)
// ============================================================================

/**
 * Build per-leg token audit for dev diagnostics.
 * Extracts airline, from/to, raw datetimes, and resolved tokens.
 */
function buildLegTokenAudit(items: Array<Record<string, unknown>>): LegTokenAuditEntry[] {
  return items
    .filter(item => (item.booking_type as string) === 'flight')
    .map(item => {
      const rawDep = (item.start_datetime as string | null) || null;
      const rawArr = (item.end_datetime as string | null) || null;
      const depToken = extractDateToken(rawDep) || toDateTokenFromString(rawDep);
      const arrToken = extractDateToken(rawArr) || toDateTokenFromString(rawArr) || depToken;
      return {
        airline: (item.airline as string | null) || (item.vendor_name as string | null) || null,
        from: (item.departure_airport_code as string | null) || (item.from_location as string | null) || null,
        to: (item.arrival_airport_code as string | null) || (item.to_location as string | null) || null,
        rawDeparture: rawDep,
        rawArrival: rawArr,
        departureDateToken: depToken,
        arrivalDateToken: arrToken,
      };
    });
}

// ============================================================================
// STAGING FACTORY
// ============================================================================

/**
 * Build a ParsedImportStaging object from a set of parsed items.
 *
 * This is the ONE call site that produces the staging object used
 * by the Create Trip wizard for all import-driven trip creation.
 *
 * @param parsedItems - Raw parsed booking objects from edge functions
 * @param travelMode  - Current wizard travel mode ('fly' | 'drive' | etc.)
 * @param sessionId   - Optional session ID (generated if not provided)
 */
export function buildImportStaging(
  parsedItems: Array<Record<string, unknown>>,
  travelMode: string,
  sessionId?: string,
): ParsedImportStaging {
  const id = sessionId || `staging_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 1. Extract date tokens
  const dateTokens = extractDateTokensFromParsedItems(parsedItems);

  // 2. Derive trip frame from tokens
  const tripFrame = deriveTripFrameFromDateTokens(dateTokens);

  // 3. Build suggested meta (name, destination, etc.)
  const metaBookings = parsedItems.map(item => ({
    booking_type: (item.booking_type as string) || 'other',
    start_datetime: (item.start_datetime as string) || '',
    end_datetime: item.end_datetime as string | undefined,
    departure_airport_code: item.departure_airport_code as string | null | undefined,
    arrival_airport_code: item.arrival_airport_code as string | null | undefined,
    departure_airport_name: item.departure_airport_name as string | null | undefined,
    arrival_airport_name: item.arrival_airport_name as string | null | undefined,
    vendor_name: item.vendor_name as string | undefined,
    from_location: item.from_location as string | null | undefined,
    to_location: item.to_location as string | null | undefined,
    property_name: item.property_name as string | null | undefined,
    address: item.address as string | null | undefined,
  }));

  const meta = buildSuggestedTripMeta(metaBookings, travelMode);

  // v3.9.37: Dev-only verification logs
  if (import.meta.env.DEV) {
    console.log('[IMPORT_STAGING] DATE_TOKENS_EXTRACTED', {
      count: dateTokens.length,
      uniqueTokens: dateTokens,
    });
    console.log('[IMPORT_STAGING] DERIVED_TRIP_RANGE', {
      start: tripFrame.startDate,
      end: tripFrame.endDate,
    });
  }

  return {
    sessionId: id,
    parsedItems,
    dateTokens,
    tripFrame,
    meta,
  };
}

// ============================================================================
// IMMUTABLE STAGING SNAPSHOT (v3.9.40)
// ============================================================================

/**
 * Build an immutable StagingSnapshot from the current merged bookings.
 * Called synchronously at Continue time — the returned object is the
 * ONLY source for trip creation dates and timeline items.
 *
 * @param allBookings - The fully merged canonical booking set for the session
 * @param travelMode  - Current wizard travel mode
 */
export function buildStagingSnapshot(
  allBookings: Array<Record<string, unknown>>,
  travelMode: string,
): StagingSnapshot {
  // Freeze a copy of the items so later mutations can't affect create
  const canonicalItems = allBookings.map(b => ({ ...b }));

  // Extract date tokens
  const dateTokens = extractDateTokensFromParsedItems(canonicalItems);

  // Derive trip range
  const derivedTripRange = deriveTripFrameFromDateTokens(dateTokens);

  // Build meta
  const metaBookings = canonicalItems.map(item => ({
    booking_type: (item.booking_type as string) || 'other',
    start_datetime: (item.start_datetime as string) || '',
    end_datetime: item.end_datetime as string | undefined,
    departure_airport_code: item.departure_airport_code as string | null | undefined,
    arrival_airport_code: item.arrival_airport_code as string | null | undefined,
    departure_airport_name: item.departure_airport_name as string | null | undefined,
    arrival_airport_name: item.arrival_airport_name as string | null | undefined,
    vendor_name: item.vendor_name as string | undefined,
    from_location: item.from_location as string | null | undefined,
    to_location: item.to_location as string | null | undefined,
    property_name: item.property_name as string | null | undefined,
    address: item.address as string | null | undefined,
  }));
  const meta = buildSuggestedTripMeta(metaBookings, travelMode);

  // Build leg token audit
  const legTokenAudit = buildLegTokenAudit(canonicalItems);

  // v3.9.40: Dev-only diagnostics at Continue time
  if (import.meta.env.DEV) {
    console.log('[STAGING_SNAPSHOT] LEG_TOKEN_AUDIT', legTokenAudit);
    console.log('[STAGING_SNAPSHOT] DATE_TOKENS_EXTRACTED', {
      count: dateTokens.length,
      uniqueTokens: dateTokens,
    });
    console.log('[STAGING_SNAPSHOT] DERIVED_TRIP_RANGE', {
      start: derivedTripRange.startDate,
      end: derivedTripRange.endDate,
    });
    // Flag legs with missing tokens
    const missingTokenLegs = legTokenAudit.filter(l => !l.departureDateToken);
    if (missingTokenLegs.length > 0) {
      console.warn('[STAGING_SNAPSHOT] LEGS_MISSING_TOKENS', missingTokenLegs);
    }
  }

  return {
    canonicalItems,
    dateTokens,
    derivedTripRange,
    meta,
    legTokenAudit,
  };
}

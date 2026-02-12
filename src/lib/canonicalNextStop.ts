/**
 * v2.3.1: Canonical Next Stop Engine
 *
 * Single canonical helper that determines currentStop, nextStop, and hasUpcoming
 * from the canonical timeline. Uses string-based datetime comparison only —
 * no Date(), no parseISO(), no format(), no UTC conversion.
 *
 * INCLUDED EVENT TYPES:
 * - flight (departure)
 * - hotel_checkin, hotel_checkout
 * - rental_pickup, rental_dropoff
 * - activity_start
 * - parking_start, parking_end
 * - transport_departure
 *
 * EXCLUDED:
 * - Events without a valid HH:MM local time
 * - Any derived UI-only constructs
 */

import type { CanonicalTripState, CanonicalTimelineEvent } from './canonicalTripState';

// ============================================================================
// TYPES
// ============================================================================

export interface NextStopEvent {
  /** Source event ID */
  id: string;
  /** Event type from canonical timeline */
  type: string;
  /** Human-readable label */
  displayName: string;
  /** YYYY-MM-DD */
  eventLocalDate: string;
  /** HH:MM */
  eventLocalTime: string;
  /** Address for maps, if available */
  address?: string;
  /** Airport code or location label */
  locationLabel?: string;
  /** Source record ID for drill-through */
  sourceId: string;
  /** Source type (booking | parking) */
  sourceType: 'booking' | 'parking';
}

export interface NextStopResult {
  currentStop: NextStopEvent | null;
  nextStop: NextStopEvent | null;
  hasUpcoming: boolean;
}

// ============================================================================
// LOCAL-NOW STRING HELPER
// ============================================================================

/**
 * Returns current local time as "YYYY-MM-DD HH:MM" string.
 * Called once per evaluation — never inside loops or per-component.
 */
export function getLocalNowString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

// ============================================================================
// EVENT EXTRACTION
// ============================================================================

/** Event types eligible for next-stop engine */
const ELIGIBLE_EVENT_TYPES = new Set([
  'flight',
  'flight_departure',
  'hotel_checkin',
  'hotel_checkout',
  'rental_pickup',
  'rental_dropoff',
  'activity_start',
  'parking_start',
  'parking_end',
  'transport_departure',
]);

/**
 * Extract local date (YYYY-MM-DD) from an eventLocalDateTime string.
 * Returns null if format is invalid.
 */
function extractLocalDate(eventLocalDateTime: string): string | null {
  const datePart = eventLocalDateTime.substring(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : null;
}

/**
 * Extract local time (HH:MM) from an eventLocalDateTime string.
 * Supports formats: "YYYY-MM-DD HH:MM", "YYYY-MM-DDTHH:MM:SS", etc.
 * Returns null if no valid time found.
 */
function extractLocalTime(eventLocalDateTime: string): string | null {
  // Try space-separated: "2026-02-11 06:00"
  const spaceMatch = eventLocalDateTime.match(/^\d{4}-\d{2}-\d{2}\s+(\d{2}:\d{2})/);
  if (spaceMatch) return spaceMatch[1];

  // Try T-separated: "2026-02-11T06:00:00"
  const tMatch = eventLocalDateTime.match(/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/);
  if (tMatch) return tMatch[1];

  return null;
}

/**
 * Build a normalised "YYYY-MM-DD HH:MM" string for sorting/comparison.
 */
function buildSortKey(date: string, time: string): string {
  return `${date} ${time}`;
}

/**
 * Derive a human-readable display name from a canonical timeline event.
 */
function deriveDisplayName(event: CanonicalTimelineEvent): string {
  // Use title if available
  if (event.title) return event.title;

  // Fallback based on event type
  switch (event.eventType) {
    case 'flight':
    case 'flight_departure': {
      const codes = [event.departureAirportCode, event.arrivalAirportCode].filter(Boolean).join(' → ');
      return codes || 'Flight';
    }
    case 'hotel_checkin': return `Check-in: ${event.subtitle || 'Hotel'}`;
    case 'hotel_checkout': return `Check-out: ${event.subtitle || 'Hotel'}`;
    case 'rental_pickup': return `Pickup: ${event.subtitle || 'Rental'}`;
    case 'rental_dropoff': return `Return: ${event.subtitle || 'Rental'}`;
    case 'activity_start': return event.subtitle || 'Activity';
    case 'parking_start': return `Parking Start: ${event.subtitle || ''}`;
    case 'parking_end': return `Parking End: ${event.subtitle || ''}`;
    case 'transport_departure': return `Depart: ${event.subtitle || 'Transport'}`;
    default: return event.subtitle || 'Event';
  }
}

/**
 * Derive a location label from an event (airport code or address snippet).
 */
function deriveLocationLabel(event: CanonicalTimelineEvent): string | undefined {
  if (event.departureAirportCode) return event.departureAirportCode;
  if (event.address) return event.address;
  if (event.subtitle) return event.subtitle;
  return undefined;
}

/**
 * Convert a CanonicalTimelineEvent to a NextStopEvent, if it qualifies.
 * Returns null if the event has no valid local date+time.
 */
function toNextStopEvent(event: CanonicalTimelineEvent): (NextStopEvent & { _sortKey: string }) | null {
  if (!ELIGIBLE_EVENT_TYPES.has(event.eventType)) return null;

  const raw = event.eventLocalDateTime;
  if (!raw) return null;

  const localDate = extractLocalDate(raw);
  const localTime = extractLocalTime(raw);

  // Exclude untimed events
  if (!localDate || !localTime) return null;

  return {
    id: event.id,
    type: event.eventType,
    displayName: deriveDisplayName(event),
    eventLocalDate: localDate,
    eventLocalTime: localTime,
    address: event.address,
    locationLabel: deriveLocationLabel(event),
    sourceId: event.sourceId,
    sourceType: event.sourceType,
    _sortKey: buildSortKey(localDate, localTime),
  };
}

// ============================================================================
// MAIN HELPER
// ============================================================================

/**
 * Determine currentStop, nextStop, and hasUpcoming from canonical trip state.
 *
 * All datetime comparisons are string-based on "YYYY-MM-DD HH:MM".
 * No Date(), parseISO(), or format() is used for logic.
 *
 * @param tripState - Canonical trip state (from getCanonicalTripState)
 * @param nowLocal  - Optional override for "now" string (for testing). Defaults to getLocalNowString().
 */
export function getNextStopFromCanonicalTimeline(
  tripState: CanonicalTripState | null,
  nowLocal?: string,
): NextStopResult {
  const EMPTY: NextStopResult = { currentStop: null, nextStop: null, hasUpcoming: false };

  if (!tripState || tripState.timelineEvents.length === 0) return EMPTY;

  const nowStr = nowLocal ?? getLocalNowString();

  // Build list of eligible, timed events
  const eligible: (NextStopEvent & { _sortKey: string })[] = [];

  for (const ev of tripState.timelineEvents) {
    const mapped = toNextStopEvent(ev);
    if (mapped) eligible.push(mapped);
  }

  if (eligible.length === 0) return EMPTY;

  // Sort ascending by local datetime string
  eligible.sort((a, b) => a._sortKey.localeCompare(b._sortKey));

  // Find currentStop (latest event <= now) and nextStop (earliest event > now)
  let currentStop: (NextStopEvent & { _sortKey: string }) | null = null;
  let nextStop: (NextStopEvent & { _sortKey: string }) | null = null;

  for (const ev of eligible) {
    if (ev._sortKey <= nowStr) {
      currentStop = ev;
    } else if (!nextStop) {
      nextStop = ev;
    }
  }

  // Strip internal _sortKey before returning
  const clean = (e: (NextStopEvent & { _sortKey: string }) | null): NextStopEvent | null => {
    if (!e) return null;
    const { _sortKey, ...rest } = e;
    return rest;
  };

  return {
    currentStop: clean(currentStop),
    nextStop: clean(nextStop),
    hasUpcoming: nextStop !== null,
  };
}

/**
 * v2.6.19: Today Action Items Selector
 *
 * Derives today-relevant actionable items from canonical timeline events.
 * Used exclusively by the mobile NOW execution engine.
 *
 * RULES:
 * - Include items occurring today that require user action
 *   (check-in, checkout, depart, pickup, drop-off, activity start, engagement start)
 * - Exclude passive mid-stay overnight days (no check-in/checkout action)
 * - Exclude past items for today (time already passed) unless untimed
 * - Untimed events: include if inherently actionable on their date (e.g., check-in day)
 * - Do not guess missing times
 *
 * SORT ORDER:
 * - Timed items first, ascending by time
 * - Then untimed (all-day) actionable items
 * - Ties broken by stable type priority
 */

import type { CanonicalTimelineEvent } from './canonicalTripState';
import { getLocalNowString } from './canonicalNextStop';

// Actionable event types — excludes passive arrivals and mid-stay days
const ACTIONABLE_EVENT_TYPES = new Set([
  'flight',
  'flight_departure',
  'hotel_checkin',
  'hotel_checkout',
  'rental_pickup',
  'rental_dropoff',
  'activity_start',
  'transport_departure',
  'engagement_start',
  'parking_end', // parking expiration is actionable (move car)
]);

// Stable type priority for tie-breaking (lower = higher priority)
const TYPE_PRIORITY: Record<string, number> = {
  flight: 0,
  flight_departure: 0,
  rental_pickup: 1,
  rental_dropoff: 1,
  hotel_checkout: 2,
  hotel_checkin: 2,
  transport_departure: 3,
  activity_start: 4,
  engagement_start: 5,
  parking_end: 6,
};

export interface TodayActionItem {
  id: string;
  sourceId: string;
  sourceType: 'booking' | 'parking' | 'engagement';
  eventType: string;
  bookingType: string;
  title: string;
  subtitle: string;
  /** HH:MM or null if untimed */
  localTime: string | null;
  /** Address for navigation */
  address?: string;
  /** Airport codes for flights */
  departureAirportCode?: string;
  arrivalAirportCode?: string;
}

/**
 * Extract YYYY-MM-DD from eventLocalDateTime string.
 */
function extractDate(dt: string | undefined): string | null {
  if (!dt) return null;
  const d = dt.substring(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

/**
 * Extract HH:MM from eventLocalDateTime string.
 */
function extractTime(dt: string | undefined): string | null {
  if (!dt) return null;
  const spaceMatch = dt.match(/^\d{4}-\d{2}-\d{2}\s+(\d{2}:\d{2})/);
  if (spaceMatch) return spaceMatch[1];
  const tMatch = dt.match(/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/);
  if (tMatch) return tMatch[1];
  return null;
}

/**
 * Derive a concise action label for a pill.
 */
function deriveActionTitle(event: CanonicalTimelineEvent): string {
  switch (event.eventType) {
    case 'flight':
    case 'flight_departure': {
      const codes = [event.departureAirportCode, event.arrivalAirportCode].filter(Boolean).join(' → ');
      return codes || event.title || 'Flight';
    }
    case 'hotel_checkin': return `Check in: ${event.title || 'Hotel'}`;
    case 'hotel_checkout': return `Check out: ${event.title || 'Hotel'}`;
    case 'rental_pickup': return `Pickup: ${event.title || 'Rental'}`;
    case 'rental_dropoff': return `Return: ${event.title || 'Rental'}`;
    case 'activity_start': return event.title || 'Activity';
    case 'transport_departure': return `Depart: ${event.title || 'Transport'}`;
    case 'engagement_start': return event.title || 'Stop';
    case 'parking_end': return `Move car: ${event.title || 'Parking'}`;
    default: return event.title || 'Event';
  }
}

/**
 * Get today's actionable items from canonical timeline events.
 *
 * @param timelineEvents - All canonical timeline events
 * @param nowLocal - Optional override for "now" string (testing)
 */
export function getTodayActionItems(
  timelineEvents: CanonicalTimelineEvent[],
  nowLocal?: string,
): TodayActionItem[] {
  const nowStr = nowLocal ?? getLocalNowString();
  const todayDate = nowStr.substring(0, 10); // YYYY-MM-DD
  const nowTime = nowStr.substring(11, 16); // HH:MM

  const items: (TodayActionItem & { _time: string | null; _priority: number })[] = [];

  for (const event of timelineEvents) {
    if (!ACTIONABLE_EVENT_TYPES.has(event.eventType)) continue;

    const eventDate = extractDate(event.eventLocalDateTime);
    if (eventDate !== todayDate) continue;

    const eventTime = extractTime(event.eventLocalDateTime);

    // Skip timed events that have already passed
    if (eventTime && eventTime < nowTime) continue;

    items.push({
      id: event.id,
      sourceId: event.sourceId,
      sourceType: event.sourceType,
      eventType: event.eventType,
      bookingType: event.bookingType,
      title: deriveActionTitle(event),
      subtitle: event.subtitle,
      localTime: eventTime,
      address: event.address,
      departureAirportCode: event.departureAirportCode,
      arrivalAirportCode: event.arrivalAirportCode,
      _time: eventTime,
      _priority: TYPE_PRIORITY[event.eventType] ?? 99,
    });
  }

  // Sort: timed first by time asc, then untimed, ties by type priority
  items.sort((a, b) => {
    // Timed before untimed
    if (a._time && !b._time) return -1;
    if (!a._time && b._time) return 1;
    // Both timed: sort by time
    if (a._time && b._time) {
      const cmp = a._time.localeCompare(b._time);
      if (cmp !== 0) return cmp;
    }
    // Tie-break by type priority
    return a._priority - b._priority;
  });

  // Strip internal fields
  return items.map(({ _time, _priority, ...rest }) => rest);
}

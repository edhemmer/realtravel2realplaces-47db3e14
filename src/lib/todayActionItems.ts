/**
 * Today Action Items Selector
 *
 * Derives today-relevant saved trip items from canonical timeline events.
 * This selector never infers live conditions, traveler location, or leave-time advice.
 */

import type { CanonicalTimelineEvent } from './canonicalTripState';
import { getLocalNowString } from './canonicalNextStop';

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
  'parking_end',
]);

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
  localTime: string | null;
  address?: string;
  departureAirportCode?: string;
  arrivalAirportCode?: string;
}

function extractDate(dt: string | undefined): string | null {
  if (!dt) return null;
  const d = dt.substring(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function extractTime(dt: string | undefined): string | null {
  if (!dt) return null;
  const spaceMatch = dt.match(/^\d{4}-\d{2}-\d{2}\s+(\d{2}:\d{2})/);
  if (spaceMatch) return spaceMatch[1];
  const tMatch = dt.match(/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/);
  if (tMatch) return tMatch[1];
  return null;
}

/**
 * Create a factual label from the saved event. Labels may describe a scheduled
 * action (check-in, pickup, departure) but must not add urgency or a command
 * that is not present in the underlying record.
 */
function deriveActionTitle(event: CanonicalTimelineEvent): string {
  switch (event.eventType) {
    case 'flight':
    case 'flight_departure': {
      const codes = [event.departureAirportCode, event.arrivalAirportCode].filter(Boolean).join(' → ');
      return codes || event.title || 'Flight';
    }
    case 'hotel_checkin': return `Check-in: ${event.title || 'Hotel'}`;
    case 'hotel_checkout': return `Check-out: ${event.title || 'Hotel'}`;
    case 'rental_pickup': return `Pickup: ${event.title || 'Rental'}`;
    case 'rental_dropoff': return `Return: ${event.title || 'Rental'}`;
    case 'activity_start': return event.title || 'Activity';
    case 'transport_departure': return `Departure: ${event.title || 'Transport'}`;
    case 'engagement_start': return event.title || 'Stop';
    case 'parking_end': return `Parking ends: ${event.title || 'Parking'}`;
    default: return event.title || 'Event';
  }
}

export function getTodayActionItems(
  timelineEvents: CanonicalTimelineEvent[],
  nowLocal?: string,
): TodayActionItem[] {
  const nowStr = nowLocal ?? getLocalNowString();
  const todayDate = nowStr.substring(0, 10);
  const nowTime = nowStr.substring(11, 16);

  const items: (TodayActionItem & { _time: string | null; _priority: number })[] = [];

  for (const event of timelineEvents) {
    if (!ACTIONABLE_EVENT_TYPES.has(event.eventType)) continue;

    const eventDate = extractDate(event.eventLocalDateTime);
    if (eventDate !== todayDate) continue;

    const eventTime = extractTime(event.eventLocalDateTime);
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

  items.sort((a, b) => {
    if (a._time && !b._time) return -1;
    if (!a._time && b._time) return 1;
    if (a._time && b._time) {
      const cmp = a._time.localeCompare(b._time);
      if (cmp !== 0) return cmp;
    }
    return a._priority - b._priority;
  });

  return items.map(({ _time, _priority, ...rest }) => rest);
}

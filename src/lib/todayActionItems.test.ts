import { describe, expect, it } from 'vitest';
import { getTodayActionItems } from './todayActionItems';
import type { CanonicalTimelineEvent } from './canonicalTripState';

function event(overrides: Partial<CanonicalTimelineEvent>): CanonicalTimelineEvent {
  return {
    id: 'event-1',
    sourceId: 'source-1',
    sourceType: 'booking',
    bookingType: 'activity',
    eventType: 'activity_start',
    title: 'Saved event',
    subtitle: '',
    datetime: new Date('2026-08-14T12:00:00Z'),
    hasExplicitTime: true,
    eventLocalDateTime: '2026-08-14T12:00:00',
    ...overrides,
  };
}

describe('getTodayActionItems', () => {
  it('uses factual parking language instead of instructing the traveler to move the car', () => {
    const items = getTodayActionItems([
      event({
        id: 'parking-1',
        sourceId: 'parking-1',
        sourceType: 'parking',
        bookingType: 'parking',
        eventType: 'parking_end',
        title: 'Garage B',
        eventLocalDateTime: '2026-08-14T09:30:00',
      }),
    ], '2026-08-14T08:00:00');

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Parking ends: Garage B');
    expect(items[0].title).not.toContain('Move car');
  });

  it('uses factual departure language for saved transport events', () => {
    const items = getTodayActionItems([
      event({
        id: 'train-1',
        bookingType: 'transport',
        eventType: 'transport_departure',
        title: 'Amtrak 318',
        eventLocalDateTime: '2026-08-14T14:15:00',
      }),
    ], '2026-08-14T08:00:00');

    expect(items[0].title).toBe('Departure: Amtrak 318');
  });

  it('omits timed saved events after their stored local time has passed', () => {
    const items = getTodayActionItems([
      event({
        id: 'past-1',
        title: 'Morning museum entry',
        eventLocalDateTime: '2026-08-14T08:15:00',
      }),
      event({
        id: 'future-1',
        title: 'Lunch reservation',
        eventLocalDateTime: '2026-08-14T12:30:00',
      }),
    ], '2026-08-14T10:00:00');

    expect(items.map((item) => item.id)).toEqual(['future-1']);
  });

  it('does not include saved events from another date', () => {
    const items = getTodayActionItems([
      event({
        id: 'tomorrow-1',
        eventLocalDateTime: '2026-08-15T09:00:00',
      }),
    ], '2026-08-14T08:00:00');

    expect(items).toEqual([]);
  });
});

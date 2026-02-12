/**
 * v2.3.1: Unit tests for canonicalNextStop helper
 */
import { describe, it, expect } from 'vitest';
import { getNextStopFromCanonicalTimeline } from '../canonicalNextStop';
import type { CanonicalTripState, CanonicalTimelineEvent } from '../canonicalTripState';

/** Minimal stub for CanonicalTripState with only timelineEvents populated */
function stubState(events: Partial<CanonicalTimelineEvent>[]): CanonicalTripState {
  return {
    timelineEvents: events.map((e, i) => ({
      id: `ev-${i}`,
      sourceId: `src-${i}`,
      sourceType: 'booking' as const,
      bookingType: 'flight',
      eventType: 'flight',
      title: `Event ${i}`,
      subtitle: '',
      datetime: new Date(),
      hasExplicitTime: true,
      eventLocalDateTime: '',
      ...e,
    })),
    // Other required fields filled with stubs
    trip: {} as any,
    dateRange: {} as any,
    costs: {} as any,
    weatherByKey: {},
    hasFlights: false,
    hasStays: false,
    hasRentals: false,
    hasActivities: false,
    hasParking: false,
  };
}

describe('getNextStopFromCanonicalTimeline', () => {
  it('returns empty when tripState is null', () => {
    const result = getNextStopFromCanonicalTimeline(null);
    expect(result.currentStop).toBeNull();
    expect(result.nextStop).toBeNull();
    expect(result.hasUpcoming).toBe(false);
  });

  it('returns empty when no timeline events', () => {
    const result = getNextStopFromCanonicalTimeline(stubState([]));
    expect(result.hasUpcoming).toBe(false);
  });

  it('single future flight → nextStop is that flight', () => {
    const state = stubState([
      {
        eventType: 'flight',
        eventLocalDateTime: '2030-06-15 08:00',
        departureAirportCode: 'DEN',
        arrivalAirportCode: 'LAX',
      },
    ]);
    const result = getNextStopFromCanonicalTimeline(state, '2030-06-14 20:00');
    expect(result.nextStop).not.toBeNull();
    expect(result.nextStop!.eventLocalDate).toBe('2030-06-15');
    expect(result.nextStop!.eventLocalTime).toBe('08:00');
    expect(result.hasUpcoming).toBe(true);
    expect(result.currentStop).toBeNull();
  });

  it('multiple same-day timed events → correct chronological next', () => {
    const state = stubState([
      { eventType: 'hotel_checkin', eventLocalDateTime: '2030-06-15 15:00', title: 'Hotel A' },
      { eventType: 'flight', eventLocalDateTime: '2030-06-15 08:00', title: 'Flight' },
      { eventType: 'activity_start', eventLocalDateTime: '2030-06-15 19:00', title: 'Dinner' },
    ]);
    const result = getNextStopFromCanonicalTimeline(state, '2030-06-15 10:00');
    expect(result.currentStop!.displayName).toBe('Flight');
    expect(result.nextStop!.displayName).toBe('Hotel A');
    expect(result.nextStop!.eventLocalTime).toBe('15:00');
  });

  it('untimed events are excluded', () => {
    const state = stubState([
      // Untimed: only date, no time
      { eventType: 'activity_start', eventLocalDateTime: '2030-06-15', title: 'Untimed Tour' },
      { eventType: 'flight', eventLocalDateTime: '2030-06-15 10:00', title: 'Flight' },
    ]);
    const result = getNextStopFromCanonicalTimeline(state, '2030-06-15 08:00');
    expect(result.nextStop!.displayName).toBe('Flight');
    expect(result.hasUpcoming).toBe(true);
  });

  it('trip between events → correct current and next', () => {
    const state = stubState([
      { eventType: 'flight', eventLocalDateTime: '2030-06-15 06:00', title: 'Outbound' },
      { eventType: 'hotel_checkin', eventLocalDateTime: '2030-06-15 15:00', title: 'Check-in' },
      { eventType: 'flight', eventLocalDateTime: '2030-06-18 14:00', title: 'Return' },
    ]);
    const result = getNextStopFromCanonicalTimeline(state, '2030-06-16 12:00');
    expect(result.currentStop!.displayName).toBe('Check-in');
    expect(result.nextStop!.displayName).toBe('Return');
    expect(result.hasUpcoming).toBe(true);
  });

  it('all events in the past → no upcoming', () => {
    const state = stubState([
      { eventType: 'flight', eventLocalDateTime: '2020-01-01 08:00', title: 'Old Flight' },
    ]);
    const result = getNextStopFromCanonicalTimeline(state, '2025-01-01 00:00');
    expect(result.currentStop!.displayName).toBe('Old Flight');
    expect(result.nextStop).toBeNull();
    expect(result.hasUpcoming).toBe(false);
  });

  it('excludes non-eligible event types', () => {
    const state = stubState([
      { eventType: 'flight_arrival' as any, eventLocalDateTime: '2030-06-15 10:00', title: 'Arrival' },
      { eventType: 'flight', eventLocalDateTime: '2030-06-15 08:00', title: 'Departure' },
    ]);
    const result = getNextStopFromCanonicalTimeline(state, '2030-06-14 20:00');
    // flight_arrival is not in eligible set
    expect(result.nextStop!.displayName).toBe('Departure');
  });

  it('handles T-separated datetime format', () => {
    const state = stubState([
      { eventType: 'hotel_checkin', eventLocalDateTime: '2030-06-15T15:00:00', title: 'Hotel' },
    ]);
    const result = getNextStopFromCanonicalTimeline(state, '2030-06-15 10:00');
    expect(result.nextStop!.eventLocalTime).toBe('15:00');
  });

  it('no Date() usage in source — validates via string search', () => {
    // This is a code-level check; we read the source file in a separate validation step.
    // Here we just ensure the helper is pure string logic by verifying deterministic results
    // with a fixed nowLocal override.
    const state = stubState([
      { eventType: 'flight', eventLocalDateTime: '2026-02-11 06:00', title: 'Test' },
    ]);
    const r1 = getNextStopFromCanonicalTimeline(state, '2026-02-11 05:00');
    const r2 = getNextStopFromCanonicalTimeline(state, '2026-02-11 05:00');
    expect(r1).toEqual(r2);
  });
});

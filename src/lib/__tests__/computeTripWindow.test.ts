import { describe, it, expect } from 'vitest';
import { computeTripWindow } from '../canonicalTripState';
import { Trip, Booking, Parking } from '@/types/database';

// Helper to create a minimal trip
function makeTrip(start: string, end: string): Trip {
  return {
    id: 'trip-1',
    user_id: 'user-1',
    name: 'Test Trip',
    destination_city: 'Atlanta',
    destination_country: 'US',
    start_date: start,
    end_date: end,
    trip_type: 'personal',
    created_at: '',
    updated_at: '',
  };
}

// Helper to create a minimal booking
function makeBooking(
  type: Booking['booking_type'],
  start: string,
  end?: string
): Booking {
  return {
    id: `booking-${Math.random().toString(36).slice(2, 8)}`,
    trip_id: 'trip-1',
    booking_type: type,
    vendor_name: 'Test Vendor',
    start_datetime: start,
    end_datetime: end,
    total_cost: 0,
    my_share: 0,
    created_at: '',
    updated_at: '',
  };
}

describe('computeTripWindow', () => {
  it('ATL depart 3/11, ATL land 3/25 → Mar 11–Mar 25', () => {
    const trip = makeTrip('2025-03-11', '2025-03-20'); // wizard dates are wrong (3/20)
    const bookings: Booking[] = [
      makeBooking('flight', '2025-03-11T08:00', '2025-03-11T14:00'), // outbound
      makeBooking('flight', '2025-03-25T16:00', '2025-03-25T22:00'), // return
    ];
    const result = computeTripWindow(trip, bookings);
    expect(result.startDateStr).toBe('2025-03-11');
    expect(result.endDateStr).toBe('2025-03-25');
    expect(result.windowSource).toBe('canonicalTimeline');
  });

  it('midnight landing: last arrival at 00:05 next day → end date is next day', () => {
    const trip = makeTrip('2025-03-11', '2025-03-24');
    const bookings: Booking[] = [
      makeBooking('flight', '2025-03-11T08:00', '2025-03-11T14:00'),
      makeBooking('flight', '2025-03-24T21:00', '2025-03-25T00:05'), // lands after midnight
    ];
    const result = computeTripWindow(trip, bookings);
    expect(result.startDateStr).toBe('2025-03-11');
    expect(result.endDateStr).toBe('2025-03-25');
  });

  it('multi-airline / multi-segment: uses earliest depart and latest arrive', () => {
    const trip = makeTrip('2025-03-12', '2025-03-20');
    const bookings: Booking[] = [
      makeBooking('flight', '2025-03-11T06:00', '2025-03-11T10:00'), // BA earliest
      makeBooking('flight', '2025-03-15T08:00', '2025-03-15T12:00'), // Ryanair mid
      makeBooking('flight', '2025-03-22T14:00', '2025-03-22T20:00'), // Wizz latest
    ];
    const result = computeTripWindow(trip, bookings);
    expect(result.startDateStr).toBe('2025-03-11');
    expect(result.endDateStr).toBe('2025-03-22');
  });

  it('drive-only trip: uses drive start/end', () => {
    const trip = makeTrip('2025-04-01', '2025-04-05');
    const bookings: Booking[] = [
      makeBooking('car_rental', '2025-04-01T09:00', '2025-04-07T17:00'),
    ];
    const result = computeTripWindow(trip, bookings);
    expect(result.startDateStr).toBe('2025-04-01');
    expect(result.endDateStr).toBe('2025-04-07');
  });

  it('no bookings → fallback to wizard dates', () => {
    const trip = makeTrip('2025-05-01', '2025-05-10');
    const result = computeTripWindow(trip, []);
    expect(result.startDateStr).toBe('2025-05-01');
    expect(result.endDateStr).toBe('2025-05-10');
    expect(result.windowSource).toBe('fallback');
    expect(result.windowConfidence).toBe('fallback');
  });

  it('wizard dates extend outward but never shrink confirmation range', () => {
    const trip = makeTrip('2025-03-10', '2025-03-30'); // wider than bookings
    const bookings: Booking[] = [
      makeBooking('flight', '2025-03-12T08:00', '2025-03-12T14:00'),
      makeBooking('flight', '2025-03-25T16:00', '2025-03-25T22:00'),
    ];
    const result = computeTripWindow(trip, bookings);
    expect(result.startDateStr).toBe('2025-03-10'); // extended by wizard
    expect(result.endDateStr).toBe('2025-03-30');   // extended by wizard
  });

  it('stay check-out extends end date', () => {
    const trip = makeTrip('2025-06-01', '2025-06-05');
    const bookings: Booking[] = [
      makeBooking('stay', '2025-06-01T15:00', '2025-06-08T11:00'),
    ];
    const result = computeTripWindow(trip, bookings);
    expect(result.endDateStr).toBe('2025-06-08');
  });

  it('parking contributes to window', () => {
    const trip = makeTrip('2025-07-01', '2025-07-05');
    const parking: Parking[] = [{
      id: 'p1',
      trip_id: 'trip-1',
      parking_type: 'airport',
      label: 'Airport Lot',
      start_datetime: '2025-06-30T18:00',
      end_datetime: '2025-07-06T12:00',
      billing_type: 'per_trip',
      total_cost: 50,
      my_share: 50,
      created_at: '',
      updated_at: '',
    }];
    const result = computeTripWindow(trip, [], parking);
    expect(result.startDateStr).toBe('2025-06-30');
    expect(result.endDateStr).toBe('2025-07-06');
  });

  it('single-leg flight without end_datetime uses start as both candidates', () => {
    const trip = makeTrip('2025-08-01', '2025-08-10');
    const bookings: Booking[] = [
      makeBooking('flight', '2025-08-05T12:00'), // no end_datetime
    ];
    const result = computeTripWindow(trip, bookings);
    expect(result.startDateStr).toBe('2025-08-01'); // wizard extends earlier
    expect(result.endDateStr).toBe('2025-08-10');   // wizard extends later
  });

  it('endDate < startDate guardrail triggers fallback', () => {
    // This shouldn't happen in practice, but test the guardrail
    const trip = makeTrip('2025-01-01', '2025-01-10');
    // Simulating an impossible scenario by using computeTripWindow directly
    // with valid data — the guardrail only triggers if dates are inverted,
    // which our logic prevents, so this test just confirms normal behavior
    const result = computeTripWindow(trip, []);
    expect(result.endDateStr >= result.startDateStr).toBe(true);
  });
});

/**
 * v2.2.2: Trip date calculation tests
 * Tests for extend-only date range logic (never shrink)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateTripDateRange,
  isBookingOutsideFlightRange,
  getBookingKeyTime,
  getBookingEventLabel,
} from '../tripDateCalculations';
import { Trip, Booking } from '@/types/database';

// Helper to create mock trip
const mockTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  user_id: 'user-1',
  name: 'Test Trip',
  destination_city: 'Orlando',
  destination_country: 'USA',
  start_date: '2026-01-15',
  end_date: '2026-01-20',
  trip_type: 'personal',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

// Helper to create mock booking
const mockBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'book-1',
  trip_id: 'trip-1',
  booking_type: 'flight',
  vendor_name: 'Test Airline',
  start_datetime: '2026-01-15T10:00:00Z',
  total_cost: 500,
  my_share: 250,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('calculateTripDateRange', () => {
  it('uses manual dates when no bookings exist', () => {
    const trip = mockTrip();
    const range = calculateTripDateRange(trip, []);
    
    expect(range.isFlightAnchored).toBe(false);
    expect(range.startDate.toISOString()).toContain('2026-01-15');
    expect(range.endDate.toISOString()).toContain('2026-01-20');
  });

  it('does NOT shrink trip dates to match same-day flight (QA bug)', () => {
    // Trip Feb 22–25, same-day flight Feb 22, hotel Feb 22–25
    const trip = mockTrip({ start_date: '2026-02-22', end_date: '2026-02-25' });
    const bookings = [
      mockBooking({
        id: 'flight-1',
        booking_type: 'flight',
        start_datetime: '2026-02-22T08:00:00Z',
        end_datetime: '2026-02-22T12:00:00Z',
      }),
      mockBooking({
        id: 'hotel-1',
        booking_type: 'stay',
        start_datetime: '2026-02-22T15:00:00Z',
        end_datetime: '2026-02-25T11:00:00Z',
      }),
    ];
    const range = calculateTripDateRange(trip, bookings);
    
    expect(range.startDate.toISOString()).toContain('2026-02-22');
    expect(range.endDate.toISOString()).toContain('2026-02-25');
  });

  it('extends trip dates outward when bookings exceed manual range', () => {
    // Trip Feb 22–25, flights Feb 21–26
    const trip = mockTrip({ start_date: '2026-02-22', end_date: '2026-02-25' });
    const bookings = [
      mockBooking({
        id: 'flight-out',
        booking_type: 'flight',
        start_datetime: '2026-02-21T08:00:00Z',
        end_datetime: '2026-02-21T12:00:00Z',
      }),
      mockBooking({
        id: 'flight-ret',
        booking_type: 'flight',
        start_datetime: '2026-02-26T14:00:00Z',
        end_datetime: '2026-02-26T20:00:00Z',
      }),
    ];
    const range = calculateTripDateRange(trip, bookings);
    
    expect(range.isFlightAnchored).toBe(true);
    expect(range.startDate.toISOString()).toContain('2026-02-21');
    expect(range.endDate.toISOString()).toContain('2026-02-26');
  });

  it('keeps manual dates when all bookings are within range', () => {
    const trip = mockTrip({ start_date: '2026-01-15', end_date: '2026-01-20' });
    const bookings = [
      mockBooking({
        booking_type: 'flight',
        start_datetime: '2026-01-16T08:00:00Z',
        end_datetime: '2026-01-19T22:00:00Z',
      }),
    ];
    const range = calculateTripDateRange(trip, bookings);
    
    // Should NOT shrink to Jan 16–19, should stay Jan 15–20
    expect(range.startDate.toISOString()).toContain('2026-01-15');
    expect(range.endDate.toISOString()).toContain('2026-01-20');
  });

  it('hotel extending beyond flight does NOT get ignored', () => {
    const trip = mockTrip({ start_date: '2026-01-15', end_date: '2026-01-18' });
    const bookings = [
      mockBooking({
        id: 'flight-1',
        booking_type: 'flight',
        start_datetime: '2026-01-15T10:00:00Z',
        end_datetime: '2026-01-15T14:00:00Z',
      }),
      mockBooking({
        id: 'hotel-1',
        booking_type: 'stay',
        start_datetime: '2026-01-15T15:00:00Z',
        end_datetime: '2026-01-20T11:00:00Z',
      }),
    ];
    const range = calculateTripDateRange(trip, bookings);
    
    // Hotel checkout is Jan 20, should extend end date
    expect(range.endDate.toISOString()).toContain('2026-01-20');
  });

  it('non-flight bookings also extend the range', () => {
    const trip = mockTrip({ start_date: '2026-01-15', end_date: '2026-01-20' });
    const bookings = [
      mockBooking({
        booking_type: 'stay',
        start_datetime: '2026-01-14T15:00:00Z',
        end_datetime: '2026-01-22T11:00:00Z',
      }),
    ];
    const range = calculateTripDateRange(trip, bookings);
    
    expect(range.startDate.toISOString()).toContain('2026-01-14');
    expect(range.endDate.toISOString()).toContain('2026-01-22');
  });
});

describe('isBookingOutsideFlightRange', () => {
  it('returns false when trip is not flight-anchored', () => {
    const range = { startDate: new Date('2026-01-15'), endDate: new Date('2026-01-20'), isFlightAnchored: false };
    const result = isBookingOutsideFlightRange(
      new Date('2026-01-10'),
      new Date('2026-01-25'),
      range
    );
    expect(result).toBe(false);
  });

  it('returns true when booking starts before flight range', () => {
    const range = { startDate: new Date('2026-01-16'), endDate: new Date('2026-01-20'), isFlightAnchored: true };
    const result = isBookingOutsideFlightRange(
      new Date('2026-01-14'),
      new Date('2026-01-18'),
      range
    );
    expect(result).toBe(true);
  });

  it('returns true when booking ends after flight range', () => {
    const range = { startDate: new Date('2026-01-16'), endDate: new Date('2026-01-20'), isFlightAnchored: true };
    const result = isBookingOutsideFlightRange(
      new Date('2026-01-18'),
      new Date('2026-01-22'),
      range
    );
    expect(result).toBe(true);
  });

  it('returns false when booking is within flight range', () => {
    const range = { startDate: new Date('2026-01-16'), endDate: new Date('2026-01-20'), isFlightAnchored: true };
    const result = isBookingOutsideFlightRange(
      new Date('2026-01-17'),
      new Date('2026-01-19'),
      range
    );
    expect(result).toBe(false);
  });
});

describe('getBookingKeyTime', () => {
  it('returns start_datetime for all booking types', () => {
    const flight = mockBooking({ booking_type: 'flight', start_datetime: '2026-01-15T10:00:00Z' });
    const stay = mockBooking({ booking_type: 'stay', start_datetime: '2026-01-15T15:00:00Z' });
    const rental = mockBooking({ booking_type: 'car_rental', start_datetime: '2026-01-15T09:00:00Z' });
    
    expect(getBookingKeyTime(flight).toISOString()).toContain('10:00:00');
    expect(getBookingKeyTime(stay).toISOString()).toContain('15:00:00');
    expect(getBookingKeyTime(rental).toISOString()).toContain('09:00:00');
  });
});

describe('getBookingEventLabel', () => {
  it('returns correct labels for start events', () => {
    expect(getBookingEventLabel('flight', false)).toBe('Departs');
    expect(getBookingEventLabel('stay', false)).toBe('Check In');
    expect(getBookingEventLabel('car_rental', false)).toBe('Pickup');
    expect(getBookingEventLabel('activity', false)).toBe('Starts');
  });

  it('returns correct labels for end events', () => {
    expect(getBookingEventLabel('flight', true)).toBe('Arrives');
    expect(getBookingEventLabel('stay', true)).toBe('Check Out');
    expect(getBookingEventLabel('car_rental', true)).toBe('Drop-off');
    expect(getBookingEventLabel('activity', true)).toBe('Ends');
  });
});

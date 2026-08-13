import { describe, expect, it } from 'vitest';
import { normalizeFlightNumber, resolveBookingFlightNumber } from './useFlightDisruptionAlerts';
import type { Booking } from '@/types/database';

function flight(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'booking-1',
    trip_id: 'trip-1',
    booking_type: 'flight',
    vendor_name: 'Delta',
    start_datetime: '2026-08-14T12:00:00',
    total_cost: 0,
    my_share: 0,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

describe('flight disruption identity', () => {
  it('normalizes a real flight-number-shaped value', () => {
    expect(normalizeFlightNumber('DL 1234')).toBe('DL1234');
  });

  it('uses an explicit flight number from flight notes', () => {
    expect(resolveBookingFlightNumber(flight({ notes: 'Flight DL 1234 · seat 18A' }))).toBe('DL1234');
  });

  it('does not treat confirmation number as a flight number', () => {
    expect(resolveBookingFlightNumber(flight({ confirmation_number: 'DL1234', notes: undefined }))).toBeNull();
  });

  it('does not treat vendor name as a flight number', () => {
    expect(resolveBookingFlightNumber(flight({ vendor_name: 'DL1234', notes: undefined }))).toBeNull();
  });

  it('does not query non-flight records', () => {
    expect(resolveBookingFlightNumber(flight({ booking_type: 'stay', notes: 'Flight DL 1234' }))).toBeNull();
  });
});

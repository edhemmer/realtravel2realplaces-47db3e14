import { describe, it, expect } from 'vitest';
import { deriveTripDateRange, extractDateToken } from '../canonicalTripDates';

describe('extractDateToken', () => {
  it('extracts YYYY-MM-DD from ISO string', () => {
    expect(extractDateToken('2026-03-11T10:30:00')).toBe('2026-03-11');
  });
  it('extracts YYYY-MM-DD from date-only string', () => {
    expect(extractDateToken('2026-03-11')).toBe('2026-03-11');
  });
  it('returns null for empty/null', () => {
    expect(extractDateToken(null)).toBeNull();
    expect(extractDateToken('')).toBeNull();
    expect(extractDateToken(undefined)).toBeNull();
  });
});

describe('deriveTripDateRange', () => {
  it('multi-leg flights 3/11–3/26 returns correct range', () => {
    const bookings = [
      { booking_type: 'flight', start_datetime: '2026-03-11T10:30:00', end_datetime: '2026-03-11T13:45:00' },
      { booking_type: 'flight', start_datetime: '2026-03-26T14:30:00', end_datetime: '2026-03-26T15:50:00' },
    ];
    const range = deriveTripDateRange(bookings);
    expect(range.startDate).toBe('2026-03-11');
    expect(range.endDate).toBe('2026-03-26');
  });

  it('single same-day flight returns same date for start and end', () => {
    const bookings = [
      { booking_type: 'flight', start_datetime: '2026-05-01T08:00:00', end_datetime: '2026-05-01T11:00:00' },
    ];
    const range = deriveTripDateRange(bookings);
    expect(range.startDate).toBe('2026-05-01');
    expect(range.endDate).toBe('2026-05-01');
  });

  it('stay-only trip uses check-in/check-out', () => {
    const bookings = [
      { booking_type: 'stay', start_datetime: '2026-06-10T15:00:00', end_datetime: '2026-06-14T11:00:00' },
    ];
    const range = deriveTripDateRange(bookings);
    expect(range.startDate).toBe('2026-06-10');
    expect(range.endDate).toBe('2026-06-14');
  });

  it('mixed flights + stays takes widest range', () => {
    const bookings = [
      { booking_type: 'flight', start_datetime: '2026-03-11T10:30:00', end_datetime: '2026-03-11T13:45:00' },
      { booking_type: 'stay', start_datetime: '2026-03-11T15:00:00', end_datetime: '2026-03-27T11:00:00' },
      { booking_type: 'flight', start_datetime: '2026-03-27T14:30:00', end_datetime: '2026-03-27T17:00:00' },
    ];
    const range = deriveTripDateRange(bookings);
    expect(range.startDate).toBe('2026-03-11');
    expect(range.endDate).toBe('2026-03-27');
  });

  it('empty bookings returns nulls', () => {
    const range = deriveTripDateRange([]);
    expect(range.startDate).toBeNull();
    expect(range.endDate).toBeNull();
  });

  it('booking with only start_datetime (no end)', () => {
    const bookings = [
      { booking_type: 'activity', start_datetime: '2026-04-05T09:00:00' },
    ];
    const range = deriveTripDateRange(bookings);
    expect(range.startDate).toBe('2026-04-05');
    expect(range.endDate).toBe('2026-04-05');
  });

  it('next-day arrival extends end date correctly', () => {
    const bookings = [
      { booking_type: 'flight', start_datetime: '2026-03-24T21:00:00', end_datetime: '2026-03-25T00:05:00' },
    ];
    const range = deriveTripDateRange(bookings);
    expect(range.startDate).toBe('2026-03-24');
    expect(range.endDate).toBe('2026-03-25');
  });
});

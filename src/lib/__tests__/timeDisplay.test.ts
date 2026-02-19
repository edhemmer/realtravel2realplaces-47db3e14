import { describe, it, expect } from 'vitest';
import { getFlightTimeLabel, getDepartureTimeLabel, getArrivalTimeLabel, hasFlightTime } from '@/lib/timeDisplay';

describe('timeDisplay — v3.9.39 canonical flight time helpers', () => {
  describe('getFlightTimeLabel', () => {
    it('returns raw time string when provided', () => {
      expect(getFlightTimeLabel('23:05')).toBe('23:05');
      expect(getFlightTimeLabel('11:10 PM')).toBe('11:10 PM');
      expect(getFlightTimeLabel('6:45 AM')).toBe('6:45 AM');
    });

    it('extracts HH:mm from ISO datetime when no raw time', () => {
      expect(getFlightTimeLabel(null, '2026-03-26T23:05:00')).toBe('23:05');
      expect(getFlightTimeLabel(null, '2026-03-11T14:30:00.000Z')).toBe('14:30');
      expect(getFlightTimeLabel(undefined, '2026-01-15T06:45:00')).toBe('06:45');
    });

    it('does NOT suppress midnight — flights can depart at 00:00', () => {
      expect(getFlightTimeLabel('00:00')).toBe('00:00');
      expect(getFlightTimeLabel(null, '2026-03-26T00:00:00')).toBe('00:00');
    });

    it('returns --:-- when no time available', () => {
      expect(getFlightTimeLabel(null, null)).toBe('--:--');
      expect(getFlightTimeLabel(undefined, undefined)).toBe('--:--');
      expect(getFlightTimeLabel('', null)).toBe('--:--');
      expect(getFlightTimeLabel('  ', null)).toBe('--:--');
    });

    it('returns --:-- for date-only strings', () => {
      expect(getFlightTimeLabel(null, '2026-03-26')).toBe('--:--');
    });

    it('prefers raw time over ISO datetime', () => {
      expect(getFlightTimeLabel('6:45 PM', '2026-03-26T18:45:00')).toBe('6:45 PM');
    });

    it('does NOT convert 24h to 12h', () => {
      expect(getFlightTimeLabel('23:05')).toBe('23:05');
      expect(getFlightTimeLabel('14:30')).toBe('14:30');
    });

    it('does NOT convert 12h to 24h', () => {
      expect(getFlightTimeLabel('11:10 PM')).toBe('11:10 PM');
      expect(getFlightTimeLabel('6:00 AM')).toBe('6:00 AM');
    });
  });

  describe('getDepartureTimeLabel / getArrivalTimeLabel', () => {
    it('delegates to getFlightTimeLabel correctly', () => {
      expect(getDepartureTimeLabel('14:30')).toBe('14:30');
      expect(getArrivalTimeLabel(null, '2026-03-26T23:05:00')).toBe('23:05');
    });
  });

  describe('hasFlightTime', () => {
    it('returns true when time is available', () => {
      expect(hasFlightTime('23:05')).toBe(true);
      expect(hasFlightTime(null, '2026-03-26T14:30:00')).toBe(true);
      expect(hasFlightTime('00:00')).toBe(true); // midnight is valid
    });

    it('returns false when no time available', () => {
      expect(hasFlightTime(null, null)).toBe(false);
      expect(hasFlightTime('', null)).toBe(false);
      expect(hasFlightTime(null, '2026-03-26')).toBe(false);
    });
  });
});

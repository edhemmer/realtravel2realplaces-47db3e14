import { describe, it, expect } from 'vitest';
import { timeToMinutes, compareTimeOnly, isAfterNow, isTimeOnlyString } from '../timeOnly';

describe('timeOnly', () => {
  describe('isTimeOnlyString', () => {
    it('accepts HH:MM 24h', () => {
      expect(isTimeOnlyString('06:05')).toBe(true);
      expect(isTimeOnlyString('18:13')).toBe(true);
      expect(isTimeOnlyString('00:00')).toBe(true);
      expect(isTimeOnlyString('23:59')).toBe(true);
    });
    it('accepts h:mm AM/PM 12h', () => {
      expect(isTimeOnlyString('6:05 AM')).toBe(true);
      expect(isTimeOnlyString('12:00 PM')).toBe(true);
    });
    it('rejects invalid', () => {
      expect(isTimeOnlyString('')).toBe(false);
      expect(isTimeOnlyString(null)).toBe(false);
      expect(isTimeOnlyString(undefined)).toBe(false);
      expect(isTimeOnlyString('bad')).toBe(false);
    });
  });

  describe('timeToMinutes', () => {
    it('24h format', () => {
      expect(timeToMinutes('06:00')).toBe(360);
      expect(timeToMinutes('18:13')).toBe(1093);
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('23:59')).toBe(1439);
    });
    it('12h format', () => {
      expect(timeToMinutes('6:05 AM')).toBe(365);
      expect(timeToMinutes('12:00 PM')).toBe(720);
      expect(timeToMinutes('12:00 AM')).toBe(0);
      expect(timeToMinutes('12:59 PM')).toBe(779);
      expect(timeToMinutes('1:00 PM')).toBe(780);
    });
    it('returns null for invalid', () => {
      expect(timeToMinutes('')).toBeNull();
      expect(timeToMinutes('bad')).toBeNull();
      expect(timeToMinutes('25:00')).toBeNull();
      expect(timeToMinutes('12:60')).toBeNull();
    });
  });

  describe('compareTimeOnly', () => {
    it('compares correctly', () => {
      expect(compareTimeOnly('06:00', '05:59')).toBe(1);
      expect(compareTimeOnly('09:05', '10:00')).toBe(-1);
      expect(compareTimeOnly('12:00', '12:00')).toBe(0);
    });
    it('returns 0 for non-comparable', () => {
      expect(compareTimeOnly('bad', '10:00')).toBe(0);
      expect(compareTimeOnly('10:00', 'bad')).toBe(0);
    });
  });

  describe('isAfterNow', () => {
    it('returns true when time is after now', () => {
      expect(isAfterNow('06:00', '05:59')).toBe(true);
      expect(isAfterNow('12:00 PM', '11:59')).toBe(true);
    });
    it('returns false when time is before or equal', () => {
      expect(isAfterNow('09:05', '10:00')).toBe(false);
      expect(isAfterNow('10:00', '10:00')).toBe(false);
    });
    it('returns false for invalid inputs', () => {
      expect(isAfterNow('bad', '10:00')).toBe(false);
      expect(isAfterNow('10:00', 'bad')).toBe(false);
    });
  });
});

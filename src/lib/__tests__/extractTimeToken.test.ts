/**
 * v3.9.33: Tests for extractTimeToken
 */
import { describe, it, expect } from 'vitest';
import { extractTimeToken } from '@/lib/ingestion/extractTimeToken';

describe('extractTimeToken', () => {
  // 12-hour format
  it('extracts "11:10 PM" from departure text', () => {
    expect(extractTimeToken('Departs 11:10 PM')).toBe('11:10 PM');
  });

  it('extracts "6:00 AM" from departure text', () => {
    expect(extractTimeToken('Departure 6:00 AM Gate B12')).toBe('6:00 AM');
  });

  it('extracts "3:30 PM" with no space before meridiem', () => {
    expect(extractTimeToken('Arrives 3:30PM')).toBe('3:30PM');
  });

  // 24-hour format
  it('extracts "23:05" from departure text', () => {
    expect(extractTimeToken('Departure 23:05')).toBe('23:05');
  });

  it('extracts "06:45" from boarding text', () => {
    expect(extractTimeToken('Boarding at 06:45 Gate B12')).toBe('06:45');
  });

  it('extracts "14:30" from plain text', () => {
    expect(extractTimeToken('Flight departs 14:30 local')).toBe('14:30');
  });

  // Edge cases
  it('returns null for empty string', () => {
    expect(extractTimeToken('')).toBeNull();
  });

  it('returns null for date-only string', () => {
    expect(extractTimeToken('March 26, 2026')).toBeNull();
  });

  it('returns null for text without time', () => {
    expect(extractTimeToken('British Airways PNR Y7ZBBD')).toBeNull();
  });

  // Prefers 12h over 24h when AM/PM present
  it('prefers 12h match when AM/PM present', () => {
    expect(extractTimeToken('Departs 11:10 PM from LHR')).toBe('11:10 PM');
  });
});

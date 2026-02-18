/**
 * v3.9.35: Import Staging unit tests
 */
import { describe, it, expect } from 'vitest';
import {
  extractDateTokensFromParsedItems,
  deriveTripFrameFromDateTokens,
  buildImportStaging,
} from '../importStaging';

describe('extractDateTokensFromParsedItems', () => {
  it('extracts date tokens from multi-leg flights spanning 3/11–3/26', () => {
    const items = [
      { booking_type: 'flight', start_datetime: '2026-03-11T06:00', end_datetime: '2026-03-11T09:30' },
      { booking_type: 'flight', start_datetime: '2026-03-11T12:00', end_datetime: '2026-03-11T14:30' },
      { booking_type: 'flight', start_datetime: '2026-03-26T08:00', end_datetime: '2026-03-26T18:00' },
    ];
    const tokens = extractDateTokensFromParsedItems(items);
    expect(tokens).toContain('2026-03-11');
    expect(tokens).toContain('2026-03-26');
  });

  it('handles next-day arrival (flight landing after midnight)', () => {
    const items = [
      { booking_type: 'flight', start_datetime: '2026-03-25T23:55', end_datetime: '2026-03-26T00:05' },
    ];
    const tokens = extractDateTokensFromParsedItems(items);
    expect(tokens).toContain('2026-03-25');
    expect(tokens).toContain('2026-03-26');
  });

  it('extracts stay check-in and check-out tokens', () => {
    const items = [
      { booking_type: 'stay', start_datetime: '2026-04-01T15:00', end_datetime: '2026-04-05T11:00' },
    ];
    const tokens = extractDateTokensFromParsedItems(items);
    expect(tokens).toContain('2026-04-01');
    expect(tokens).toContain('2026-04-05');
  });

  it('handles missing end_datetime gracefully', () => {
    const items = [
      { booking_type: 'flight', start_datetime: '2026-05-10T09:00' },
    ];
    const tokens = extractDateTokensFromParsedItems(items);
    expect(tokens).toEqual(['2026-05-10']);
  });

  it('returns empty array for empty input', () => {
    expect(extractDateTokensFromParsedItems([])).toEqual([]);
  });
});

describe('deriveTripFrameFromDateTokens', () => {
  it('derives 3/11–3/26 from multi-leg tokens', () => {
    const tokens = ['2026-03-11', '2026-03-20', '2026-03-26'];
    const frame = deriveTripFrameFromDateTokens(tokens);
    expect(frame.startDate).toBe('2026-03-11');
    expect(frame.endDate).toBe('2026-03-26');
  });

  it('same-day single flight returns same date for start and end', () => {
    const frame = deriveTripFrameFromDateTokens(['2026-06-15']);
    expect(frame.startDate).toBe('2026-06-15');
    expect(frame.endDate).toBe('2026-06-15');
  });

  it('returns nulls for empty tokens', () => {
    const frame = deriveTripFrameFromDateTokens([]);
    expect(frame.startDate).toBeNull();
    expect(frame.endDate).toBeNull();
  });
});

describe('buildImportStaging', () => {
  it('produces a complete staging object with correct tripFrame', () => {
    const items = [
      { booking_type: 'flight', vendor_name: 'BA', start_datetime: '2026-03-11T06:00', end_datetime: '2026-03-11T09:30' },
      { booking_type: 'flight', vendor_name: 'Wizz', start_datetime: '2026-03-26T08:00', end_datetime: '2026-03-26T18:00' },
    ];
    const staging = buildImportStaging(items, 'fly');
    expect(staging.sessionId).toBeTruthy();
    expect(staging.parsedItems).toHaveLength(2);
    expect(staging.tripFrame.startDate).toBe('2026-03-11');
    expect(staging.tripFrame.endDate).toBe('2026-03-26');
    expect(staging.dateTokens).toContain('2026-03-11');
    expect(staging.dateTokens).toContain('2026-03-26');
    expect(staging.meta).toBeDefined();
  });

  it('stay-only trip uses check-in/check-out for frame', () => {
    const items = [
      { booking_type: 'stay', vendor_name: 'Hilton', start_datetime: '2026-07-01T15:00', end_datetime: '2026-07-05T11:00', property_name: 'Hilton Milan' },
    ];
    const staging = buildImportStaging(items, 'fly');
    expect(staging.tripFrame.startDate).toBe('2026-07-01');
    expect(staging.tripFrame.endDate).toBe('2026-07-05');
  });
});

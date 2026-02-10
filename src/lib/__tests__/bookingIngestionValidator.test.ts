/**
 * v2.2.12: Booking Ingestion Validator Tests
 * 
 * Tests the integration of ConfirmationTimeValidator into the
 * booking ingestion pipeline.
 */

import { describe, it, expect } from 'vitest';
import {
  extractConfirmationTokens,
  validateParsedBookingTimes,
  shouldValidateBookingType,
  ParsedBookingForValidation,
} from '../bookingIngestionValidator';

// ============================================================================
// shouldValidateBookingType
// ============================================================================

describe('shouldValidateBookingType', () => {
  it('validates flights', () => {
    expect(shouldValidateBookingType('flight')).toBe(true);
  });

  it('validates stays', () => {
    expect(shouldValidateBookingType('stay')).toBe(true);
  });

  it('validates car_rental', () => {
    expect(shouldValidateBookingType('car_rental')).toBe(true);
  });

  it('validates activity', () => {
    expect(shouldValidateBookingType('activity')).toBe(true);
  });

  it('validates transport', () => {
    expect(shouldValidateBookingType('transport')).toBe(true);
  });

  it('skips null/undefined', () => {
    expect(shouldValidateBookingType(null)).toBe(false);
    expect(shouldValidateBookingType(undefined)).toBe(false);
  });

  it('skips unknown types', () => {
    expect(shouldValidateBookingType('parking')).toBe(false);
    expect(shouldValidateBookingType('other')).toBe(false);
  });
});

// ============================================================================
// extractConfirmationTokens
// ============================================================================

describe('extractConfirmationTokens', () => {
  it('extracts start and end tokens from flight datetimes', () => {
    const parsed: ParsedBookingForValidation = {
      booking_type: 'flight',
      start_datetime: '2026-02-11T06:00:00',
      end_datetime: '2026-02-11T07:39:00',
    };
    const tokens = extractConfirmationTokens(parsed);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({ rawToken: '6:00 AM', field: 'start' });
    expect(tokens[1]).toEqual({ rawToken: '7:39 AM', field: 'end' });
  });

  it('extracts PM times correctly', () => {
    const parsed: ParsedBookingForValidation = {
      booking_type: 'stay',
      start_datetime: '2026-02-12T16:00:00',
      end_datetime: '2026-02-14T10:00:00',
    };
    const tokens = extractConfirmationTokens(parsed);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({ rawToken: '4:00 PM', field: 'start' });
    expect(tokens[1]).toEqual({ rawToken: '10:00 AM', field: 'end' });
  });

  it('returns empty array for date-only bookings', () => {
    const parsed: ParsedBookingForValidation = {
      booking_type: 'stay',
      start_datetime: '2026-02-12',
      end_datetime: '2026-02-14',
    };
    const tokens = extractConfirmationTokens(parsed);
    expect(tokens).toHaveLength(0);
  });

  it('returns empty array for null datetimes (manual entry)', () => {
    const parsed: ParsedBookingForValidation = {
      booking_type: 'flight',
      start_datetime: null,
      end_datetime: null,
    };
    const tokens = extractConfirmationTokens(parsed);
    expect(tokens).toHaveLength(0);
  });
});

// ============================================================================
// validateParsedBookingTimes — Happy paths
// ============================================================================

describe('validateParsedBookingTimes — valid events', () => {
  it('Frontier ATL→DEN flight passes validation', () => {
    const parsed: ParsedBookingForValidation = {
      booking_type: 'flight',
      start_datetime: '2026-02-11T06:00:00',
      end_datetime: '2026-02-11T07:39:00',
    };
    const result = validateParsedBookingTimes(
      parsed,
      '2026-02-11T06:00:00',
      '2026-02-11T07:39:00',
    );
    expect(result.isValid).toBe(true);
    expect(result.isLowConfidence).toBe(false);
    expect(result.issuesSummary).toBeNull();
    expect(result.shouldClearTimes).toBe(false);
  });

  it('Airbnb stay with 4:00 PM check-in / 10:00 AM checkout passes', () => {
    const parsed: ParsedBookingForValidation = {
      booking_type: 'stay',
      start_datetime: '2026-02-12T16:00:00',
      end_datetime: '2026-02-14T10:00:00',
    };
    const result = validateParsedBookingTimes(
      parsed,
      '2026-02-12T16:00:00',
      '2026-02-14T10:00:00',
    );
    expect(result.isValid).toBe(true);
    expect(result.isLowConfidence).toBe(false);
  });

  it('rental car pickup/dropoff passes', () => {
    const parsed: ParsedBookingForValidation = {
      booking_type: 'car_rental',
      start_datetime: '2026-02-12T10:00:00',
      end_datetime: '2026-02-14T17:00:00',
    };
    const result = validateParsedBookingTimes(
      parsed,
      '2026-02-12T10:00:00',
      '2026-02-14T17:00:00',
    );
    expect(result.isValid).toBe(true);
    expect(result.isLowConfidence).toBe(false);
  });
});

// ============================================================================
// validateParsedBookingTimes — Invalid events (UTC drift)
// ============================================================================

describe('validateParsedBookingTimes — invalid events', () => {
  it('flags UTC drift on flight (1:00 AM stored vs 6:00 AM parsed)', () => {
    const parsed: ParsedBookingForValidation = {
      booking_type: 'flight',
      start_datetime: '2026-02-11T06:00:00',
      end_datetime: '2026-02-11T07:39:00',
    };
    // Simulate UTC drift: normalizer incorrectly stored 1:00 AM
    const result = validateParsedBookingTimes(
      parsed,
      '2026-02-11T01:00:00', // drifted
      '2026-02-11T07:39:00', // correct
    );
    expect(result.isValid).toBe(false);
    expect(result.isLowConfidence).toBe(true);
    expect(result.issuesSummary).toContain('Start time');
    expect(result.shouldClearTimes).toBe(true);
  });

  it('flags Airbnb UTC drift (11:00 AM stored vs 4:00 PM parsed)', () => {
    const parsed: ParsedBookingForValidation = {
      booking_type: 'stay',
      start_datetime: '2026-02-12T16:00:00',
      end_datetime: '2026-02-14T10:00:00',
    };
    const result = validateParsedBookingTimes(
      parsed,
      '2026-02-12T11:00:00', // drifted
      '2026-02-14T05:00:00', // drifted
    );
    expect(result.isValid).toBe(false);
    expect(result.isLowConfidence).toBe(true);
    expect(result.validation?.fields.filter(f => !f.isValid)).toHaveLength(2);
  });
});

// ============================================================================
// validateParsedBookingTimes — Mixed bundle
// ============================================================================

describe('validateParsedBookingTimes — mixed', () => {
  it('one bad time in a booking flags entire booking as low-confidence', () => {
    const parsed: ParsedBookingForValidation = {
      booking_type: 'flight',
      start_datetime: '2026-02-11T06:00:00',
      end_datetime: '2026-02-11T07:39:00',
    };
    // Start is correct, end is drifted
    const result = validateParsedBookingTimes(
      parsed,
      '2026-02-11T06:00:00', // correct
      '2026-02-11T02:39:00', // drifted
    );
    expect(result.isValid).toBe(false);
    expect(result.isLowConfidence).toBe(true);
    expect(result.validation?.fields.find(f => f.field === 'start')?.isValid).toBe(true);
    expect(result.validation?.fields.find(f => f.field === 'end')?.isValid).toBe(false);
  });
});

// ============================================================================
// validateParsedBookingTimes — Manual-only bypass
// ============================================================================

describe('validateParsedBookingTimes — manual-only bypass', () => {
  it('manual event with no parsed times bypasses validation', () => {
    const parsed: ParsedBookingForValidation = {
      booking_type: 'activity',
      start_datetime: null,
      end_datetime: null,
    };
    const result = validateParsedBookingTimes(parsed, null, null);
    expect(result.isValid).toBe(true);
    expect(result.isLowConfidence).toBe(false);
    expect(result.validation).toBeNull();
  });

  it('date-only booking (no time digits) bypasses validation', () => {
    const parsed: ParsedBookingForValidation = {
      booking_type: 'stay',
      start_datetime: '2026-02-12',
      end_datetime: '2026-02-14',
    };
    const result = validateParsedBookingTimes(
      parsed,
      '2026-02-12',
      '2026-02-14',
    );
    expect(result.isValid).toBe(true);
    expect(result.isLowConfidence).toBe(false);
  });
});

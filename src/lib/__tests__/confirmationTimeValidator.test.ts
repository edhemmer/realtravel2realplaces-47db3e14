/**
 * v2.2.11: Confirmation Time Validator Tests
 * 
 * Validates that canonical local times match original confirmation tokens.
 */

import { describe, it, expect } from 'vitest';
import {
  extractAnchorTime,
  validateTimeField,
  validateBookingTimes,
  ConfirmationTimeToken,
} from '../confirmationTimeValidator';

// ============================================================================
// extractAnchorTime
// ============================================================================

describe('extractAnchorTime', () => {
  it('parses "6:00 AM"', () => {
    expect(extractAnchorTime('6:00 AM')).toEqual({ hours: 6, minutes: 0 });
  });

  it('parses "7:39 AM"', () => {
    expect(extractAnchorTime('7:39 AM')).toEqual({ hours: 7, minutes: 39 });
  });

  it('parses "4:00 PM"', () => {
    expect(extractAnchorTime('4:00 PM')).toEqual({ hours: 16, minutes: 0 });
  });

  it('parses "12:00 PM" (noon)', () => {
    expect(extractAnchorTime('12:00 PM')).toEqual({ hours: 12, minutes: 0 });
  });

  it('parses "12:00 AM" (midnight)', () => {
    expect(extractAnchorTime('12:00 AM')).toEqual({ hours: 0, minutes: 0 });
  });

  it('parses "After 4:00 PM" — extracts anchor', () => {
    expect(extractAnchorTime('After 4:00 PM')).toEqual({ hours: 16, minutes: 0 });
  });

  it('parses "By 10:00 AM" — extracts anchor', () => {
    expect(extractAnchorTime('By 10:00 AM')).toEqual({ hours: 10, minutes: 0 });
  });

  it('parses "Check-in: 3:00 PM"', () => {
    expect(extractAnchorTime('Check-in: 3:00 PM')).toEqual({ hours: 15, minutes: 0 });
  });

  it('parses 24-hour format "16:00"', () => {
    expect(extractAnchorTime('16:00')).toEqual({ hours: 16, minutes: 0 });
  });

  it('parses 24-hour format "06:00"', () => {
    expect(extractAnchorTime('06:00')).toEqual({ hours: 6, minutes: 0 });
  });

  it('returns null for empty/null', () => {
    expect(extractAnchorTime(null)).toBeNull();
    expect(extractAnchorTime(undefined)).toBeNull();
    expect(extractAnchorTime('')).toBeNull();
  });

  it('returns null for non-time string', () => {
    expect(extractAnchorTime('no time here')).toBeNull();
  });
});

// ============================================================================
// validateTimeField
// ============================================================================

describe('validateTimeField', () => {
  it('validates matching flight departure — ATL 6:00 AM', () => {
    const result = validateTimeField(
      '2026-02-11T06:00:00',
      '6:00 AM',
      'start'
    );
    expect(result.isValid).toBe(true);
    expect(result.canonicalTime).toBe('6:00 AM');
  });

  it('validates matching flight arrival — DEN 7:39 AM', () => {
    const result = validateTimeField(
      '2026-02-11T07:39:00',
      '7:39 AM',
      'end'
    );
    expect(result.isValid).toBe(true);
    expect(result.canonicalTime).toBe('7:39 AM');
  });

  it('validates Airbnb check-in — "After 4:00 PM" matches 4:00 PM', () => {
    const result = validateTimeField(
      '2026-02-12T16:00:00',
      'After 4:00 PM',
      'start'
    );
    expect(result.isValid).toBe(true);
    expect(result.canonicalTime).toBe('4:00 PM');
  });

  it('validates Airbnb check-out — "By 10:00 AM" matches 10:00 AM', () => {
    const result = validateTimeField(
      '2026-02-14T10:00:00',
      'By 10:00 AM',
      'end'
    );
    expect(result.isValid).toBe(true);
    expect(result.canonicalTime).toBe('10:00 AM');
  });

  it('allows 1-minute tolerance', () => {
    const result = validateTimeField(
      '2026-02-11T06:01:00',
      '6:00 AM',
      'start',
      2
    );
    expect(result.isValid).toBe(true);
  });

  it('flags mismatch when canonical is hours off (UTC drift scenario)', () => {
    // Simulates the old bug: confirmation says 6:00 AM but canonical stored 1:00 AM
    const result = validateTimeField(
      '2026-02-11T01:00:00',
      '6:00 AM',
      'start'
    );
    expect(result.isValid).toBe(false);
    expect(result.mismatchReason).toContain('differs by');
    expect(result.mismatchReason).toContain('300 minutes');
  });

  it('flags mismatch for Airbnb UTC drift — 11:00 AM vs After 4:00 PM', () => {
    // Old bug: Airbnb 4:00 PM stored as UTC then shown as 11:00 AM (EST offset)
    const result = validateTimeField(
      '2026-02-12T11:00:00',
      'After 4:00 PM',
      'start'
    );
    expect(result.isValid).toBe(false);
    expect(result.mismatchReason).toContain('differs by');
  });

  it('treats no confirmation token as valid (nothing to validate)', () => {
    const result = validateTimeField(
      '2026-02-11T06:00:00',
      null,
      'start'
    );
    expect(result.isValid).toBe(true);
  });

  it('treats unparseable confirmation token as valid (cannot validate)', () => {
    const result = validateTimeField(
      '2026-02-11T06:00:00',
      'sometime in the morning',
      'start'
    );
    expect(result.isValid).toBe(true);
  });

  it('flags when canonical has no time but confirmation does', () => {
    const result = validateTimeField(
      '2026-02-11',
      '6:00 AM',
      'start'
    );
    expect(result.isValid).toBe(false);
    expect(result.mismatchReason).toContain('no explicit time');
  });

  it('unknown timezone fallback — compares raw HH:MM without UTC drift', () => {
    // No timezone info, but stored naively as local. Should match on digits.
    const result = validateTimeField(
      '2026-02-11T14:30:00',
      '2:30 PM',
      'start'
    );
    expect(result.isValid).toBe(true);
    expect(result.canonicalTime).toBe('2:30 PM');
  });
});

// ============================================================================
// validateBookingTimes (booking-level)
// ============================================================================

describe('validateBookingTimes', () => {
  it('validates Frontier ATL→DEN flight — both fields match', () => {
    const tokens: ConfirmationTimeToken[] = [
      { rawToken: '6:00 AM', field: 'start' },
      { rawToken: '7:39 AM', field: 'end' },
    ];
    const result = validateBookingTimes(
      '2026-02-11T06:00:00',
      '2026-02-11T07:39:00',
      tokens
    );
    expect(result.isValid).toBe(true);
    expect(result.isLowConfidence).toBe(false);
    expect(result.fields).toHaveLength(2);
  });

  it('validates Colorado Springs Airbnb stay', () => {
    const tokens: ConfirmationTimeToken[] = [
      { rawToken: 'After 4:00 PM', field: 'start' },
      { rawToken: 'By 10:00 AM', field: 'end' },
    ];
    const result = validateBookingTimes(
      '2026-02-12T16:00:00',
      '2026-02-14T10:00:00',
      tokens
    );
    expect(result.isValid).toBe(true);
    expect(result.isLowConfidence).toBe(false);
  });

  it('flags low confidence when start time has UTC drift', () => {
    const tokens: ConfirmationTimeToken[] = [
      { rawToken: '6:00 AM', field: 'start' },
      { rawToken: '7:39 AM', field: 'end' },
    ];
    // start is off by 5 hours (UTC drift), end is correct
    const result = validateBookingTimes(
      '2026-02-11T01:00:00',
      '2026-02-11T07:39:00',
      tokens
    );
    expect(result.isValid).toBe(false);
    expect(result.isLowConfidence).toBe(true);
    expect(result.fields.find(f => f.field === 'start')?.isValid).toBe(false);
    expect(result.fields.find(f => f.field === 'end')?.isValid).toBe(true);
  });

  it('passes with no confirmation tokens (manual entry)', () => {
    const result = validateBookingTimes(
      '2026-02-11T06:00:00',
      '2026-02-11T18:00:00',
      []
    );
    expect(result.isValid).toBe(true);
    expect(result.isLowConfidence).toBe(false);
  });

  it('rental car — validates pickup time', () => {
    const tokens: ConfirmationTimeToken[] = [
      { rawToken: '10:00 AM', field: 'start' },
      { rawToken: '5:00 PM', field: 'end' },
    ];
    const result = validateBookingTimes(
      '2026-02-12T10:00:00',
      '2026-02-14T17:00:00',
      tokens
    );
    expect(result.isValid).toBe(true);
    expect(result.isLowConfidence).toBe(false);
  });
});

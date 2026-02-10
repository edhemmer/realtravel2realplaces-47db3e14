/**
 * v2.2.10: Canonical Time Normalizer tests
 * Covers cross-booking timezone normalization for flights, stays, rentals,
 * and unknown-timezone fallback scenarios.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveDestinationTimezone,
  resolveBookingTimezone,
  formatLocalTimeDirect,
  formatLocalDateDirect,
} from '../canonicalTimeNormalizer';

// ============================================================================
// resolveDestinationTimezone
// ============================================================================

describe('resolveDestinationTimezone', () => {
  it('resolves US state abbreviations', () => {
    expect(resolveDestinationTimezone('CO', 'United States')).toBe('America/Denver');
    expect(resolveDestinationTimezone('GA', 'United States')).toBe('America/New_York');
    expect(resolveDestinationTimezone('CA', 'United States')).toBe('America/Los_Angeles');
    expect(resolveDestinationTimezone('TX', 'United States')).toBe('America/Chicago');
    expect(resolveDestinationTimezone('HI', 'United States')).toBe('Pacific/Honolulu');
    expect(resolveDestinationTimezone('AZ', 'United States')).toBe('America/Phoenix');
  });

  it('resolves full US state names', () => {
    expect(resolveDestinationTimezone('Colorado', null)).toBe('America/Denver');
    expect(resolveDestinationTimezone('Georgia', null)).toBe('America/New_York');
    expect(resolveDestinationTimezone('New York', null)).toBe('America/New_York');
  });

  it('resolves international countries', () => {
    expect(resolveDestinationTimezone(null, 'Japan')).toBe('Asia/Tokyo');
    expect(resolveDestinationTimezone(null, 'France')).toBe('Europe/Paris');
    expect(resolveDestinationTimezone(null, 'United Kingdom')).toBe('Europe/London');
  });

  it('prefers state over country for US trips', () => {
    // State gives Mountain, country would give Eastern (default US)
    expect(resolveDestinationTimezone('CO', 'United States')).toBe('America/Denver');
  });

  it('returns null for unknown locations', () => {
    expect(resolveDestinationTimezone(null, null)).toBeNull();
    expect(resolveDestinationTimezone(null, 'Atlantis')).toBeNull();
    expect(resolveDestinationTimezone('XX', null)).toBeNull();
  });
});

// ============================================================================
// resolveBookingTimezone
// ============================================================================

describe('resolveBookingTimezone', () => {
  it('resolves flight departure to departure airport timezone', () => {
    const tz = resolveBookingTimezone('flight', 'start', 'ATL', 'DEN', 'America/Denver');
    expect(tz).toBe('America/New_York');
  });

  it('resolves flight arrival to arrival airport timezone', () => {
    const tz = resolveBookingTimezone('flight', 'end', 'ATL', 'DEN', 'America/Denver');
    expect(tz).toBe('America/Denver');
  });

  it('resolves stay to destination timezone', () => {
    const tz = resolveBookingTimezone('stay', 'start', null, null, 'America/Denver');
    expect(tz).toBe('America/Denver');
  });

  it('resolves car_rental to destination timezone', () => {
    const tz = resolveBookingTimezone('car_rental', 'start', null, null, 'America/Denver');
    expect(tz).toBe('America/Denver');
  });

  it('resolves activity to destination timezone', () => {
    const tz = resolveBookingTimezone('activity', 'start', null, null, 'Europe/Paris');
    expect(tz).toBe('Europe/Paris');
  });

  it('returns null when flight airport is unknown', () => {
    const tz = resolveBookingTimezone('flight', 'start', 'XYZ', null, null);
    expect(tz).toBeNull();
  });

  it('returns null when no destination timezone for non-flight', () => {
    const tz = resolveBookingTimezone('stay', 'start', null, null, null);
    expect(tz).toBeNull();
  });
});

// ============================================================================
// formatLocalTimeDirect
// ============================================================================

describe('formatLocalTimeDirect', () => {
  it('extracts time from naive datetime string', () => {
    expect(formatLocalTimeDirect('2026-02-11T06:00:00')).toBe('6:00 AM');
    expect(formatLocalTimeDirect('2026-02-11T14:30:00')).toBe('2:30 PM');
    expect(formatLocalTimeDirect('2026-02-11T23:59:00')).toBe('11:59 PM');
  });

  it('extracts time from Z-suffixed UTC string (same digits)', () => {
    // The stored digits are the local time, regardless of Z suffix
    expect(formatLocalTimeDirect('2026-02-11T06:00:00.000Z')).toBe('6:00 AM');
    expect(formatLocalTimeDirect('2026-02-11T16:00:00.000Z')).toBe('4:00 PM');
  });

  it('returns null for date-only strings', () => {
    expect(formatLocalTimeDirect('2026-02-11')).toBeNull();
  });

  it('returns null for midnight (likely defaulted)', () => {
    expect(formatLocalTimeDirect('2026-02-11T00:00:00')).toBeNull();
    expect(formatLocalTimeDirect('2026-02-11T00:00:00.000Z')).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(formatLocalTimeDirect(null)).toBeNull();
    expect(formatLocalTimeDirect(undefined)).toBeNull();
  });

  it('formats in 24h mode', () => {
    expect(formatLocalTimeDirect('2026-02-11T06:00:00', true)).toBe('06:00');
    expect(formatLocalTimeDirect('2026-02-11T14:30:00', true)).toBe('14:30');
  });

  it('handles noon correctly', () => {
    expect(formatLocalTimeDirect('2026-02-11T12:00:00')).toBe('12:00 PM');
  });

  it('handles 12:30 AM edge case', () => {
    expect(formatLocalTimeDirect('2026-02-11T00:30:00')).toBe('12:30 AM');
  });

  // === CRITICAL: Flight ATL → DEN test case from bug report ===
  it('flight ATL→DEN: departure 6:00 AM stored as Z shows 6:00 AM', () => {
    // Parser returns 6:00 AM (local ATL time), edge function stored with Z
    expect(formatLocalTimeDirect('2026-02-11T06:00:00.000Z')).toBe('6:00 AM');
  });

  it('flight ATL→DEN: arrival 7:39 AM stored as Z shows 7:39 AM', () => {
    expect(formatLocalTimeDirect('2026-02-11T07:39:00.000Z')).toBe('7:39 AM');
  });

  // === CRITICAL: Airbnb stay test case from bug report ===
  it('Airbnb check-in: 4:00 PM stored as Z shows 4:00 PM', () => {
    expect(formatLocalTimeDirect('2026-02-12T16:00:00.000Z')).toBe('4:00 PM');
  });

  it('Airbnb check-out: 10:00 AM stored as Z shows 10:00 AM', () => {
    expect(formatLocalTimeDirect('2026-02-14T10:00:00.000Z')).toBe('10:00 AM');
  });
});

// ============================================================================
// formatLocalDateDirect
// ============================================================================

describe('formatLocalDateDirect', () => {
  it('extracts date from naive datetime string', () => {
    // Feb 11 2026 is a Wednesday
    expect(formatLocalDateDirect('2026-02-11T06:00:00')).toBe('Wed, Feb 11');
  });

  it('extracts date from Z-suffixed string (same digits)', () => {
    expect(formatLocalDateDirect('2026-02-11T06:00:00.000Z')).toBe('Wed, Feb 11');
  });

  it('extracts date from date-only string', () => {
    expect(formatLocalDateDirect('2026-02-11')).toBe('Wed, Feb 11');
  });

  it('formats in day-first style', () => {
    expect(formatLocalDateDirect('2026-02-11T06:00:00', true)).toBe('Wed, 11 Feb');
  });

  it('returns null for null/undefined', () => {
    expect(formatLocalDateDirect(null)).toBeNull();
    expect(formatLocalDateDirect(undefined)).toBeNull();
  });

  it('returns null for invalid strings', () => {
    expect(formatLocalDateDirect('not-a-date')).toBeNull();
  });

  // === Cross-timezone date preservation ===
  it('late-night UTC stored time preserves original date digits', () => {
    // If parser said Feb 12 at 11 PM, stored as 2026-02-12T23:00:00.000Z
    // Direct extraction should show Feb 12, NOT Feb 13 (as a UTC→device shift might cause)
    expect(formatLocalDateDirect('2026-02-12T23:00:00.000Z')).toBe('Thu, Feb 12');
  });
});

// ============================================================================
// Integration: Same day, different locations
// ============================================================================

describe('same day different locations', () => {
  it('flight and stay on same day can have different timezones', () => {
    // Flight departs ATL at 6:00 AM Eastern
    const flightTz = resolveBookingTimezone('flight', 'start', 'ATL', 'DEN', 'America/Denver');
    expect(flightTz).toBe('America/New_York');
    expect(formatLocalTimeDirect('2026-02-11T06:00:00.000Z')).toBe('6:00 AM');

    // Stay check-in at Colorado Springs at 4:00 PM Mountain
    const stayTz = resolveBookingTimezone('stay', 'start', null, null, 'America/Denver');
    expect(stayTz).toBe('America/Denver');
    expect(formatLocalTimeDirect('2026-02-11T16:00:00.000Z')).toBe('4:00 PM');

    // Different timezones, same day, correct local times
    expect(flightTz).not.toBe(stayTz);
  });
});

// ============================================================================
// Multi-day trip with changing conditions
// ============================================================================

describe('multi-day trip timeline', () => {
  it('correctly handles events across multiple days', () => {
    const events = [
      { dt: '2026-02-11T06:00:00.000Z', expected: '6:00 AM', date: 'Wed, Feb 11' },
      { dt: '2026-02-12T16:00:00.000Z', expected: '4:00 PM', date: 'Thu, Feb 12' },
      { dt: '2026-02-13T09:30:00.000Z', expected: '9:30 AM', date: 'Fri, Feb 13' },
      { dt: '2026-02-14T10:00:00.000Z', expected: '10:00 AM', date: 'Sat, Feb 14' },
    ];

    events.forEach(({ dt, expected, date }) => {
      expect(formatLocalTimeDirect(dt)).toBe(expected);
      expect(formatLocalDateDirect(dt)).toBe(date);
    });
  });
});

// ============================================================================
// Unknown timezone fallback
// ============================================================================

describe('unknown timezone fallback', () => {
  it('resolveBookingTimezone returns null for unknown airport', () => {
    const tz = resolveBookingTimezone('flight', 'start', 'ZZZ', null, null);
    expect(tz).toBeNull();
  });

  it('resolveBookingTimezone returns null for stay with no destination', () => {
    const tz = resolveBookingTimezone('stay', 'start', null, null, null);
    expect(tz).toBeNull();
  });

  it('formatLocalTimeDirect still works without timezone (renders as-is)', () => {
    // Even without timezone resolution, digit extraction gives correct local time
    expect(formatLocalTimeDirect('2026-02-11T14:00:00')).toBe('2:00 PM');
  });
});

// ============================================================================
// Unit switching (F/C) — temperature is in canonicalWeather, but time format preferences
// ============================================================================

describe('format preference switching', () => {
  it('12h and 24h formats both work', () => {
    const dt = '2026-02-11T14:30:00.000Z';
    expect(formatLocalTimeDirect(dt, false)).toBe('2:30 PM');
    expect(formatLocalTimeDirect(dt, true)).toBe('14:30');
  });

  it('date format preferences work', () => {
    const dt = '2026-02-11T14:30:00';
    expect(formatLocalDateDirect(dt, false)).toBe('Wed, Feb 11');
    expect(formatLocalDateDirect(dt, true)).toBe('Wed, 11 Feb');
  });
});

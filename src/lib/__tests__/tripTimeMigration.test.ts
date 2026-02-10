/**
 * v2.2.16: Tests for Existing Trip Time & Timeline Repair
 */

import { describe, it, expect } from 'vitest';
import {
  stripUtcSuffix,
  renormalizeBookingTime,
  migrateBooking,
  migrateTrip,
  repairExistingTripsTimeAndTimeline,
  CURRENT_TIME_MIGRATION_VERSION,
  MigrationBooking,
  MigrationTrip,
} from '../tripTimeMigration';

// ============================================================================
// stripUtcSuffix
// ============================================================================

describe('stripUtcSuffix', () => {
  it('removes trailing Z', () => {
    expect(stripUtcSuffix('2026-02-11T06:00:00.000Z')).toBe('2026-02-11T06:00:00.000');
    expect(stripUtcSuffix('2026-02-11T06:00:00Z')).toBe('2026-02-11T06:00:00');
  });

  it('removes trailing timezone offset', () => {
    expect(stripUtcSuffix('2026-02-11T06:00:00+05:00')).toBe('2026-02-11T06:00:00');
    expect(stripUtcSuffix('2026-02-11T16:00:00-04:00')).toBe('2026-02-11T16:00:00');
  });

  it('leaves naive datetimes unchanged', () => {
    expect(stripUtcSuffix('2026-02-11T06:00:00')).toBe('2026-02-11T06:00:00');
    expect(stripUtcSuffix('2026-02-11')).toBe('2026-02-11');
  });

  it('handles empty string', () => {
    expect(stripUtcSuffix('')).toBe('');
  });
});

// ============================================================================
// renormalizeBookingTime
// ============================================================================

describe('renormalizeBookingTime', () => {
  it('strips Z suffix from flight booking and resolves airport timezones', () => {
    const booking: MigrationBooking = {
      id: 'b1',
      booking_type: 'flight',
      start_datetime: '2026-02-11T06:00:00.000Z',
      end_datetime: '2026-02-11T07:39:00.000Z',
      departure_airport_code: 'ATL',
      arrival_airport_code: 'DEN',
    };
    const result = renormalizeBookingTime(booking, null);
    expect(result.normalizedStart).toBe('2026-02-11T06:00:00.000');
    expect(result.normalizedEnd).toBe('2026-02-11T07:39:00.000');
    expect(result.wasModified).toBe(true);
    expect(result.startTimeZone).toBe('America/New_York'); // ATL
    expect(result.endTimeZone).toBe('America/Denver'); // DEN
  });

  it('uses destination timezone for stay bookings', () => {
    const booking: MigrationBooking = {
      id: 'b2',
      booking_type: 'stay',
      start_datetime: '2026-02-11T16:00:00Z',
      end_datetime: '2026-02-14T10:00:00Z',
    };
    const result = renormalizeBookingTime(booking, 'America/Denver');
    expect(result.normalizedStart).toBe('2026-02-11T16:00:00');
    expect(result.normalizedEnd).toBe('2026-02-14T10:00:00');
    expect(result.startTimeZone).toBe('America/Denver');
    expect(result.endTimeZone).toBe('America/Denver');
    expect(result.wasModified).toBe(true);
  });

  it('reports wasModified=false for already-naive strings', () => {
    const booking: MigrationBooking = {
      id: 'b3',
      booking_type: 'stay',
      start_datetime: '2026-02-11T16:00:00',
      end_datetime: '2026-02-14T10:00:00',
    };
    const result = renormalizeBookingTime(booking, 'America/Denver');
    expect(result.wasModified).toBe(false);
  });
});

// ============================================================================
// migrateBooking
// ============================================================================

describe('migrateBooking', () => {
  it('bypasses manual-only bookings', () => {
    const booking: MigrationBooking = {
      id: 'manual-1',
      booking_type: 'activity',
      start_datetime: '2026-02-12T09:00:00Z',
      isManual: true,
    };
    const result = migrateBooking(booking, 'America/Denver');
    expect(result.wasModified).toBe(false);
    expect(result.timeIsEstimated).toBe(false);
    // Original datetime preserved as-is
    expect(result.normalizedStartDatetime).toBe('2026-02-12T09:00:00Z');
  });

  it('normalizes and validates a flight with matching confirmation tokens', () => {
    const booking: MigrationBooking = {
      id: 'flight-1',
      booking_type: 'flight',
      start_datetime: '2026-02-11T06:00:00.000Z',
      end_datetime: '2026-02-11T07:39:00.000Z',
      departure_airport_code: 'ATL',
      arrival_airport_code: 'DEN',
      confirmationTokens: [
        { rawToken: '6:00 AM', field: 'start' },
        { rawToken: '7:39 AM', field: 'end' },
      ],
    };
    const result = migrateBooking(booking, null);
    expect(result.wasModified).toBe(true);
    expect(result.timeIsEstimated).toBe(false);
    expect(result.issuesSummary).toBeNull();
    expect(result.normalizedStartDatetime).toBe('2026-02-11T06:00:00.000');
  });

  it('flags low-confidence when confirmation tokens do not match', () => {
    // Simulate UTC-shifted time: stored 01:00 but confirmation says 6:00 AM
    const booking: MigrationBooking = {
      id: 'flight-bad',
      booking_type: 'flight',
      start_datetime: '2026-02-11T01:00:00.000Z',
      departure_airport_code: 'ATL',
      arrival_airport_code: 'DEN',
      confirmationTokens: [
        { rawToken: '6:00 AM', field: 'start' },
      ],
    };
    const result = migrateBooking(booking, null);
    expect(result.timeIsEstimated).toBe(true);
    expect(result.issuesSummary).toContain('Start time');
  });

  it('skips validation when no confirmation tokens exist', () => {
    const booking: MigrationBooking = {
      id: 'stay-no-tokens',
      booking_type: 'stay',
      start_datetime: '2026-02-11T16:00:00Z',
      end_datetime: '2026-02-14T10:00:00Z',
    };
    const result = migrateBooking(booking, 'America/Denver');
    expect(result.wasModified).toBe(true);
    expect(result.timeIsEstimated).toBe(false);
    expect(result.issuesSummary).toBeNull();
  });
});

// ============================================================================
// migrateTrip
// ============================================================================

describe('migrateTrip', () => {
  const baseTrip: MigrationTrip = {
    id: 'trip-1',
    destination_state: 'CO',
    destination_country: 'United States',
  };

  it('migrates a trip with UTC-shifted bookings', () => {
    const bookings: MigrationBooking[] = [
      {
        id: 'b1',
        booking_type: 'flight',
        start_datetime: '2026-02-11T06:00:00Z',
        end_datetime: '2026-02-11T07:39:00Z',
        departure_airport_code: 'ATL',
        arrival_airport_code: 'DEN',
        confirmationTokens: [
          { rawToken: '6:00 AM', field: 'start' },
          { rawToken: '7:39 AM', field: 'end' },
        ],
      },
      {
        id: 'b2',
        booking_type: 'stay',
        start_datetime: '2026-02-11T16:00:00Z',
        end_datetime: '2026-02-14T10:00:00Z',
        confirmationTokens: [
          { rawToken: 'After 4:00 PM', field: 'start' },
          { rawToken: 'By 10:00 AM', field: 'end' },
        ],
      },
    ];

    const result = migrateTrip(baseTrip, bookings);
    expect(result.skipped).toBe(false);
    expect(result.modifiedCount).toBe(2);
    expect(result.lowConfidenceCount).toBe(0);
    expect(result.framePendingValidation).toBe(false);
    expect(result.migrationVersion).toBe(CURRENT_TIME_MIGRATION_VERSION);
  });

  it('sets framePendingValidation when any booking has mismatched times', () => {
    const bookings: MigrationBooking[] = [
      {
        id: 'good',
        booking_type: 'flight',
        start_datetime: '2026-02-11T06:00:00Z',
        departure_airport_code: 'ATL',
        arrival_airport_code: 'DEN',
        confirmationTokens: [{ rawToken: '6:00 AM', field: 'start' }],
      },
      {
        id: 'bad',
        booking_type: 'stay',
        start_datetime: '2026-02-11T01:00:00Z', // Wrong — should be 4:00 PM
        confirmationTokens: [{ rawToken: '4:00 PM', field: 'start' }],
      },
    ];

    const result = migrateTrip(baseTrip, bookings);
    expect(result.lowConfidenceCount).toBe(1);
    expect(result.framePendingValidation).toBe(true);
  });

  it('skips already-migrated trips', () => {
    const migratedTrip: MigrationTrip = {
      ...baseTrip,
      timeMigrationVersion: CURRENT_TIME_MIGRATION_VERSION,
    };
    const result = migrateTrip(migratedTrip, []);
    expect(result.skipped).toBe(true);
    expect(result.bookingResults).toHaveLength(0);
  });

  it('handles manual-only trip without flagging', () => {
    const bookings: MigrationBooking[] = [
      {
        id: 'manual-1',
        booking_type: 'activity',
        start_datetime: '2026-02-12T09:00:00Z',
        isManual: true,
      },
    ];
    const result = migrateTrip(baseTrip, bookings);
    expect(result.modifiedCount).toBe(0);
    expect(result.lowConfidenceCount).toBe(0);
    expect(result.framePendingValidation).toBe(false);
  });
});

// ============================================================================
// repairExistingTripsTimeAndTimeline (batch)
// ============================================================================

describe('repairExistingTripsTimeAndTimeline', () => {
  it('processes multiple trips and skips already-migrated ones', () => {
    const trips: MigrationTrip[] = [
      { id: 'trip-old', destination_country: 'United States', destination_state: 'CO' },
      { id: 'trip-migrated', destination_country: 'United States', timeMigrationVersion: CURRENT_TIME_MIGRATION_VERSION },
    ];
    const bookingsByTripId: Record<string, MigrationBooking[]> = {
      'trip-old': [
        {
          id: 'b1',
          booking_type: 'flight',
          start_datetime: '2026-02-11T06:00:00Z',
          departure_airport_code: 'ATL',
          arrival_airport_code: 'DEN',
        },
      ],
      'trip-migrated': [],
    };

    const results = repairExistingTripsTimeAndTimeline(trips, bookingsByTripId);
    expect(results).toHaveLength(2);
    expect(results[0].skipped).toBe(false);
    expect(results[0].modifiedCount).toBe(1);
    expect(results[1].skipped).toBe(true);
  });

  it('is idempotent — second run on same data produces no changes', () => {
    const trip: MigrationTrip = {
      id: 'trip-1',
      destination_country: 'United States',
      destination_state: 'CO',
    };
    const bookings: MigrationBooking[] = [
      {
        id: 'b1',
        booking_type: 'stay',
        start_datetime: '2026-02-11T16:00:00', // Already naive (no Z)
        end_datetime: '2026-02-14T10:00:00',
      },
    ];

    // First run
    const results1 = repairExistingTripsTimeAndTimeline([trip], { 'trip-1': bookings });
    expect(results1[0].modifiedCount).toBe(0); // Already clean

    // Simulate marking as migrated
    const migratedTrip: MigrationTrip = {
      ...trip,
      timeMigrationVersion: CURRENT_TIME_MIGRATION_VERSION,
    };
    const results2 = repairExistingTripsTimeAndTimeline([migratedTrip], { 'trip-1': bookings });
    expect(results2[0].skipped).toBe(true);
  });

  it('does not alter trips created after the fix (already naive datetimes)', () => {
    const trip: MigrationTrip = {
      id: 'new-trip',
      destination_country: 'United States',
      destination_state: 'GA',
    };
    const bookings: MigrationBooking[] = [
      {
        id: 'b1',
        booking_type: 'flight',
        start_datetime: '2026-03-01T08:00:00', // Already naive
        end_datetime: '2026-03-01T10:30:00',
        departure_airport_code: 'ATL',
        arrival_airport_code: 'DEN',
        confirmationTokens: [
          { rawToken: '8:00 AM', field: 'start' },
          { rawToken: '10:30 AM', field: 'end' },
        ],
      },
    ];

    const results = repairExistingTripsTimeAndTimeline([trip], { 'new-trip': bookings });
    expect(results[0].modifiedCount).toBe(0);
    expect(results[0].lowConfidenceCount).toBe(0);
    expect(results[0].framePendingValidation).toBe(false);
  });
});

// ============================================================================
// Confirmation token re-validation scenarios
// ============================================================================

describe('confirmation token re-validation during migration', () => {
  it('clears low-confidence when normalized time matches token', () => {
    const booking: MigrationBooking = {
      id: 'flight-ok',
      booking_type: 'flight',
      start_datetime: '2026-02-11T06:00:00Z', // Z suffix, but digits are correct
      departure_airport_code: 'ATL',
      arrival_airport_code: 'DEN',
      confirmationTokens: [{ rawToken: '6:00 AM', field: 'start' }],
    };
    const result = migrateBooking(booking, null);
    // After stripping Z, digits are 06:00 → matches "6:00 AM"
    expect(result.timeIsEstimated).toBe(false);
  });

  it('flags low-confidence when normalized time still mismatches token', () => {
    // Deliberately wrong: stored as 1:00 AM but confirmation says 6:00 AM
    const booking: MigrationBooking = {
      id: 'flight-bad',
      booking_type: 'flight',
      start_datetime: '2026-02-11T01:00:00Z',
      departure_airport_code: 'ATL',
      arrival_airport_code: 'DEN',
      confirmationTokens: [{ rawToken: '6:00 AM', field: 'start' }],
    };
    const result = migrateBooking(booking, null);
    expect(result.timeIsEstimated).toBe(true);
    expect(result.issuesSummary).toContain('6:00 AM');
  });
});

// ============================================================================
// Unknown-timezone fallback
// ============================================================================

describe('unknown timezone fallback', () => {
  it('still normalizes by stripping Z even without resolvable timezone', () => {
    const booking: MigrationBooking = {
      id: 'unknown-tz',
      booking_type: 'activity',
      start_datetime: '2026-02-12T14:00:00Z',
    };
    // Pass null for destination timezone (unknown)
    const result = migrateBooking(booking, null);
    expect(result.normalizedStartDatetime).toBe('2026-02-12T14:00:00');
    expect(result.startTimeZone).toBeNull();
    expect(result.wasModified).toBe(true);
    expect(result.timeIsEstimated).toBe(false);
  });
});

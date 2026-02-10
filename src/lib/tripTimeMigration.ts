/**
 * v2.2.16: Existing Trip Time & Timeline Repair
 *
 * One-time migration utility that re-normalizes booking-derived event times
 * for trips created before canonicalTimeNormalizer (v2.2.10).
 *
 * WHAT IT DOES:
 * 1. Scans bookings that may have UTC/toISOString() drift
 * 2. Re-normalizes via resolveBookingTimezone + formatLocalTimeDirect (same helpers as live ingestion)
 * 3. Re-validates against stored confirmation tokens (when available)
 * 4. Flags low-confidence events via the existing timeIsEstimated mechanism
 * 5. Marks trips with pending issues as framePendingValidation
 *
 * SAFETY:
 * - Idempotent: tracks timeMigrationVersion per trip
 * - Scoped: only touches booking time fields + confidence flags
 * - Manual-only events bypass entirely
 * - No UI changes
 */

import { resolveBookingTimezone, resolveDestinationTimezone, formatLocalTimeDirect } from './canonicalTimeNormalizer';
import { validateBookingTimes, ConfirmationTimeToken } from './confirmationTimeValidator';
import { shouldValidateBookingType } from './bookingIngestionValidator';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Current migration version. Increment if migration logic changes. */
export const CURRENT_TIME_MIGRATION_VERSION = 1;

// ============================================================================
// TYPES
// ============================================================================

/** Minimal booking shape for migration (subset of full Booking) */
export interface MigrationBooking {
  id: string;
  booking_type: string;
  start_datetime: string;
  end_datetime?: string | null;
  departure_airport_code?: string | null;
  arrival_airport_code?: string | null;
  vendor_name?: string;
  /** Optional: stored confirmation time tokens from original parse */
  confirmationTokens?: ConfirmationTimeToken[];
  /** Whether this booking was manually created (no confirmation source) */
  isManual?: boolean;
}

/** Minimal trip shape for migration */
export interface MigrationTrip {
  id: string;
  destination_state?: string | null;
  destination_country: string;
  /** If set and >= CURRENT_TIME_MIGRATION_VERSION, trip is already migrated */
  timeMigrationVersion?: number;
}

/** Result of migrating a single booking */
export interface BookingMigrationResult {
  bookingId: string;
  /** Original start_datetime before migration */
  originalStartDatetime: string;
  /** Original end_datetime before migration */
  originalEndDatetime: string | null;
  /** Re-normalized start_datetime */
  normalizedStartDatetime: string;
  /** Re-normalized end_datetime */
  normalizedEndDatetime: string | null;
  /** Whether times changed from the original */
  wasModified: boolean;
  /** Whether the booking is flagged as low-confidence after re-validation */
  timeIsEstimated: boolean;
  /** Validation issues summary (null if valid or no tokens) */
  issuesSummary: string | null;
  /** Resolved timezone for the start field */
  startTimeZone: string | null;
  /** Resolved timezone for the end field */
  endTimeZone: string | null;
}

/** Result of migrating an entire trip */
export interface TripMigrationResult {
  tripId: string;
  /** Whether the trip was already migrated (skipped) */
  skipped: boolean;
  /** Per-booking results */
  bookingResults: BookingMigrationResult[];
  /** Number of bookings whose times were actually modified */
  modifiedCount: number;
  /** Number of bookings flagged as low-confidence */
  lowConfidenceCount: number;
  /** Whether the trip frame should be marked as pending validation */
  framePendingValidation: boolean;
  /** Migration version applied */
  migrationVersion: number;
}

// ============================================================================
// CORE MIGRATION LOGIC
// ============================================================================

/**
 * Re-normalize a single booking's time fields using canonical helpers.
 *
 * For most bookings, the stored datetime string's HH:MM digits ARE the correct
 * local time — the issue was only in how they were RENDERED (via `new Date()`).
 * The normalizer strips any trailing "Z" suffix so renderers treat the string
 * as a naive local datetime, avoiding browser timezone shifts.
 *
 * @param booking - The booking to re-normalize
 * @param tripDestinationTimeZone - IANA timezone for the trip destination (non-flight events)
 */
export function renormalizeBookingTime(
  booking: MigrationBooking,
  tripDestinationTimeZone: string | null
): {
  normalizedStart: string;
  normalizedEnd: string | null;
  startTimeZone: string | null;
  endTimeZone: string | null;
  wasModified: boolean;
} {
  // Resolve timezones per booking type
  const startTz = resolveBookingTimezone(
    booking.booking_type,
    'start',
    booking.departure_airport_code,
    booking.arrival_airport_code,
    tripDestinationTimeZone
  );
  const endTz = resolveBookingTimezone(
    booking.booking_type,
    'end',
    booking.departure_airport_code,
    booking.arrival_airport_code,
    tripDestinationTimeZone
  );

  // Strip "Z" suffix to prevent new Date() UTC shifting — the digits are already local
  const normalizedStart = stripUtcSuffix(booking.start_datetime);
  const normalizedEnd = booking.end_datetime ? stripUtcSuffix(booking.end_datetime) : null;

  const wasModified =
    normalizedStart !== booking.start_datetime ||
    normalizedEnd !== booking.end_datetime;

  return {
    normalizedStart,
    normalizedEnd,
    startTimeZone: startTz,
    endTimeZone: endTz,
    wasModified,
  };
}

/**
 * Migrate a single booking: re-normalize + re-validate.
 */
export function migrateBooking(
  booking: MigrationBooking,
  tripDestinationTimeZone: string | null
): BookingMigrationResult {
  // Manual-only events bypass entirely
  if (booking.isManual || !shouldValidateBookingType(booking.booking_type)) {
    return {
      bookingId: booking.id,
      originalStartDatetime: booking.start_datetime,
      originalEndDatetime: booking.end_datetime || null,
      normalizedStartDatetime: booking.start_datetime,
      normalizedEndDatetime: booking.end_datetime || null,
      wasModified: false,
      timeIsEstimated: false,
      issuesSummary: null,
      startTimeZone: null,
      endTimeZone: null,
    };
  }

  // Step 1: Re-normalize
  const { normalizedStart, normalizedEnd, startTimeZone, endTimeZone, wasModified } =
    renormalizeBookingTime(booking, tripDestinationTimeZone);

  // Step 2: Re-validate against confirmation tokens (if available)
  let timeIsEstimated = false;
  let issuesSummary: string | null = null;

  if (booking.confirmationTokens && booking.confirmationTokens.length > 0) {
    const validation = validateBookingTimes(
      normalizedStart,
      normalizedEnd,
      booking.confirmationTokens,
      2 // 2-minute tolerance
    );

    if (validation.isLowConfidence) {
      timeIsEstimated = true;
      const issues = validation.fields
        .filter(f => !f.isValid)
        .map(f => {
          const fieldLabel = f.field === 'start' ? 'Start time' : 'End time';
          return `${fieldLabel}: expected "${f.confirmationAnchor}" but got "${f.canonicalTime || 'none'}"`;
        });
      issuesSummary = issues.join('; ');
    }
  }

  return {
    bookingId: booking.id,
    originalStartDatetime: booking.start_datetime,
    originalEndDatetime: booking.end_datetime || null,
    normalizedStartDatetime: normalizedStart,
    normalizedEndDatetime: normalizedEnd,
    wasModified,
    timeIsEstimated,
    issuesSummary,
    startTimeZone: startTimeZone,
    endTimeZone: endTimeZone,
  };
}

/**
 * Migrate all bookings for a single trip.
 *
 * @param trip - The trip to migrate
 * @param bookings - All booking-derived events for this trip
 * @returns Migration result with per-booking details
 */
export function migrateTrip(
  trip: MigrationTrip,
  bookings: MigrationBooking[]
): TripMigrationResult {
  // Check if already migrated
  if (
    trip.timeMigrationVersion !== undefined &&
    trip.timeMigrationVersion >= CURRENT_TIME_MIGRATION_VERSION
  ) {
    return {
      tripId: trip.id,
      skipped: true,
      bookingResults: [],
      modifiedCount: 0,
      lowConfidenceCount: 0,
      framePendingValidation: false,
      migrationVersion: trip.timeMigrationVersion,
    };
  }

  // Resolve destination timezone for non-flight events
  const destTz = resolveDestinationTimezone(trip.destination_state, trip.destination_country);

  // Migrate each booking
  const bookingResults = bookings.map(b => migrateBooking(b, destTz));

  const modifiedCount = bookingResults.filter(r => r.wasModified).length;
  const lowConfidenceCount = bookingResults.filter(r => r.timeIsEstimated).length;

  // Trip frame is pending validation if any booking has low-confidence times
  const framePendingValidation = lowConfidenceCount > 0;

  return {
    tripId: trip.id,
    skipped: false,
    bookingResults,
    modifiedCount,
    lowConfidenceCount,
    framePendingValidation,
    migrationVersion: CURRENT_TIME_MIGRATION_VERSION,
  };
}

/**
 * Run the full migration across multiple trips.
 *
 * @param trips - All trips to consider for migration
 * @param bookingsByTripId - Map of trip ID → bookings
 * @returns Array of per-trip migration results
 */
export function repairExistingTripsTimeAndTimeline(
  trips: MigrationTrip[],
  bookingsByTripId: Record<string, MigrationBooking[]>
): TripMigrationResult[] {
  return trips.map(trip => {
    const bookings = bookingsByTripId[trip.id] || [];
    return migrateTrip(trip, bookings);
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Strip the trailing "Z" or timezone offset from an ISO datetime string.
 * This converts a UTC-tagged string into a naive local datetime,
 * preserving the HH:MM digits as the correct local time.
 *
 * Examples:
 *   "2026-02-11T06:00:00.000Z"      → "2026-02-11T06:00:00.000"
 *   "2026-02-11T06:00:00Z"          → "2026-02-11T06:00:00"
 *   "2026-02-11T06:00:00+05:00"     → "2026-02-11T06:00:00"
 *   "2026-02-11T06:00:00"           → "2026-02-11T06:00:00" (no change)
 *   "2026-02-11"                    → "2026-02-11" (no change)
 */
export function stripUtcSuffix(datetimeStr: string): string {
  if (!datetimeStr) return datetimeStr;

  // Remove trailing Z
  if (datetimeStr.endsWith('Z')) {
    return datetimeStr.slice(0, -1);
  }

  // Remove trailing timezone offset like +05:00 or -04:00
  const offsetMatch = datetimeStr.match(/^(.+T\d{2}:\d{2}(:\d{2})?(\.\d+)?)[+-]\d{2}:\d{2}$/);
  if (offsetMatch) {
    return offsetMatch[1];
  }

  return datetimeStr;
}

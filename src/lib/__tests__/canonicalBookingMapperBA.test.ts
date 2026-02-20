/**
 * v4.4.2: BA-style four-leg itinerary with NO IATA codes
 *
 * Proves that:
 * 1. canonicalBookingMapper returns all 4 legs (none dropped due to missing codes).
 * 2. deriveTripDatesFromCanonical returns the correct trip bounds.
 * 3. _parse_issues are attached for missing airport codes.
 */
import { describe, it, expect } from 'vitest';
import {
  buildBookingsFromCanonicalImport,
  deriveTripDatesFromCanonical,
} from '@/lib/import/canonicalBookingMapper';
import type { CanonicalImportBatch } from '@/lib/import/canonicalBookingMapper.types';

function buildBABatch(): CanonicalImportBatch {
  return {
    trip: {
      trip_name: 'BA Europe Trip',
      destination_city: 'Milan',
      destination_country: 'Italy',
    },
    bookings: [
      {
        booking_type: 'flight',
        vendor_name: 'British Airways',
        start_datetime: '2026-03-11T23:10:00',
        end_datetime: '2026-03-12T11:15:00',
        confirmation_number: 'BA1234',
        departure_airport_code: null,
        arrival_airport_code: null,
        from_location: 'Hartsfield-Jackson Int',
        to_location: 'Heathrow (London)',
      },
      {
        booking_type: 'flight',
        vendor_name: 'British Airways',
        start_datetime: '2026-03-12T14:40:00',
        end_datetime: '2026-03-12T17:45:00',
        confirmation_number: 'BA1234',
        departure_airport_code: null,
        arrival_airport_code: null,
        from_location: 'Heathrow (London)',
        to_location: 'Linate (Milan)',
      },
      {
        booking_type: 'flight',
        vendor_name: 'British Airways',
        start_datetime: '2026-03-26T12:40:00',
        end_datetime: '2026-03-26T13:45:00',
        confirmation_number: 'BA1234',
        departure_airport_code: null,
        arrival_airport_code: null,
        from_location: 'Linate (Milan)',
        to_location: 'Heathrow (London)',
      },
      {
        booking_type: 'flight',
        vendor_name: 'British Airways',
        start_datetime: '2026-03-26T15:35:00',
        end_datetime: '2026-03-26T21:10:00',
        confirmation_number: 'BA1234',
        departure_airport_code: null,
        arrival_airport_code: null,
        from_location: 'Heathrow (London)',
        to_location: 'Hartsfield-Jackson Int',
      },
    ],
  };
}

describe('v4.4.2: BA multi-leg — no IATA codes', () => {
  it('buildBookingsFromCanonicalImport returns all 4 legs', () => {
    const batch = buildBABatch();
    const result = buildBookingsFromCanonicalImport(
      batch as unknown as Record<string, unknown>,
      'test-trip-id',
      'GBP',
    );

    expect(result).not.toBeNull();
    expect(result!.bookings).toHaveLength(4);

    // Every leg is a flight
    for (const b of result!.bookings) {
      expect(b.booking_type).toBe('flight');
      expect(b.trip_id).toBe('test-trip-id');
      expect(b._extracted_currency).toBe('GBP');
    }

    // Verify first leg airports
    expect(result!.bookings[0].from_location).toBe('Hartsfield-Jackson Int');
    expect(result!.bookings[0].to_location).toBe('Heathrow (London)');
    expect(result!.bookings[0].departure_airport_code).toBeNull();
    expect(result!.bookings[0].arrival_airport_code).toBeNull();
  });

  it('deriveTripDatesFromCanonical returns correct bounds for all 4 legs', () => {
    const batch = buildBABatch();
    const dates = deriveTripDatesFromCanonical(batch.bookings);

    expect(dates.start_date).toBe('2026-03-11');
    expect(dates.end_date).toBe('2026-03-26');
  });

  it('trip bounds from buildBookingsFromCanonicalImport match leg dates', () => {
    const batch = buildBABatch();
    const result = buildBookingsFromCanonicalImport(
      batch as unknown as Record<string, unknown>,
      'test-trip-id',
    );

    expect(result!.tripBounds.start_date).toBe('2026-03-11');
    expect(result!.tripBounds.end_date).toBe('2026-03-26');
  });

  it('attaches MISSING_AIRPORT_CODE parse issues to each leg', () => {
    const batch = buildBABatch();
    // Run through the mapper to trigger issue attachment
    buildBookingsFromCanonicalImport(
      batch as unknown as Record<string, unknown>,
      'test-trip-id',
    );

    // After mapping, the original batch bookings should have _parse_issues
    for (const booking of batch.bookings) {
      expect(booking._parse_issues).toBeDefined();
      expect(Array.isArray(booking._parse_issues)).toBe(true);
      const issues = booking._parse_issues as any[];
      // Each leg missing both departure and arrival codes → 2 issues
      expect(issues.length).toBe(2);
      expect(issues[0].issueType).toBe('MISSING_AIRPORT_CODE');
      expect(issues[1].issueType).toBe('MISSING_AIRPORT_CODE');
    }
  });

  it('does NOT attach issues when IATA codes are present', () => {
    const batch: CanonicalImportBatch = {
      bookings: [
        {
          booking_type: 'flight',
          vendor_name: 'Delta',
          start_datetime: '2026-04-01T08:00:00',
          end_datetime: '2026-04-01T12:00:00',
          confirmation_number: 'DL999',
          departure_airport_code: 'ATL',
          arrival_airport_code: 'JFK',
        },
      ],
    };

    const result = buildBookingsFromCanonicalImport(
      batch as unknown as Record<string, unknown>,
      'test-trip-id',
    );

    expect(result).not.toBeNull();
    expect(result!.bookings).toHaveLength(1);
    // No issues should have been attached
    expect(batch.bookings[0]._parse_issues).toBeUndefined();
  });
});

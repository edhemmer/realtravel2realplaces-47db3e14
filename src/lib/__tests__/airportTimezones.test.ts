/**
 * v2.2.4: Airport Timezone Resolver & Flight Time Display Tests
 * 
 * Verifies that flight times display in airport-local time regardless
 * of the viewer's device timezone.
 */

import { describe, it, expect } from 'vitest';
import { getAirportTimeZone, formatTimeInTimezone, formatDateInTimezone } from '../airportTimezones';
import { buildCanonicalTimeline } from '../canonicalTripState';
import { Booking, Parking } from '@/types/database';

describe('getAirportTimeZone', () => {
  it('returns correct timezone for ATL', () => {
    expect(getAirportTimeZone('ATL')).toBe('America/New_York');
  });

  it('returns correct timezone for DEN', () => {
    expect(getAirportTimeZone('DEN')).toBe('America/Denver');
  });

  it('returns correct timezone for LAX', () => {
    expect(getAirportTimeZone('LAX')).toBe('America/Los_Angeles');
  });

  it('returns correct timezone for LHR', () => {
    expect(getAirportTimeZone('LHR')).toBe('Europe/London');
  });

  it('handles case-insensitive input', () => {
    expect(getAirportTimeZone('atl')).toBe('America/New_York');
    expect(getAirportTimeZone('den')).toBe('America/Denver');
  });

  it('returns fallback for unknown code', () => {
    expect(getAirportTimeZone('ZZZ', 'America/Chicago')).toBe('America/Chicago');
  });

  it('returns undefined for unknown code with no fallback', () => {
    expect(getAirportTimeZone('ZZZ')).toBeUndefined();
  });

  it('handles null/undefined input', () => {
    expect(getAirportTimeZone(null)).toBeUndefined();
    expect(getAirportTimeZone(undefined)).toBeUndefined();
  });
});

describe('formatTimeInTimezone', () => {
  it('formats ATL departure at 6:00 AM Eastern correctly', () => {
    // 6:00 AM Eastern = 11:00 UTC (during EST, non-DST)
    const utcIso = '2026-02-11T11:00:00Z';
    const result = formatTimeInTimezone(utcIso, 'America/New_York');
    expect(result).toBe('6:00 AM');
  });

  it('formats DEN arrival at 1:33 PM Mountain correctly', () => {
    // 1:33 PM Mountain = 20:33 UTC (during MST, non-DST)
    const utcIso = '2026-02-14T20:33:00Z';
    const result = formatTimeInTimezone(utcIso, 'America/Denver');
    expect(result).toBe('1:33 PM');
  });

  it('formats in 24h mode', () => {
    const utcIso = '2026-02-14T20:33:00Z';
    const result = formatTimeInTimezone(utcIso, 'America/Denver', true);
    // 24h mode: 1:33 PM = 13:33
    expect(result).toBe('13:33');
  });

  it('returns null for invalid input', () => {
    expect(formatTimeInTimezone(null, 'America/New_York')).toBeNull();
    expect(formatTimeInTimezone('', 'America/New_York')).toBeNull();
  });
});

describe('formatDateInTimezone', () => {
  it('formats date correctly in Eastern timezone', () => {
    const utcIso = '2026-02-11T11:00:00Z';
    const result = formatDateInTimezone(utcIso, 'America/New_York');
    expect(result).toContain('Feb');
    expect(result).toContain('11');
  });

  it('handles date that crosses midnight in different timezone', () => {
    // 1 AM UTC Feb 12 = 8 PM EST Feb 11
    const utcIso = '2026-02-12T01:00:00Z';
    const result = formatDateInTimezone(utcIso, 'America/New_York');
    expect(result).toContain('Feb');
    expect(result).toContain('11');
  });
});

describe('ATL → DEN real-world scenario (v2.2.4 regression)', () => {
  /**
   * Real example:
   * ATL → DEN
   * Departure: Wed Feb 11, 2026 at 6:00 AM (ATL = America/New_York)
   * Return: Sat Feb 14, 2026 at 1:33 PM (DEN = America/Denver)
   * 
   * These times MUST display as 6:00 AM and 1:33 PM regardless of
   * the browser/device timezone.
   */
  
  const mockOutboundFlight: Booking = {
    id: 'flight-atl-den',
    trip_id: 'trip-1',
    booking_type: 'flight',
    vendor_name: 'Delta Air Lines',
    airline: 'Delta Air Lines',
    start_datetime: '2026-02-11T11:00:00Z', // 6:00 AM Eastern
    end_datetime: '2026-02-11T14:33:00Z', // Arrival in Denver local would be different
    departure_airport_code: 'ATL',
    departure_airport_name: 'Hartsfield-Jackson Atlanta International',
    arrival_airport_code: 'DEN',
    arrival_airport_name: 'Denver International',
    confirmation_number: 'ABC123',
    total_cost: 350,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    address: null,
    advance_recommended: null,
    activity_source: null,
    booking_pattern: null,
    booking_url: null,
    from_location: null,
    frequent_flyer_number: null,
    link_url: null,
    location_summary: null,
    my_share: null,
    notes: null,
    operator: null,
    passenger_name: 'John Doe',
    pickup_location: null,
    property_name: null,
    rental_company: null,
    return_location: null,
    stay_type: null,
    ticket_required: null,
    tickets_purchased: null,
    to_location: null,
    transport_mode: null,
    tsa_precheck_number: null,
  } as unknown as Booking;

  const mockReturnFlight: Booking = {
    id: 'flight-den-atl',
    trip_id: 'trip-1',
    booking_type: 'flight',
    vendor_name: 'Delta Air Lines',
    airline: 'Delta Air Lines',
    start_datetime: '2026-02-14T20:33:00Z', // 1:33 PM Mountain
    end_datetime: '2026-02-15T01:00:00Z',
    departure_airport_code: 'DEN',
    departure_airport_name: 'Denver International',
    arrival_airport_code: 'ATL',
    arrival_airport_name: 'Hartsfield-Jackson Atlanta International',
    confirmation_number: 'ABC123',
    total_cost: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    address: null,
    advance_recommended: null,
    activity_source: null,
    booking_pattern: null,
    booking_url: null,
    from_location: null,
    frequent_flyer_number: null,
    link_url: null,
    location_summary: null,
    my_share: null,
    notes: null,
    operator: null,
    passenger_name: 'John Doe',
    pickup_location: null,
    property_name: null,
    rental_company: null,
    return_location: null,
    stay_type: null,
    ticket_required: null,
    tickets_purchased: null,
    to_location: null,
    transport_mode: null,
    tsa_precheck_number: null,
  } as unknown as Booking;

  it('timeline events include timezone-aware fields for outbound flight', () => {
    const events = buildCanonicalTimeline([mockOutboundFlight], []);
    const flightEvent = events.find(e => e.sourceId === 'flight-atl-den');
    
    expect(flightEvent).toBeDefined();
    expect(flightEvent!.departureTimeZone).toBe('America/New_York');
    expect(flightEvent!.arrivalTimeZone).toBe('America/Denver');
    expect(flightEvent!.departureLocalTime).toBe('2026-02-11T11:00:00Z');
    expect(flightEvent!.arrivalLocalTime).toBe('2026-02-11T14:33:00Z');
  });

  it('departure displays as 6:00 AM regardless of device timezone', () => {
    const events = buildCanonicalTimeline([mockOutboundFlight], []);
    const flightEvent = events.find(e => e.sourceId === 'flight-atl-den');
    
    // Format using the timezone-aware helper
    const depTime = formatTimeInTimezone(
      flightEvent!.departureLocalTime!,
      flightEvent!.departureTimeZone!
    );
    expect(depTime).toBe('6:00 AM');
  });

  it('return flight departure displays as 1:33 PM Mountain', () => {
    const events = buildCanonicalTimeline([mockReturnFlight], []);
    const returnEvent = events.find(e => e.sourceId === 'flight-den-atl');
    
    expect(returnEvent!.departureTimeZone).toBe('America/Denver');
    
    const depTime = formatTimeInTimezone(
      returnEvent!.departureLocalTime!,
      returnEvent!.departureTimeZone!
    );
    expect(depTime).toBe('1:33 PM');
  });

  it('existing trips without airport codes still render (backwards compat)', () => {
    const legacyFlight: Booking = {
      ...mockOutboundFlight,
      id: 'legacy-flight',
      departure_airport_code: null,
      arrival_airport_code: null,
    } as unknown as Booking;
    
    const events = buildCanonicalTimeline([legacyFlight], []);
    const flightEvent = events.find(e => e.sourceId === 'legacy-flight');
    
    expect(flightEvent).toBeDefined();
    expect(flightEvent!.departureTimeZone).toBeUndefined();
    expect(flightEvent!.arrivalTimeZone).toBeUndefined();
    // Should still have datetime for legacy rendering
    expect(flightEvent!.datetime).toBeDefined();
    expect(flightEvent!.departureTime).toBeDefined();
  });
});

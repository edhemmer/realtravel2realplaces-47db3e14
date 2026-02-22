/**
 * v3.9.41: Tests for Explore origin resolver — planning-mode awareness
 * and dining lane presence.
 */

import { describe, it, expect } from 'vitest';
import { resolveExploreOriginForContext, hasExploreDestination, buildExploreMapSearchUrl } from '@/lib/location/exploreContext';
import type { ExploreOrigin } from '@/lib/location/exploreContext';
import { buildExploreSections } from '@/lib/exploreRankingSections';
import { getMockAttractions, dedupeAttractions, rankAttractions } from '@/lib/mockAttractions';
import type { Trip, Booking } from '@/types/database';

// ============================================================================
// HELPERS
// ============================================================================

function makeTripBase(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    user_id: 'u1',
    name: 'Test Trip',
    start_date: '2026-04-01',
    end_date: '2026-04-15',
    destination_city: 'Tenerife',
    destination_country: 'Spain',
    destination_state: null,
    destination_address: null,
    destination_type: 'beach',
    origin_address: null,
    transportation_mode: 'flight',
    trip_type: 'personal',
    trip_state: 'active',
    estimated_miles: null,
    notes: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as Trip;
}

function makeStayBooking(lat?: number, lng?: number): Booking {
  return {
    id: 'stay-1',
    trip_id: 'trip-1',
    booking_type: 'stay',
    vendor_name: 'Hotel Tenerife',
    start_datetime: '2026-04-01T14:00:00',
    end_datetime: '2026-04-15T11:00:00',
    address: '123 Beach Road, Tenerife, Spain',
    property_name: 'Hotel Tenerife',
    total_cost: 1200,
    my_share: null,
    arrival_airport_code: null,
    arrival_airport_name: null,
    departure_airport_code: null,
    departure_airport_name: null,
    confirmation_number: null,
    airline: null,
    booking_url: null,
    created_at: '',
    updated_at: '',
    notes: null,
    from_location: null,
    to_location: null,
    location_summary: null,
    link_url: null,
    operator: null,
    passenger_name: null,
    pickup_location: null,
    return_location: null,
    rental_company: null,
    stay_type: 'hotel',
    transport_mode: null,
    ticket_required: null,
    tickets_purchased: null,
    tsa_precheck_number: null,
    frequent_flyer_number: null,
    booking_pattern: null,
    activity_source: null,
    advance_recommended: null,
  } as Booking;
}

function makeFlightBooking(arrCode: string): Booking {
  return {
    id: 'flight-1',
    trip_id: 'trip-1',
    booking_type: 'flight',
    vendor_name: 'Wizz Air',
    start_datetime: '2026-04-01T06:00:00',
    arrival_airport_code: arrCode,
    arrival_airport_name: `${arrCode} Airport`,
    departure_airport_code: 'LHR',
    departure_airport_name: 'London Heathrow',
    address: null,
    property_name: null,
    total_cost: 300,
    my_share: null,
    end_datetime: '2026-04-01T10:00:00',
    confirmation_number: null,
    airline: 'Wizz Air',
    booking_url: null,
    created_at: '',
    updated_at: '',
    notes: null,
    from_location: null,
    to_location: null,
    location_summary: null,
    link_url: null,
    operator: null,
    passenger_name: null,
    pickup_location: null,
    return_location: null,
    rental_company: null,
    stay_type: null,
    transport_mode: null,
    ticket_required: null,
    tickets_purchased: null,
    tsa_precheck_number: null,
    frequent_flyer_number: null,
    booking_pattern: null,
    activity_source: null,
    advance_recommended: null,
  } as Booking;
}

// ============================================================================
// ORIGIN RESOLVER — PLANNING MODE
// ============================================================================

describe('Explore Origin Resolver — Planning Mode', () => {
  const futureTrip = makeTripBase({
    start_date: '2026-06-01',
    end_date: '2026-06-15',
  });

  it('returns ARRIVAL_AIRPORT origin in planning mode with flight, ignoring device', () => {
    const homeDevice = { lat: 40.7128, lng: -74.006 }; // NYC (user's home)
    const bookings = [makeFlightBooking('TFS')];

    const origin = resolveExploreOriginForContext({
      tripId: futureTrip.id,
      trip: futureTrip,
      bookings,
      timelineEvents: [],
      isActive: false,
      deviceLocation: homeDevice,
    });

    expect(origin).not.toBeNull();
    expect(origin!.source).toBe('ARRIVAL_AIRPORT');
    // Must NOT return device coords (NYC)
    expect(origin!.lat).not.toBeCloseTo(40.71, 0);
    // TFS coords ~ 28.04
    expect(origin!.lat).toBeCloseTo(28.04, 0);
  });

  it('never returns DEVICE origin in planning mode', () => {
    const homeDevice = { lat: 40.7128, lng: -74.006 };
    const bookings = [makeFlightBooking('TFS')];

    const origin = resolveExploreOriginForContext({
      tripId: futureTrip.id,
      trip: futureTrip,
      bookings,
      timelineEvents: [],
      isActive: false,
      deviceLocation: homeDevice,
    });

    expect(origin?.source).not.toBe('DEVICE');
  });

  it('returns null when no destination info', () => {
    const noDestTrip = makeTripBase({
      destination_city: null,
      destination_country: null,
      destination_address: null,
    });

    expect(hasExploreDestination(noDestTrip)).toBe(false);

    const origin = resolveExploreOriginForContext({
      tripId: noDestTrip.id,
      trip: noDestTrip,
      bookings: [],
      timelineEvents: [],
      isActive: false,
    });

    expect(origin).toBeNull();
  });
});

// ============================================================================
// ORIGIN RESOLVER — ACTIVE TRIP
// ============================================================================

describe('Explore Origin Resolver — Active Trip', () => {
  it('returns DEVICE when user is near destination during active trip', () => {
    const activeTrip = makeTripBase({
      start_date: '2026-02-15',
      end_date: '2026-03-01',
    });
    // Device near TFS (28.04, -16.57)
    const nearDevice = { lat: 28.05, lng: -16.56 };
    const bookings = [makeFlightBooking('TFS')];

    const origin = resolveExploreOriginForContext({
      tripId: activeTrip.id,
      trip: activeTrip,
      bookings,
      timelineEvents: [],
      isActive: true,
      deviceLocation: nearDevice,
    });

    expect(origin).not.toBeNull();
    expect(origin!.source).toBe('DEVICE');
  });

  it('does NOT return DEVICE when user is far from destination during active trip', () => {
    const activeTrip = makeTripBase({
      start_date: '2026-02-15',
      end_date: '2026-03-01',
    });
    // Device in NYC (far from Tenerife)
    const farDevice = { lat: 40.71, lng: -74.01 };
    const bookings = [makeFlightBooking('TFS')];

    const origin = resolveExploreOriginForContext({
      tripId: activeTrip.id,
      trip: activeTrip,
      bookings,
      timelineEvents: [],
      isActive: true,
      deviceLocation: farDevice,
    });

    expect(origin).not.toBeNull();
    // Should fall back to ARRIVAL_AIRPORT, not DEVICE
    expect(origin!.source).not.toBe('DEVICE');
    expect(origin!.source).toBe('ARRIVAL_AIRPORT');
  });
});

// ============================================================================
// v3.5.3: COORDS-ONLY ORIGIN RESOLUTION
// ============================================================================

describe('Explore Origin Resolver — Coords Only (v3.5.3)', () => {
  it('resolveExploreOriginForContext always returns numeric lat/lng, never strings', () => {
    const trip = makeTripBase();
    const bookings = [makeFlightBooking('TFS')];

    const origin = resolveExploreOriginForContext({
      tripId: trip.id,
      trip,
      bookings,
      timelineEvents: [],
      isActive: false,
    });

    expect(origin).not.toBeNull();
    expect(typeof origin!.lat).toBe('number');
    expect(typeof origin!.lng).toBe('number');
    expect(Number.isFinite(origin!.lat)).toBe(true);
    expect(Number.isFinite(origin!.lng)).toBe(true);
  });

  it('pre-arrival with flight + stay resolves to airport coords (not string)', () => {
    const trip = makeTripBase({ start_date: '2026-06-01', end_date: '2026-06-15' });
    const bookings = [makeFlightBooking('TFS'), makeStayBooking()];

    const origin = resolveExploreOriginForContext({
      tripId: trip.id,
      trip,
      bookings,
      timelineEvents: [],
      isActive: false,
    });

    expect(origin).not.toBeNull();
    // Stay has no coords in this mock, so falls to airport
    expect(origin!.source).toBe('ARRIVAL_AIRPORT');
    expect(origin!.lat).toBeCloseTo(28.04, 0); // TFS
    expect(origin!.lng).toBeCloseTo(-16.57, 0);
  });

  it('pre-arrival with flight only (no stay) resolves to airport coords', () => {
    const trip = makeTripBase({ start_date: '2026-06-01', end_date: '2026-06-15' });
    const bookings = [makeFlightBooking('ATH')];

    const origin = resolveExploreOriginForContext({
      tripId: trip.id,
      trip,
      bookings,
      timelineEvents: [],
      isActive: false,
    });

    expect(origin).not.toBeNull();
    expect(origin!.source).toBe('ARRIVAL_AIRPORT');
    // ATH coords ~ 37.94, 23.94
    expect(origin!.lat).toBeCloseTo(37.94, 0);
    expect(origin!.lng).toBeCloseTo(23.94, 0);
  });

  it('arrived (within 15mi) resolves to device coords, not city string', () => {
    const activeTrip = makeTripBase({
      start_date: '2026-02-15',
      end_date: '2026-03-01',
    });
    const nearDevice = { lat: 28.05, lng: -16.56 }; // Near TFS
    const bookings = [makeFlightBooking('TFS')];

    const origin = resolveExploreOriginForContext({
      tripId: activeTrip.id,
      trip: activeTrip,
      bookings,
      timelineEvents: [],
      isActive: true,
      deviceLocation: nearDevice,
    });

    expect(origin).not.toBeNull();
    expect(origin!.source).toBe('DEVICE');
    expect(origin!.lat).toBe(nearDevice.lat);
    expect(origin!.lng).toBe(nearDevice.lng);
  });

  it('buildExploreMapSearchUrl uses only lat,lng in query param', () => {
    const origin: ExploreOrigin = {
      lat: 33.64,
      lng: -84.43,
      label: 'ATL – Hartsfield-Jackson',
      source: 'ARRIVAL_AIRPORT',
    };
    const url = buildExploreMapSearchUrl(origin);
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=33.64,-84.43');
    // Must NOT contain labels, city names, or airport codes
    expect(url).not.toContain('ATL');
    expect(url).not.toContain('Hartsfield');
    expect(url).not.toContain('Nearby');
    expect(url).not.toContain('Atlanta');
  });

  it('buildExploreMapSearchUrl never contains string-based queries', () => {
    const origins: ExploreOrigin[] = [
      { lat: 40.64, lng: -73.78, label: 'JFK – John F. Kennedy', source: 'ARRIVAL_AIRPORT' },
      { lat: 28.05, lng: -16.56, label: 'Current location', source: 'DEVICE' },
      { lat: 41.39, lng: 2.15, label: 'Barcelona, Spain', source: 'DESTINATION' },
      { lat: 51.47, lng: -0.45, label: 'Your lodging (Hilton)', source: 'LODGING' },
    ];

    for (const origin of origins) {
      const url = buildExploreMapSearchUrl(origin);
      const queryParam = new URL(url).searchParams.get('query')!;
      // Must be "lat,lng" format — two numbers separated by comma
      expect(queryParam).toMatch(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
    }
  });
});

// ============================================================================
// DINING LANE
// ============================================================================

describe('Explore Dining Lane', () => {
  it('mock attractions include dining categories', () => {
    const attractions = getMockAttractions('default');
    const categories = new Set(attractions.map(a => a.category));

    expect(categories.has('Restaurant')).toBe(true);
    expect(categories.has('Cafe')).toBe(true);
    expect(categories.has('Bar')).toBe(true);
  });

  it('buildExploreSections produces a dining section', () => {
    const attractions = rankAttractions(dedupeAttractions(getMockAttractions('default')));
    const { sections } = buildExploreSections(attractions);

    const diningSection = sections.find(s => s.id === 'dining');
    expect(diningSection).toBeDefined();
    expect(diningSection!.items.length).toBeGreaterThan(0);
    expect(diningSection!.title).toBe('Dining & Drinks');
  });

  it('dining items are deduped by id', () => {
    const attractions = getMockAttractions('default');
    const deduped = dedupeAttractions(attractions);
    const ids = deduped.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

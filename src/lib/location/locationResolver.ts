/**
 * v3.12.2: Canonical Location Resolver
 * 
 * Single source of truth for resolving LocationRefs from timeline items,
 * bookings, airports, and trip data. Never throws — returns null when
 * unresolvable.
 */

import type { LocationRef } from './locationTypes';
import type { CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import type { Booking, Trip } from '@/types/database';
import { airports, getAirportByCode } from '@/lib/airportData';
import { resolveIata } from '@/lib/airports/resolveIata';

// ============================================================================
// AIRPORT COORDINATES (bundled, no network)
// ============================================================================

/** Approximate coordinates for major airports. Sufficient for weather/explore anchoring. */
const AIRPORT_COORDS: Record<string, { lat: number; lng: number }> = {
  ATL: { lat: 33.6407, lng: -84.4277 }, JFK: { lat: 40.6413, lng: -73.7781 },
  LAX: { lat: 33.9425, lng: -118.4081 }, ORD: { lat: 41.9742, lng: -87.9073 },
  DFW: { lat: 32.8998, lng: -97.0403 }, DEN: { lat: 39.8561, lng: -104.6737 },
  SFO: { lat: 37.6213, lng: -122.3790 }, SEA: { lat: 47.4502, lng: -122.3088 },
  MIA: { lat: 25.7959, lng: -80.2870 }, MCO: { lat: 28.4312, lng: -81.3081 },
  BOS: { lat: 42.3656, lng: -71.0096 }, EWR: { lat: 40.6895, lng: -74.1745 },
  LGA: { lat: 40.7769, lng: -73.8740 }, PHX: { lat: 33.4373, lng: -112.0078 },
  IAH: { lat: 29.9902, lng: -95.3368 }, MSP: { lat: 44.8848, lng: -93.2223 },
  DTW: { lat: 42.2162, lng: -83.3554 }, FLL: { lat: 26.0742, lng: -80.1506 },
  TPA: { lat: 27.9756, lng: -82.5333 }, PHL: { lat: 39.8744, lng: -75.2424 },
  CLT: { lat: 35.2140, lng: -80.9431 }, LAS: { lat: 36.0840, lng: -115.1537 },
  BWI: { lat: 39.1754, lng: -76.6684 }, SLC: { lat: 40.7899, lng: -111.9791 },
  SAN: { lat: 32.7338, lng: -117.1933 }, PDX: { lat: 45.5898, lng: -122.5951 },
  HNL: { lat: 21.3187, lng: -157.9225 }, AUS: { lat: 30.1975, lng: -97.6664 },
  BNA: { lat: 36.1263, lng: -86.6774 }, MSY: { lat: 29.9934, lng: -90.2580 },
  MCI: { lat: 39.2976, lng: -94.7139 }, RDU: { lat: 35.8801, lng: -78.7880 },
  DCA: { lat: 38.8512, lng: -77.0402 }, IAD: { lat: 38.9531, lng: -77.4565 },
  STL: { lat: 38.7487, lng: -90.3700 }, MDW: { lat: 41.7868, lng: -87.7522 },
  ANC: { lat: 61.1743, lng: -149.9982 }, HOU: { lat: 29.6454, lng: -95.2789 },
  DAL: { lat: 32.8471, lng: -96.8518 }, ABQ: { lat: 35.0402, lng: -106.6091 },
  SAT: { lat: 29.5337, lng: -98.4698 }, IND: { lat: 39.7173, lng: -86.2944 },
  CMH: { lat: 39.9980, lng: -82.8919 }, CLE: { lat: 41.4058, lng: -81.8539 },
  PIT: { lat: 40.4915, lng: -80.2329 }, OKC: { lat: 35.3931, lng: -97.6007 },
  MEM: { lat: 35.0424, lng: -89.9767 }, TUS: { lat: 32.1161, lng: -110.9410 },
  // International
  LHR: { lat: 51.4700, lng: -0.4543 }, CDG: { lat: 49.0097, lng: 2.5479 },
  FRA: { lat: 50.0379, lng: 8.5622 }, AMS: { lat: 52.3105, lng: 4.7683 },
  FCO: { lat: 41.8003, lng: 12.2389 }, MXP: { lat: 45.6306, lng: 8.7281 },
  LIN: { lat: 45.4520, lng: 9.2765 }, MAD: { lat: 40.4983, lng: -3.5676 },
  BCN: { lat: 41.2974, lng: 2.0833 }, ZRH: { lat: 47.4647, lng: 8.5492 },
  MUC: { lat: 48.3537, lng: 11.7860 }, DUB: { lat: 53.4264, lng: -6.2499 },
  LIS: { lat: 38.7756, lng: -9.1354 }, LGW: { lat: 51.1537, lng: -0.1821 },
  NRT: { lat: 35.7720, lng: 140.3929 }, HND: { lat: 35.5494, lng: 139.7798 },
  ICN: { lat: 37.4602, lng: 126.4407 }, SIN: { lat: 1.3644, lng: 103.9915 },
  HKG: { lat: 22.3080, lng: 113.9185 }, BKK: { lat: 13.6900, lng: 100.7501 },
  DXB: { lat: 25.2532, lng: 55.3657 }, DOH: { lat: 25.2731, lng: 51.6081 },
  IST: { lat: 41.2753, lng: 28.7519 }, SYD: { lat: -33.9399, lng: 151.1753 },
  MEL: { lat: -37.6690, lng: 144.8410 }, YYZ: { lat: 43.6777, lng: -79.6248 },
  YVR: { lat: 49.1967, lng: -123.1815 }, MEX: { lat: 19.4363, lng: -99.0721 },
  CUN: { lat: 21.0365, lng: -86.8771 }, GRU: { lat: -23.4356, lng: -46.4731 },
  EZE: { lat: -34.8222, lng: -58.5358 }, BOG: { lat: 4.7016, lng: -74.1469 },
  LIM: { lat: -12.0219, lng: -77.1143 }, SCL: { lat: -33.3930, lng: -70.7858 },
  TLV: { lat: 32.0114, lng: 34.8867 },
};

/**
 * Get approximate coordinates for an IATA airport code.
 */
export function getAirportCoords(iata: string): { lat: number; lng: number } | null {
  return AIRPORT_COORDS[iata.toUpperCase()] || null;
}

// ============================================================================
// AIRPORT REF RESOLVER
// ============================================================================

/**
 * Resolve an airport LocationRef from IATA code, name, or city.
 * Returns null if unresolvable.
 */
export function resolveAirportRef(input: {
  iata?: string | null;
  name?: string | null;
  city?: string | null;
}): LocationRef | null {
  // Try direct IATA first
  if (input.iata && /^[A-Z]{3}$/i.test(input.iata.trim())) {
    const code = input.iata.trim().toUpperCase();
    const airport = getAirportByCode(code);
    const coords = getAirportCoords(code);
    return {
      kind: 'AIRPORT',
      key: code,
      label: airport ? `${code} – ${airport.name}` : `${code} Airport`,
      iata: code,
      lat: coords?.lat,
      lng: coords?.lng,
      city: airport?.city,
      country: airport?.country,
    };
  }

  // Try resolving from name text
  const nameText = input.name || input.city;
  if (nameText) {
    const resolution = resolveIata(nameText);
    if (resolution.code) {
      const coords = getAirportCoords(resolution.code);
      return {
        kind: 'AIRPORT',
        key: resolution.code,
        label: resolution.name ? `${resolution.code} – ${resolution.name}` : `${resolution.code} Airport`,
        iata: resolution.code,
        lat: coords?.lat,
        lng: coords?.lng,
        city: input.city || undefined,
      };
    }
  }

  return null;
}

// ============================================================================
// TIMELINE ITEM → LOCATION REF
// ============================================================================

/**
 * Resolve a LocationRef from a CanonicalTimelineEvent.
 * Handles flights (airports), stays (address), and other booking types.
 */
export function resolveLocationRefFromTimelineItem(
  item: CanonicalTimelineEvent
): LocationRef | null {
  // Flights → arrival airport for destination, departure for origin
  if (item.bookingType === 'flight') {
    // Prefer arrival airport for "where you're going"
    const arrRef = resolveAirportRef({
      iata: item.arrivalAirportCode,
    });
    if (arrRef) return arrRef;

    // Fallback to departure airport
    const depRef = resolveAirportRef({
      iata: item.departureAirportCode,
    });
    if (depRef) return depRef;

    return null;
  }

  // Stays → address-based
  if (item.bookingType === 'stay') {
    if (item.address) {
      return {
        kind: 'STAY',
        key: item.sourceId,
        label: item.title || 'Lodging',
        address: item.address,
      };
    }
    // Fallback: use title as place name
    if (item.title) {
      return {
        kind: 'STAY',
        key: item.sourceId,
        label: item.title,
      };
    }
    return null;
  }

  // Activities / transport / parking → address or subtitle
  if (item.address) {
    return {
      kind: 'PLACE',
      key: item.sourceId,
      label: item.title || item.subtitle || 'Location',
      address: item.address,
    };
  }

  if (item.subtitle) {
    return {
      kind: 'PLACE',
      key: item.sourceId,
      label: item.subtitle,
    };
  }

  return null;
}

// ============================================================================
// BOOKING → LOCATION REF
// ============================================================================

/**
 * Resolve a LocationRef from a Booking record.
 */
export function resolveLocationRefFromBooking(booking: Booking): LocationRef | null {
  if (booking.booking_type === 'flight') {
    return resolveAirportRef({
      iata: booking.arrival_airport_code,
      name: booking.arrival_airport_name,
    });
  }

  if (booking.booking_type === 'stay') {
    return {
      kind: 'STAY',
      key: booking.id,
      label: booking.property_name || booking.vendor_name || 'Lodging',
      address: booking.address || undefined,
    };
  }

  if (booking.address) {
    return {
      kind: 'PLACE',
      key: booking.id,
      label: booking.vendor_name || 'Location',
      address: booking.address,
    };
  }

  return null;
}

// ============================================================================
// TRIP PRIMARY LOCATION
// ============================================================================

/**
 * Resolve the trip's primary location for weather/explore anchoring.
 * Priority: stay → first arrival airport → trip destination city.
 */
export function resolveTripPrimaryLocation(
  trip: Trip,
  bookings: Booking[]
): LocationRef {
  // 1. Stay with address
  const stay = bookings.find(b => b.booking_type === 'stay');
  if (stay) {
    const ref = resolveLocationRefFromBooking(stay);
    if (ref) {
      // Enrich with trip-level city/state/country
      return {
        ...ref,
        city: ref.city || trip.destination_city,
        state: ref.state || trip.destination_state || undefined,
        country: ref.country || trip.destination_country,
      };
    }
  }

  // 2. First arrival airport
  const flightWithArrival = bookings.find(
    b => b.booking_type === 'flight' && b.arrival_airport_code
  );
  if (flightWithArrival) {
    const ref = resolveAirportRef({
      iata: flightWithArrival.arrival_airport_code,
      name: flightWithArrival.arrival_airport_name,
    });
    if (ref) {
      return {
        ...ref,
        city: ref.city || trip.destination_city,
        state: ref.state || trip.destination_state || undefined,
        country: ref.country || trip.destination_country,
      };
    }
  }

  // 3. Trip destination city fallback
  return {
    kind: 'CITY',
    key: `city:${trip.destination_city}:${trip.destination_country}`,
    label: [trip.destination_city, trip.destination_state, trip.destination_country]
      .filter(Boolean)
      .join(', '),
    city: trip.destination_city,
    state: trip.destination_state || undefined,
    country: trip.destination_country,
  };
}

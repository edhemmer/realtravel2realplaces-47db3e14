/**
 * v4.10.0: Extract unique explorable areas from trip bookings.
 *
 * Builds a deduplicated list of areas the user can pre-explore,
 * derived from airports, lodging, and activity addresses.
 */

import type { Booking } from '@/types/database';
import { getAirportCoords, resolveAirportRef } from '@/lib/location/locationResolver';
import { getAirportByCode } from '@/lib/airportData';

export interface ExplorableArea {
  /** Unique key for dedup */
  key: string;
  /** Display label */
  label: string;
  /** Sub-label (e.g. "Arrival airport", "Lodging") */
  sublabel: string;
  /** Coordinates for explore origin */
  lat: number;
  lng: number;
  /** Visual type for icon */
  type: 'airport' | 'lodging' | 'activity' | 'car_rental' | 'transport';
}

/**
 * Extract all unique explorable areas from a trip's bookings.
 * Returns areas sorted: lodging first, then airports, then others.
 */
export function extractTripAreas(bookings: Booking[]): ExplorableArea[] {
  const areas: ExplorableArea[] = [];
  const seen = new Set<string>();

  // 1. Airports (both departure and arrival)
  for (const b of bookings) {
    if (b.booking_type !== 'flight') continue;

    for (const code of [b.departure_airport_code, b.arrival_airport_code]) {
      if (!code) continue;
      const upper = code.toUpperCase();
      const areaKey = `airport:${upper}`;
      if (seen.has(areaKey)) continue;

      const coords = getAirportCoords(upper);
      if (!coords) continue;

      const airport = getAirportByCode(upper);
      const label = airport
        ? `${upper} – ${airport.city}`
        : `${upper} Airport`;

      areas.push({
        key: areaKey,
        label,
        sublabel: 'Airport area',
        lat: coords.lat,
        lng: coords.lng,
        type: 'airport',
      });
      seen.add(areaKey);
    }
  }

  // 2. Lodging (stays)
  for (const b of bookings) {
    if (b.booking_type !== 'stay') continue;
    // We need geocoded coords — for now use the address if available
    // We'll attempt to use any coords we can find
    const areaKey = `stay:${b.id}`;
    if (seen.has(areaKey)) continue;

    // Try to get coords from the location_summary or address
    // For now, lodging without coords needs geocoding — skip
    // But we still want to show them with a geocode trigger
    const label = b.property_name || b.vendor_name || 'Lodging';
    const sublabel = b.address
      ? b.address.length > 40
        ? b.address.substring(0, 40) + '…'
        : b.address
      : 'Lodging';

    // For lodging, we need to geocode if no coords. 
    // The explore engine already handles this. We'll add a placeholder.
    areas.push({
      key: areaKey,
      label,
      sublabel,
      lat: 0, // Will be geocoded
      lng: 0,
      type: 'lodging',
    });
    seen.add(areaKey);
  }

  // 3. Activities/transport with addresses
  for (const b of bookings) {
    if (b.booking_type === 'flight' || b.booking_type === 'stay') continue;
    if (!b.address) continue;

    // Dedupe by address similarity
    const addrKey = `addr:${b.address.trim().toLowerCase().substring(0, 30)}`;
    if (seen.has(addrKey)) continue;

    areas.push({
      key: addrKey,
      label: b.vendor_name || b.property_name || 'Activity',
      sublabel: b.address.length > 40 ? b.address.substring(0, 40) + '…' : b.address,
      lat: 0,
      lng: 0,
      type: b.booking_type === 'car_rental' ? 'car_rental' : b.booking_type === 'transport' ? 'transport' : 'activity',
    });
    seen.add(addrKey);
  }

  // Sort: lodging first, airports, then others
  const typeOrder: Record<string, number> = { lodging: 0, airport: 1, activity: 2, car_rental: 3, transport: 4 };
  areas.sort((a, b) => (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9));

  return areas;
}

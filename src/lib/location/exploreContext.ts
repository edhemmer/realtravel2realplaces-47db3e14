/**
 * v3.9.16: Canonical Explore Context Origin Resolver
 * 
 * Single source of truth for Explore origin based on context.
 * Resolves origin from trip-level, timeline item, or booking item context
 * using the canonical location graph.
 * 
 * Gate: Trip + Destination required (city/address/coords). Lodging NOT required.
 */

import type { Booking, Trip } from '@/types/database';
import type { CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import type { LocationRef } from './locationTypes';
import {
  resolveLocationRefFromTimelineItem,
  resolveLocationRefFromBooking,
  resolveAirportRef,
  getAirportCoords,
} from './locationResolver';

// ============================================================================
// TYPES
// ============================================================================

export type ExploreContextKind = 'TRIP' | 'TIMELINE_ITEM' | 'BOOKING_ITEM';

export interface ExploreContext {
  kind: ExploreContextKind;
  id?: string;
}

export type ExploreOriginSource = 'LODGING' | 'DEVICE' | 'ARRIVAL_AIRPORT' | 'DESTINATION';

export interface ExploreOrigin {
  lat: number;
  lng: number;
  label: string;
  source: ExploreOriginSource;
}

// ============================================================================
// CANONICAL DESTINATION GATE
// ============================================================================

/**
 * v3.9.16: Returns true if the trip has enough destination info to power Explore.
 * Requires any of: destination city, destination address, or destination coords.
 * Does NOT require lodging or flights.
 */
export function hasExploreDestination(trip: Trip): boolean {
  if (trip.destination_city?.trim()) return true;
  if (trip.destination_address?.trim()) return true;
  // origin_address can serve as drive destination context
  if (trip.origin_address?.trim() && trip.destination_city?.trim()) return true;
  return false;
}

// ============================================================================
// GEOCODE CACHE (per trip id, session-scoped)
// ============================================================================

const _geocodeCache = new Map<string, { lat: number; lng: number } | null>();

/**
 * Simple geocode via Nominatim for destination city fallback.
 * Cached per trip id for the session.
 */
async function geocodeDestination(trip: Trip): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = `${trip.id}::${trip.destination_city}::${trip.destination_address}::${trip.destination_country}`;
  if (_geocodeCache.has(cacheKey)) return _geocodeCache.get(cacheKey) ?? null;

  // Try destination_address first (more precise, especially for drive trips)
  const queries: string[] = [];
  if (trip.destination_address?.trim()) {
    const addrParts = [trip.destination_address, trip.destination_city, trip.destination_state, trip.destination_country].filter(Boolean);
    queries.push(addrParts.join(', '));
  }
  // Fallback: city-level
  const cityParts = [trip.destination_city, trip.destination_state, trip.destination_country].filter(Boolean);
  if (cityParts.length > 0) {
    queries.push(cityParts.join(', '));
  }

  for (const query of queries) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        { headers: { 'User-Agent': 'RT2RP/4.10' } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.length > 0) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        _geocodeCache.set(cacheKey, coords);
        return coords;
      }
    } catch {
      // Geocode failure is non-fatal, try next query
    }
  }

  _geocodeCache.set(cacheKey, null);
  return null;
}

// ============================================================================
// HELPERS
// ============================================================================

function refToOrigin(ref: LocationRef, source: ExploreOriginSource): ExploreOrigin | null {
  if (ref.lat != null && ref.lng != null) {
    return { lat: ref.lat, lng: ref.lng, label: ref.label, source };
  }
  return null;
}

function sourceFromRefKind(ref: LocationRef): ExploreOriginSource {
  if (ref.kind === 'STAY') return 'LODGING';
  if (ref.kind === 'AIRPORT') return 'ARRIVAL_AIRPORT';
  return 'DESTINATION';
}

// ============================================================================
// DISTANCE HELPER
// ============================================================================

function haversineDistanceMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================================
// ARRIVAL DETECTION
// ============================================================================

function isArrived(
  trip: Trip,
  bookings: Booking[],
  deviceLocation: { lat: number; lng: number } | null,
  destinationCoords: { lat: number; lng: number } | null,
): boolean {
  if (!deviceLocation) return false;

  // Check if device is within 15 miles of destination or any stay
  if (destinationCoords) {
    const dist = haversineDistanceMiles(
      deviceLocation.lat, deviceLocation.lng,
      destinationCoords.lat, destinationCoords.lng
    );
    if (dist <= 15) return true;
  }

  // Check proximity to any stay coords
  for (const b of bookings.filter(b => b.booking_type === 'stay')) {
    const ref = resolveLocationRefFromBooking(b);
    if (ref?.lat != null && ref?.lng != null) {
      const dist = haversineDistanceMiles(
        deviceLocation.lat, deviceLocation.lng,
        ref.lat, ref.lng
      );
      if (dist <= 15) return true;
    }
  }

  // v3.9.41: Removed blanket "active trip = arrived" assumption.
  // User must be within 15mi of destination or stay to count as arrived.
  return false;
}

// ============================================================================
// TRIP-LEVEL ORIGIN RESOLVER (UPGRADED v3.9.16)
// ============================================================================

function resolveTripOriginSync(
  trip: Trip,
  bookings: Booking[],
  deviceLocation: { lat: number; lng: number } | null,
  isActive: boolean,
): ExploreOrigin | null {
  // Compute destination coords from known sources for arrival check
  let destinationCoords: { lat: number; lng: number } | null = null;

  // Try stay coords first
  const stays = bookings.filter(b => b.booking_type === 'stay');
  for (const stay of stays) {
    const ref = resolveLocationRefFromBooking(stay);
    if (ref?.lat != null && ref?.lng != null) {
      destinationCoords = { lat: ref.lat, lng: ref.lng };
      break;
    }
  }

  // Try arrival airport coords
  if (!destinationCoords) {
    const flights = bookings
      .filter(b => b.booking_type === 'flight' && b.arrival_airport_code)
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
    for (const flight of flights) {
      const coords = getAirportCoords(flight.arrival_airport_code!);
      if (coords) {
        destinationCoords = coords;
        break;
      }
    }
  }

  // v3.9.16: Arrived check — device within 15mi of destination/stay OR active trip
  const arrived = isActive && isArrived(trip, bookings, deviceLocation, destinationCoords);

  // If arrived and device location available → DEVICE mode
  if (arrived && deviceLocation) {
    return {
      lat: deviceLocation.lat,
      lng: deviceLocation.lng,
      label: 'Current location',
      source: 'DEVICE',
    };
  }

  // Fallback chain (pre-arrival or no device):
  // 1. Lodging coords
  for (const stay of stays) {
    const ref = resolveLocationRefFromBooking(stay);
    if (ref) {
      const origin = refToOrigin(ref, 'LODGING');
      if (origin) return origin;
    }
  }

  // 2. First arrival airport coords
  const flights = bookings
    .filter(b => b.booking_type === 'flight' && b.arrival_airport_code)
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
  for (const flight of flights) {
    const ref = resolveAirportRef({
      iata: flight.arrival_airport_code,
      name: flight.arrival_airport_name,
    });
    if (ref) {
      const origin = refToOrigin(ref, 'ARRIVAL_AIRPORT');
      if (origin) return origin;
    }
  }

  // 3. Destination coords from cache (geocoded)
  // This is sync — only returns if already cached
  const cacheKey = `${trip.id}::${trip.destination_city}::${trip.destination_address}::${trip.destination_country}`;
  const cached = _geocodeCache.get(cacheKey);
  if (cached) {
    const label = trip.destination_address?.trim()
      ? [trip.destination_address, trip.destination_city, trip.destination_state].filter(Boolean).join(', ')
      : [trip.destination_city, trip.destination_state, trip.destination_country].filter(Boolean).join(', ');
    return { lat: cached.lat, lng: cached.lng, label, source: 'DESTINATION' };
  }

  return null;
}

// ============================================================================
// CONTEXT ITEM ORIGIN RESOLVER
// ============================================================================

function resolveItemOriginFromTimeline(
  itemId: string,
  timelineEvents: CanonicalTimelineEvent[],
): ExploreOrigin | null {
  const item = timelineEvents.find(e => e.id === itemId);
  if (!item) return null;

  const ref = resolveLocationRefFromTimelineItem(item);
  if (!ref) return null;

  const source = sourceFromRefKind(ref);
  return refToOrigin(ref, source);
}

function resolveItemOriginFromBooking(
  itemId: string,
  bookings: Booking[],
): ExploreOrigin | null {
  const booking = bookings.find(b => b.id === itemId);
  if (!booking) return null;

  const ref = resolveLocationRefFromBooking(booking);
  if (!ref) return null;

  const source = sourceFromRefKind(ref);
  return refToOrigin(ref, source);
}

// ============================================================================
// MAIN RESOLVER
// ============================================================================

export interface ResolveExploreOriginArgs {
  tripId: string;
  trip: Trip;
  bookings: Booking[];
  timelineEvents: CanonicalTimelineEvent[];
  isActive: boolean;
  context?: ExploreContext;
  deviceLocation?: { lat: number; lng: number } | null;
}

/**
 * v3.9.16: Resolve Explore origin for a given context.
 * Returns null if no origin can be determined synchronously.
 * Kicks off async geocode for destination fallback if needed.
 */
export function resolveExploreOriginForContext(
  args: ResolveExploreOriginArgs,
): ExploreOrigin | null {
  const { trip, bookings, timelineEvents, isActive, context, deviceLocation } = args;

  // Gate check
  if (!hasExploreDestination(trip)) return null;

  const ctx = context ?? { kind: 'TRIP' };

  switch (ctx.kind) {
    case 'TIMELINE_ITEM':
      if (ctx.id) {
        const itemOrigin = resolveItemOriginFromTimeline(ctx.id, timelineEvents);
        if (itemOrigin) return itemOrigin;
      }
      return resolveTripOriginSync(trip, bookings, deviceLocation ?? null, isActive);

    case 'BOOKING_ITEM':
      if (ctx.id) {
        const bookingOrigin = resolveItemOriginFromBooking(ctx.id, bookings);
        if (bookingOrigin) return bookingOrigin;
      }
      return resolveTripOriginSync(trip, bookings, deviceLocation ?? null, isActive);

    case 'TRIP':
    default:
      return resolveTripOriginSync(trip, bookings, deviceLocation ?? null, isActive);
  }
}

/**
 * v3.9.16: Async version that triggers geocode fallback for destination-only trips.
 * Call once when mounting the Explore tab; the sync resolver will pick up the cache.
 */
export async function ensureExploreOriginGeocode(trip: Trip): Promise<void> {
  if (!hasExploreDestination(trip)) return;
  await geocodeDestination(trip);
}

/**
 * Get subtitle label based on source.
 */
export function getExploreOriginSubtitle(source: ExploreOriginSource): string {
  switch (source) {
    case 'LODGING': return 'Exploring near your lodging';
    case 'ARRIVAL_AIRPORT': return 'Exploring near your arrival airport';
    case 'DEVICE': return 'Exploring near your current location';
    case 'DESTINATION': return 'Exploring near your destination';
  }
}

// ============================================================================
// v3.5.3: STRICT COORDS-ONLY MAP URL BUILDER
// ============================================================================

/**
 * v3.5.3: Build a Google Maps search URL using ONLY lat/lng coordinates.
 * NEVER passes strings like "Nearby", city names, or airport codes as the query.
 * Returns null if no coordinates are available.
 */
export function buildExploreMapSearchUrl(origin: ExploreOrigin): string {
  return `https://www.google.com/maps/search/?api=1&query=${origin.lat},${origin.lng}`;
}

/**
 * v3.5.3: Build a Google Maps search URL for a specific place using coordinates.
 * Falls back to null if no coordinates are provided.
 */
export function buildExplorePlaceMapUrl(coords: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
}

/**
 * v3.5.3: Open Google Maps centered on the Explore origin coordinates.
 * NEVER opens with string-based queries.
 */
export function openExploreOriginMap(origin: ExploreOrigin): void {
  window.open(buildExploreMapSearchUrl(origin), '_blank', 'noopener,noreferrer');
}

/**
 * v3.12.4: Canonical Explore Context Origin Resolver
 * 
 * Single source of truth for Explore origin based on context.
 * Resolves origin from trip-level, timeline item, or booking item context
 * using the canonical location graph.
 */

import type { Booking, Trip } from '@/types/database';
import type { CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import type { LocationRef } from './locationTypes';
import {
  resolveLocationRefFromTimelineItem,
  resolveLocationRefFromBooking,
  resolveAirportRef,
} from './locationResolver';

// ============================================================================
// TYPES
// ============================================================================

export type ExploreContextKind = 'TRIP' | 'TIMELINE_ITEM' | 'BOOKING_ITEM';

export interface ExploreContext {
  kind: ExploreContextKind;
  id?: string;
}

export type ExploreOriginSource = 'LODGING' | 'DEVICE' | 'ARRIVAL_AIRPORT';

export interface ExploreOrigin {
  lat: number;
  lng: number;
  label: string;
  source: ExploreOriginSource;
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
  return 'LODGING'; // PLACE/CITY fallback
}

// ============================================================================
// TRIP-LEVEL ORIGIN RESOLVER
// ============================================================================

function resolveTripOrigin(
  bookings: Booking[],
  deviceLocation: { lat: number; lng: number } | null,
  isActive: boolean,
): ExploreOrigin | null {
  // Active trip: prefer device
  if (isActive && deviceLocation) {
    return {
      lat: deviceLocation.lat,
      lng: deviceLocation.lng,
      label: 'Current location',
      source: 'DEVICE',
    };
  }

  // Lodging with coords
  const stays = bookings.filter(b => b.booking_type === 'stay');
  for (const stay of stays) {
    const ref = resolveLocationRefFromBooking(stay);
    if (ref) {
      const origin = refToOrigin(ref, 'LODGING');
      if (origin) return origin;
    }
  }

  // First flight arrival airport with coords
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

  // Active trip without device, try lodging/airport (already done above)
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
  bookings: Booking[];
  timelineEvents: CanonicalTimelineEvent[];
  isActive: boolean;
  context?: ExploreContext;
  deviceLocation?: { lat: number; lng: number } | null;
}

/**
 * Resolve Explore origin for a given context.
 * Returns null if no origin can be determined.
 */
export function resolveExploreOriginForContext(
  args: ResolveExploreOriginArgs,
): ExploreOrigin | null {
  const { bookings, timelineEvents, isActive, context, deviceLocation } = args;
  const ctx = context ?? { kind: 'TRIP' };

  switch (ctx.kind) {
    case 'TIMELINE_ITEM':
      if (ctx.id) {
        const itemOrigin = resolveItemOriginFromTimeline(ctx.id, timelineEvents);
        if (itemOrigin) return itemOrigin;
      }
      // Fallback to trip-level
      return resolveTripOrigin(bookings, deviceLocation ?? null, isActive);

    case 'BOOKING_ITEM':
      if (ctx.id) {
        const bookingOrigin = resolveItemOriginFromBooking(ctx.id, bookings);
        if (bookingOrigin) return bookingOrigin;
      }
      // Fallback to trip-level
      return resolveTripOrigin(bookings, deviceLocation ?? null, isActive);

    case 'TRIP':
    default:
      return resolveTripOrigin(bookings, deviceLocation ?? null, isActive);
  }
}

/**
 * Get subtitle label based on source.
 */
export function getExploreOriginSubtitle(source: ExploreOriginSource): string {
  switch (source) {
    case 'LODGING': return 'Exploring near your lodging';
    case 'ARRIVAL_AIRPORT': return 'Exploring near your arrival airport';
    case 'DEVICE': return 'Exploring near your current location';
  }
}

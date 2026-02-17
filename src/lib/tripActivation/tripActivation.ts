/**
 * v3.12.3: Canonical Trip Activation Orchestrator
 * 
 * Single entry point to compute trip readiness after import/creation.
 * Pure, deterministic, no async/network calls, never throws.
 * Idempotent — safe to call multiple times.
 */

import type { Trip, Booking } from '@/types/database';
import type { LocationRef } from '@/lib/location/locationTypes';
import type { CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import {
  resolveTripPrimaryLocation,
  resolveLocationRefFromTimelineItem,
  resolveLocationRefFromBooking,
} from '@/lib/location/locationResolver';
import { buildNavTarget } from '@/lib/location/navigationTargets';

// ============================================================================
// TYPES
// ============================================================================

export interface TripActivationIssue {
  code: string;
  message: string;
  itemId?: string;
}

export type WeatherModeHint = 'FORECAST' | 'SEASONAL' | 'UNAVAILABLE';

export interface TripActivationResult {
  tripId: string;
  tripWindow: { startDate: string; endDate: string };
  primaryLocationRef?: LocationRef;
  weatherModeHint: WeatherModeHint;
  exploreOrigin?: { lat: number; lng: number; label: string; source: string };
  issues: TripActivationIssue[];
}

// ============================================================================
// HELPERS
// ============================================================================

const FORECAST_WINDOW_DAYS = 14;

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysDiff(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  const a = new Date(y1, m1 - 1, d1);
  const b = new Date(y2, m2 - 1, d2);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Derive trip window from timeline events (local wall-clock dates).
 */
function deriveTripWindow(
  timelineEvents: CanonicalTimelineEvent[],
  tripStartDate: string,
  tripEndDate: string,
): { startDate: string; endDate: string } {
  if (timelineEvents.length > 0) {
    const dates = timelineEvents
      .map(e => e.eventLocalDateTime?.substring(0, 10))
      .filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d));

    if (dates.length > 0) {
      dates.sort();
      let start = dates[0];
      let end = dates[dates.length - 1];
      // Anchor dates extend only
      if (tripStartDate < start) start = tripStartDate;
      if (tripEndDate > end) end = tripEndDate;
      return { startDate: start, endDate: end };
    }
  }
  return { startDate: tripStartDate, endDate: tripEndDate };
}

/**
 * Resolve explore origin from trip data.
 * Priority: Stay with coords/address → Arrival airport with coords → null
 */
function resolveExploreOriginFromTrip(
  primaryRef: LocationRef | undefined,
  bookings: Booking[],
): { lat: number; lng: number; label: string; source: string } | undefined {
  // If primary ref has coordinates
  if (primaryRef?.lat != null && primaryRef?.lng != null) {
    return {
      lat: primaryRef.lat,
      lng: primaryRef.lng,
      label: primaryRef.label,
      source: primaryRef.kind === 'STAY' ? 'stay' : primaryRef.kind === 'AIRPORT' ? 'airport' : 'city',
    };
  }

  // Try stays with address (text-based, but still provides origin)
  const stay = bookings.find(b => b.booking_type === 'stay' && b.address);
  if (stay) {
    return {
      lat: 0,
      lng: 0,
      label: stay.property_name || stay.vendor_name || 'Lodging',
      source: 'stay',
    };
  }

  return undefined;
}

// ============================================================================
// MAIN: ACTIVATE TRIP
// ============================================================================

/**
 * Compute trip activation payload. Pure, deterministic, idempotent.
 * Consumes canonical trip state + bookings to produce a "ready" payload.
 */
export function activateTrip(
  tripId: string,
  trip: Trip,
  bookings: Booking[],
  timelineEvents: CanonicalTimelineEvent[],
): TripActivationResult {
  const issues: TripActivationIssue[] = [];

  // 1. Derive trip window from timeline items
  const tripWindow = deriveTripWindow(timelineEvents, trip.start_date, trip.end_date);

  // 2. Resolve primary location
  let primaryLocationRef: LocationRef | undefined;
  try {
    primaryLocationRef = resolveTripPrimaryLocation(trip, bookings);
  } catch {
    // Never throw
  }

  // 3. Compute weather mode hint
  let weatherModeHint: WeatherModeHint = 'UNAVAILABLE';
  if (primaryLocationRef) {
    const today = getTodayStr();
    const daysOut = daysDiff(today, tripWindow.startDate);
    if (daysOut <= FORECAST_WINDOW_DAYS) {
      weatherModeHint = 'FORECAST';
    } else {
      weatherModeHint = 'SEASONAL';
    }
  }

  // 4. Resolve explore origin
  const exploreOrigin = resolveExploreOriginFromTrip(primaryLocationRef, bookings);

  // 5. Navigation sanity sweep
  // Check flights
  const flights = bookings.filter(b => b.booking_type === 'flight');
  for (const flight of flights) {
    const ref = resolveLocationRefFromBooking(flight);
    if (!ref) {
      issues.push({
        code: 'AIRPORT_UNRESOLVABLE',
        message: "We couldn't resolve an airport location for one leg.",
        itemId: flight.id,
      });
      continue;
    }
    const target = buildNavTarget(ref);
    if (!target) {
      issues.push({
        code: 'NAV_TARGET_MISSING',
        message: 'Navigation target could not be built for a flight.',
        itemId: flight.id,
      });
    }
  }

  // Check stays
  const stays = bookings.filter(b => b.booking_type === 'stay');
  for (const stay of stays) {
    if (!stay.address) {
      issues.push({
        code: 'STAY_MISSING_ADDRESS',
        message: 'Add a full lodging address for door-to-door navigation.',
        itemId: stay.id,
      });
    }
  }

  return {
    tripId,
    tripWindow,
    primaryLocationRef,
    weatherModeHint,
    exploreOrigin,
    issues,
  };
}

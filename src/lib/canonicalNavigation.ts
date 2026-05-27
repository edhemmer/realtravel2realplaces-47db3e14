/**
 * v4.0.3: Canonical Navigation Helper
 *
 * Single entry point for ALL "Navigate" / "Open in Maps" actions across the app.
 * Ensures full parsed addresses are always used when available and city/state
 * is only used as a true fallback.
 *
 * Consumers call `resolveCanonicalNavigation` with whatever data they have,
 * and get back a ready-to-use `CanonicalNavResult` with URL + label.
 *
 * NO React imports. Pure TypeScript utility.
 */

import { resolveAirportRef, getAirportCoords } from '@/lib/location/locationResolver';
import { buildNavTarget, openNavTarget } from '@/lib/location/navigationTargets';
import {
  resolveMapsDestination,
  buildMapsDirectionsUrl,
  type MapsDestination,
} from '@/lib/mapsDestination';
import { openNavigationResult } from '@/lib/native/nativeNavigation';

// ============================================================================
// TYPES
// ============================================================================

export interface CanonicalNavInput {
  /** Full street address from parsed confirmation / manual entry */
  address?: string | null;
  /** Property or venue name (e.g., "Hilton Garden Inn") */
  propertyName?: string | null;
  /** Location label (venue name, airport name) */
  locationLabel?: string | null;
  /** Booking type — used to select airport vs address resolution */
  bookingType?: string | null;
  /** IATA departure airport code */
  departureAirportCode?: string | null;
  /** IATA arrival airport code */
  arrivalAirportCode?: string | null;
  /** Pickup location (rental cars) */
  pickupLocation?: string | null;
  /** Return location (rental cars) */
  returnLocation?: string | null;
  /** City fallback */
  city?: string | null;
  /** State fallback */
  state?: string | null;
  /** Country fallback */
  country?: string | null;
  /** Lat (pass-through when already known) */
  lat?: number | null;
  /** Lng (pass-through when already known) */
  lng?: number | null;
}

export interface CanonicalNavResult {
  /** Ready-to-open Maps URL (directions mode) */
  url: string;
  /** Human-readable label for button text */
  label: string;
  /** The resolved destination query used in the URL */
  query: string;
  /** Underlying MapsDestination for advanced callers */
  destination: MapsDestination;
}

// ============================================================================
// CORE RESOLVER
// ============================================================================

/**
 * Resolve a canonical navigation result from any combination of location data.
 * Returns null if no usable location data exists.
 *
 * Priority cascade:
 *   1. Flight → airport coords/name via canonical airport resolver
 *   2. Full street address (from parsed confirmation)
 *   3. Property/venue name + city context
 *   4. Pickup/return location (rental cars)
 *   5. Location label
 *   6. City/state/country fallback
 */
export function resolveCanonicalNavigation(input: CanonicalNavInput): CanonicalNavResult | null {
  // ── 1. Flights: use canonical airport resolver for precise coords ──
  if (input.bookingType === 'flight') {
    const result = resolveFlightNavigation(input);
    if (result) return result;
  }

  // ── 2. Full address (highest non-flight priority) ──
  if (input.address && input.address.trim().length > 0) {
    const dest = resolveMapsDestination({
      address: input.address,
      propertyName: input.propertyName ?? undefined,
      city: input.city ?? undefined,
      state: input.state ?? undefined,
      country: input.country ?? undefined,
    });
    if (dest) {
      return buildResult(dest, input.propertyName || input.locationLabel || 'Destination');
    }
  }

  // ── 3. Pickup location (rental cars) ──
  if (input.pickupLocation && input.pickupLocation.trim().length > 0) {
    const dest = resolveMapsDestination({
      address: input.pickupLocation,
      locationLabel: input.locationLabel ?? undefined,
    });
    if (dest) {
      return buildResult(dest, input.locationLabel || 'Pickup Location');
    }
  }

  // ── 4. Return location (rental cars) ──
  if (input.returnLocation && input.returnLocation.trim().length > 0) {
    const dest = resolveMapsDestination({
      address: input.returnLocation,
      locationLabel: input.locationLabel ?? undefined,
    });
    if (dest) {
      return buildResult(dest, input.locationLabel || 'Return Location');
    }
  }

  // ── 5. Property name / location label ──
  if (input.propertyName || input.locationLabel) {
    const dest = resolveMapsDestination({
      propertyName: input.propertyName ?? undefined,
      locationLabel: input.locationLabel ?? undefined,
      city: input.city ?? undefined,
      state: input.state ?? undefined,
      country: input.country ?? undefined,
    });
    if (dest) {
      return buildResult(dest, input.propertyName || input.locationLabel || 'Destination');
    }
  }

  // ── 6. Lat/lng directly ──
  if (input.lat != null && input.lng != null) {
    const dest = resolveMapsDestination({
      lat: input.lat,
      lng: input.lng,
    });
    if (dest) {
      return buildResult(dest, input.locationLabel || 'Location');
    }
  }

  // ── 7. City/state fallback ──
  if (input.city) {
    const dest = resolveMapsDestination({
      city: input.city ?? undefined,
      state: input.state ?? undefined,
      country: input.country ?? undefined,
    });
    if (dest) {
      return buildResult(dest, input.city);
    }
  }

  return null;
}

// ============================================================================
// FLIGHT-SPECIFIC RESOLUTION
// ============================================================================

function resolveFlightNavigation(input: CanonicalNavInput): CanonicalNavResult | null {
  // Try departure airport first, then arrival
  for (const code of [input.departureAirportCode, input.arrivalAirportCode]) {
    if (!code) continue;
    const trimmed = code.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(trimmed)) continue;

    // Prefer coords from airport database
    const coords = getAirportCoords(trimmed);
    if (coords) {
      const dest: MapsDestination = {
        query: `${coords.lat},${coords.lng}`,
        lat: coords.lat,
        lng: coords.lng,
        precision: 'GEO',
      };
      return buildResult(dest, `${trimmed} Airport`);
    }

    // Fallback: canonical airport ref → NavTarget
    const ref = resolveAirportRef({ iata: trimmed });
    if (ref) {
      const target = buildNavTarget(ref);
      if (target) {
        const dest: MapsDestination = {
          query: target.value,
          lat: ref.lat,
          lng: ref.lng,
          precision: ref.lat != null ? 'GEO' : 'PLACE',
        };
        return buildResult(dest, `${trimmed} Airport`);
      }
    }
  }

  // Fallback: use address if available
  if (input.address && input.address.trim().length > 0) {
    const dest = resolveMapsDestination({ address: input.address });
    if (dest) return buildResult(dest, 'Airport');
  }

  return null;
}

// ============================================================================
// HELPERS
// ============================================================================

function buildResult(dest: MapsDestination, labelHint: string): CanonicalNavResult {
  return {
    url: buildMapsDirectionsUrl(dest),
    label: labelHint,
    query: dest.query,
    destination: dest,
  };
}

// ============================================================================
// CONVENIENCE: Open Maps (with iframe breakout + native iOS URL schemes)
// ============================================================================

/**
 * Open the canonical navigation result in Maps.
 * On iOS native uses Apple Maps URL schemes; on web uses iframe-breakout chain.
 */
export async function openCanonicalNav(result: CanonicalNavResult): Promise<void> {
  await openNavigationResult({
    url: result.url,
    query: result.query,
    lat: result.destination.lat,
    lng: result.destination.lng,
    label: result.label,
  });
}

/**
 * Convenience: resolve + open in one call.
 * Returns true if navigation was attempted, false if no destination found.
 */
export function navigateTo(input: CanonicalNavInput): boolean {
  const result = resolveCanonicalNavigation(input);
  if (!result) return false;
  openCanonicalNav(result);
  return true;
}

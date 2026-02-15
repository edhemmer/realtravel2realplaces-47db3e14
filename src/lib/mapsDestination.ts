/**
 * v2.2.10: Canonical Maps Destination Resolver
 *
 * Single source of truth for all Maps launch points in RT2RP.
 * Resolves the best available destination query from any event/booking/stop
 * using a strict precision cascade: ADDRESS > PLACE > GEO > CITY.
 *
 * USAGE:
 *   const dest = resolveMapsDestination({ address, propertyName, city, state, country });
 *   if (dest) openMapsDestination(dest);
 */

// ============================================================================
// TYPES
// ============================================================================

export type MapsPrecision = 'ADDRESS' | 'PLACE' | 'GEO' | 'CITY';

export interface MapsDestination {
  /** URL-ready query string */
  query: string;
  /** Optional coordinates */
  lat?: number;
  lng?: number;
  /** Precision level achieved */
  precision: MapsPrecision;
}

/**
 * Input shape for the resolver.
 * Accepts any combination of fields — the resolver picks the best available.
 */
export interface MapsDestinationInput {
  /** Street address (e.g. "123 Main St, Denver, CO 80202") */
  address?: string | null;
  /** Place/property name (e.g. "Hilton Garden Inn") */
  propertyName?: string | null;
  /** Location label (e.g. airport code, venue name) */
  locationLabel?: string | null;
  /** City */
  city?: string | null;
  /** State/province */
  state?: string | null;
  /** Country */
  country?: string | null;
  /** Latitude */
  lat?: number | null;
  /** Longitude */
  lng?: number | null;
}

// ============================================================================
// RESOLVER
// ============================================================================

/**
 * Determines whether a string looks like a structured street address
 * (contains at least a number + street-like word, not just a city/state).
 */
function looksLikeStreetAddress(addr: string): boolean {
  // Must contain a digit (house/building number) to qualify as street-level
  return /\d/.test(addr) && addr.trim().length > 5;
}

/**
 * Resolve the best Maps destination from available data.
 * Returns null if no usable location data exists.
 *
 * Precision cascade:
 *   1. ADDRESS — structured street address (contains number + street)
 *   2. PLACE — property/venue name + city context
 *   3. GEO — raw lat/lng coordinates
 *   4. CITY — city/state/country fallback
 */
export function resolveMapsDestination(input: MapsDestinationInput): MapsDestination | null {
  // 1. ADDRESS: If address looks like a real street address, use it directly
  if (input.address && looksLikeStreetAddress(input.address)) {
    // Build the fullest possible address query
    const parts: string[] = [input.address.trim()];
    // Only append city/state/country if they aren't already in the address string
    const addrLower = input.address.toLowerCase();
    if (input.city && !addrLower.includes(input.city.toLowerCase())) {
      parts.push(input.city);
    }
    if (input.state && !addrLower.includes(input.state.toLowerCase())) {
      parts.push(input.state);
    }
    if (input.country && !addrLower.includes(input.country.toLowerCase())) {
      parts.push(input.country);
    }
    return {
      query: parts.join(', '),
      precision: 'ADDRESS',
    };
  }

  // 2. PLACE: property/venue name + city context
  const placeName = input.propertyName || input.locationLabel;
  if (placeName && placeName.trim().length > 0) {
    const parts: string[] = [placeName.trim()];
    if (input.city) parts.push(input.city);
    if (input.state) parts.push(input.state);
    return {
      query: parts.join(', '),
      precision: 'PLACE',
    };
  }

  // Also try: address that exists but isn't street-level (e.g. "Denver, CO")
  // This is still better than bare city fallback since user typed it
  if (input.address && input.address.trim().length > 0) {
    return {
      query: input.address.trim(),
      precision: 'PLACE',
    };
  }

  // 3. GEO: lat/lng coordinates
  if (input.lat != null && input.lng != null) {
    return {
      query: `${input.lat},${input.lng}`,
      lat: input.lat,
      lng: input.lng,
      precision: 'GEO',
    };
  }

  // 4. CITY: final fallback
  if (input.city) {
    const parts: string[] = [input.city];
    if (input.state) parts.push(input.state);
    if (input.country) parts.push(input.country);
    return {
      query: parts.join(', '),
      precision: 'CITY',
    };
  }

  return null;
}

// ============================================================================
// MAPS URL BUILDER + LAUNCHER
// ============================================================================

/**
 * Build a Google Maps directions URL from a resolved destination.
 * Uses the Directions API (destination= param) so the user gets
 * door-to-door routing from their current location.
 */
export function buildMapsDirectionsUrl(dest: MapsDestination): string {
  if (dest.lat != null && dest.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest.query)}`;
}

/**
 * Open Maps in a new tab for a resolved destination.
 * Convenience wrapper used by all launch points.
 */
export function openMapsDestination(dest: MapsDestination): void {
  const url = buildMapsDirectionsUrl(dest);
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ============================================================================
// CONVENIENCE: Resolve from CanonicalTimelineEvent shape
// ============================================================================

/**
 * Resolve Maps destination from a CanonicalTimelineEvent.
 * Maps the event's available fields into the resolver input.
 */
export function resolveMapsFromTimelineEvent(event: {
  address?: string;
  title?: string;
  subtitle?: string;
  departureAirportCode?: string;
  arrivalAirportCode?: string;
  bookingType?: string;
}): MapsDestination | null {
  // v3.13.2: For flights, validate IATA code before using as navigation target
  if (event.bookingType === 'flight') {
    const code = event.departureAirportCode?.trim().toUpperCase();
    if (code && /^[A-Z]{3}$/.test(code)) {
      return resolveMapsDestination({
        locationLabel: `${code} Airport`,
      });
    }
    // Fallback: try arrival airport
    const arrCode = event.arrivalAirportCode?.trim().toUpperCase();
    if (arrCode && /^[A-Z]{3}$/.test(arrCode)) {
      return resolveMapsDestination({
        locationLabel: `${arrCode} Airport`,
      });
    }
    // Final fallback: use address or title if available
    if (event.address) {
      return resolveMapsDestination({ address: event.address });
    }
    return null;
  }

  return resolveMapsDestination({
    address: event.address,
    propertyName: event.bookingType === 'stay' ? event.title : undefined,
    locationLabel: event.subtitle,
  });
}

/**
 * Resolve Maps destination from a NextStopEvent shape.
 */
export function resolveMapsFromNextStop(event: {
  address?: string;
  locationLabel?: string;
  type?: string;
  displayName?: string;
}): MapsDestination | null {
  // v3.13.2: For flights, validate IATA code before using as navigation target
  if (event.type === 'flight' || event.type === 'flight_departure') {
    const code = event.locationLabel?.trim().toUpperCase();
    if (code && /^[A-Z]{3}$/.test(code)) {
      return resolveMapsDestination({
        locationLabel: `${code} Airport`,
      });
    }
    // Fallback: use address if available
    if (event.address) {
      return resolveMapsDestination({ address: event.address });
    }
    return null;
  }

  return resolveMapsDestination({
    address: event.address,
    locationLabel: event.locationLabel,
  });
}

/**
 * v3.8.4: Canonical Location Model
 * 
 * Single source of truth for structured location data.
 * Provider-abstract: UI and storage never depend on provider specifics.
 */

// ============================================================================
// PROVIDER ENUM
// ============================================================================

export type PlacesProviderType = 'OSM_PHOTON' | 'OSM_NOMINATIM' | 'GOOGLE_PLACES' | 'MAPBOX';

// ============================================================================
// LOCATION STRUCTURED
// ============================================================================

export interface LocationStructured {
  /** ISO 3166-1 alpha-2 country code (e.g., "US") */
  countryCode: string;
  /** State/province code or name (e.g., "GA", "Ontario") */
  regionCode: string;
  /** City/town/locality name */
  cityName: string;
  /** Provider that resolved this location */
  provider: PlacesProviderType;
  /** Provider-specific place identifier */
  providerId: string;
  /** Latitude */
  lat: number;
  /** Longitude */
  lng: number;
  /** Human-readable formatted string (e.g., "Lawrenceville, GA, US") */
  formatted: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if a LocationStructured object is fully populated.
 * All required fields must be present and non-empty.
 */
export function isLocationComplete(loc: LocationStructured | null | undefined): loc is LocationStructured {
  if (!loc) return false;
  return !!(
    loc.countryCode &&
    loc.regionCode &&
    loc.cityName &&
    loc.provider &&
    loc.providerId &&
    typeof loc.lat === 'number' && !isNaN(loc.lat) &&
    typeof loc.lng === 'number' && !isNaN(loc.lng) &&
    loc.formatted
  );
}

/**
 * Generate a display label from a structured location.
 * Format: "City, Region, Country"
 */
export function locationLabel(loc: LocationStructured | null | undefined): string {
  if (!loc) return '';
  const parts: string[] = [];
  if (loc.cityName) parts.push(loc.cityName);
  if (loc.regionCode) parts.push(loc.regionCode);
  if (loc.countryCode) parts.push(loc.countryCode);
  return parts.join(', ');
}

/**
 * Generate a stable unique key for a location.
 * Format: "provider:providerId"
 */
export function locationKey(loc: LocationStructured): string {
  return `${loc.provider}:${loc.providerId}`;
}

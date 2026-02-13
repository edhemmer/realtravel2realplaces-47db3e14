/**
 * v2.5.3: Canonical Device Location Helper
 *
 * Single source of truth for current device geolocation.
 * - Requests permission once per session
 * - Caches coordinates in memory
 * - Returns trip fallback when denied/unavailable
 * - No background tracking, no continuous updates, no persistent storage
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DeviceCoords {
  lat: number;
  lng: number;
}

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export interface DeviceLocationResult {
  coords: DeviceCoords | null;
  status: LocationStatus;
}

// ============================================================================
// SESSION CACHE (module-level singleton)
// ============================================================================

let cachedCoords: DeviceCoords | null = null;
let cachedStatus: LocationStatus = 'idle';
let pendingRequest: Promise<DeviceLocationResult> | null = null;

/**
 * Request device location once per session.
 * Returns cached result on subsequent calls.
 * Never prompts more than once.
 */
export async function getDeviceLocation(): Promise<DeviceLocationResult> {
  // Already resolved (granted or denied) — return cache
  if (cachedStatus === 'granted' || cachedStatus === 'denied' || cachedStatus === 'unavailable') {
    return { coords: cachedCoords, status: cachedStatus };
  }

  // Already requesting — return the pending promise (dedup)
  if (pendingRequest) {
    return pendingRequest;
  }

  // No geolocation API available
  if (!navigator.geolocation) {
    cachedStatus = 'unavailable';
    return { coords: null, status: 'unavailable' };
  }

  cachedStatus = 'requesting';

  pendingRequest = new Promise<DeviceLocationResult>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        cachedCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        cachedStatus = 'granted';
        pendingRequest = null;
        resolve({ coords: cachedCoords, status: 'granted' });
      },
      () => {
        cachedStatus = 'denied';
        pendingRequest = null;
        resolve({ coords: null, status: 'denied' });
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });

  return pendingRequest;
}

/**
 * Get cached coords synchronously (null if not yet resolved).
 */
export function getCachedDeviceLocation(): DeviceCoords | null {
  return cachedCoords;
}

/**
 * Get current status synchronously.
 */
export function getLocationStatus(): LocationStatus {
  return cachedStatus;
}

// ============================================================================
// LINK BUILDERS — coordinate-aware
// ============================================================================

export interface LocationContext {
  /** Device coords if available */
  deviceCoords: DeviceCoords | null;
  /** Trip fallback city */
  city: string;
  /** Trip fallback state */
  state?: string;
  /** Trip fallback country */
  country: string;
}

/**
 * Build a Google Maps search URL that prefers device coordinates.
 */
export function buildGoogleMapsSearchUrl(searchTerm: string, ctx: LocationContext): string {
  if (ctx.deviceCoords) {
    const { lat, lng } = ctx.deviceCoords;
    return `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}/@${lat},${lng},14z`;
  }
  const fallback = buildFallbackQuery(ctx);
  return `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}+${encodeURIComponent(fallback)}`;
}

/**
 * Build a Yelp search URL that prefers device coordinates.
 */
export function buildYelpSearchUrl(searchDesc: string, ctx: LocationContext): string {
  if (ctx.deviceCoords) {
    const { lat, lng } = ctx.deviceCoords;
    return `https://www.yelp.com/search?find_desc=${encodeURIComponent(searchDesc)}&l=g:${lng},${lat},${lng + 0.05},${lat + 0.05}&attrs=RestaurantsPriceRange2.1,RestaurantsPriceRange2.2`;
  }
  const yelpLoc = `${ctx.city}${ctx.state ? `, ${ctx.state}` : ''}`;
  return `https://www.yelp.com/search?find_desc=${encodeURIComponent(searchDesc)}&find_loc=${encodeURIComponent(yelpLoc)}&attrs=RestaurantsPriceRange2.1,RestaurantsPriceRange2.2`;
}

/**
 * Build a generic external search URL that uses coordinates or fallback.
 */
export function buildExternalSearchUrl(baseUrl: string, ctx: LocationContext): string {
  // This is a pass-through for links that don't support coordinate params
  return baseUrl;
}

function buildFallbackQuery(ctx: LocationContext): string {
  return `${ctx.city}${ctx.state ? ` ${ctx.state}` : ''} ${ctx.country}`;
}

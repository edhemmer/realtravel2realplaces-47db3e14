/**
 * v3.8.16: Route Provider — Cached, Degraded-Safe
 *
 * Wraps route fetching with caching by (origin, dest, day).
 * Returns estimated distance/duration when available.
 * Degrades gracefully — DrivePlan still works with destination-only navigation.
 *
 * Currently uses Haversine estimation (no external API).
 * When a real route API is integrated, this wrapper handles caching and fallback.
 */

import type { LocationRef, DriveRouteSummary } from '@/types/drive';

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry {
  summary: DriveRouteSummary | null;
  timestamp: number;
}

const routeCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cacheKey(origin: LocationRef | undefined, dest: LocationRef, day?: string): string {
  const originKey = origin?.value || origin?.city || 'current';
  const destKey = dest.value || dest.city || 'unknown';
  return `${originKey}|${destKey}|${day || 'any'}`;
}

// ============================================================================
// HAVERSINE ESTIMATION (bundled, no network)
// ============================================================================

const EARTH_RADIUS_MI = 3959;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistanceMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MI * c;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export interface RouteResult {
  summary: DriveRouteSummary | null;
  confidence: 'high' | 'medium' | 'low';
  degradedReason?: string;
}

/**
 * Get route summary between origin and destination.
 * Uses cached results when available. Currently estimates via Haversine.
 */
export function getRoute(
  origin: LocationRef | undefined,
  dest: LocationRef,
  departDateText?: string,
): RouteResult {
  const key = cacheKey(origin, dest, departDateText);

  // Check cache
  const cached = routeCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      summary: cached.summary,
      confidence: cached.summary ? 'medium' : 'low',
      degradedReason: cached.summary ? undefined : 'Route unavailable right now',
    };
  }

  // Attempt estimation
  const originLat = origin?.lat;
  const originLng = origin?.lng;
  const destLat = dest.lat;
  const destLng = dest.lng;

  if (originLat != null && originLng != null && destLat != null && destLng != null) {
    const straightLineMi = haversineDistanceMi(originLat, originLng, destLat, destLng);
    // Driving distance is typically 1.2-1.4x straight line
    const estimatedMi = Math.round(straightLineMi * 1.3);
    // Estimate ~50 mph average (accounts for city/highway mix)
    const estimatedMinutes = Math.round((estimatedMi / 50) * 60);

    const summary: DriveRouteSummary = {
      distanceMiles: estimatedMi,
      durationMinutes: estimatedMinutes,
    };

    routeCache.set(key, { summary, timestamp: Date.now() });
    return { summary, confidence: 'medium' };
  }

  // No coordinates — can't estimate
  routeCache.set(key, { summary: null, timestamp: Date.now() });
  return {
    summary: null,
    confidence: 'low',
    degradedReason: 'Route unavailable right now',
  };
}

/**
 * Clear the route cache (for testing).
 */
export function clearRouteCache(): void {
  routeCache.clear();
}

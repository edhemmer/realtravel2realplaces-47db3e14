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
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry {
  summary: DriveRouteSummary | null;
  timestamp: number;
}

interface LiveRouteCacheEntry {
  result: RouteResult;
  timestamp: number;
}

interface HereRouteResponse {
  liveTravelTimeSeconds?: number;
  baselineTravelTimeSeconds?: number;
  distanceMeters?: number;
  typicalTravelTimeSeconds?: number | null;
  hasIncident?: boolean;
  fetchedAt?: number;
  error?: string;
}

const routeCache = new Map<string, CacheEntry>();
const liveRouteCache = new Map<string, LiveRouteCacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const LIVE_ROUTE_TTL_MS = 15 * 60 * 1000; // 15 minutes, cost-controlled

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
  provider?: 'here' | 'estimate';
  fetchedAt?: number;
  trafficDelayMinutes?: number;
  hasIncident?: boolean;
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
      provider: 'estimate',
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
    return { summary, confidence: 'medium', provider: 'estimate' };
  }

  // No coordinates — can't estimate
  routeCache.set(key, { summary: null, timestamp: Date.now() });
  return {
    summary: null,
    confidence: 'low',
    degradedReason: 'Route unavailable right now',
    provider: 'estimate',
  };
}

function liveRouteKey(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  departureTime?: string,
): string {
  return [
    origin.lat.toFixed(3),
    origin.lng.toFixed(3),
    dest.lat.toFixed(3),
    dest.lng.toFixed(3),
    departureTime || 'now',
  ].join('|');
}

function metersToMiles(meters?: number): number {
  return Math.round(((meters || 0) / 1609.344) * 10) / 10;
}

function secondsToMinutes(seconds?: number): number {
  return Math.max(1, Math.round((seconds || 0) / 60));
}

/**
 * Fetch a provider-backed route through the Supabase HERE proxy.
 * The synchronous getRoute() remains the deterministic offline estimate.
 */
export async function fetchLiveRoute(params: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  departureTime?: string;
}): Promise<RouteResult> {
  const key = liveRouteKey(params.origin, params.destination, params.departureTime);
  const cached = liveRouteCache.get(key);

  if (cached && Date.now() - cached.timestamp < LIVE_ROUTE_TTL_MS) {
    return { ...cached.result, fetchedAt: cached.timestamp };
  }

  const { data, error } = await supabase.functions.invoke('here-route', {
    body: {
      originLat: params.origin.lat,
      originLng: params.origin.lng,
      destLat: params.destination.lat,
      destLng: params.destination.lng,
      departureTime: params.departureTime || 'now',
    },
  });

  if (error) {
    return {
      summary: null,
      confidence: 'low',
      degradedReason: error.message || 'Live route provider unavailable',
      provider: 'here',
    };
  }

  const route = (data || {}) as HereRouteResponse;
  if (route.error || !route.distanceMeters || !route.liveTravelTimeSeconds) {
    return {
      summary: null,
      confidence: 'low',
      degradedReason: route.error || 'Live route provider returned no route',
      provider: 'here',
    };
  }

  const liveMinutes = secondsToMinutes(route.liveTravelTimeSeconds);
  const baselineMinutes = secondsToMinutes(route.baselineTravelTimeSeconds || route.typicalTravelTimeSeconds || route.liveTravelTimeSeconds);
  const result: RouteResult = {
    summary: {
      distanceMiles: metersToMiles(route.distanceMeters),
      durationMinutes: liveMinutes,
      routeLabel: route.hasIncident || liveMinutes > baselineMinutes + 10 ? 'Traffic-aware route' : 'Provider route',
    },
    confidence: 'high',
    provider: 'here',
    fetchedAt: route.fetchedAt || Date.now(),
    trafficDelayMinutes: Math.max(0, liveMinutes - baselineMinutes),
    hasIncident: Boolean(route.hasIncident),
  };

  liveRouteCache.set(key, { result, timestamp: Date.now() });
  return result;
}

/**
 * Clear the route cache (for testing).
 */
export function clearRouteCache(): void {
  routeCache.clear();
  liveRouteCache.clear();
}

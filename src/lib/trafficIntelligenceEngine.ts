/**
 * v5.9.2: Traffic Intelligence Engine — Canonical Real-Time Route Intelligence
 *
 * Single canonical source for live traffic-aware routing data.
 * All consumers (driveSignalEngine, leaveTimingEngine, orchestration) use this engine.
 *
 * ARCHITECTURE:
 * - Fetches baseline + live travel time from HERE via edge function proxy
 * - Caches by routeKey (origin+destination hash) with 3-minute TTL
 * - Deduplicates in-flight requests per routeKey
 * - Falls back gracefully: cached → baseline → haversine estimate
 * - NO polling, NO intervals — on-demand only
 */

import { supabase } from '@/integrations/supabase/client';
import {
  checkCallAllowed,
  recordCall,
  acquireLock,
  releaseLock,
  type CallPriority,
  type FreshnessTier,
} from '@/lib/movementCallGovernance';

// ============================================================================
// OUTPUT TYPE
// ============================================================================

export type CongestionLevel = 'low' | 'moderate' | 'heavy';

export interface TrafficIntelligence {
  /** Live estimated travel time in minutes (with traffic) */
  estimatedTravelTime: number;
  /** Baseline travel time in minutes (no traffic) */
  baselineTravelTime: number;
  /** Delay in minutes (live - baseline) */
  delayMinutes: number;
  /** Congestion classification */
  congestionLevel: CongestionLevel;
  /** Whether an incident was detected on route */
  hasIncident: boolean;
  /** Distance in miles */
  distanceMiles: number;
  /** When this data was last fetched */
  lastUpdatedAt: number;
  /** Data source */
  source: 'live' | 'cached' | 'baseline_only' | 'haversine_fallback';
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface CachedTrafficEntry {
  intelligence: TrafficIntelligence;
  fetchedAt: number;
}

interface HereRouteResponse {
  liveTravelTimeSeconds: number;
  baselineTravelTimeSeconds: number;
  distanceMeters: number;
  typicalTravelTimeSeconds: number | null;
  hasIncident: boolean;
  fetchedAt: number;
}

// ============================================================================
// CACHE (per routeKey, in-memory, bounded)
// ============================================================================

const _trafficCache = new Map<string, CachedTrafficEntry>();
const _inFlightRequests = new Set<string>();

/** Cache TTL: 3 minutes */
const CACHE_TTL_MS = 3 * 60 * 1000;

/** Minimum gap between fetches for same route: 2 minutes */
const MIN_FETCH_GAP_MS = 2 * 60 * 1000;

/** Max cached entries */
const MAX_CACHE_ENTRIES = 20;

// ============================================================================
// ROUTE KEY GENERATION
// ============================================================================

/**
 * Generate a deterministic route key from origin and destination coordinates.
 * Rounds to 4 decimal places (~11m precision) for stable caching.
 */
function generateRouteKey(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): string {
  const r = (n: number) => n.toFixed(4);
  return `${r(originLat)},${r(originLng)}|${r(destLat)},${r(destLng)}`;
}

// ============================================================================
// CONGESTION CLASSIFICATION (documented, deterministic)
// ============================================================================

/**
 * Classify congestion level from delay minutes:
 * - low:      delay < 5 min
 * - moderate: delay 5–10 min
 * - heavy:    delay > 10 min
 */
function classifyCongestion(delayMinutes: number): CongestionLevel {
  if (delayMinutes < 5) return 'low';
  if (delayMinutes <= 10) return 'moderate';
  return 'heavy';
}

// ============================================================================
// HAVERSINE FALLBACK (matches routeProvider.ts)
// ============================================================================

const EARTH_RADIUS_MI = 3959;

function haversineDistanceMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MI * c;
}

function buildHaversineFallback(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): TrafficIntelligence {
  const straightLine = haversineDistanceMi(originLat, originLng, destLat, destLng);
  const estimatedMiles = Math.round(straightLine * 1.3);
  const estimatedMinutes = Math.round((estimatedMiles / 50) * 60);

  return {
    estimatedTravelTime: estimatedMinutes,
    baselineTravelTime: estimatedMinutes,
    delayMinutes: 0,
    congestionLevel: 'low',
    hasIncident: false,
    distanceMiles: estimatedMiles,
    lastUpdatedAt: Date.now(),
    source: 'haversine_fallback',
  };
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

function getCached(routeKey: string): CachedTrafficEntry | null {
  const entry = _trafficCache.get(routeKey);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    // Expired — but keep for fallback (returned with 'cached' source)
    return entry;
  }
  return entry;
}

function isCacheFresh(routeKey: string): boolean {
  const entry = _trafficCache.get(routeKey);
  if (!entry) return false;
  return Date.now() - entry.fetchedAt < MIN_FETCH_GAP_MS;
}

function writeCache(routeKey: string, intelligence: TrafficIntelligence): void {
  // Evict oldest if at capacity
  if (!_trafficCache.has(routeKey) && _trafficCache.size >= MAX_CACHE_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of _trafficCache) {
      if (entry.fetchedAt < oldestTime) {
        oldestTime = entry.fetchedAt;
        oldestKey = key;
      }
    }
    if (oldestKey) _trafficCache.delete(oldestKey);
  }

  _trafficCache.set(routeKey, {
    intelligence,
    fetchedAt: Date.now(),
  });
}

// ============================================================================
// FETCH (non-blocking, deduplication guard)
// ============================================================================

async function fetchFromHere(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  routeKey: string,
): Promise<TrafficIntelligence | null> {
  // Duplicate request guard
  if (_inFlightRequests.has(routeKey)) return null;

  // Governance lock
  if (!acquireLock('traffic', routeKey)) return null;

  _inFlightRequests.add(routeKey);

  try {
    const { data, error } = await supabase.functions.invoke('here-route', {
      body: {
        originLat,
        originLng,
        destLat,
        destLng,
        departureTime: 'now',
      },
    });

    if (error || !data) {
      console.warn('[TrafficIntelligence] HERE fetch failed:', error?.message || 'no data');
      return null;
    }

    const res = data as HereRouteResponse;

    const liveMins = Math.round(res.liveTravelTimeSeconds / 60);
    const baselineMins = Math.round(res.baselineTravelTimeSeconds / 60);
    const delayMins = Math.max(0, liveMins - baselineMins);
    const distanceMiles = Math.round((res.distanceMeters / 1609.344) * 10) / 10;

    const intelligence: TrafficIntelligence = {
      estimatedTravelTime: liveMins,
      baselineTravelTime: baselineMins,
      delayMinutes: delayMins,
      congestionLevel: classifyCongestion(delayMins),
      hasIncident: res.hasIncident || false,
      distanceMiles,
      lastUpdatedAt: Date.now(),
      source: 'live',
    };

    writeCache(routeKey, intelligence);
    return intelligence;
  } catch (err) {
    console.warn('[TrafficIntelligence] Fetch error:', err);
    return null;
  } finally {
    _inFlightRequests.delete(routeKey);
  }
}

// ============================================================================
// MAIN ENGINE (on-demand, deterministic fallback)
// ============================================================================

/**
 * Get traffic intelligence for a route.
 *
 * Fallback hierarchy:
 * 1. Fresh cached result → return immediately
 * 2. Live fetch from HERE → cache and return
 * 3. Stale cached result → return with 'cached' source
 * 4. Haversine estimate → return with 'haversine_fallback' source
 *
 * This function initiates a background fetch when cache is stale
 * and returns the best available data synchronously.
 */
export function getTrafficIntelligence(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): TrafficIntelligence {
  const routeKey = generateRouteKey(originLat, originLng, destLat, destLng);

  // Step 1: Check cache freshness
  if (isCacheFresh(routeKey)) {
    const cached = getCached(routeKey);
    if (cached) return cached.intelligence;
  }

  // Step 2: Trigger background fetch (non-blocking)
  if (!_inFlightRequests.has(routeKey)) {
    fetchFromHere(originLat, originLng, destLat, destLng, routeKey).catch(() => {
      // Silently handled — fallback chain covers this
    });
  }

  // Step 3: Return stale cached data if available
  const stale = getCached(routeKey);
  if (stale) {
    return { ...stale.intelligence, source: 'cached' };
  }

  // Step 4: Haversine fallback
  return buildHaversineFallback(originLat, originLng, destLat, destLng);
}

/**
 * Async version that waits for the fetch to complete.
 * Use sparingly — only when fresh data is critical.
 */
export async function getTrafficIntelligenceAsync(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<TrafficIntelligence> {
  const routeKey = generateRouteKey(originLat, originLng, destLat, destLng);

  // Return fresh cache immediately
  if (isCacheFresh(routeKey)) {
    const cached = getCached(routeKey);
    if (cached) return cached.intelligence;
  }

  // Attempt live fetch
  const live = await fetchFromHere(originLat, originLng, destLat, destLng, routeKey);
  if (live) return live;

  // Stale cache fallback
  const stale = getCached(routeKey);
  if (stale) return { ...stale.intelligence, source: 'cached' };

  // Haversine fallback
  return buildHaversineFallback(originLat, originLng, destLat, destLng);
}

/**
 * Clear traffic cache (for testing).
 */
export function clearTrafficCache(): void {
  _trafficCache.clear();
  _inFlightRequests.clear();
}

/**
 * v5.10.0: Transit Intelligence Engine — Canonical Schedule-Aware Transit Layer
 *
 * Single canonical source for public transit routing intelligence.
 * All consumers (orchestration, leave timing, future multimodal) use this engine.
 *
 * ARCHITECTURE:
 * - Fetches real transit routes from HERE Public Transit API via edge function
 * - Caches by routeKey (origin + destination + time bucket) with 3-minute TTL
 * - Deduplicates in-flight requests per routeKey
 * - Deterministic route scoring: time, transfers, walking, disruption
 * - Falls back gracefully: cached → unavailable (never fabricates routes)
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
// OUTPUT TYPES
// ============================================================================

export type DelayRiskLevel = 'low' | 'moderate' | 'high';
export type TransitConfidence = 'high' | 'medium' | 'low';

export interface TransitRoute {
  /** Total door-to-door travel time in minutes */
  totalTravelMinutes: number;
  /** Walking segments total in minutes */
  walkingMinutes: number;
  /** Waiting at stops/stations in minutes */
  waitingMinutes: number;
  /** Time actually in transit vehicles in minutes */
  inTransitMinutes: number;
  /** Number of transfers between vehicles */
  transferCount: number;
  /** Scheduled departure time (ISO string) */
  departureAt: string;
  /** Scheduled arrival time (ISO string) */
  arrivalAt: string;
  /** Transit legs summary */
  legs: TransitLeg[];
  /** Internal scoring (higher = better) */
  score: number;
}

export interface TransitLeg {
  mode: string;
  name: string | null;
  shortName: string | null;
  headsign: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  durationMinutes: number;
}

export interface TransitIntelligence {
  /** Whether transit is available for this route */
  available: boolean;
  /** Best scored route */
  recommendedRoute: TransitRoute | null;
  /** Up to 2 alternate routes */
  alternateRoutes: TransitRoute[];
  /** Departure deadline — latest time to leave and still arrive */
  lastViableDepartureAt: string | null;
  /** Delay risk assessment */
  delayRiskLevel: DelayRiskLevel;
  /** Confidence in the data */
  confidenceLevel: TransitConfidence;
  /** Advisory flags for orchestration */
  advisoryFlags: TransitAdvisoryFlag[];
  /** When this was last fetched */
  lastUpdatedAt: number;
  /** Data source */
  source: 'live' | 'cached' | 'unavailable';
}

export type TransitAdvisoryFlag =
  | 'time_sensitive'
  | 'last_departure_soon'
  | 'high_walking'
  | 'multiple_transfers'
  | 'missed_cutoff';

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface HereTransitResponse {
  routes: HereTransitRoute[];
  noTransit: boolean;
  fetchedAt: number;
}

interface HereTransitRoute {
  totalDurationSeconds: number;
  walkingSeconds: number;
  waitingSeconds: number;
  transitSeconds: number;
  transferCount: number;
  departureAt: string | null;
  arrivalAt: string | null;
  legs: Array<{
    mode: string;
    name: string | null;
    shortName: string | null;
    headsign: string | null;
    departureTime: string | null;
    arrivalTime: string | null;
    durationSeconds: number;
    intermediateStops: number;
  }>;
}

interface CachedTransitEntry {
  intelligence: TransitIntelligence;
  fetchedAt: number;
}

// ============================================================================
// CACHE (per routeKey, in-memory, bounded)
// ============================================================================

const _transitCache = new Map<string, CachedTransitEntry>();
const _inFlightRequests = new Set<string>();

/** Cache TTL: 3 minutes */
const CACHE_TTL_MS = 3 * 60 * 1000;

/** Min gap between fetches for same route: 2 minutes */
const MIN_FETCH_GAP_MS = 2 * 60 * 1000;

/** Max cached entries */
const MAX_CACHE_ENTRIES = 15;

// ============================================================================
// ROUTE KEY GENERATION
// ============================================================================

/**
 * Generate a deterministic route key from coordinates and 5-minute time bucket.
 * Time bucket prevents cache misses from trivial time differences.
 */
function generateRouteKey(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): string {
  const r = (n: number) => n.toFixed(4);
  const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
  return `transit:${r(originLat)},${r(originLng)}|${r(destLat)},${r(destLng)}|${bucket}`;
}

// ============================================================================
// ROUTE SCORING (deterministic, documented)
// ============================================================================

/**
 * Score a transit route deterministically.
 * Higher score = better route.
 *
 * Factors (all weighted):
 * - Total travel time: lower is better (base: 100 - totalMinutes)
 * - Transfer penalty: -8 per transfer
 * - Walking penalty: -1 per walking minute over 10 min threshold
 * - Schedule alignment: +5 if departure is within 15 min of now
 *
 * Arrival deadline bonus: +10 if arrives before deadline
 */
const TRANSFER_PENALTY = 8;
const WALKING_THRESHOLD_MIN = 10;
const WALKING_PENALTY_PER_MIN = 1;

function scoreRoute(
  route: HereTransitRoute,
  arrivalDeadline?: string,
): number {
  const totalMin = Math.round(route.totalDurationSeconds / 60);
  const walkMin = Math.round(route.walkingSeconds / 60);

  // Base: prefer shorter routes (cap at 0)
  let score = Math.max(0, 100 - totalMin);

  // Transfer penalty
  score -= route.transferCount * TRANSFER_PENALTY;

  // Walking penalty (only above threshold)
  if (walkMin > WALKING_THRESHOLD_MIN) {
    score -= (walkMin - WALKING_THRESHOLD_MIN) * WALKING_PENALTY_PER_MIN;
  }

  // Schedule alignment: bonus for soon-departing routes
  if (route.departureAt) {
    const depTime = new Date(route.departureAt).getTime();
    const now = Date.now();
    const minutesUntilDep = (depTime - now) / 60000;
    if (minutesUntilDep >= 0 && minutesUntilDep <= 15) {
      score += 5;
    }
  }

  // Arrival deadline bonus
  if (arrivalDeadline && route.arrivalAt) {
    const deadline = new Date(arrivalDeadline).getTime();
    const arrival = new Date(route.arrivalAt).getTime();
    if (arrival <= deadline) {
      score += 10;
    } else {
      score -= 15; // Heavy penalty for missing deadline
    }
  }

  return Math.max(0, score);
}

// ============================================================================
// ADVISORY FLAG DERIVATION
// ============================================================================

function deriveAdvisoryFlags(
  route: TransitRoute | null,
  routes: TransitRoute[],
): TransitAdvisoryFlag[] {
  if (!route) return [];
  const flags: TransitAdvisoryFlag[] = [];

  // Time-sensitive: departure within 10 minutes
  if (route.departureAt) {
    const dep = new Date(route.departureAt).getTime();
    const minsUntil = (dep - Date.now()) / 60000;
    if (minsUntil >= 0 && minsUntil <= 10) {
      flags.push('time_sensitive');
    }
    if (minsUntil < 0) {
      flags.push('missed_cutoff');
    }
  }

  // Last departure soon: if this is the only viable route
  if (routes.length <= 1 && route.departureAt) {
    const dep = new Date(route.departureAt).getTime();
    const minsUntil = (dep - Date.now()) / 60000;
    if (minsUntil >= 0 && minsUntil <= 20) {
      flags.push('last_departure_soon');
    }
  }

  // High walking
  if (route.walkingMinutes > 12) {
    flags.push('high_walking');
  }

  // Multiple transfers
  if (route.transferCount >= 2) {
    flags.push('multiple_transfers');
  }

  return flags;
}

// ============================================================================
// DELAY RISK ASSESSMENT
// ============================================================================

function assessDelayRisk(route: TransitRoute | null): DelayRiskLevel {
  if (!route) return 'low';

  // More transfers = higher risk
  if (route.transferCount >= 3) return 'high';
  if (route.transferCount >= 2 && route.waitingMinutes < 5) return 'high';
  if (route.transferCount >= 1 && route.waitingMinutes < 3) return 'moderate';

  // Long walking segments increase risk
  if (route.walkingMinutes > 15) return 'moderate';

  return 'low';
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

function convertRoute(raw: HereTransitRoute, arrivalDeadline?: string): TransitRoute {
  return {
    totalTravelMinutes: Math.round(raw.totalDurationSeconds / 60),
    walkingMinutes: Math.round(raw.walkingSeconds / 60),
    waitingMinutes: Math.round(raw.waitingSeconds / 60),
    inTransitMinutes: Math.round(raw.transitSeconds / 60),
    transferCount: raw.transferCount,
    departureAt: raw.departureAt || '',
    arrivalAt: raw.arrivalAt || '',
    legs: raw.legs.map((leg) => ({
      mode: leg.mode,
      name: leg.name,
      shortName: leg.shortName,
      headsign: leg.headsign,
      departureTime: leg.departureTime,
      arrivalTime: leg.arrivalTime,
      durationMinutes: Math.round(leg.durationSeconds / 60),
    })),
    score: scoreRoute(raw, arrivalDeadline),
  };
}

function buildUnavailable(): TransitIntelligence {
  return {
    available: false,
    recommendedRoute: null,
    alternateRoutes: [],
    lastViableDepartureAt: null,
    delayRiskLevel: 'low',
    confidenceLevel: 'low',
    advisoryFlags: [],
    lastUpdatedAt: Date.now(),
    source: 'unavailable',
  };
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

function isCacheFresh(routeKey: string): boolean {
  const entry = _transitCache.get(routeKey);
  if (!entry) return false;
  return Date.now() - entry.fetchedAt < MIN_FETCH_GAP_MS;
}

function getCached(routeKey: string): CachedTransitEntry | null {
  const entry = _transitCache.get(routeKey);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return entry; // stale but usable
  return entry;
}

function writeCache(routeKey: string, intelligence: TransitIntelligence): void {
  if (!_transitCache.has(routeKey) && _transitCache.size >= MAX_CACHE_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of _transitCache) {
      if (entry.fetchedAt < oldestTime) {
        oldestTime = entry.fetchedAt;
        oldestKey = key;
      }
    }
    if (oldestKey) _transitCache.delete(oldestKey);
  }
  _transitCache.set(routeKey, { intelligence, fetchedAt: Date.now() });
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
  arrivalDeadline?: string,
): Promise<TransitIntelligence | null> {
  if (_inFlightRequests.has(routeKey)) return null;

  if (!acquireLock('transit', routeKey)) return null;

  _inFlightRequests.add(routeKey);

  try {
    const reqBody: Record<string, unknown> = {
      originLat,
      originLng,
      destLat,
      destLng,
      alternatives: 3,
    };

    // If arrival deadline, use arrivalTime instead of departureTime
    if (arrivalDeadline) {
      reqBody.arrivalTime = arrivalDeadline;
    }

    const { data, error } = await supabase.functions.invoke('here-transit', {
      body: reqBody,
    });

    if (error || !data) {
      console.warn('[TransitIntelligence] HERE fetch failed:', error?.message || 'no data');
      return null;
    }

    const res = data as HereTransitResponse;

    if (res.noTransit || !res.routes || res.routes.length === 0) {
      const unavailable = buildUnavailable();
      writeCache(routeKey, unavailable);
      return unavailable;
    }

    // Convert and score all routes
    const scored = res.routes
      .map((r) => convertRoute(r, arrivalDeadline))
      .filter((r) => r.departureAt && r.arrivalAt)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      const unavailable = buildUnavailable();
      writeCache(routeKey, unavailable);
      return unavailable;
    }

    // Filter out routes with missed departures
    const viable = scored.filter((r) => {
      if (!r.departureAt) return false;
      return new Date(r.departureAt).getTime() > Date.now() - 60000; // 1 min grace
    });

    if (viable.length === 0) {
      const result: TransitIntelligence = {
        ...buildUnavailable(),
        available: false,
        advisoryFlags: ['missed_cutoff'],
        source: 'live',
      };
      writeCache(routeKey, result);
      return result;
    }

    const recommended = viable[0];
    const alternates = viable.slice(1, 3);

    // Compute last viable departure
    const lastViable = viable.length > 0
      ? viable[viable.length - 1].departureAt
      : null;

    const flags = deriveAdvisoryFlags(recommended, viable);
    const delayRisk = assessDelayRisk(recommended);

    const intelligence: TransitIntelligence = {
      available: true,
      recommendedRoute: recommended,
      alternateRoutes: alternates,
      lastViableDepartureAt: lastViable,
      delayRiskLevel: delayRisk,
      confidenceLevel: 'high',
      advisoryFlags: flags,
      lastUpdatedAt: Date.now(),
      source: 'live',
    };

    writeCache(routeKey, intelligence);
    return intelligence;
  } catch (err) {
    console.warn('[TransitIntelligence] Fetch error:', err);
    return null;
  } finally {
    _inFlightRequests.delete(routeKey);
  }
}

// ============================================================================
// MAIN ENGINE (on-demand, deterministic fallback)
// ============================================================================

/**
 * Get transit intelligence for a route.
 *
 * Fallback hierarchy:
 * 1. Fresh cached result → return immediately
 * 2. Live fetch from HERE Transit → cache and return
 * 3. Stale cached result → return with 'cached' source
 * 4. Return available=false (never fabricates routes)
 *
 * Initiates background fetch when cache is stale.
 */
export function getTransitIntelligence(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  arrivalDeadline?: string,
): TransitIntelligence {
  const routeKey = generateRouteKey(originLat, originLng, destLat, destLng);

  // Step 1: Fresh cache
  if (isCacheFresh(routeKey)) {
    const cached = getCached(routeKey);
    if (cached) return cached.intelligence;
  }

  // Step 2: Trigger background fetch
  if (!_inFlightRequests.has(routeKey)) {
    fetchFromHere(originLat, originLng, destLat, destLng, routeKey, arrivalDeadline).catch(() => {});
  }

  // Step 3: Stale cache
  const stale = getCached(routeKey);
  if (stale) return { ...stale.intelligence, source: 'cached' };

  // Step 4: Unavailable
  return buildUnavailable();
}

/**
 * Async version that waits for the fetch to complete.
 */
export async function getTransitIntelligenceAsync(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  arrivalDeadline?: string,
): Promise<TransitIntelligence> {
  const routeKey = generateRouteKey(originLat, originLng, destLat, destLng);

  if (isCacheFresh(routeKey)) {
    const cached = getCached(routeKey);
    if (cached) return cached.intelligence;
  }

  const live = await fetchFromHere(originLat, originLng, destLat, destLng, routeKey, arrivalDeadline);
  if (live) return live;

  const stale = getCached(routeKey);
  if (stale) return { ...stale.intelligence, source: 'cached' };

  return buildUnavailable();
}

/**
 * Clear transit cache (for testing).
 */
export function clearTransitCache(): void {
  _transitCache.clear();
  _inFlightRequests.clear();
}

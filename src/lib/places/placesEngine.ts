/**
 * v3.11.4: Canonical Places Engine — Single Source of Truth
 *
 * One query builder + one normalizer + one session cache.
 * Used by Drive Suggestions and Explore (when wired).
 * DriveEngine does NOT import this — pure eligibility only.
 *
 * Fail-safe: never throws, returns UNAVAILABLE on error.
 * Deterministic: same inputs → same output order.
 */

import { fetchNearbyPlaces } from './placesService';

// ============================================================================
// CANONICAL TYPES
// ============================================================================

export type PlacesCategory = 'gas' | 'food' | 'essentials' | 'attractions' | 'nature' | 'hiking' | 'grocery' | 'culture' | 'nightlife' | 'cafe';
export type PlacesPlanContext = 'free' | 'pro' | 'business';
export type PlacesSourceContext = 'explore' | 'drive_suggestions';

export interface PlacesQuery {
  origin: { lat: number; lng: number };
  category: PlacesCategory;
  radiusMiles: number;
  limit: number;
  planContext: PlacesPlanContext;
  sourceContext: PlacesSourceContext;
}

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  isOpen?: boolean;
  lat: number;
  lng: number;
  provider: 'google';
  photoUrl?: string | null;
  reviewCount?: number;
}

export type PlacesStatus = 'OK' | 'UNAVAILABLE';
export type PlacesUnavailableReason = 'MISSING_KEY' | 'PROVIDER_ERROR' | 'NO_RESULTS';

export interface PlacesEngineResult {
  results: PlaceResult[];
  status: PlacesStatus;
  reason?: PlacesUnavailableReason;
  fromCache: boolean;
}

// ============================================================================
// CATEGORY → PROVIDER TYPE MAP
// ============================================================================

function categoryToProviderType(category: PlacesCategory): string {
  switch (category) {
    case 'gas': return 'gas_station';
    case 'food': return 'restaurant';
    case 'essentials': return 'convenience_store';
    case 'attractions': return 'tourist_attraction';
    case 'nature': return 'park';
    case 'hiking': return 'hiking_trail';
    case 'grocery': return 'grocery_store';
    case 'culture': return 'museum';
    case 'nightlife': return 'night_club';
    case 'cafe': return 'cafe';
    default: return 'gas_station';
  }
}

// ============================================================================
// SESSION CACHE
// ============================================================================

interface CacheEntry {
  result: PlacesEngineResult;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

// TTL: 10 min for successful, 2 min for unavailable
const SUCCESS_TTL_MS = 10 * 60 * 1000;
const UNAVAILABLE_TTL_MS = 2 * 60 * 1000;
const MAX_CACHE_SIZE = 50;

function buildCacheKey(query: PlacesQuery): string {
  // Round lat/lng to 3 decimals (~0.7 miles) to prevent fragmentation
  const rLat = query.origin.lat.toFixed(3);
  const rLng = query.origin.lng.toFixed(3);
  return `${rLat},${rLng}:${query.category}:${query.radiusMiles}:${query.limit}`;
}

function getFromCache(key: string): PlacesEngineResult | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const ttl = entry.result.status === 'OK' ? SUCCESS_TTL_MS : UNAVAILABLE_TTL_MS;
  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(key);
    return null;
  }

  return { ...entry.result, fromCache: true };
}

function writeToCache(key: string, result: PlacesEngineResult): void {
  // Evict oldest if at capacity
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = [...cache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, Math.floor(MAX_CACHE_SIZE / 2));
    for (const [k] of oldest) {
      cache.delete(k);
    }
  }
  cache.set(key, { result: { ...result, fromCache: false }, timestamp: Date.now() });
}

// ============================================================================
// NORMALIZATION + DEDUP + SORT
// ============================================================================

function normalize(raw: { placeId: string; name: string; address: string; rating: number | null; lat: number; lng: number; photoUrl?: string | null; reviewCount?: number | null }): PlaceResult {
  return {
    placeId: raw.placeId,
    name: raw.name,
    address: raw.address,
    rating: raw.rating ?? undefined,
    lat: raw.lat,
    lng: raw.lng,
    provider: 'google',
    photoUrl: raw.photoUrl ?? null,
    reviewCount: raw.reviewCount ?? undefined,
  };
}

function dedup(places: PlaceResult[]): PlaceResult[] {
  const seen = new Set<string>();
  return places.filter((p) => {
    if (seen.has(p.placeId)) return false;
    seen.add(p.placeId);
    return true;
  });
}

function sortDeterministic(places: PlaceResult[]): PlaceResult[] {
  // Keep provider order (distance-based from Google), then rating desc as tie-breaker
  return [...places].sort((a, b) => {
    const rA = a.rating ?? 0;
    const rB = b.rating ?? 0;
    return rB - rA;
  });
}

// ============================================================================
// MAIN QUERY FUNCTION
// ============================================================================

/**
 * Canonical query entry point. All callers use this.
 * Never throws. Returns UNAVAILABLE on any failure.
 */
export async function queryPlaces(query: PlacesQuery): Promise<PlacesEngineResult> {
  const cacheKey = buildCacheKey(query);

  // Check cache first
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const providerType = categoryToProviderType(query.category);
    const raw = await fetchNearbyPlaces({
      lat: query.origin.lat,
      lng: query.origin.lng,
      type: providerType as 'gas_station' | 'restaurant',
      radiusMiles: query.radiusMiles,
      limit: query.limit,
    });

    if (raw.length === 0) {
      const result: PlacesEngineResult = {
        results: [],
        status: 'UNAVAILABLE',
        reason: 'NO_RESULTS',
        fromCache: false,
      };
      writeToCache(cacheKey, result);
      return result;
    }

    const normalized = raw.map(normalize);
    const deduped = dedup(normalized);
    const sorted = sortDeterministic(deduped);
    const limited = sorted.slice(0, query.limit);

    const result: PlacesEngineResult = {
      results: limited,
      status: 'OK',
      fromCache: false,
    };
    writeToCache(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[PlacesEngine] Provider error:', err);
    const result: PlacesEngineResult = {
      results: [],
      status: 'UNAVAILABLE',
      reason: 'PROVIDER_ERROR',
      fromCache: false,
    };
    writeToCache(cacheKey, result);
    return result;
  }
}

/**
 * Clear the session cache (useful for testing or forced refresh).
 */
export function clearPlacesCache(): void {
  cache.clear();
}

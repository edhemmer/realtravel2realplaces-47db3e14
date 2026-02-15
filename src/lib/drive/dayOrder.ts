/**
 * v3.8.4: Deterministic TBD Day Auto-Ordering
 * 
 * Computes optimal visit order for date-only (TBD) tour stops
 * using Haversine distance and greedy nearest-neighbor.
 * 
 * RULES:
 * - CONFIRMED items (with time) are never reordered by this module
 * - TBD items (no time) are ordered by approximate routing distance
 * - Does NOT assign or display invented times
 * - Tie-breakers: locationKey then original insertion index
 * - Stable across refresh/resume via sequence hash
 */

import { locationKey, LocationStructured } from '@/lib/location/types';

// ============================================================================
// TYPES
// ============================================================================

export type DayOrderMode = 'OPTIMIZED_AUTO' | 'MANUAL_LOCKED';

export interface OrderableStop {
  /** Unique stop ID */
  id: string;
  /** Date (YYYY-MM-DD) */
  date: string;
  /** Time if confirmed (HH:MM or HH:MM:SS), undefined/null if TBD */
  time?: string | null;
  /** Structured location (must have lat/lng for ordering) */
  location?: LocationStructured | null;
  /** Original insertion index (for tie-breaking) */
  insertionIndex: number;
}

export interface DayOrderResult {
  /** Ordered stop IDs for TBD items */
  orderedIds: string[];
  /** Hash of the input set (for change detection) */
  sequenceHash: string;
  /** Order mode */
  mode: DayOrderMode;
}

// ============================================================================
// HAVERSINE DISTANCE
// ============================================================================

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate Haversine (straight-line) distance between two lat/lng points.
 * Returns distance in kilometers.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

// ============================================================================
// SEQUENCE HASH (for change detection)
// ============================================================================

/**
 * Compute a simple deterministic hash from a set of stop IDs + locations.
 * Used to detect when the TBD stop set changes (add/remove/location change).
 */
export function computeSequenceHash(stops: OrderableStop[]): string {
  const parts = stops.map(s => {
    const locKey = s.location ? locationKey(s.location) : 'none';
    return `${s.id}:${locKey}`;
  });
  parts.sort(); // Canonical order for hash stability
  // Simple string hash
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `h${Math.abs(hash).toString(36)}`;
}

// ============================================================================
// GREEDY NEAREST-NEIGHBOR ORDERING
// ============================================================================

/**
 * Order TBD stops using greedy nearest-neighbor from a starting point.
 * 
 * @param tbdStops - TBD stops to order (must have location with lat/lng)
 * @param anchorLat - Starting latitude (from last confirmed stop or first TBD)
 * @param anchorLng - Starting longitude
 * @returns Ordered array of stop IDs
 */
function greedyNearestNeighbor(
  tbdStops: OrderableStop[],
  anchorLat: number,
  anchorLng: number
): string[] {
  if (tbdStops.length === 0) return [];
  if (tbdStops.length === 1) return [tbdStops[0].id];

  const remaining = [...tbdStops];
  const ordered: string[] = [];
  let currentLat = anchorLat;
  let currentLng = anchorLng;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const stop = remaining[i];
      const lat = stop.location?.lat ?? 0;
      const lng = stop.location?.lng ?? 0;
      const dist = haversineDistance(currentLat, currentLng, lat, lng);

      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      } else if (dist === bestDist) {
        // Tie-break: locationKey then insertion index
        const existKey = remaining[bestIdx].location 
          ? locationKey(remaining[bestIdx].location!) 
          : '';
        const newKey = stop.location ? locationKey(stop.location) : '';
        if (newKey < existKey || (newKey === existKey && stop.insertionIndex < remaining[bestIdx].insertionIndex)) {
          bestIdx = i;
        }
      }
    }

    const chosen = remaining.splice(bestIdx, 1)[0];
    ordered.push(chosen.id);
    currentLat = chosen.location?.lat ?? currentLat;
    currentLng = chosen.location?.lng ?? currentLng;
  }

  return ordered;
}

// ============================================================================
// MAIN: ORDER TBD STOPS FOR A DATE
// ============================================================================

/**
 * Compute deterministic order for TBD stops within a single date.
 * 
 * @param allStopsForDate - All stops for the target date (confirmed + TBD)
 * @param cachedHash - Previously cached sequence hash (skip recompute if unchanged)
 * @param cachedOrder - Previously cached order (return as-is if hash matches)
 * @param dayOrderMode - Current mode for this date
 * @returns DayOrderResult with ordered IDs and new hash
 */
export function computeDayOrder(
  allStopsForDate: OrderableStop[],
  cachedHash?: string,
  cachedOrder?: string[],
  dayOrderMode: DayOrderMode = 'OPTIMIZED_AUTO'
): DayOrderResult {
  // Separate confirmed (has time) from TBD (no time)
  const confirmed = allStopsForDate.filter(s => s.time && s.time.trim().length > 0);
  const tbd = allStopsForDate.filter(s => !s.time || s.time.trim().length === 0);

  // If manual locked, return cached or insertion-order
  if (dayOrderMode === 'MANUAL_LOCKED') {
    return {
      orderedIds: cachedOrder || tbd.map(s => s.id),
      sequenceHash: cachedHash || computeSequenceHash(tbd),
      mode: 'MANUAL_LOCKED',
    };
  }

  // Compute current hash
  const currentHash = computeSequenceHash(tbd);

  // If hash unchanged and we have cached order, skip recompute
  if (cachedHash === currentHash && cachedOrder && cachedOrder.length === tbd.length) {
    return {
      orderedIds: cachedOrder,
      sequenceHash: currentHash,
      mode: 'OPTIMIZED_AUTO',
    };
  }

  // Filter to stops with valid coordinates
  const withCoords = tbd.filter(s => s.location?.lat != null && s.location?.lng != null);
  const withoutCoords = tbd.filter(s => !s.location?.lat || !s.location?.lng);

  // Find anchor: last confirmed stop with coordinates, else first TBD
  let anchorLat = 0;
  let anchorLng = 0;

  // Sort confirmed by time to find the last one
  const confirmedSorted = [...confirmed].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const lastConfirmed = confirmedSorted.length > 0 ? confirmedSorted[confirmedSorted.length - 1] : null;

  if (lastConfirmed?.location?.lat != null && lastConfirmed?.location?.lng != null) {
    anchorLat = lastConfirmed.location.lat;
    anchorLng = lastConfirmed.location.lng;
  } else if (withCoords.length > 0) {
    anchorLat = withCoords[0].location!.lat;
    anchorLng = withCoords[0].location!.lng;
  }

  // Order stops with coordinates via nearest-neighbor
  const orderedWithCoords = greedyNearestNeighbor(withCoords, anchorLat, anchorLng);

  // Append stops without coordinates in insertion order
  const orderedWithoutCoords = withoutCoords
    .sort((a, b) => a.insertionIndex - b.insertionIndex)
    .map(s => s.id);

  return {
    orderedIds: [...orderedWithCoords, ...orderedWithoutCoords],
    sequenceHash: currentHash,
    mode: 'OPTIMIZED_AUTO',
  };
}

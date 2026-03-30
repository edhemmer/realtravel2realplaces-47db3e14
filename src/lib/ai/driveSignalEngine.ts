/**
 * v5.9.0: Drive Signal Engine — Bounded Real-Time Route Intelligence
 *
 * Provides route timing awareness for drive-related events by leveraging
 * the existing routeProvider (Haversine estimation). Produces stable,
 * per-event drive signals consumed by aiOrchestrationEngine.
 *
 * ARCHITECTURE:
 * - canonicalTripState is the source of truth for events
 * - routeProvider supplies ETA estimation (no new APIs)
 * - This engine is read-only: no state mutation, no persistence
 * - Signals are bounded: max 1 per event, max 10 cached
 *
 * NO polling, NO intervals, NO new API providers.
 * Fetch is on-demand only (triggered during NOW evaluation).
 */

import type { CanonicalTripState, CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import { getRoute } from '@/lib/drive/routeProvider';
import { getTrafficIntelligence, type TrafficIntelligence } from '@/lib/trafficIntelligenceEngine';
import type { LocationRef } from '@/types/drive';
import { getLocalNowString } from '@/lib/canonicalNextStop';

// ============================================================================
// OUTPUT TYPE
// ============================================================================

export type DriveRouteState = 'stable' | 'tightening' | 'delayed';

export interface DriveSignal {
  eventId: string;
  etaMinutes: number;
  routeState: DriveRouteState;
  confidence: 'high' | 'medium';
  fetchedAt: number;
  /** v5.9.2: Traffic-aware data when available */
  trafficIntelligence?: TrafficIntelligence;
}

// ============================================================================
// CACHE (per-event, in-memory, max 10 entries)
// ============================================================================

interface CachedDriveSignal {
  signal: DriveSignal;
  lastFetchedAt: number;
  /** Previous ETA for stability comparison */
  previousEta: number | null;
  previousStateChangeAt: number;
}

const _driveCache = new Map<string, CachedDriveSignal>();

/** Minimum gap between fetches for the same event: 5 minutes */
const MIN_REFRESH_MS = 5 * 60 * 1000;

/** Max cached entries */
const MAX_CACHE_ENTRIES = 10;

/** Stability filter: ignore ETA changes smaller than this */
const STABILITY_ETA_THRESHOLD_MINUTES = 2;

/** Stability filter: ignore rapid state changes within this window */
const STABILITY_WINDOW_MS = 60 * 1000;

/** Max lookahead: only evaluate events within next 120 minutes */
const LOOKAHEAD_MINUTES = 120;

// ============================================================================
// ROUTE STATE THRESHOLDS (documented, deterministic)
// ============================================================================

/**
 * Route state derivation from ETA vs. time-to-event comparison.
 *
 * 'stable'     — ETA leaves ≥15 min buffer before event start
 * 'tightening' — ETA leaves 5–15 min buffer (cutting it close)
 * 'delayed'    — ETA leaves <5 min buffer OR exceeds event start time
 */
const BUFFER_STABLE_MIN = 15;
const BUFFER_TIGHTENING_MIN = 5;

function deriveRouteState(etaMinutes: number, minutesToEvent: number): DriveRouteState {
  const buffer = minutesToEvent - etaMinutes;
  if (buffer >= BUFFER_STABLE_MIN) return 'stable';
  if (buffer >= BUFFER_TIGHTENING_MIN) return 'tightening';
  return 'delayed';
}

// ============================================================================
// ELIGIBILITY CHECKS
// ============================================================================

/** Event types that imply a routeable destination */
const ROUTEABLE_EVENT_TYPES = new Set([
  'flight_departure',
  'hotel_checkin',
  'rental_pickup',
  'activity_start',
  'transport_departure',
  'engagement_start',
]);

function isRouteableEvent(ev: CanonicalTimelineEvent): boolean {
  return ROUTEABLE_EVENT_TYPES.has(ev.eventType) && !!ev.address;
}

function getMinutesToEvent(ev: CanonicalTimelineEvent): number | null {
  if (!ev.eventLocalDateTime || ev.eventLocalDateTime.length < 16) return null;

  const nowStr = getLocalNowString();
  const todayStr = nowStr.substring(0, 10);
  const evDate = ev.eventLocalDateTime.substring(0, 10);

  if (evDate !== todayStr) return null;

  const nowH = parseInt(nowStr.substring(11, 13), 10);
  const nowM = parseInt(nowStr.substring(14, 16), 10);
  const evTimePart = ev.eventLocalDateTime.substring(11, 16);
  const evH = parseInt(evTimePart.substring(0, 2), 10);
  const evM = parseInt(evTimePart.substring(3, 5), 10);

  if (isNaN(nowH) || isNaN(nowM) || isNaN(evH) || isNaN(evM)) return null;

  const diff = (evH * 60 + evM) - (nowH * 60 + nowM);
  return diff > 0 ? diff : null;
}

// ============================================================================
// SIGNAL COMPUTATION (uses existing routeProvider — no new APIs)
// ============================================================================

function computeSignalForEvent(
  ev: CanonicalTimelineEvent,
  trip: CanonicalTripState['trip'],
  minutesToEvent: number,
): DriveSignal | null {
  // Build destination LocationRef from event address
  const dest: LocationRef = {
    type: 'ADDRESS',
    value: ev.address || null,
    city: undefined,
  };

  // Build origin from trip origin (if available)
  const origin: LocationRef | undefined = trip.origin_address
    ? { type: 'ADDRESS', value: trip.origin_address, city: trip.destination_city || undefined }
    : undefined;

  // v5.9.2: Attempt traffic-aware routing when coordinates are available
  const originLat = origin?.lat;
  const originLng = origin?.lng;
  const destLat = dest.lat;
  const destLng = dest.lng;

  if (originLat != null && originLng != null && destLat != null && destLng != null) {
    const traffic = getTrafficIntelligence(originLat, originLng, destLat, destLng);

    // Use live travel time instead of haversine estimate
    const etaMinutes = traffic.estimatedTravelTime;
    const routeState = deriveRouteState(etaMinutes, minutesToEvent);
    const confidence: DriveSignal['confidence'] =
      traffic.source === 'live' ? 'high' : 'medium';

    return {
      eventId: ev.id,
      etaMinutes,
      routeState,
      confidence,
      fetchedAt: Date.now(),
      trafficIntelligence: traffic,
    };
  }

  // Fallback: use existing route provider (haversine)
  const routeResult = getRoute(origin, dest);

  if (!routeResult.summary) return null;

  const etaMinutes = routeResult.summary.durationMinutes;
  const routeState = deriveRouteState(etaMinutes, minutesToEvent);

  const confidence: DriveSignal['confidence'] =
    routeResult.confidence === 'high' ? 'high' : 'medium';

  return {
    eventId: ev.id,
    etaMinutes,
    routeState,
    confidence,
    fetchedAt: Date.now(),
  };
}

// ============================================================================
// STABILITY FILTER
// ============================================================================

function applyStabilityFilter(
  newSignal: DriveSignal,
  cached: CachedDriveSignal | undefined,
): DriveSignal {
  if (!cached) return newSignal;

  const now = Date.now();

  // Ignore small ETA changes
  const etaDiff = Math.abs(newSignal.etaMinutes - cached.signal.etaMinutes);
  if (etaDiff < STABILITY_ETA_THRESHOLD_MINUTES) {
    // Keep previous signal with updated fetchedAt
    return { ...cached.signal, fetchedAt: now };
  }

  // Ignore rapid route state changes
  if (
    newSignal.routeState !== cached.signal.routeState &&
    (now - cached.previousStateChangeAt) < STABILITY_WINDOW_MS
  ) {
    // Keep previous state, update ETA only
    return { ...cached.signal, etaMinutes: newSignal.etaMinutes, fetchedAt: now };
  }

  return newSignal;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

function shouldFetch(eventId: string): boolean {
  const cached = _driveCache.get(eventId);
  if (!cached) return true;
  return (Date.now() - cached.lastFetchedAt) >= MIN_REFRESH_MS;
}

function writeToCache(signal: DriveSignal): void {
  const existing = _driveCache.get(signal.eventId);

  // Evict oldest entry if at capacity
  if (!existing && _driveCache.size >= MAX_CACHE_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of _driveCache) {
      if (entry.lastFetchedAt < oldestTime) {
        oldestTime = entry.lastFetchedAt;
        oldestKey = key;
      }
    }
    if (oldestKey) _driveCache.delete(oldestKey);
  }

  const stateChanged = existing ? signal.routeState !== existing.signal.routeState : true;

  _driveCache.set(signal.eventId, {
    signal,
    lastFetchedAt: Date.now(),
    previousEta: existing?.signal.etaMinutes ?? null,
    previousStateChangeAt: stateChanged ? Date.now() : (existing?.previousStateChangeAt ?? Date.now()),
  });
}

// ============================================================================
// MAIN ENGINE (pure, on-demand, deterministic)
// ============================================================================

/**
 * Resolve drive signals for upcoming routeable events.
 * Called during NOW evaluation — NOT on a timer or interval.
 *
 * Returns stable, cached-when-fresh signals for eligible events.
 * Max 1 signal per event. Max 10 cached entries.
 */
export function resolveDriveSignals(
  state: CanonicalTripState | null,
): DriveSignal[] {
  if (!state) return [];

  // Only evaluate during active trip phase
  const todayStr = getLocalNowString().substring(0, 10);
  const start = state.trip.start_date;
  const end = state.trip.end_date;
  if (todayStr < start || todayStr > end) return [];

  // Only drive-relevant trips
  const mode = state.trip.transportation_mode as string;
  const isDriveTrip = mode === 'drive' || mode === 'mixed';

  // Also check for car rentals in timeline
  const hasCarRental = state.timelineEvents.some(
    (e) => e.bookingType === 'car_rental'
  );

  if (!isDriveTrip && !hasCarRental) return [];

  const signals: DriveSignal[] = [];

  for (const ev of state.timelineEvents) {
    if (!isRouteableEvent(ev)) continue;

    const minutesToEvent = getMinutesToEvent(ev);
    if (minutesToEvent === null || minutesToEvent > LOOKAHEAD_MINUTES) continue;

    // Check cache freshness
    if (!shouldFetch(ev.id)) {
      const cached = _driveCache.get(ev.id);
      if (cached) {
        signals.push(cached.signal);
      }
      continue;
    }

    // Compute signal using existing route provider
    const rawSignal = computeSignalForEvent(ev, state.trip, minutesToEvent);
    if (!rawSignal) continue;

    // Apply stability filter
    const stableSignal = applyStabilityFilter(rawSignal, _driveCache.get(ev.id));

    // Write to cache
    writeToCache(stableSignal);
    signals.push(stableSignal);
  }

  return signals;
}

/**
 * Get the highest-priority drive signal (most urgent route state).
 * Returns null if no signals exist.
 */
export function getPrimaryDriveSignal(signals: DriveSignal[]): DriveSignal | null {
  if (signals.length === 0) return null;

  // Priority: delayed > tightening > stable
  const delayed = signals.find((s) => s.routeState === 'delayed');
  if (delayed) return delayed;

  const tightening = signals.find((s) => s.routeState === 'tightening');
  if (tightening) return tightening;

  return signals[0];
}

/**
 * Clear drive signal cache (for testing).
 */
export function clearDriveSignalCache(): void {
  _driveCache.clear();
}

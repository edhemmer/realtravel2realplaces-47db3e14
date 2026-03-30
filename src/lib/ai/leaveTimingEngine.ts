/**
 * v5.9.2: Leave Timing Engine — Drive-Aware Departure Decision Layer
 *
 * Converts existing drive signals and upcoming event timing into clear,
 * stable departure guidance: 'leave_now', 'leave_soon', or 'on_track'.
 *
 * v5.9.2: Enhanced with congestion-based buffer adjustments from
 * trafficIntelligenceEngine data carried on DriveSignal.
 *
 * ARCHITECTURE:
 * - canonicalTripState is the source of truth for events
 * - driveSignalEngine provides route timing signals (now with traffic data)
 * - This engine is read-only: no state mutation, no route fetching
 * - Maximum 1 recommendation for the most relevant upcoming event
 *
 * NO polling, NO intervals, NO direct route fetching.
 */

import type { CanonicalTripState, CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import type { DriveSignal } from '@/lib/ai/driveSignalEngine';
import { getLocalNowString } from '@/lib/canonicalNextStop';

// ============================================================================
// OUTPUT TYPE
// ============================================================================

export type LeaveTimingStatus = 'leave_now' | 'leave_soon' | 'on_track';

export interface LeaveTimingRecommendation {
  eventId: string;
  status: LeaveTimingStatus;
  message: string;
  urgency: 'high' | 'medium' | 'low';
  derivedFrom: 'drive_signal';
  updatedAt: number;
}

// ============================================================================
// STABILITY CACHE (prevents jittery recommendation switching)
// ============================================================================

interface CachedRecommendation {
  recommendation: LeaveTimingRecommendation;
  statusSetAt: number;
}

let _cachedRecommendation: CachedRecommendation | null = null;

/**
 * Minimum time between status changes: 90 seconds.
 * Prevents oscillation between leave_soon ↔ on_track.
 */
const STATUS_STABILITY_MS = 90 * 1000;

// ============================================================================
// CONSTANTS (documented, deterministic)
// ============================================================================

/**
 * Lookahead window: only evaluate events within next 120 minutes.
 */
const LOOKAHEAD_MINUTES = 120;

/**
 * Classification thresholds (buffer = minutesToEvent - etaMinutes):
 *
 * 'leave_now'  — buffer < 10 min, OR routeState is 'delayed'
 *                On-time arrival is at risk unless user departs immediately.
 *
 * 'leave_soon' — buffer 10–25 min, OR routeState is 'tightening'
 *                Departure should happen soon to maintain comfortable timing.
 *
 * 'on_track'   — buffer > 25 min AND routeState is 'stable'
 *                Current timing does not justify immediate departure pressure.
 */
const LEAVE_NOW_BUFFER_THRESHOLD = 10;
const LEAVE_SOON_BUFFER_THRESHOLD = 25;

// ============================================================================
// NAVIGATION-RELEVANT EVENT TYPES
// ============================================================================

const NAV_EVENT_TYPES = new Set([
  'flight_departure',
  'hotel_checkin',
  'rental_pickup',
  'activity_start',
  'transport_departure',
  'engagement_start',
]);

// ============================================================================
// TIME HELPERS (reuse canonical string approach, no timezone math)
// ============================================================================

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
// CONGESTION BUFFER (v5.9.2)
// ============================================================================

/**
 * Apply congestion-based buffer adjustment:
 * - low:      standard buffer (0 extra minutes)
 * - moderate: +5 min
 * - heavy:    +12 min
 *
 * Only applies when traffic intelligence is available on the drive signal.
 */
function getCongestionBuffer(signal: DriveSignal): number {
  const congestion = signal.trafficIntelligence?.congestionLevel;
  if (!congestion) return 0;
  if (congestion === 'moderate') return 5;
  if (congestion === 'heavy') return 12;
  return 0;
}

// ============================================================================
// CLASSIFICATION (deterministic, uses both buffer AND routeState + congestion)
// ============================================================================

function classifyLeaveStatus(
  buffer: number,
  routeState: DriveSignal['routeState'],
  signal: DriveSignal,
): { status: LeaveTimingStatus; urgency: LeaveTimingRecommendation['urgency'] } {
  // v5.9.2: Apply congestion buffer to tighten thresholds
  const congestionBuffer = getCongestionBuffer(signal);
  const adjustedBuffer = buffer - congestionBuffer;

  // Route state 'delayed' always escalates to leave_now
  if (routeState === 'delayed' || adjustedBuffer < LEAVE_NOW_BUFFER_THRESHOLD) {
    return { status: 'leave_now', urgency: 'high' };
  }

  // Route state 'tightening' escalates to leave_soon even if buffer is moderate
  if (routeState === 'tightening' || adjustedBuffer < LEAVE_SOON_BUFFER_THRESHOLD) {
    return { status: 'leave_soon', urgency: 'medium' };
  }

  return { status: 'on_track', urgency: 'low' };
}

// ============================================================================
// MESSAGE GENERATION (concise, grounded, user-facing)
// ============================================================================

function generateMessage(
  status: LeaveTimingStatus,
  routeState: DriveSignal['routeState'],
  eventLabel: string,
): string {
  switch (status) {
    case 'leave_now':
      if (routeState === 'delayed') {
        return `Leave now — route timing is tight for ${eventLabel}`;
      }
      return `Leave now — limited buffer for ${eventLabel}`;

    case 'leave_soon':
      if (routeState === 'tightening') {
        return `Leave soon — route timing is getting tighter`;
      }
      return `Leave soon to stay comfortable for ${eventLabel}`;

    case 'on_track':
      return `On track — no immediate rush`;
  }
}

// ============================================================================
// STABILITY FILTER
// ============================================================================

/**
 * Apply stability filter to prevent rapid status oscillation.
 * If the new status differs from the cached status AND the cached status
 * was set less than STATUS_STABILITY_MS ago, keep the cached status —
 * UNLESS the new status is more urgent (escalation always allowed).
 */
function applyStabilityFilter(
  newRecommendation: LeaveTimingRecommendation,
): LeaveTimingRecommendation {
  if (!_cachedRecommendation) return newRecommendation;

  // Different event → no stability filtering needed
  if (_cachedRecommendation.recommendation.eventId !== newRecommendation.eventId) {
    return newRecommendation;
  }

  const cached = _cachedRecommendation;
  const now = Date.now();
  const timeSinceChange = now - cached.statusSetAt;

  // Same status → just update timestamp
  if (cached.recommendation.status === newRecommendation.status) {
    return newRecommendation;
  }

  // Escalation is always allowed (on_track → leave_soon → leave_now)
  const urgencyOrder: Record<LeaveTimingStatus, number> = {
    on_track: 0,
    leave_soon: 1,
    leave_now: 2,
  };

  if (urgencyOrder[newRecommendation.status] > urgencyOrder[cached.recommendation.status]) {
    return newRecommendation;
  }

  // De-escalation: only allow after stability window
  if (timeSinceChange < STATUS_STABILITY_MS) {
    return { ...cached.recommendation, updatedAt: now };
  }

  return newRecommendation;
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

/**
 * Compute a leave timing recommendation for the most relevant upcoming
 * drive-related event. Returns null when no recommendation can be made.
 *
 * Called during NOW evaluation — NOT on a timer or interval.
 *
 * @param state - Canonical trip state
 * @param driveSignals - Drive signals from driveSignalEngine
 * @returns At most 1 LeaveTimingRecommendation, or null
 */
export function computeLeaveTimingRecommendation(
  state: CanonicalTripState | null,
  driveSignals: DriveSignal[],
): LeaveTimingRecommendation | null {
  if (!state || driveSignals.length === 0) return null;

  // Only during active trip phase
  const todayStr = getLocalNowString().substring(0, 10);
  const start = state.trip.start_date;
  const end = state.trip.end_date;
  if (todayStr < start || todayStr > end) return null;

  // Find the most urgent drive signal that maps to a valid upcoming event
  // Priority: delayed > tightening > stable
  const sortedSignals = [...driveSignals].sort((a, b) => {
    const order: Record<string, number> = { delayed: 0, tightening: 1, stable: 2 };
    return (order[a.routeState] ?? 3) - (order[b.routeState] ?? 3);
  });

  for (const signal of sortedSignals) {
    // Find the matching canonical event
    const event = state.timelineEvents.find((ev) => ev.id === signal.eventId);
    if (!event) continue;

    // Must be navigation-relevant
    if (!NAV_EVENT_TYPES.has(event.eventType)) continue;

    // Must have valid timing within lookahead
    const minutesToEvent = getMinutesToEvent(event);
    if (minutesToEvent === null || minutesToEvent > LOOKAHEAD_MINUTES) continue;

    // Compute buffer: time available minus drive ETA
    const buffer = minutesToEvent - signal.etaMinutes;

    // Classify
    const { status, urgency } = classifyLeaveStatus(buffer, signal.routeState, signal);

    // Build event label from canonical data
    const eventLabel = event.title || event.bookingType || 'next stop';

    const recommendation: LeaveTimingRecommendation = {
      eventId: signal.eventId,
      status,
      message: generateMessage(status, signal.routeState, eventLabel),
      urgency,
      derivedFrom: 'drive_signal',
      updatedAt: Date.now(),
    };

    // Apply stability filter
    const stableRecommendation = applyStabilityFilter(recommendation);

    // Update cache
    _cachedRecommendation = {
      recommendation: stableRecommendation,
      statusSetAt: stableRecommendation.status !== _cachedRecommendation?.recommendation.status
        ? Date.now()
        : (_cachedRecommendation?.statusSetAt ?? Date.now()),
    };

    return stableRecommendation;
  }

  return null;
}

/**
 * Clear leave timing cache (for testing).
 */
export function clearLeaveTimingCache(): void {
  _cachedRecommendation = null;
}

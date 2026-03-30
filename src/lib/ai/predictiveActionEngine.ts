/**
 * v5.7.0: Predictive Action Engine
 *
 * Bounded forward-looking action layer that anticipates near-term user needs
 * based on upcoming timeline events within a strict 120-minute window.
 *
 * SCOPE:
 * - Evaluates ONLY events within the next 120 minutes
 * - Generates candidate actions tied to real upcoming events or gaps
 * - Does NOT fetch new data, infer missing data, or create synthetic context
 *
 * OUTPUT: PredictiveAction[] candidates for merging into orchestration actions.
 * Final authority remains with aiOrchestrationEngine.
 */

import type { CanonicalTripState, CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import { getLocalNowString } from '@/lib/canonicalNextStop';

// ============================================================================
// TYPES
// ============================================================================

export type PredictiveAction = {
  id: string;
  actionType: 'navigate' | 'open_event' | 'open_explore' | 'open_weather' | 'open_expenses' | 'review';
  priority: 'high' | 'medium' | 'low';
  targetId?: string;
  reason: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum lookahead in minutes */
const PREDICTION_WINDOW_MINUTES = 120;

/** Threshold for "imminent" event */
const IMMINENT_THRESHOLD_MINUTES = 90;

/** Minimum gap (in minutes) to consider as meaningful idle time */
const IDLE_GAP_MINUTES = 60;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Compute minutes until an event's local datetime from now.
 * Returns null if the event is not today or has no valid time.
 */
function minutesUntilEvent(eventLocalDateTime: string): number | null {
  if (!eventLocalDateTime || eventLocalDateTime.length < 16) return null;
  const timePart = eventLocalDateTime.substring(11, 16);
  if (!/^\d{2}:\d{2}$/.test(timePart)) return null;

  const nowStr = getLocalNowString();
  if (nowStr.substring(0, 10) !== eventLocalDateTime.substring(0, 10)) return null;

  const nowH = parseInt(nowStr.substring(11, 13), 10);
  const nowM = parseInt(nowStr.substring(14, 16), 10);
  const evH = parseInt(timePart.substring(0, 2), 10);
  const evM = parseInt(timePart.substring(3, 5), 10);

  if (isNaN(nowH) || isNaN(nowM) || isNaN(evH) || isNaN(evM)) return null;
  const diff = (evH * 60 + evM) - (nowH * 60 + nowM);
  return diff >= 0 ? diff : null;
}

/**
 * Get upcoming events within the prediction window, sorted by time.
 */
function getUpcomingEvents(state: CanonicalTripState): Array<{ event: CanonicalTimelineEvent; minutesAway: number }> {
  const results: Array<{ event: CanonicalTimelineEvent; minutesAway: number }> = [];

  for (const ev of state.timelineEvents) {
    if (!ev.eventLocalDateTime) continue;
    const mins = minutesUntilEvent(ev.eventLocalDateTime);
    if (mins !== null && mins >= 0 && mins <= PREDICTION_WINDOW_MINUTES) {
      results.push({ event: ev, minutesAway: mins });
    }
  }

  return results.sort((a, b) => a.minutesAway - b.minutesAway);
}

/**
 * Detect if there's a tight transition between two consecutive upcoming events.
 * A tight transition is when the gap between two events is ≤ 30 minutes.
 */
function detectTightTransition(
  upcoming: Array<{ event: CanonicalTimelineEvent; minutesAway: number }>
): { eventA: CanonicalTimelineEvent; eventB: CanonicalTimelineEvent; gap: number } | null {
  for (let i = 0; i < upcoming.length - 1; i++) {
    const gap = upcoming[i + 1].minutesAway - upcoming[i].minutesAway;
    if (gap <= 30 && gap >= 0) {
      return { eventA: upcoming[i].event, eventB: upcoming[i + 1].event, gap };
    }
  }
  return null;
}

/**
 * Detect a meaningful idle gap (≥ 60 min) where the user has free time.
 * Only considers the gap between now and the first event, or between events.
 */
function detectIdleGap(
  upcoming: Array<{ event: CanonicalTimelineEvent; minutesAway: number }>
): boolean {
  // If no upcoming events, there's idle time
  if (upcoming.length === 0) return true;

  // If first event is far enough away, there's idle time
  if (upcoming[0].minutesAway >= IDLE_GAP_MINUTES) return true;

  // Check gaps between consecutive events
  for (let i = 0; i < upcoming.length - 1; i++) {
    const gap = upcoming[i + 1].minutesAway - upcoming[i].minutesAway;
    if (gap >= IDLE_GAP_MINUTES) return true;
  }

  return false;
}

/**
 * Check if weather data indicates concern for an upcoming event.
 */
function hasWeatherConcern(
  state: CanonicalTripState,
  event: CanonicalTimelineEvent,
): boolean {
  if (!event.eventLocalDateTime) return false;
  const dateKey = event.eventLocalDateTime.substring(0, 10);
  const destId = `dest::${state.trip.destination_city}`;
  const key = `${dateKey}::${destId}`;
  const snapshot = state.weatherByKey[key];
  if (!snapshot) return false;

  // Only flag if precipitation probability is high or conditions are severe
  return (
    (snapshot.precipChance != null && snapshot.precipChance >= 60) ||
    (snapshot.condition?.toLowerCase().includes('storm') ?? false) ||
    (snapshot.condition?.toLowerCase().includes('rain') ?? false)
  );
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

/**
 * Generate predictive action candidates based on upcoming events.
 * Returns an array of PredictiveAction candidates (may be empty).
 *
 * These are candidates only — the orchestration engine decides
 * final inclusion after deduplication and priority sorting.
 */
export function generatePredictiveActions(
  state: CanonicalTripState | null,
): PredictiveAction[] {
  if (!state) return [];

  const upcoming = getUpcomingEvents(state);
  const actions: PredictiveAction[] = [];

  // --- Rule 1: Imminent event (≤ 90 minutes) ---
  const imminent = upcoming.filter((u) => u.minutesAway <= IMMINENT_THRESHOLD_MINUTES);
  if (imminent.length > 0) {
    const next = imminent[0];
    const eventType = next.event.bookingType;
    const isNavigable = ['flight', 'stay', 'activity', 'transport'].includes(eventType);

    if (isNavigable && next.event.address) {
      actions.push({
        id: `pred-nav-${next.event.sourceId}`,
        actionType: 'navigate',
        priority: next.minutesAway <= 45 ? 'high' : 'medium',
        targetId: next.event.sourceId,
        reason: `${next.event.title} is ${next.minutesAway} min away`,
      });
    }

    actions.push({
      id: `pred-event-${next.event.sourceId}`,
      actionType: 'open_event',
      priority: next.minutesAway <= 30 ? 'high' : 'medium',
      targetId: next.event.sourceId,
      reason: `Review details for ${next.event.title} coming up soon`,
    });
  }

  // --- Rule 2: Tight transition ---
  const tightTransition = detectTightTransition(upcoming);
  if (tightTransition && !actions.some((a) => a.targetId === tightTransition.eventB.sourceId)) {
    actions.push({
      id: `pred-tight-${tightTransition.eventB.sourceId}`,
      actionType: 'open_event',
      priority: 'high',
      targetId: tightTransition.eventB.sourceId,
      reason: `Only ${tightTransition.gap} min gap before ${tightTransition.eventB.title}`,
    });
  }

  // --- Rule 3: Meaningful idle gap ---
  if (detectIdleGap(upcoming) && !actions.some((a) => a.actionType === 'open_explore')) {
    actions.push({
      id: 'pred-explore-idle',
      actionType: 'open_explore',
      priority: 'low',
      reason: 'Free time available — explore nearby',
    });
  }

  // --- Rule 4: Weather impact on upcoming event ---
  for (const u of upcoming.slice(0, 3)) {
    if (hasWeatherConcern(state, u.event) && !actions.some((a) => a.actionType === 'open_weather')) {
      actions.push({
        id: `pred-weather-${u.event.sourceId}`,
        actionType: 'open_weather',
        priority: 'medium',
        targetId: u.event.sourceId,
        reason: `Weather may affect ${u.event.title}`,
      });
      break;
    }
  }

  return actions;
}

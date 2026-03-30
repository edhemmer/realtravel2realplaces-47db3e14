/**
 * v5.8.0: Sequence Engine
 *
 * Bounded multi-step context layer that generates short, grounded sequences
 * from upcoming canonical trip events. Sequences represent real near-term
 * flows (e.g., "flight → hotel check-in") to improve user confidence
 * during transitions.
 *
 * ARCHITECTURE BOUNDARY:
 * - Separate from aiOrchestrationEngine, predictiveActionEngine, aiFeedbackEngine
 * - Reads ONLY from canonicalTripState + current time
 * - Does NOT invent intermediate steps, fetch data, or create synthetic context
 * - Generates at most 1 sequence with 2–3 steps
 *
 * OUTPUT: ActionSequence | null — consumed optionally by aiOrchestrationEngine.
 */

import type { CanonicalTripState, CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import { getLocalNowString } from '@/lib/canonicalNextStop';

// ============================================================================
// TYPES
// ============================================================================

export type SequenceStep = {
  stepNumber: number;
  label: string;
  actionType?: 'navigate' | 'open_event' | 'open_explore' | 'open_weather' | 'open_expenses' | 'review';
  targetId?: string;
};

export type ActionSequence = {
  id: string;
  title: string;
  steps: SequenceStep[];
  relevance: 'high' | 'medium';
};

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum lookahead window in minutes */
const SEQUENCE_WINDOW_MINUTES = 180;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Compute minutes from now until an event's local datetime.
 * Returns null if event is not today or has no valid time.
 */
function minutesUntil(eventLocalDateTime: string): number | null {
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

type UpcomingEvent = {
  event: CanonicalTimelineEvent;
  minutesAway: number;
};

/**
 * Get upcoming canonical events within the sequence window, sorted by time.
 * Filters out events without valid local datetimes.
 */
function getUpcomingEligible(state: CanonicalTripState): UpcomingEvent[] {
  const results: UpcomingEvent[] = [];

  for (const ev of state.timelineEvents) {
    if (!ev.eventLocalDateTime) continue;
    const mins = minutesUntil(ev.eventLocalDateTime);
    if (mins !== null && mins >= 0 && mins <= SEQUENCE_WINDOW_MINUTES) {
      results.push({ event: ev, minutesAway: mins });
    }
  }

  return results.sort((a, b) => a.minutesAway - b.minutesAway);
}

/**
 * Build a concise label from a canonical event.
 * Uses the event title directly — no invented details.
 */
function labelForEvent(ev: CanonicalTimelineEvent): string {
  return ev.title || ev.bookingType || 'Event';
}

/**
 * Determine if an event type supports navigation action.
 */
function isNavigable(ev: CanonicalTimelineEvent): boolean {
  return !!ev.address && ['flight', 'stay', 'activity', 'transport', 'parking'].includes(ev.bookingType);
}

// ============================================================================
// SEQUENCE GENERATORS
// ============================================================================

/**
 * Try to build a compressed-flow sequence from 2–3 consecutive upcoming events.
 * Only generates when events form a real ordered multi-step flow.
 */
function tryCompressedFlow(upcoming: UpcomingEvent[]): ActionSequence | null {
  if (upcoming.length < 2) return null;

  // Take the first 2–3 events within the window
  const candidates = upcoming.slice(0, 3);

  // All candidates must be within the sequence window (already filtered)
  // and reasonably close together (all within 180 min of now).
  // Verify the last candidate is not too far from the first to form a cohesive flow.
  const spread = candidates[candidates.length - 1].minutesAway - candidates[0].minutesAway;
  if (spread > 150) {
    // Too spread out for a cohesive sequence, try just the first 2
    candidates.splice(2);
  }

  if (candidates.length < 2) return null;

  // Build steps from actual events
  const steps: SequenceStep[] = candidates.map((c, idx) => {
    const step: SequenceStep = {
      stepNumber: idx + 1,
      label: labelForEvent(c.event),
      actionType: 'open_event',
      targetId: c.event.sourceId,
    };

    // First step: if navigable, suggest navigate instead
    if (idx === 0 && isNavigable(c.event)) {
      step.actionType = 'navigate';
    }

    return step;
  });

  // Determine relevance based on how soon the first event is
  const relevance: 'high' | 'medium' = candidates[0].minutesAway <= 90 ? 'high' : 'medium';

  // Build a concise title from the flow
  const title = candidates.length === 3
    ? `${labelForEvent(candidates[0].event)} → ${labelForEvent(candidates[1].event)} → ${labelForEvent(candidates[2].event)}`
    : `${labelForEvent(candidates[0].event)} → ${labelForEvent(candidates[1].event)}`;

  return {
    id: `seq-flow-${candidates[0].event.sourceId}`,
    title,
    steps,
    relevance,
  };
}

/**
 * Try to build a transition sequence when two events form a clear
 * arrival → next commitment pattern (e.g., flight arrival → hotel check-in).
 */
function tryTransitionFlow(upcoming: UpcomingEvent[]): ActionSequence | null {
  if (upcoming.length < 2) return null;

  const first = upcoming[0];
  const second = upcoming[1];
  const gap = second.minutesAway - first.minutesAway;

  // Transition pattern: gap between 5–90 minutes, different event types
  if (gap < 5 || gap > 90) return null;
  if (first.event.bookingType === second.event.bookingType) return null;

  const steps: SequenceStep[] = [
    {
      stepNumber: 1,
      label: labelForEvent(first.event),
      actionType: 'open_event',
      targetId: first.event.sourceId,
    },
    {
      stepNumber: 2,
      label: labelForEvent(second.event),
      actionType: isNavigable(second.event) ? 'navigate' : 'open_event',
      targetId: second.event.sourceId,
    },
  ];

  return {
    id: `seq-transition-${first.event.sourceId}`,
    title: `${labelForEvent(first.event)} → ${labelForEvent(second.event)}`,
    steps,
    relevance: first.minutesAway <= 60 ? 'high' : 'medium',
  };
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

/**
 * Generate an optional bounded action sequence from upcoming canonical events.
 *
 * Returns at most 1 ActionSequence with 2–3 steps, or null if no
 * meaningful multi-step flow exists in the next 180 minutes.
 *
 * This is a pure, deterministic function with no side effects.
 */
export function generateSequence(
  state: CanonicalTripState | null,
): ActionSequence | null {
  if (!state) return null;

  const upcoming = getUpcomingEligible(state);
  if (upcoming.length < 2) return null;

  // Priority 1: Transition flow (different event types close together)
  const transition = tryTransitionFlow(upcoming);
  if (transition && transition.relevance === 'high') return transition;

  // Priority 2: Compressed flow (2–3 consecutive events)
  const compressed = tryCompressedFlow(upcoming);
  if (compressed) return compressed;

  // Priority 3: Medium-relevance transition
  if (transition) return transition;

  return null;
}

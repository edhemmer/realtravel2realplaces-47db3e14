/**
 * v5.8.4: AI Orchestration Engine
 *
 * Single canonical AI orchestration layer that sits above deterministic systems
 * and converts structured trip state into cohesive, human-useful guidance.
 *
 * ARCHITECTURE BOUNDARY:
 * - Deterministic systems (canonicalTripState, proactiveInsightEngine) remain
 *   the source of truth for data, triggers, and safety.
 * - This layer summarizes, prioritizes, and explains — it does NOT replace
 *   canonical truth, modify state, or invent unsupported facts.
 *
 * INPUTS: canonicalTripState, canonicalWeather, proactive insight outputs
 * NO new APIs, NO persistence, NO background agents, NO polling.
 */

import type { CanonicalTripState, CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import type { ProactiveInsight, ProactiveInsightAction } from '@/lib/proactiveInsightEngine';
import { getLocalNowString } from '@/lib/canonicalNextStop';
import { computePreferenceWeights, reorderActionsWithPreference } from '@/lib/ai/aiFeedbackEngine';
import { generatePredictiveActions, type PredictiveAction } from '@/lib/ai/predictiveActionEngine';
import { generateSequence, type ActionSequence } from '@/lib/ai/sequenceEngine';

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export type AIOrchestratedGuidanceItem = {
  id: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  type: 'time' | 'weather' | 'logistics' | 'risk' | 'expense' | 'explore' | 'general';
  actionHint?: string;
};

export type AIOrchestratedAction = {
  id: string;
  label: string;
  actionType: 'navigate' | 'open_event' | 'open_explore' | 'open_weather' | 'open_expenses' | 'review';
  actionPayload?: Record<string, unknown>;
};

export type AIOrchestratedContext = {
  phase: 'pre-trip' | 'in-transit' | 'active' | 'post-trip';
  primaryFocus: string;
  summary: string;
  prioritizedGuidance: AIOrchestratedGuidanceItem[];
  recommendedActions: AIOrchestratedAction[];
  /** v5.8.0: Optional bounded multi-step sequence for near-term context */
  activeSequence: ActionSequence | null;
};

// ============================================================================
// PHASE DETECTION
// ============================================================================

function resolvePhase(state: CanonicalTripState): AIOrchestratedContext['phase'] {
  const today = getLocalNowString().substring(0, 10);
  const start = state.trip.start_date;
  const end = state.trip.end_date;
  if (today > end) return 'post-trip';
  if (today >= start) return 'active';
  return 'pre-trip';
}

// ============================================================================
// SAFE TIME HELPERS (reuse canonical string approach)
// ============================================================================

function safeMinutesUntilEvent(eventLocalDateTime: string): number | null {
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

// ============================================================================
// PRIMARY FOCUS RESOLVER
// ============================================================================

function resolvePrimaryFocus(
  phase: AIOrchestratedContext['phase'],
  state: CanonicalTripState,
  insights: ProactiveInsight[],
): string {
  if (phase === 'post-trip') return 'Trip complete — review your experience';
  if (phase === 'pre-trip') {
    const daysUntil = daysBetween(getLocalNowString().substring(0, 10), state.trip.start_date);
    if (daysUntil <= 1) return 'Final preparations before departure';
    if (daysUntil <= 3) return 'Getting ready for your trip';
    return 'Planning ahead for your upcoming trip';
  }

  // Active phase: derive from highest-priority insight
  const highInsight = insights.find((i) => i.priority === 'high');
  if (highInsight) {
    switch (highInsight.type) {
      case 'time': return 'Making the next arrival on time';
      case 'risk': return 'Reviewing missing details for upcoming steps';
      case 'logistics': return 'Handling a tight transition';
      case 'weather': return 'Adapting to changing conditions';
    }
  }

  // Check for upcoming events
  const todayStr = getLocalNowString().substring(0, 10);
  const todayEvents = state.timelineEvents.filter(
    (e) => e.eventLocalDateTime && e.eventLocalDateTime.substring(0, 10) === todayStr
  );

  if (todayEvents.length === 0) return 'Using available free time';
  
  const nextEvent = todayEvents.find((e) => {
    const mins = e.eventLocalDateTime ? safeMinutesUntilEvent(e.eventLocalDateTime) : null;
    return mins !== null && mins >= 0;
  });

  if (!nextEvent) return 'Wrapping up the day';
  
  const mins = safeMinutesUntilEvent(nextEvent.eventLocalDateTime!);
  if (mins !== null && mins <= 60) return 'Preparing for the next step';
  return 'On track with the current plan';
}

// ============================================================================
// SUMMARY GENERATOR
// ============================================================================

function generateSummary(
  phase: AIOrchestratedContext['phase'],
  state: CanonicalTripState,
  insights: ProactiveInsight[],
): string {
  if (phase === 'post-trip') {
    return `Your trip to ${state.trip.destination_city || state.trip.name} is complete.`;
  }

  if (phase === 'pre-trip') {
    const daysUntil = daysBetween(getLocalNowString().substring(0, 10), state.trip.start_date);
    const destination = state.trip.destination_city || state.trip.name;
    if (daysUntil <= 1) return `Departing for ${destination} tomorrow — finalize your preparations.`;
    return `${destination} is ${daysUntil} days away.`;
  }

  // Active phase
  const todayStr = getLocalNowString().substring(0, 10);
  const todayEvents = state.timelineEvents.filter(
    (e) => e.eventLocalDateTime && e.eventLocalDateTime.substring(0, 10) === todayStr
  );
  const upcomingCount = todayEvents.filter((e) => {
    const mins = e.eventLocalDateTime ? safeMinutesUntilEvent(e.eventLocalDateTime) : null;
    return mins !== null && mins >= 0;
  }).length;

  const highInsight = insights.find((i) => i.priority === 'high');

  if (highInsight?.type === 'time') {
    return `Timing is tight — stay focused on your next step.`;
  }
  if (highInsight?.type === 'risk') {
    return `An upcoming event needs attention before you proceed.`;
  }

  if (upcomingCount === 0) return 'No more scheduled events today.';
  if (upcomingCount === 1) return 'One more thing on your schedule today.';
  return `${upcomingCount} events remaining today.`;
}

// ============================================================================
// GUIDANCE CONVERTER
// ============================================================================

function convertInsightsToGuidance(
  insights: ProactiveInsight[],
): AIOrchestratedGuidanceItem[] {
  return insights.slice(0, 3).map((insight, idx) => {
    let title: string;
    switch (insight.type) {
      case 'time': title = 'Timing'; break;
      case 'weather': title = 'Weather'; break;
      case 'logistics': title = 'Schedule'; break;
      case 'risk': title = 'Attention needed'; break;
      default: title = 'Update';
    }

    return {
      id: `guidance-${insight.id}-${idx}`,
      title,
      message: insight.message,
      priority: insight.priority,
      type: insight.type,
      actionHint: insight.action ? describeAction(insight.action) : undefined,
    };
  });
}

function describeAction(action: ProactiveInsightAction): string {
  switch (action.actionType) {
    case 'navigate': return `Navigate to ${action.destinationLabel}`;
    case 'open_event': return 'View event details';
    case 'open_explore': return 'Explore nearby';
    case 'open_weather': return 'Check weather';
  }
}

// ============================================================================
// v5.8.2.1: SEQUENCE PRESSURE CLASSIFICATION
// ============================================================================

/**
 * Internal sequence pressure signal.
 * Derived from step spacing and sequence relevance.
 *
 * 'high'   — tightly compressed flow, steps close together (≤45 min spread)
 *            OR sequence relevance is 'high' with ≤2 steps tightly packed.
 * 'medium' — moderately spaced upcoming flow (≤90 min spread).
 * 'low'    — sequence exists but spacing is relaxed.
 * 'none'   — no usable sequence.
 *
 * Uses only data already available on the ActionSequence and safe
 * canonical event timing from safeMinutesUntilEvent. No timezone math.
 */
type SequencePressure = 'high' | 'medium' | 'low' | 'none';

function deriveSequencePressure(
  sequence: ActionSequence | null,
  state: CanonicalTripState | null,
): SequencePressure {
  if (!sequence || !state || sequence.steps.length < 2) return 'none';

  // Find canonical events matching the sequence step targetIds
  // to derive actual time spacing between steps.
  const stepMinutes: (number | null)[] = sequence.steps.map((step) => {
    if (!step.targetId) return null;
    const ev = state.timelineEvents.find((e) => e.sourceId === step.targetId);
    if (!ev?.eventLocalDateTime) return null;
    return safeMinutesUntilEvent(ev.eventLocalDateTime);
  });

  // Filter to valid future minutes
  const validMinutes = stepMinutes.filter((m): m is number => m !== null && m >= 0);

  if (validMinutes.length < 2) {
    // Can't determine spacing; fall back to sequence relevance
    return sequence.relevance === 'high' ? 'medium' : 'low';
  }

  // Spread = gap between first and last step
  const spread = validMinutes[validMinutes.length - 1] - validMinutes[0];

  if (spread <= 45) return 'high';
  if (spread <= 90) return 'medium';
  return 'low';
}

/**
 * Generate a single, clear execution message from the active sequence.
 * Replaces fragmented guidance with one concise directive.
 *
 * Rules:
 * - Max 1 message, max 2 sentences, ~120 chars preferred
 * - Uses only real canonical event labels from sequence steps
 * - Does not invent verbs or steps not present in the sequence
 * - Returns null if sequence is insufficient
 */
function generateSequenceAwareMessage(
  sequence: ActionSequence,
): AIOrchestratedGuidanceItem | null {
  if (!sequence.steps || sequence.steps.length < 2) return null;

  const step1 = sequence.steps[0];
  const step2 = sequence.steps[1];

  // Build a direct message: current step + next context
  const actionVerb = step1.actionType === 'navigate' ? 'Head to' : 'Next up:';
  const message = `${actionVerb} ${step1.label} — then ${step2.label}`;

  return {
    id: `seq-guidance-${sequence.id}`,
    title: 'Next steps',
    message,
    priority: 'high',
    type: 'logistics',
    actionHint: step1.actionType ? describeSequenceStepAction(step1) : undefined,
  };
}

function describeSequenceStepAction(step: import('@/lib/ai/sequenceEngine').SequenceStep): string {
  switch (step.actionType) {
    case 'navigate': return `Navigate to ${step.label}`;
    case 'open_event': return 'View event details';
    default: return step.label;
  }
}

/**
 * Apply sequence-aware messaging to guidance.
 *
 * v5.8.2.1: Enhanced with pressure-based suppression.
 *
 * HIGH pressure:
 * - Replace fragmented guidance with single sequence message
 * - Keep only critical alerts (risk + high priority)
 * - Suppress explore, general, and low-priority items
 *
 * MEDIUM pressure:
 * - Replace fragmented guidance with single sequence message
 * - Keep critical alerts AND time/logistics high-priority items
 *
 * LOW pressure:
 * - Preserve original guidance unchanged
 *
 * NONE:
 * - Preserve original guidance unchanged
 */
function applySequenceAwareGuidance(
  originalGuidance: AIOrchestratedGuidanceItem[],
  sequence: ActionSequence | null,
  pressure: SequencePressure,
): AIOrchestratedGuidanceItem[] {
  if (pressure === 'none' || pressure === 'low' || !sequence) return originalGuidance;

  const seqMessage = generateSequenceAwareMessage(sequence);
  if (!seqMessage) return originalGuidance;

  if (pressure === 'high') {
    // Keep only critical risk alerts
    const criticalAlerts = originalGuidance.filter(
      (g) => g.type === 'risk' && g.priority === 'high'
    );
    return [...criticalAlerts, seqMessage].slice(0, 3);
  }

  // Medium pressure: keep critical alerts + high-priority time/logistics
  const importantItems = originalGuidance.filter(
    (g) =>
      (g.type === 'risk' && g.priority === 'high') ||
      (g.type === 'time' && g.priority === 'high') ||
      (g.type === 'logistics' && g.priority === 'high')
  );
  return [...importantItems, seqMessage].slice(0, 3);
}

// ============================================================================
// ACTION RECOMMENDER
// ============================================================================

function recommendActions(
  phase: AIOrchestratedContext['phase'],
  state: CanonicalTripState,
  insights: ProactiveInsight[],
): AIOrchestratedAction[] {
  const actions: AIOrchestratedAction[] = [];

  if (phase === 'post-trip') return actions;

  // From high-priority insights, derive action suggestions
  for (const insight of insights) {
    if (actions.length >= 3) break;
    if (!insight.action) continue;

    switch (insight.action.actionType) {
      case 'navigate':
        actions.push({
          id: `action-nav-${insight.id}`,
          label: `Navigate to ${insight.action.destinationLabel}`,
          actionType: 'navigate',
          actionPayload: { destinationLabel: insight.action.destinationLabel },
        });
        break;
      case 'open_event':
        actions.push({
          id: `action-event-${insight.id}`,
          label: 'Review upcoming event',
          actionType: 'open_event',
          actionPayload: { eventId: insight.action.eventId },
        });
        break;
      case 'open_explore':
        actions.push({
          id: `action-explore-${insight.id}`,
          label: 'Explore nearby',
          actionType: 'open_explore',
        });
        break;
      case 'open_weather':
        actions.push({
          id: `action-weather-${insight.id}`,
          label: 'Check weather',
          actionType: 'open_weather',
        });
        break;
    }
  }

  // If active and no expense action yet, suggest reviewing expenses
  if (phase === 'active' && actions.length < 3) {
    const todayStr = getLocalNowString().substring(0, 10);
    const todayEvents = state.timelineEvents.filter(
      (e) => e.eventLocalDateTime && e.eventLocalDateTime.substring(0, 10) === todayStr
    );
    const upcomingCount = todayEvents.filter((e) => {
      const mins = e.eventLocalDateTime ? safeMinutesUntilEvent(e.eventLocalDateTime) : null;
      return mins !== null && mins >= 0;
    }).length;

    // Suggest explore if low density
    if (upcomingCount === 0 && !actions.some((a) => a.actionType === 'open_explore')) {
      actions.push({
        id: 'action-explore-idle',
        label: 'Explore nearby',
        actionType: 'open_explore',
      });
    }
  }

  return actions.slice(0, 3);
}

// ============================================================================
// v5.8.3: TRANSITION STATE DETECTION
// ============================================================================

/**
 * Lightweight internal transition state derived from canonical event timing.
 *
 * 'approaching_next_event' — next event starts within 90 min, no event currently active.
 * 'between_events'         — previous event ended, next event exists with ≥30 min gap.
 * 'just_completed_event'   — an event ended within the last 20 min.
 * null                     — no meaningful transition detected.
 *
 * Uses only safeMinutesUntilEvent and canonical event start/end times.
 * No timezone math, no synthetic steps.
 */
type TransitionState = 'approaching_next_event' | 'between_events' | 'just_completed_event' | null;

function resolveTransitionState(state: CanonicalTripState): TransitionState {
  const nowStr = getLocalNowString();
  const todayStr = nowStr.substring(0, 10);
  const nowMinutes = parseMinutesFromTimeString(nowStr);
  if (nowMinutes === null) return null;

  // Get today's events with valid times, sorted by start
  const todayEvents = state.timelineEvents
    .filter((e) => e.eventLocalDateTime && e.eventLocalDateTime.substring(0, 10) === todayStr)
    .sort((a, b) => (a.eventLocalDateTime! > b.eventLocalDateTime! ? 1 : -1));

  if (todayEvents.length === 0) return null;

  // Find the most recently ended event (end time already passed)
  // and the next upcoming event (start time in the future)
  let lastEnded: { event: CanonicalTimelineEvent; endMinutes: number } | null = null;
  let nextUpcoming: { event: CanonicalTimelineEvent; startMinutes: number } | null = null;

  for (const ev of todayEvents) {
    const startMins = parseMinutesFromTimeString(ev.eventLocalDateTime!);
    if (startMins === null) continue;

    // Estimate end time: use arrivalLocalTime for flights, otherwise start + 60 min
    const endMins = estimateEventEndMinutes(ev, startMins);

    if (endMins <= nowMinutes) {
      // This event has ended
      if (!lastEnded || endMins > lastEnded.endMinutes) {
        lastEnded = { event: ev, endMinutes: endMins };
      }
    } else if (startMins > nowMinutes) {
      // This event hasn't started yet
      if (!nextUpcoming || startMins < nextUpcoming.startMinutes) {
        nextUpcoming = { event: ev, startMinutes: startMins };
      }
    }
    // Events currently in progress (startMins <= now < endMins) → no transition
  }

  // Check if any event is currently in progress
  const inProgress = todayEvents.some((ev) => {
    const startMins = parseMinutesFromTimeString(ev.eventLocalDateTime!);
    if (startMins === null) return false;
    const endMins = estimateEventEndMinutes(ev, startMins);
    return startMins <= nowMinutes && nowMinutes < endMins;
  });

  // 1. JUST COMPLETED: event ended within last 20 minutes
  if (lastEnded && (nowMinutes - lastEnded.endMinutes) <= 20) {
    return 'just_completed_event';
  }

  // 2. APPROACHING: next event within 90 min, nothing in progress
  if (nextUpcoming && !inProgress && (nextUpcoming.startMinutes - nowMinutes) <= 90) {
    return 'approaching_next_event';
  }

  // 3. BETWEEN: previous ended, next exists, gap ≥ 30 min
  if (lastEnded && nextUpcoming && !inProgress) {
    const gapToNext = nextUpcoming.startMinutes - nowMinutes;
    if (gapToNext >= 30) {
      return 'between_events';
    }
  }

  return null;
}

/**
/**
 * Estimate event end time in minutes-since-midnight.
 * Uses arrivalLocalTime for flights, otherwise start + 60 min.
 */
function estimateEventEndMinutes(ev: CanonicalTimelineEvent, startMins: number): number {
  // For flights, use arrival time if available
  if (ev.bookingType === 'flight' && ev.arrivalLocalTime) {
    const arrMins = parseMinutesFromTimeString(ev.arrivalLocalTime);
    if (arrMins !== null) return arrMins;
  }
  // Default: assume 60 min duration
  return startMins + 60;
}

/**
 * Parse minutes-since-midnight from a datetime or time string.
 * Accepts "YYYY-MM-DDTHH:MM" or "HH:MM" formats.
 */
function parseMinutesFromTimeString(dt: string): number | null {
  if (!dt) return null;
  // Extract HH:MM from position 11 (datetime) or 0 (time-only)
  let timePart: string;
  if (dt.length >= 16 && dt[10] === 'T') {
    timePart = dt.substring(11, 16);
  } else if (dt.length >= 5 && dt[2] === ':') {
    timePart = dt.substring(0, 5);
  } else {
    return null;
  }
  if (!/^\d{2}:\d{2}$/.test(timePart)) return null;
  const h = parseInt(timePart.substring(0, 2), 10);
  const m = parseInt(timePart.substring(3, 5), 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Apply transition-aware refinement to summary text.
 *
 * This is a secondary signal — sequencePressure overrides when active.
 * Only refines the summary when no sequence-aware summary was applied.
 *
 * Uses real canonical event labels only. No invented steps.
 */
function applyTransitionToSummary(
  baseSummary: string,
  transition: TransitionState,
  state: CanonicalTripState,
  sequencePressure: SequencePressure,
): string {
  // Sequence pressure already provides summary — do not override
  if (sequencePressure === 'high' || sequencePressure === 'medium') return baseSummary;

  if (!transition) return baseSummary;

  const nowStr = getLocalNowString();
  const todayStr = nowStr.substring(0, 10);

  // Find next upcoming event label for context
  const nextEvent = state.timelineEvents.find((e) => {
    if (!e.eventLocalDateTime || e.eventLocalDateTime.substring(0, 10) !== todayStr) return false;
    const mins = safeMinutesUntilEvent(e.eventLocalDateTime);
    return mins !== null && mins > 0;
  });

  const nextLabel = nextEvent?.title || nextEvent?.bookingType || null;

  switch (transition) {
    case 'approaching_next_event':
      return nextLabel ? `Coming up: ${nextLabel}` : baseSummary;
    case 'between_events':
      return nextLabel ? `Gap before ${nextLabel}` : 'Open time before next event.';
    case 'just_completed_event':
      return nextLabel ? `Done — next is ${nextLabel}` : 'Just wrapped up.';
    default:
      return baseSummary;
  }
}

/**
 * Apply transition-aware refinement to primaryFocus.
 *
 * Only activates during active phase when no high-priority insight exists
 * and sequencePressure is low or none.
 */
function applyTransitionToFocus(
  baseFocus: string,
  transition: TransitionState,
  sequencePressure: SequencePressure,
  hasHighInsight: boolean,
): string {
  // Don't override when sequence pressure or high insights dominate
  if (sequencePressure === 'high' || sequencePressure === 'medium' || hasHighInsight) {
    return baseFocus;
  }

  switch (transition) {
    case 'approaching_next_event': return 'Getting ready for the next event';
    case 'between_events': return 'Free time between events';
    case 'just_completed_event': return 'Transitioning to what\'s next';
    default: return baseFocus;
  }
}

// ============================================================================
// v5.8.4: EXECUTION CONTEXT DERIVATION
// ============================================================================

/**
 * Lightweight execution-environment signal derived from canonical event types.
 * Used to refine guidance during movement-heavy periods.
 *
 * All flags default to false when event type is unclear.
 * No external APIs, no simulated data, no inferred types.
 */
type ExecutionContext = {
  hasUpcomingMovement: boolean;
  hasUpcomingFlight: boolean;
  hasUpcomingLodging: boolean;
  isTravelHeavyWindow: boolean;
};

/** Known movement booking types from canonical event structure */
const MOVEMENT_TYPES = new Set(['transport', 'car_rental']);
const FLIGHT_TYPES = new Set(['flight']);
const LODGING_TYPES = new Set(['stay']);

/** Known movement event types */
const MOVEMENT_EVENT_TYPES = new Set(['flight_departure', 'rental_pickup', 'rental_return']);
const LODGING_EVENT_TYPES = new Set(['hotel_checkin', 'hotel_checkout']);

function deriveExecutionContext(
  state: CanonicalTripState,
  activeSequence: ActionSequence | null,
  sequencePressure: SequencePressure,
): ExecutionContext {
  const todayStr = getLocalNowString().substring(0, 10);

  // Get next upcoming event (today, future only)
  const nextEvent = state.timelineEvents.find((e) => {
    if (!e.eventLocalDateTime || e.eventLocalDateTime.substring(0, 10) !== todayStr) return false;
    const mins = safeMinutesUntilEvent(e.eventLocalDateTime);
    return mins !== null && mins > 0;
  });

  // Collect event types to check: next event + sequence step events
  const typesToCheck: Array<{ bookingType: string; eventType: string }> = [];

  if (nextEvent) {
    typesToCheck.push({ bookingType: nextEvent.bookingType, eventType: nextEvent.eventType });
  }

  if (activeSequence) {
    for (const step of activeSequence.steps) {
      if (!step.targetId) continue;
      const ev = state.timelineEvents.find((e) => e.sourceId === step.targetId);
      if (ev) {
        typesToCheck.push({ bookingType: ev.bookingType, eventType: ev.eventType });
      }
    }
  }

  const hasUpcomingMovement = typesToCheck.some(
    (t) => MOVEMENT_TYPES.has(t.bookingType) || MOVEMENT_EVENT_TYPES.has(t.eventType)
  );
  const hasUpcomingFlight = typesToCheck.some(
    (t) => FLIGHT_TYPES.has(t.bookingType) || t.eventType === 'flight_departure'
  );
  const hasUpcomingLodging = typesToCheck.some(
    (t) => LODGING_TYPES.has(t.bookingType) || LODGING_EVENT_TYPES.has(t.eventType)
  );

  const isTravelHeavyWindow =
    !!activeSequence &&
    (sequencePressure === 'high' || sequencePressure === 'medium') &&
    (hasUpcomingMovement || hasUpcomingFlight);

  return { hasUpcomingMovement, hasUpcomingFlight, hasUpcomingLodging, isTravelHeavyWindow };
}

/**
 * Apply execution-context-based action filtering.
 *
 * When isTravelHeavyWindow = true:
 * - Move generic explore/review actions to end (deprioritize)
 *
 * This is the lowest-priority signal (below sequencePressure and transitionState).
 * It only refines; it never removes or creates actions.
 */
function applyExecutionContextToActions(
  actions: AIOrchestratedAction[],
  execCtx: ExecutionContext,
): AIOrchestratedAction[] {
  if (!execCtx.isTravelHeavyWindow || actions.length <= 1) return actions;

  // Deprioritize explore/review during travel-heavy windows
  const focused = actions.filter(
    (a) => a.actionType !== 'open_explore' && a.actionType !== 'review'
  );
  const deprioritized = actions.filter(
    (a) => a.actionType === 'open_explore' || a.actionType === 'review'
  );
  return [...focused, ...deprioritized].slice(0, 3);
}

/**
 * Lightly refine summary wording based on execution context.
 *
 * Only activates when isTravelHeavyWindow is true AND no higher-priority
 * signal (sequencePressure, transitionState) has already refined the summary.
 *
 * Adds subtle movement emphasis without changing length or creating narrative.
 */
function applyExecutionContextToSummary(
  currentSummary: string,
  execCtx: ExecutionContext,
  sequencePressure: SequencePressure,
  transitionState: TransitionState,
): string {
  // Only refine when no higher signal has shaped the summary
  if (sequencePressure === 'high' || sequencePressure === 'medium') return currentSummary;
  if (transitionState !== null) return currentSummary;
  if (!execCtx.isTravelHeavyWindow) return currentSummary;

  // Light prefix to indicate movement context — keep it short
  if (execCtx.hasUpcomingFlight) return `Travel ahead — ${currentSummary.charAt(0).toLowerCase()}${currentSummary.slice(1)}`;
  if (execCtx.hasUpcomingMovement) return `On the move — ${currentSummary.charAt(0).toLowerCase()}${currentSummary.slice(1)}`;
  return currentSummary;
}

// ============================================================================
// HELPERS
// ============================================================================

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00');
  const b = new Date(dateB + 'T00:00:00');
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

/**
 * Compute the AI-orchestrated context from canonical trip state and
 * existing proactive insights. This is a pure, deterministic function
 * with no side effects, no API calls, and no persistence.
 */
export function computeOrchestratedContext(
  state: CanonicalTripState | null,
  insights: ProactiveInsight[],
): AIOrchestratedContext | null {
  if (!state) return null;

  const phase = resolvePhase(state);
  const primaryFocus = resolvePrimaryFocus(phase, state, insights);
  const summary = generateSummary(phase, state, insights);
  const baseGuidance = convertInsightsToGuidance(insights);
  const currentActions = recommendActions(phase, state, insights);

  // v5.7.0: Generate predictive action candidates from upcoming events.
  const predictiveCandidates = generatePredictiveActions(state);

  // v5.7.0: Merge current + predictive actions with deduplication.
  const mergedActions = mergePredictiveActions(currentActions, predictiveCandidates);

  // v5.6.0: Apply bounded preference feedback to action ordering.
  const feedbackWeights = computePreferenceWeights();
  const recommendedActions = reorderActionsWithPreference(mergedActions, feedbackWeights);

  // v5.8.0: Generate optional bounded multi-step sequence.
  const rawSequence = generateSequence(state);
  const activeSequence = (rawSequence && rawSequence.relevance === 'high' && phase === 'active')
    ? rawSequence
    : null;

  // v5.8.2.1: Derive sequence pressure from step spacing for decision weighting.
  const sequencePressure = deriveSequencePressure(activeSequence, state);

  // v5.8.2: Apply sequence-aware messaging when a valid sequence is active.
  const prioritizedGuidance = applySequenceAwareGuidance(baseGuidance, activeSequence, sequencePressure);

  // v5.8.2.1: Apply sequence-pressure action weighting.
  const pressuredActions = applySequencePressureToActions(recommendedActions, activeSequence, sequencePressure);

  // v5.8.3: Detect transition state for moment-aware refinement.
  const transitionState = phase === 'active' ? resolveTransitionState(state) : null;
  const hasHighInsight = insights.some((i) => i.priority === 'high');

  // v5.8.4: Derive execution context from canonical event types.
  const execCtx = phase === 'active'
    ? deriveExecutionContext(state, activeSequence, sequencePressure)
    : { hasUpcomingMovement: false, hasUpcomingFlight: false, hasUpcomingLodging: false, isTravelHeavyWindow: false };

  // v5.8.4: Apply execution-context action refinement (lowest priority signal).
  const contextActions = applyExecutionContextToActions(pressuredActions, execCtx);

  // v5.8.2 + v5.8.3: Build final summary.
  let finalSummary: string;
  if ((sequencePressure === 'high' || sequencePressure === 'medium') && activeSequence && activeSequence.steps.length >= 2) {
    finalSummary = `${activeSequence.steps[0].label} → ${activeSequence.steps[1].label}`;
  } else {
    finalSummary = applyTransitionToSummary(summary, transitionState, state, sequencePressure);
  }

  // v5.8.4: Apply execution-context summary refinement (lowest priority).
  finalSummary = applyExecutionContextToSummary(finalSummary, execCtx, sequencePressure, transitionState);

  // v5.8.3: Refine primaryFocus with transition awareness (secondary signal).
  const finalFocus = phase === 'active'
    ? applyTransitionToFocus(primaryFocus, transitionState, sequencePressure, hasHighInsight)
    : primaryFocus;

  return {
    phase,
    primaryFocus: finalFocus,
    summary: finalSummary,
    prioritizedGuidance,
    recommendedActions: contextActions,
    activeSequence,
  };
}

// ============================================================================
// v5.8.2.1: SEQUENCE PRESSURE ACTION WEIGHTING
// ============================================================================

/**
 * Apply sequence-pressure weighting to recommended actions.
 *
 * HIGH pressure:
 * - Suppress generic explore/review actions unless sequence-relevant
 * - Elevate actions whose targetId matches a sequence step
 * - Never remove critical navigate or event actions
 *
 * MEDIUM pressure:
 * - Mildly deprioritize explore actions (move to end)
 *
 * LOW / NONE:
 * - No changes
 */
function applySequencePressureToActions(
  actions: AIOrchestratedAction[],
  sequence: ActionSequence | null,
  pressure: SequencePressure,
): AIOrchestratedAction[] {
  if (pressure === 'none' || pressure === 'low' || !sequence || actions.length <= 1) {
    return actions;
  }

  // Collect sequence step targetIds for relevance matching
  const sequenceTargetIds = new Set(
    sequence.steps.map((s) => s.targetId).filter(Boolean)
  );

  if (pressure === 'high') {
    // Partition: sequence-relevant + critical first, then rest
    const relevant: AIOrchestratedAction[] = [];
    const suppressed: AIOrchestratedAction[] = [];

    for (const action of actions) {
      const isSequenceRelevant =
        action.actionPayload?.eventId && sequenceTargetIds.has(action.actionPayload.eventId as string);
      const isCritical = action.actionType === 'navigate';
      const isLowValue = action.actionType === 'open_explore' || action.actionType === 'review';

      if (isSequenceRelevant || isCritical) {
        relevant.push(action);
      } else if (isLowValue) {
        suppressed.push(action);
      } else {
        relevant.push(action);
      }
    }

    // Return relevant first, then suppressed (still available, just deprioritized)
    return [...relevant, ...suppressed].slice(0, 3);
  }

  // MEDIUM: move explore actions to end
  const nonExplore = actions.filter((a) => a.actionType !== 'open_explore');
  const explore = actions.filter((a) => a.actionType === 'open_explore');
  return [...nonExplore, ...explore].slice(0, 3);
}

// ============================================================================
// v5.7.0: PREDICTIVE ACTION MERGING
// ============================================================================

/**
 * Merge current-state actions with predictive action candidates.
 *
 * Priority hierarchy (locked):
 *  1. Critical current-state actions
 *  2. High-value current-state actions
 *  3. High-confidence predictive actions
 *  4. Lower-value current actions
 *  5. Lower-value predictive actions
 *
 * Deduplication: If a current action shares the same actionType AND
 * targetId as a predictive action, the predictive version is discarded.
 *
 * Final output is capped at 3 actions.
 */
function mergePredictiveActions(
  currentActions: AIOrchestratedAction[],
  predictive: PredictiveAction[],
): AIOrchestratedAction[] {
  // Deduplicate: remove predictive actions that overlap with current actions
  const currentKeys = new Set(
    currentActions.map((a) => `${a.actionType}::${a.actionPayload?.eventId ?? a.actionPayload?.destinationLabel ?? ''}`)
  );

  const uniquePredictive = predictive.filter((p) => {
    const key = `${p.actionType}::${p.targetId ?? ''}`;
    return !currentKeys.has(key);
  });

  // Convert predictive actions to orchestrated action format
  const convertedPredictive: Array<AIOrchestratedAction & { _priority: number }> = uniquePredictive.map((p) => ({
    id: p.id,
    label: p.reason,
    actionType: p.actionType,
    actionPayload: p.targetId ? { eventId: p.targetId } : undefined,
    // Priority score: high=3, medium=2, low=1
    _priority: p.priority === 'high' ? 3 : p.priority === 'medium' ? 2 : 1,
  }));

  // Tag current actions with higher base priority so they sort first at equal tiers
  const taggedCurrent: Array<AIOrchestratedAction & { _priority: number }> = currentActions.map((a, idx) => ({
    ...a,
    // Current actions get a boost of +3 for first position, +2 for second, etc.
    _priority: Math.max(4 - idx, 1) + 3,
  }));

  // Merge, sort by priority descending, cap at 3
  const all = [...taggedCurrent, ...convertedPredictive];
  all.sort((a, b) => b._priority - a._priority);

  // Strip internal _priority field and limit to 3
  return all.slice(0, 3).map(({ _priority, ...action }) => action);
}

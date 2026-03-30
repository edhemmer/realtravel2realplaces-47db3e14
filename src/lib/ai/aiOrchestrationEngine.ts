/**
 * v5.4.0: AI Orchestration Engine
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
// v5.8.2: SEQUENCE-AWARE MESSAGING
// ============================================================================

/**
 * Derive sequence pressure from an active sequence.
 * 'high' = first step is imminent (≤60 min away or sequence relevance is high)
 * 'medium' = sequence exists but not imminent
 * 'none' = no sequence
 */
type SequencePressure = 'high' | 'medium' | 'none';

function deriveSequencePressure(sequence: ActionSequence | null): SequencePressure {
  if (!sequence) return 'none';
  return sequence.relevance === 'high' ? 'high' : 'medium';
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
 * When an active sequence with high/medium pressure exists:
 * - Replace fragmented guidance with a single primary sequence message
 * - Preserve critical alerts (risk type, high priority)
 * - Suppress lower-priority/duplicate guidance
 *
 * When no sequence or pressure is 'none':
 * - Return original guidance unchanged
 */
function applySequenceAwareGuidance(
  originalGuidance: AIOrchestratedGuidanceItem[],
  sequence: ActionSequence | null,
  pressure: SequencePressure,
): AIOrchestratedGuidanceItem[] {
  if (pressure === 'none' || !sequence) return originalGuidance;

  const seqMessage = generateSequenceAwareMessage(sequence);
  if (!seqMessage) return originalGuidance;

  // Keep only critical alerts (risk + high priority)
  const criticalAlerts = originalGuidance.filter(
    (g) => g.type === 'risk' && g.priority === 'high'
  );

  // Combine: critical alerts first, then the single sequence message
  // Cap at 3 total (spec), but typically 1-2
  return [...criticalAlerts, seqMessage].slice(0, 3);
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
  const prioritizedGuidance = convertInsightsToGuidance(insights);
  const currentActions = recommendActions(phase, state, insights);

  // v5.7.0: Generate predictive action candidates from upcoming events.
  const predictiveCandidates = generatePredictiveActions(state);

  // v5.7.0: Merge current + predictive actions with deduplication.
  const mergedActions = mergePredictiveActions(currentActions, predictiveCandidates);

  // v5.6.0: Apply bounded preference feedback to action ordering.
  const feedbackWeights = computePreferenceWeights();
  const recommendedActions = reorderActionsWithPreference(mergedActions, feedbackWeights);

  // v5.8.0: Generate optional bounded multi-step sequence.
  // Include only when relevance is 'high' and phase is active.
  const rawSequence = generateSequence(state);
  const activeSequence = (rawSequence && rawSequence.relevance === 'high' && phase === 'active')
    ? rawSequence
    : null;

  return {
    phase,
    primaryFocus,
    summary,
    prioritizedGuidance,
    recommendedActions,
    activeSequence,
  };
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

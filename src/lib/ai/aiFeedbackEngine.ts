/**
 * v5.6.0: AI Feedback Engine
 *
 * Bounded, deterministic feedback layer that tracks user action taps
 * on AI recommendedActions and provides preference weights for
 * action reordering.
 *
 * SCOPE:
 * - Tracks taps on recommendedActions only
 * - Influences ordering of recommendedActions only
 * - Does NOT affect guidance, summary, primaryFocus, or deterministic logic
 *
 * STORAGE: localStorage only, rolling window of 50 events max.
 * No backend persistence. No cross-device sync.
 */

// ============================================================================
// TYPES
// ============================================================================

export type AIActionType = 'navigate' | 'open_event' | 'open_explore' | 'open_weather' | 'open_expenses' | 'review';

export type AIActionInteractionEvent = {
  actionType: AIActionType;
  timestamp: number;
  contextPhase: 'pre-trip' | 'in-transit' | 'active' | 'post-trip';
};

export type ActionPreferenceWeights = {
  navigate: number;
  open_event: number;
  open_explore: number;
  open_weather: number;
  open_expenses: number;
  review: number;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'rt2rp_ai_action_feedback';
const MAX_EVENTS = 50;

/**
 * Half-life for recency decay in milliseconds (24 hours).
 * Events older than this contribute roughly half the weight of recent ones.
 */
const DECAY_HALF_LIFE_MS = 24 * 60 * 60 * 1000;

/**
 * Maximum influence cap per action type (0-1 scale, normalized).
 * Prevents any single action from dominating excessively.
 */
const MAX_WEIGHT_CAP = 0.4;

/** Minimum number of events needed before preferences take effect. */
const MIN_EVENTS_FOR_PREFERENCE = 3;

// ============================================================================
// STORAGE HELPERS
// ============================================================================

function readEvents(): AIActionInteractionEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      // Malformed data — reset safely
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    // Validate each event minimally
    return parsed.filter(
      (e: unknown): e is AIActionInteractionEvent =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as AIActionInteractionEvent).actionType === 'string' &&
        typeof (e as AIActionInteractionEvent).timestamp === 'number' &&
        typeof (e as AIActionInteractionEvent).contextPhase === 'string'
    );
  } catch {
    // Parse failure — reset safely
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function writeEvents(events: AIActionInteractionEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

/**
 * Append a new interaction event and trim to the most recent MAX_EVENTS.
 */
export function recordActionInteraction(
  actionType: AIActionType,
  contextPhase: AIActionInteractionEvent['contextPhase'],
): void {
  const events = readEvents();
  events.push({
    actionType,
    timestamp: Date.now(),
    contextPhase,
  });
  // Keep only the most recent MAX_EVENTS
  const trimmed = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
  writeEvents(trimmed);
}

// ============================================================================
// SCORING
// ============================================================================

/**
 * Compute preference weights from stored interaction events.
 *
 * Scoring formula (per event):
 *   weight = 2^(-age_ms / DECAY_HALF_LIFE_MS)
 *
 * This gives:
 *   - events from now: weight ≈ 1.0
 *   - events 24h old: weight ≈ 0.5
 *   - events 48h old: weight ≈ 0.25
 *   - events 72h old: weight ≈ 0.125
 *
 * Weights are then normalized across all action types and capped
 * at MAX_WEIGHT_CAP to prevent excessive dominance.
 *
 * Returns null if insufficient data exists.
 */
export function computePreferenceWeights(): ActionPreferenceWeights | null {
  const events = readEvents();
  if (events.length < MIN_EVENTS_FOR_PREFERENCE) return null;

  const now = Date.now();
  const rawScores: ActionPreferenceWeights = {
    navigate: 0,
    open_event: 0,
    open_explore: 0,
    open_weather: 0,
    open_expenses: 0,
    review: 0,
  };

  for (const event of events) {
    const ageMs = Math.max(0, now - event.timestamp);
    // Exponential decay: newer events matter more
    const decayFactor = Math.pow(2, -(ageMs / DECAY_HALF_LIFE_MS));
    if (event.actionType in rawScores) {
      rawScores[event.actionType] += decayFactor;
    }
  }

  // Normalize to 0-1 range
  const total = Object.values(rawScores).reduce((sum, v) => sum + v, 0);
  if (total === 0) return null;

  const normalized: ActionPreferenceWeights = {
    navigate: 0,
    open_event: 0,
    open_explore: 0,
    open_weather: 0,
    open_expenses: 0,
    review: 0,
  };

  for (const key of Object.keys(rawScores) as AIActionType[]) {
    // Normalize and cap to prevent excessive dominance
    normalized[key] = Math.min(rawScores[key] / total, MAX_WEIGHT_CAP);
  }

  return normalized;
}

// ============================================================================
// ACTION REORDERING
// ============================================================================

/**
 * Reorder recommended actions using preference weights as a secondary factor.
 *
 * Rules:
 * - The first action is preserved if it's critical (has 'navigate' type or
 *   contains event payload, indicating urgency from deterministic systems).
 * - Among remaining actions, preference weights influence ordering.
 * - No actions are added or removed.
 * - If weights are null or insufficient, original order is returned unchanged.
 *
 * The influence is bounded: preference weight is used as a small tiebreaker
 * (max 0.3 influence on final sort score) to keep deterministic ordering
 * dominant.
 */
export function reorderActionsWithPreference<T extends { actionType: AIActionType; actionPayload?: Record<string, unknown> }>(
  actions: T[],
  weights: ActionPreferenceWeights | null,
): T[] {
  // No reordering needed for 0-1 actions or no weights
  if (actions.length <= 1 || !weights) return actions;

  // Determine if first action is critical (should stay first)
  const first = actions[0];
  const firstIsCritical =
    first.actionType === 'navigate' ||
    (first.actionType === 'open_event' && first.actionPayload?.eventId);

  if (firstIsCritical) {
    // Reorder only the remaining actions
    if (actions.length <= 2) return actions;
    const rest = actions.slice(1);
    const reordered = sortByPreference(rest, weights);
    return [first, ...reordered];
  }

  // Reorder all actions by preference
  return sortByPreference(actions, weights);
}

/**
 * Sort actions using preference weights as a secondary tiebreaker.
 * Original index provides the primary deterministic order (lower = higher priority).
 * Preference weight provides a bounded secondary boost (max 30% influence).
 */
function sortByPreference<T extends { actionType: AIActionType }>(
  actions: T[],
  weights: ActionPreferenceWeights,
): T[] {
  const PREFERENCE_INFLUENCE = 0.3; // Max 30% influence on sort score

  const scored = actions.map((action, index) => {
    // Primary: deterministic order (inverted so first = highest)
    const deterministicScore = 1 - index / Math.max(actions.length, 1);
    // Secondary: preference weight (bounded)
    const preferenceScore = (weights[action.actionType] || 0) * PREFERENCE_INFLUENCE;
    return {
      action,
      score: deterministicScore + preferenceScore,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.action);
}

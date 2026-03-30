/**
 * v5.12.0: Proactive Trip Intelligence Engine
 *
 * Near-horizon anticipatory layer that surfaces early, high-value
 * preparation guidance before urgency becomes actionable.
 *
 * Canonical rules:
 * - Insight-only — no execution actions
 * - No API calls
 * - No route generation
 * - No upstream modification
 * - Silence is the default outcome
 * - Defers to unifiedExecutionEngine when execution is appropriate
 */

import type { CanonicalTripState } from '@/lib/canonicalTripState';
import type {
  OrchestrationResult,
  OrchestrationStep,
  BufferStatus,
  DownstreamRiskLevel,
} from '@/lib/movementOrchestrationEngine';
import type {
  AirportIntelligenceResult,
  AirportTimingState,
} from '@/lib/airportIntelligenceEngine';
import type {
  UnifiedExecutionOutput,
  UnifiedActionType,
} from '@/lib/unifiedExecutionEngine';

// ============================================================================
// TYPES
// ============================================================================

export type ProactiveType = 'prepare' | 'heads_up' | 'watch' | 'none';
export type ProactivePriority = 'high' | 'medium' | 'low';
export type ProactiveConfidence = 'high' | 'medium' | 'low';

export type InsightComparison =
  | 'same_insight'
  | 'strengthened'
  | 'weakened'
  | 'lateral_change'
  | 'replaced'
  | 'first_insight';

export interface ProactiveTripInsight {
  proactiveType: ProactiveType;
  proactivePriority: ProactivePriority;
  proactiveMessage: string;
  proactiveConfidence: ProactiveConfidence;
  suppressionReason: string;
  /** Fingerprint for deduplication */
  contextFingerprint: string;
}

export interface ProactiveInsightSnapshot {
  proactiveType: ProactiveType;
  proactivePriority: ProactivePriority;
  message: string;
  confidence: ProactiveConfidence;
  surfacedAt: string;
  contextFingerprint: string;
}

export interface ProactiveTripInput {
  canonicalState: CanonicalTripState | null;
  orchestration: OrchestrationResult | null;
  airportIntelligence: AirportIntelligenceResult | null;
  unifiedExecution: UnifiedExecutionOutput | null;
  currentTime: Date;
  lastProactiveInsight: ProactiveInsightSnapshot | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Cooldown between proactive insights (ms) */
const PROACTIVE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/** Near-horizon window for trend evaluation (minutes) */
const NEAR_HORIZON_MINUTES = 45;

/** Buffer thresholds for trend detection (minutes) */
const BUFFER_TREND_TIGHT = 20;
const BUFFER_TREND_CRITICAL = 10;

/** Airport timing states that indicate a tightening trend */
const AIRPORT_APPROACHING_STATES: Set<AirportTimingState> = new Set([
  'on_track',
]);

const AIRPORT_TIGHTENING_STATES: Set<AirportTimingState> = new Set([
  'tightening',
  'critical',
  'failure_imminent',
]);

/** Unified actions that indicate execution is active — proactive must defer */
const ACTIVE_UNIFIED_ACTIONS: Set<UnifiedActionType> = new Set([
  'leave_now',
  'act_now',
  'switch_mode',
  'prepare',
]);

// ============================================================================
// NO-INSIGHT RESULT
// ============================================================================

const NO_INSIGHT: ProactiveTripInsight = {
  proactiveType: 'none',
  proactivePriority: 'low',
  proactiveMessage: '',
  proactiveConfidence: 'low',
  suppressionReason: 'no_near_horizon_value',
  contextFingerprint: '',
};

function suppressed(reason: string): ProactiveTripInsight {
  return { ...NO_INSIGHT, suppressionReason: reason };
}

// ============================================================================
// FINGERPRINT
// ============================================================================

function buildFingerprint(
  type: ProactiveType,
  priority: ProactivePriority,
  stepId: string | null,
  signal: string,
): string {
  return `${type}|${priority}|${stepId ?? 'none'}|${signal}`;
}

// ============================================================================
// INSIGHT COMPARISON
// ============================================================================

const PRIORITY_RANK: Record<ProactivePriority, number> = {
  high: 2,
  medium: 1,
  low: 0,
};

const TYPE_RANK: Record<ProactiveType, number> = {
  prepare: 3,
  heads_up: 2,
  watch: 1,
  none: 0,
};

function compareInsight(
  candidate: ProactiveTripInsight,
  last: ProactiveInsightSnapshot | null,
): InsightComparison {
  if (!last) return 'first_insight';
  if (candidate.contextFingerprint === last.contextFingerprint) return 'same_insight';

  const candidateStrength =
    TYPE_RANK[candidate.proactiveType] * 10 + PRIORITY_RANK[candidate.proactivePriority];
  const lastStrength =
    TYPE_RANK[last.proactiveType] * 10 + PRIORITY_RANK[last.proactivePriority];

  if (candidateStrength > lastStrength) return 'strengthened';
  if (candidateStrength < lastStrength) return 'weakened';
  return 'lateral_change';
}

// ============================================================================
// DEFERRAL CHECK
// ============================================================================

function shouldDeferToExecution(unified: UnifiedExecutionOutput | null): boolean {
  if (!unified) return false;
  return ACTIVE_UNIFIED_ACTIONS.has(unified.unifiedAction);
}

// ============================================================================
// COOLDOWN CHECK
// ============================================================================

function withinCooldown(
  last: ProactiveInsightSnapshot | null,
  currentTime: Date,
): boolean {
  if (!last) return false;
  const elapsed = currentTime.getTime() - new Date(last.surfacedAt).getTime();
  return elapsed < PROACTIVE_COOLDOWN_MS;
}

// ============================================================================
// TRIP PHASE CHECK
// ============================================================================

function isActivePhase(state: CanonicalTripState, currentTime: Date): boolean {
  const today = currentTime.toISOString().substring(0, 10);
  const start = state.trip.start_date;
  const end = state.trip.end_date;
  return today >= start && today <= end;
}

// ============================================================================
// NEAR-HORIZON HELPERS
// ============================================================================

function minutesUntilStep(step: OrchestrationStep, currentTime: Date): number | null {
  const target = step.requiredArrivalTime ?? step.plannedDepartureTime;
  if (!target) return null;
  const targetMs = new Date(target).getTime();
  const diff = (targetMs - currentTime.getTime()) / 60_000;
  return isNaN(diff) ? null : diff;
}

function isNearHorizon(step: OrchestrationStep, currentTime: Date): boolean {
  const mins = minutesUntilStep(step, currentTime);
  return mins !== null && mins > 0 && mins <= NEAR_HORIZON_MINUTES;
}

// ============================================================================
// CANDIDATE GENERATORS
// ============================================================================

/**
 * A) Preparation window opening — nextStep exists and user should prepare soon.
 */
function detectPreparationWindow(
  orchestration: OrchestrationResult,
  currentTime: Date,
): ProactiveTripInsight | null {
  const next = orchestration.nextStep;
  if (!next) return null;
  if (next.status === 'completed' || next.status === 'missed') return null;

  const mins = minutesUntilStep(next, currentTime);
  if (mins === null || mins <= 0 || mins > NEAR_HORIZON_MINUTES) return null;

  // Already active or urgent — defer to execution
  if (next.status === 'active' || next.status === 'blocked') return null;

  const isClose = mins <= 20;
  const proactiveType: ProactiveType = isClose ? 'prepare' : 'heads_up';
  const priority: ProactivePriority = isClose ? 'high' : 'medium';
  const confidence: ProactiveConfidence =
    next.bufferMinutes !== null ? 'high' : 'medium';

  const destination = next.destination || 'your next step';
  const message = isClose
    ? `You'll likely need to leave soon for ${destination}`
    : `Your next step toward ${destination} is approaching`;

  return {
    proactiveType,
    proactivePriority: priority,
    proactiveMessage: message,
    proactiveConfidence: confidence,
    suppressionReason: '',
    contextFingerprint: buildFingerprint(proactiveType, priority, next.stepId, 'prep-window'),
  };
}

/**
 * B) Pressure transition approaching — airport timing likely to tighten.
 */
function detectAirportPressureTransition(
  airport: AirportIntelligenceResult,
): ProactiveTripInsight | null {
  // Only trigger when currently safe but approaching tightening
  if (!AIRPORT_APPROACHING_STATES.has(airport.airportTimingState)) return null;

  const mins = airport.minutesToDeparture;
  if (mins === null) return null;

  // Near the boundary between on_track and tightening (60–75 min range)
  if (mins > 75 || mins <= 60) return null;

  return {
    proactiveType: 'heads_up',
    proactivePriority: 'medium',
    proactiveMessage: 'Airport timing may tighten shortly',
    proactiveConfidence: airport.airportConfidenceLevel === 'low' ? 'low' : 'medium',
    suppressionReason: '',
    contextFingerprint: buildFingerprint('heads_up', 'medium', null, 'airport-transition'),
  };
}

/**
 * C) Dependency weakening — chain viable but pressure rising.
 */
function detectDependencyWeakening(
  orchestration: OrchestrationResult,
  currentTime: Date,
): ProactiveTripInsight | null {
  if (orchestration.downstreamRiskLevel === 'none') return null;
  if (orchestration.downstreamRiskLevel === 'critical') return null; // Defer to execution

  const next = orchestration.nextStep;
  if (!next) return null;
  if (!isNearHorizon(next, currentTime)) return null;

  // Buffer trending toward tight or critical
  const buffer = next.bufferMinutes;
  if (buffer === null) return null;

  let insight: ProactiveTripInsight | null = null;

  if (buffer <= BUFFER_TREND_CRITICAL && next.bufferStatus !== 'critical') {
    insight = {
      proactiveType: 'prepare',
      proactivePriority: 'high',
      proactiveMessage: 'This connection could become tight if delays continue',
      proactiveConfidence: 'medium',
      suppressionReason: '',
      contextFingerprint: buildFingerprint('prepare', 'high', next.stepId, 'dep-weakening-critical'),
    };
  } else if (buffer <= BUFFER_TREND_TIGHT && next.bufferStatus === 'safe') {
    insight = {
      proactiveType: 'heads_up',
      proactivePriority: 'medium',
      proactiveMessage: 'Buffer for your next connection is getting smaller',
      proactiveConfidence: 'medium',
      suppressionReason: '',
      contextFingerprint: buildFingerprint('heads_up', 'medium', next.stepId, 'dep-weakening-tight'),
    };
  }

  return insight;
}

/**
 * D) Readiness-in-context — active trip phase, next step nearing horizon.
 */
function detectReadinessContext(
  orchestration: OrchestrationResult,
  currentTime: Date,
): ProactiveTripInsight | null {
  const next = orchestration.nextStep;
  if (!next) return null;
  if (next.status !== 'upcoming') return null;

  const mins = minutesUntilStep(next, currentTime);
  if (mins === null || mins <= 0) return null;

  // Watch-level: far edge of horizon (30–45 min)
  if (mins < 30 || mins > NEAR_HORIZON_MINUTES) return null;

  // Only if buffer looks safe — otherwise higher-priority detectors handle it
  if (next.bufferStatus !== 'safe' && next.bufferStatus !== 'unknown') return null;

  return {
    proactiveType: 'watch',
    proactivePriority: 'low',
    proactiveMessage: 'Your next step is on the horizon — no action needed yet',
    proactiveConfidence: next.bufferMinutes !== null ? 'medium' : 'low',
    suppressionReason: '',
    contextFingerprint: buildFingerprint('watch', 'low', next.stepId, 'readiness'),
  };
}

// ============================================================================
// CONFIDENCE GATING
// ============================================================================

function passesConfidenceGate(insight: ProactiveTripInsight): boolean {
  const { proactiveType, proactiveConfidence } = insight;

  if (proactiveType === 'prepare' && proactiveConfidence === 'low') return false;
  if (proactiveType === 'heads_up' && proactiveConfidence === 'low') return false;
  // watch is allowed at low confidence but is rare
  return true;
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

export function computeProactiveTripIntelligence(
  input: ProactiveTripInput,
): ProactiveTripInsight {
  const {
    canonicalState,
    orchestration,
    airportIntelligence,
    unifiedExecution,
    currentTime,
    lastProactiveInsight,
  } = input;

  // ---- Guard: no state ----
  if (!canonicalState) return suppressed('no_canonical_state');

  // ---- Guard: not active trip phase ----
  if (!isActivePhase(canonicalState, currentTime)) {
    return suppressed('not_active_phase');
  }

  // ---- Guard: defer to unified execution ----
  if (shouldDeferToExecution(unifiedExecution)) {
    return suppressed('deferred_to_execution');
  }

  // ---- Guard: no orchestration context ----
  if (!orchestration) return suppressed('no_orchestration');

  // ---- Collect candidates (priority order) ----
  const candidates: ProactiveTripInsight[] = [];

  // B) Airport pressure transition (higher priority than prep window)
  if (airportIntelligence) {
    const airportCandidate = detectAirportPressureTransition(airportIntelligence);
    if (airportCandidate) candidates.push(airportCandidate);
  }

  // C) Dependency weakening
  const depCandidate = detectDependencyWeakening(orchestration, currentTime);
  if (depCandidate) candidates.push(depCandidate);

  // A) Preparation window
  const prepCandidate = detectPreparationWindow(orchestration, currentTime);
  if (prepCandidate) candidates.push(prepCandidate);

  // D) Readiness (lowest priority, watch only)
  const readyCandidate = detectReadinessContext(orchestration, currentTime);
  if (readyCandidate) candidates.push(readyCandidate);

  // ---- Select highest-value candidate ----
  candidates.sort((a, b) => {
    const typeDiff = TYPE_RANK[b.proactiveType] - TYPE_RANK[a.proactiveType];
    if (typeDiff !== 0) return typeDiff;
    return PRIORITY_RANK[b.proactivePriority] - PRIORITY_RANK[a.proactivePriority];
  });

  const winner = candidates[0];
  if (!winner) return suppressed('no_near_horizon_triggers');

  // ---- Confidence gate ----
  if (!passesConfidenceGate(winner)) {
    return suppressed('confidence_below_threshold');
  }

  // ---- Cooldown check ----
  if (withinCooldown(lastProactiveInsight, currentTime)) {
    const comparison = compareInsight(winner, lastProactiveInsight);

    // Only allow through if meaningfully strengthened
    if (comparison !== 'strengthened' && comparison !== 'replaced') {
      return suppressed('within_cooldown');
    }
  }

  // ---- Last-insight comparison (outside cooldown) ----
  const comparison = compareInsight(winner, lastProactiveInsight);
  if (comparison === 'same_insight') return suppressed('same_insight');
  if (comparison === 'weakened') return suppressed('weakened_insight');
  if (comparison === 'lateral_change') return suppressed('lateral_no_advantage');

  return winner;
}

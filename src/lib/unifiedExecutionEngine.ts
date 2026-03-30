/**
 * v5.11.2: Unified Execution Guidance Engine
 *
 * Resolves all upstream intelligence signals into ONE stable, actionable
 * decision. Prevents oscillation, flip-flopping, and conflicting guidance.
 *
 * Canonical rules:
 * - One engine only
 * - No API calls
 * - No route generation
 * - No upstream modification
 * - No signal blending
 * - One action or no action
 */

import type { MultimodalDecision } from './multimodalDecisionEngine';
import type { MovementExecutionResult } from './movementExecutionHelper';
import type { ContextualExecutionOutput } from './contextualExecutionEngine';
import type { OrchestrationResult } from './movementOrchestrationEngine';
import type { AirportIntelligenceResult } from './airportIntelligenceEngine';

// ============================================================================
// TYPES
// ============================================================================

export type UnifiedActionType =
  | 'leave_now'
  | 'act_now'
  | 'switch_mode'
  | 'prepare'
  | 'monitor'
  | 'no_action';

export type UnifiedPriority = 'critical' | 'high' | 'medium' | 'low' | 'none';
export type UnifiedConfidence = 'high' | 'medium' | 'low';

export type ActionComparison =
  | 'same_action'
  | 'upgrade'
  | 'downgrade'
  | 'lateral_change'
  | 'first_action';

export interface UnifiedExecutionInput {
  multimodalDecision: MultimodalDecision | null;
  movementExecution: MovementExecutionResult | null;
  contextualExecution: ContextualExecutionOutput | null;
  orchestration: OrchestrationResult | null;
  airportIntelligence: AirportIntelligenceResult | null;
  currentTime: Date;
  lastUnifiedAction: UnifiedActionSnapshot | null;
}

export interface UnifiedExecutionOutput {
  unifiedAction: UnifiedActionType;
  unifiedPriority: UnifiedPriority;
  unifiedMessage: string;
  unifiedActionType: UnifiedActionType;
  unifiedConfidence: UnifiedConfidence;
  suppressionReason: string;
}

export interface UnifiedActionSnapshot {
  action: UnifiedActionType;
  priority: UnifiedPriority;
  message: string;
  confidence: UnifiedConfidence;
  surfacedAt: string;
  contextFingerprint: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DECISION_LOCK_MS = 90_000; // 90 seconds
const CRITICAL_OVERRIDE_LOCK_MS = 15_000; // 15s minimum even for critical

// Priority rank for comparison (higher = more urgent)
const PRIORITY_RANK: Record<UnifiedPriority, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  none: 0,
};

const ACTION_RANK: Record<UnifiedActionType, number> = {
  leave_now: 6,
  act_now: 5,
  switch_mode: 4,
  prepare: 3,
  monitor: 2,
  no_action: 0,
};

const MIN_CONFIDENCE_FOR_PRIORITY: Record<string, UnifiedConfidence> = {
  critical: 'medium',
  high: 'medium',
  medium: 'low',
  low: 'low',
};

const CONFIDENCE_RANK: Record<UnifiedConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

// ============================================================================
// CANDIDATE RESOLUTION
// ============================================================================

interface ActionCandidate {
  action: UnifiedActionType;
  priority: UnifiedPriority;
  message: string;
  confidence: UnifiedConfidence;
  source: string;
}

function resolveFromOrchestration(input: UnifiedExecutionInput): ActionCandidate | null {
  const orch = input.orchestration;
  if (!orch) return null;

  // Chain failure / dependency break — highest priority
  if (orch.downstreamRiskLevel === 'critical') {
    const impacted = orch.orchestrationContext.nextStep?.stepType || 'downstream step';
    return {
      action: 'act_now',
      priority: 'critical',
      message: `Chain dependency failure — ${impacted} is at critical risk.`,
      confidence: 'high',
      source: 'orchestration_chain_failure',
    };
  }

  if (orch.orchestrationContext.immediateDependencyPressure) {
    return {
      action: 'leave_now',
      priority: 'high',
      message: 'Dependency pressure — act now to maintain schedule.',
      confidence: 'medium',
      source: 'orchestration_dependency_pressure',
    };
  }

  return null;
}

function resolveFromAirport(input: UnifiedExecutionInput): ActionCandidate | null {
  const airport = input.airportIntelligence;
  if (!airport) return null;

  const exec = airport.airportExecutionContext;
  if (!exec) return null;

  if (airport.airportTimingState === 'failure_imminent' || airport.airportTimingState === 'missed_or_failed') {
    return {
      action: airport.airportTimingState === 'missed_or_failed' ? 'no_action' : 'leave_now',
      priority: 'critical',
      message: exec.executionMessageHint || 'Airport timing is critical — leave immediately.',
      confidence: airport.airportConfidenceLevel === 'low' ? 'low' : 'high',
      source: 'airport_critical',
    };
  }

  if (airport.airportTimingState === 'critical') {
    return {
      action: 'leave_now',
      priority: 'critical',
      message: exec.executionMessageHint || 'Airport window is critical.',
      confidence: airport.airportConfidenceLevel === 'low' ? 'low' : 'medium',
      source: 'airport_critical',
    };
  }

  if (airport.airportTimingState === 'tightening') {
    return {
      action: exec.executionRecommendationType === 'leave_now' ? 'leave_now' : 'prepare',
      priority: 'high',
      message: exec.executionMessageHint || 'Airport access window is tightening.',
      confidence: airport.airportConfidenceLevel === 'low' ? 'low' : 'medium',
      source: 'airport_tightening',
    };
  }

  return null;
}

function resolveFromContextualExecution(input: UnifiedExecutionInput): ActionCandidate | null {
  const ctx = input.contextualExecution;
  if (!ctx || !ctx.shouldSurfaceExecution) return null;

  const multimodal = input.multimodalDecision;
  const mode = multimodal?.recommendedMode || 'route';

  let action: UnifiedActionType = 'prepare';
  if (ctx.executionPriority === 'high') action = 'leave_now';
  else if (ctx.executionPriority === 'medium') action = 'act_now';

  const priority: UnifiedPriority =
    ctx.executionPriority === 'high' ? 'high' :
    ctx.executionPriority === 'medium' ? 'medium' : 'low';

  // Mode switch detection
  if (ctx.executionMessage.toLowerCase().includes('now recommended') ||
      ctx.executionMessage.toLowerCase().includes('is now the best')) {
    action = 'switch_mode';
  }

  return {
    action,
    priority,
    message: ctx.executionMessage || `${capitalize(mode)} navigation recommended.`,
    confidence: priority === 'low' ? 'low' : 'medium',
    source: 'contextual_execution',
  };
}

// ============================================================================
// COMPARISON LOGIC
// ============================================================================

function compareActions(
  candidate: ActionCandidate,
  last: UnifiedActionSnapshot,
): ActionComparison {
  const candidateRank = PRIORITY_RANK[candidate.priority] * 10 + ACTION_RANK[candidate.action];
  const lastRank = PRIORITY_RANK[last.priority] * 10 + ACTION_RANK[last.action];

  if (candidate.action === last.action && candidate.priority === last.priority) {
    return 'same_action';
  }

  if (candidateRank > lastRank + 5) return 'upgrade';
  if (candidateRank < lastRank - 5) return 'downgrade';
  return 'lateral_change';
}

function isWithinLockWindow(
  last: UnifiedActionSnapshot,
  currentTime: Date,
  comparison: ActionComparison,
): boolean {
  const elapsed = currentTime.getTime() - new Date(last.surfacedAt).getTime();

  // Critical overrides have a shorter minimum lock
  if (comparison === 'upgrade') {
    return elapsed < CRITICAL_OVERRIDE_LOCK_MS;
  }

  return elapsed < DECISION_LOCK_MS;
}

// ============================================================================
// CONFIDENCE GATING
// ============================================================================

function passesConfidenceGate(candidate: ActionCandidate): boolean {
  const minRequired = MIN_CONFIDENCE_FOR_PRIORITY[candidate.priority];
  if (!minRequired) return true;
  return CONFIDENCE_RANK[candidate.confidence] >= CONFIDENCE_RANK[minRequired];
}

// ============================================================================
// ELIGIBILITY CHECK
// ============================================================================

function isEligible(input: UnifiedExecutionInput, candidate: ActionCandidate): boolean {
  // Must have valid execution context
  if (candidate.action === 'leave_now' || candidate.action === 'act_now' || candidate.action === 'switch_mode') {
    const exec = input.movementExecution;
    if (exec && !exec.isExecutable) return false;
  }

  // Confidence gate
  if (!passesConfidenceGate(candidate)) return false;

  return true;
}

// ============================================================================
// FINGERPRINT
// ============================================================================

function buildFingerprint(candidate: ActionCandidate): string {
  return `${candidate.action}|${candidate.priority}|${candidate.source}|${candidate.message.slice(0, 30)}`;
}

// ============================================================================
// SUPPRESSED OUTPUT
// ============================================================================

const NO_ACTION_OUTPUT: UnifiedExecutionOutput = {
  unifiedAction: 'no_action',
  unifiedPriority: 'none',
  unifiedMessage: '',
  unifiedActionType: 'no_action',
  unifiedConfidence: 'low',
  suppressionReason: '',
};

function suppressed(reason: string): UnifiedExecutionOutput {
  return { ...NO_ACTION_OUTPUT, suppressionReason: reason };
}

// ============================================================================
// CORE: RESOLVE
// ============================================================================

export function resolveUnifiedExecution(input: UnifiedExecutionInput): UnifiedExecutionOutput {
  // ── Gather candidates in priority order ──
  const candidates: ActionCandidate[] = [];

  const orchCandidate = resolveFromOrchestration(input);
  if (orchCandidate) candidates.push(orchCandidate);

  const airportCandidate = resolveFromAirport(input);
  if (airportCandidate) candidates.push(airportCandidate);

  const ctxCandidate = resolveFromContextualExecution(input);
  if (ctxCandidate) candidates.push(ctxCandidate);

  // ── No candidates → no action ──
  if (candidates.length === 0) {
    return suppressed('no_candidates');
  }

  // ── Sort by priority rank (descending), then action rank ──
  candidates.sort((a, b) => {
    const prioA = PRIORITY_RANK[a.priority] * 10 + ACTION_RANK[a.action];
    const prioB = PRIORITY_RANK[b.priority] * 10 + ACTION_RANK[b.action];
    return prioB - prioA;
  });

  // ── Take the highest priority candidate ──
  const winner = candidates[0];

  // ── Eligibility check ──
  if (!isEligible(input, winner)) {
    return suppressed('not_eligible');
  }

  // ── Handle missed_or_failed from airport ──
  if (winner.action === 'no_action') {
    return suppressed('missed_or_failed');
  }

  // ── Compare against last unified action ──
  const last = input.lastUnifiedAction;
  if (last) {
    const comparison = compareActions(winner, last);

    switch (comparison) {
      case 'same_action': {
        const fingerprint = buildFingerprint(winner);
        if (fingerprint === last.contextFingerprint) {
          return suppressed('same_action_unchanged');
        }
        // Same type but different context — allow if outside lock
        if (isWithinLockWindow(last, input.currentTime, comparison)) {
          return suppressed('same_action_locked');
        }
        break;
      }

      case 'upgrade':
        // Upgrades allowed unless within critical override minimum gap
        if (isWithinLockWindow(last, input.currentTime, comparison)) {
          return suppressed('upgrade_min_gap');
        }
        break;

      case 'downgrade':
        // Downgrades blocked within lock window
        if (isWithinLockWindow(last, input.currentTime, 'downgrade')) {
          return suppressed('downgrade_blocked');
        }
        // Even outside lock, require clear justification
        if (PRIORITY_RANK[winner.priority] >= PRIORITY_RANK[last.priority] - 1) {
          return suppressed('downgrade_insufficient');
        }
        break;

      case 'lateral_change':
        // Lateral changes require meaningful improvement + outside lock
        if (isWithinLockWindow(last, input.currentTime, comparison)) {
          return suppressed('lateral_locked');
        }
        break;
    }
  }

  // ── Build output ──
  return {
    unifiedAction: winner.action,
    unifiedPriority: winner.priority,
    unifiedMessage: winner.message,
    unifiedActionType: winner.action,
    unifiedConfidence: winner.confidence,
    suppressionReason: '',
  };
}

// ============================================================================
// SNAPSHOT BUILDER
// ============================================================================

export function buildUnifiedSnapshot(
  output: UnifiedExecutionOutput,
  surfacedAt: Date,
): UnifiedActionSnapshot {
  return {
    action: output.unifiedAction,
    priority: output.unifiedPriority,
    message: output.unifiedMessage,
    confidence: output.unifiedConfidence,
    surfacedAt: surfacedAt.toISOString(),
    contextFingerprint: `${output.unifiedAction}|${output.unifiedPriority}|${output.unifiedMessage.slice(0, 30)}`,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

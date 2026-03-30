/**
 * v5.10.3: Contextual Execution Intelligence
 *
 * Advisory surfacing layer that decides WHEN to present an already-available
 * movement action to the user. Consumes governed outputs only — never
 * triggers API calls, alters recommendations, or generates execution links.
 *
 * Canonical rules:
 * - One engine only
 * - No polling loops
 * - No notifications / auto-launch
 * - Governance-aware evaluation cadence
 */

import type { MultimodalDecision } from './multimodalDecisionEngine';
import type { MovementExecutionResult } from './movementExecutionHelper';

// ============================================================================
// TYPES
// ============================================================================

export type ExecutionPriority = 'low' | 'medium' | 'high';

export interface ContextualExecutionInput {
  multimodalDecision: MultimodalDecisionResult;
  movementExecution: MovementExecutionResult;
  currentTime: Date;
  lastEvaluationAt?: string;
  lastSurfacedAction?: SurfacedActionMeta;
  appVisible: boolean;
  tripContext?: {
    timeSensitive?: boolean;
    lastViableDepartureAt?: string;
    activeNavigation?: boolean;
    isPassiveViewing?: boolean;
  };
}

export interface ContextualExecutionOutput {
  shouldSurfaceExecution: boolean;
  executionPriority: ExecutionPriority;
  executionMessage: string;
  actionLabel: string;
  suppressionReason: string;
  nextEvaluationAt: string;
}

export interface SurfacedActionMeta {
  messageIntent: string;
  recommendedMode: string;
  urgencyLevel: string;
  surfacedAt: string;
  contextHash: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SURFACE_COOLDOWN_MS = 4 * 60 * 1000; // 4 minutes
const MATERIAL_TIME_CHANGE_MIN = 5;
const MATERIAL_RELIABILITY_CHANGE = 15;
const STALE_RECOMMENDATION_MS = 12 * 60 * 1000; // 12 minutes
const CUTOFF_URGENT_MS = 8 * 60 * 1000; // 8 minutes

const EVAL_INTERVAL: Record<string, number> = {
  critical: 60 * 1000,
  active: 3 * 60 * 1000,
  passive: 10 * 60 * 1000,
};

// ============================================================================
// CONTEXT HASH (lightweight fingerprint of recommendation state)
// ============================================================================

function buildContextHash(decision: MultimodalDecisionResult): string {
  const rec = decision.recommendedOption;
  if (!rec) return 'none';
  return `${decision.recommendedMode}|${Math.round(rec.totalTravelMinutes)}|${decision.urgencyLevel}|${rec.cutoffRisk ? 1 : 0}`;
}

// ============================================================================
// TRIGGER DETECTION
// ============================================================================

interface TriggerResult {
  triggered: boolean;
  category: 'immediate_urgency' | 'meaningful_shift' | 'execution_window' | 'none';
  intent: string;
}

function detectTrigger(
  input: ContextualExecutionInput,
  contextHash: string,
): TriggerResult {
  const { multimodalDecision, currentTime, lastSurfacedAction, tripContext } = input;
  const rec = multimodalDecision.recommendedOption;
  const none: TriggerResult = { triggered: false, category: 'none', intent: '' };

  if (!rec) return none;

  // --- A) Immediate urgency ---
  if (multimodalDecision.timeSensitive && multimodalDecision.urgencyLevel === 'high') {
    return { triggered: true, category: 'immediate_urgency', intent: 'leave_now_urgent' };
  }

  if (tripContext?.lastViableDepartureAt) {
    const cutoffMs = new Date(tripContext.lastViableDepartureAt).getTime() - currentTime.getTime();
    if (cutoffMs > 0 && cutoffMs <= CUTOFF_URGENT_MS) {
      return { triggered: true, category: 'immediate_urgency', intent: 'cutoff_imminent' };
    }
  }

  if (rec.cutoffRisk && multimodalDecision.urgencyLevel !== 'low') {
    return { triggered: true, category: 'immediate_urgency', intent: 'cutoff_risk' };
  }

  // --- B) Meaningful recommendation shift ---
  if (lastSurfacedAction) {
    const modeChanged = multimodalDecision.recommendedMode !== lastSurfacedAction.recommendedMode;
    const urgencyEscalated =
      lastSurfacedAction.urgencyLevel === 'low' && multimodalDecision.urgencyLevel !== 'low' ||
      lastSurfacedAction.urgencyLevel === 'moderate' && multimodalDecision.urgencyLevel === 'high';

    if (modeChanged) {
      return { triggered: true, category: 'meaningful_shift', intent: 'mode_changed' };
    }
    if (urgencyEscalated) {
      return { triggered: true, category: 'meaningful_shift', intent: 'urgency_escalated' };
    }

    // Check material time/reliability change via hash comparison
    if (contextHash !== lastSurfacedAction.contextHash) {
      const prevParts = lastSurfacedAction.contextHash.split('|');
      const prevTime = parseInt(prevParts[1] || '0', 10);
      const curTime = Math.round(rec.totalTravelMinutes);
      if (Math.abs(curTime - prevTime) >= MATERIAL_TIME_CHANGE_MIN) {
        return { triggered: true, category: 'meaningful_shift', intent: 'time_changed_materially' };
      }
    }
  }

  // --- C) User-in-context execution window (first surface) ---
  if (!lastSurfacedAction && !tripContext?.isPassiveViewing) {
    if (multimodalDecision.urgencyLevel !== 'low') {
      return { triggered: true, category: 'execution_window', intent: 'first_surface' };
    }
  }

  return none;
}

// ============================================================================
// SUPPRESSION CHECK
// ============================================================================

function isSuppressed(
  input: ContextualExecutionInput,
  trigger: TriggerResult,
  contextHash: string,
): string | null {
  const { lastSurfacedAction, currentTime } = input;

  if (!lastSurfacedAction) return null;

  const elapsed = currentTime.getTime() - new Date(lastSurfacedAction.surfacedAt).getTime();

  // Urgent escalation can bypass cooldown
  if (trigger.category === 'immediate_urgency') {
    // Still enforce a short minimum gap (60s) even for urgent
    if (elapsed < 60_000) return 'urgent_min_gap';
    return null;
  }

  // Normal cooldown
  if (elapsed < SURFACE_COOLDOWN_MS) return 'cooldown_active';

  // Same practical outcome
  if (
    contextHash === lastSurfacedAction.contextHash &&
    trigger.intent === lastSurfacedAction.messageIntent
  ) {
    return 'unchanged_context';
  }

  return null;
}

// ============================================================================
// MESSAGE GENERATION
// ============================================================================

function generateMessage(
  decision: MultimodalDecisionResult,
  trigger: TriggerResult,
): { message: string; label: string } {
  const mode = decision.recommendedMode;
  const rec = decision.recommendedOption;
  const mins = rec ? Math.round(rec.totalTravelMinutes) : 0;

  if (trigger.intent === 'leave_now_urgent' || trigger.intent === 'cutoff_imminent') {
    if (mode === 'transit') {
      return {
        message: `Leave now — your transit option departs soon.`,
        label: 'Open transit directions',
      };
    }
    return {
      message: `Leave now to arrive on time — ${mins} min ${mode}.`,
      label: `Open ${mode} navigation`,
    };
  }

  if (trigger.intent === 'cutoff_risk') {
    return {
      message: `You may miss this route if you wait.`,
      label: `Start ${mode} navigation`,
    };
  }

  if (trigger.intent === 'mode_changed') {
    const reason = decision.decisionReasonSummary || `${mode} is now the best option`;
    return {
      message: `${capitalize(mode)} is now recommended — ${reason}.`,
      label: `Open ${mode} navigation`,
    };
  }

  if (trigger.intent === 'urgency_escalated') {
    return {
      message: `Time is getting tight — ${mins} min via ${mode}.`,
      label: `Open ${mode} navigation`,
    };
  }

  if (trigger.intent === 'time_changed_materially') {
    return {
      message: `Route updated — ${mins} min via ${mode}.`,
      label: `Open ${mode} navigation`,
    };
  }

  // first_surface / default
  return {
    message: `${capitalize(mode)} recommended — ${mins} min.`,
    label: `Open ${mode} navigation`,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============================================================================
// PRIORITY
// ============================================================================

function derivePriority(trigger: TriggerResult, decision: MultimodalDecisionResult): ExecutionPriority {
  if (trigger.category === 'immediate_urgency') return 'high';
  if (trigger.category === 'meaningful_shift' && decision.urgencyLevel === 'high') return 'high';
  if (trigger.category === 'meaningful_shift') return 'medium';
  if (decision.urgencyLevel === 'moderate') return 'medium';
  return 'low';
}

// ============================================================================
// NEXT EVALUATION WINDOW
// ============================================================================

function computeNextEvaluation(input: ContextualExecutionInput): string {
  const tier = input.tripContext?.activeNavigation
    ? 'critical'
    : input.tripContext?.timeSensitive
      ? 'active'
      : 'passive';
  const intervalMs = EVAL_INTERVAL[tier] ?? EVAL_INTERVAL.passive;
  return new Date(input.currentTime.getTime() + intervalMs).toISOString();
}

// ============================================================================
// CORE: EVALUATE
// ============================================================================

const SUPPRESSED_OUTPUT: ContextualExecutionOutput = {
  shouldSurfaceExecution: false,
  executionPriority: 'low',
  executionMessage: '',
  actionLabel: '',
  suppressionReason: '',
  nextEvaluationAt: '',
};

export function evaluateContextualExecution(input: ContextualExecutionInput): ContextualExecutionOutput {
  const nextEval = computeNextEvaluation(input);

  // ── Background guard ──
  if (!input.appVisible) {
    return { ...SUPPRESSED_OUTPUT, suppressionReason: 'app_backgrounded', nextEvaluationAt: nextEval };
  }

  // ── Execution readiness ──
  if (!input.movementExecution.isExecutable) {
    return { ...SUPPRESSED_OUTPUT, suppressionReason: 'not_executable', nextEvaluationAt: nextEval };
  }

  if (!input.movementExecution.primaryExecutionUrl) {
    return { ...SUPPRESSED_OUTPUT, suppressionReason: 'no_execution_url', nextEvaluationAt: nextEval };
  }

  // ── Stale recommendation guard ──
  const recAge = input.currentTime.getTime() - new Date(input.multimodalDecision.recommendedOption?.sourceTimestamp || input.currentTime.toISOString()).getTime();
  if (recAge > STALE_RECOMMENDATION_MS) {
    return { ...SUPPRESSED_OUTPUT, suppressionReason: 'stale_recommendation', nextEvaluationAt: nextEval };
  }

  // ── Passive viewing guard ──
  if (input.tripContext?.isPassiveViewing && !input.multimodalDecision.timeSensitive) {
    return { ...SUPPRESSED_OUTPUT, suppressionReason: 'passive_viewing', nextEvaluationAt: nextEval };
  }

  // ── Trigger detection ──
  const contextHash = buildContextHash(input.multimodalDecision);
  const trigger = detectTrigger(input, contextHash);

  if (!trigger.triggered) {
    return { ...SUPPRESSED_OUTPUT, suppressionReason: 'no_trigger', nextEvaluationAt: nextEval };
  }

  // ── Suppression check ──
  const suppressReason = isSuppressed(input, trigger, contextHash);
  if (suppressReason) {
    return { ...SUPPRESSED_OUTPUT, suppressionReason: suppressReason, nextEvaluationAt: nextEval };
  }

  // ── Generate surface ──
  const { message, label } = generateMessage(input.multimodalDecision, trigger);
  const priority = derivePriority(trigger, input.multimodalDecision);

  return {
    shouldSurfaceExecution: true,
    executionPriority: priority,
    executionMessage: message,
    actionLabel: label,
    suppressionReason: '',
    nextEvaluationAt: nextEval,
  };
}

/**
 * Build a SurfacedActionMeta snapshot after surfacing,
 * so the next evaluation can compare against it.
 */
export function buildSurfacedMeta(
  decision: MultimodalDecisionResult,
  trigger: { intent: string },
  surfacedAt: Date,
): SurfacedActionMeta {
  return {
    messageIntent: trigger.intent,
    recommendedMode: decision.recommendedMode,
    urgencyLevel: decision.urgencyLevel,
    surfacedAt: surfacedAt.toISOString(),
    contextHash: buildContextHash(decision),
  };
}

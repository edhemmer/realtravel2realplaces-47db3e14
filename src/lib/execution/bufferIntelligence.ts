/**
 * v3.8.17: Buffer Intelligence Layer
 *
 * Cross-engine reasoning: determines whether the user has enough buffer
 * to arrive on time for the next critical event.
 *
 * RULES:
 * - Buffer computed ONLY when minutesUntil AND driveDurationMinutes are confidently available.
 * - No timezone conversions, no inferred timezones, no shifting.
 * - Fixed prep minutes by event type (constants, deterministic).
 * - Risk reductions are additive, capped at 20 minutes.
 * - Returns NOT_READY when data is insufficient (never guesses).
 */

import type { NextActionCardModel } from './nextActionResolver';
import type { ExecutionWindow } from './executionWindows';
import type { DrivePlan } from '@/types/drive';

// ============================================================================
// TYPES
// ============================================================================

export type BufferStatus = 'COMFORTABLE' | 'TIGHT' | 'HIGH_RISK' | 'NOT_READY';

export interface BufferStatusResult {
  status: BufferStatus;
  /** Net buffer minutes after drive + prep + risk. null when NOT_READY. */
  bufferMinutes: number | null;
  /** When to leave (minutes from now). null when NOT_READY. */
  recommendedLeaveInMinutes: number | null;
  /** Internal reasons for this result */
  reasons: string[];
  /** Short, calm user-facing label */
  uiLabel: string;
  /** Optional one-line detail */
  uiDetail?: string;
}

// ============================================================================
// CONSTANTS (fixed, deterministic — no heuristics)
// ============================================================================

/** Fixed prep minutes by event type */
const PREP_MINUTES: Record<string, number> = {
  DEPARTURE: 45,   // Airport pre-departure baseline
  RETURN: 20,      // Car return
  PICKUP: 15,      // Car pickup
  CHECKIN: 15,     // Lodging check-in
  CHECKOUT: 15,    // Lodging checkout
  EXPIRE: 10,      // Parking expiry
  STOP: 15,        // Tour stop
  ACTIVITY: 15,    // Activity
};

/** Risk reductions (additive, NOT multipliers) */
const RISK_WEATHER_MINUTES = 10;
const RISK_LONG_DRIVE_MINUTES = 10;
const RISK_TOLL_MINUTES = 5;
const RISK_CAP_MINUTES = 20;

/** Status thresholds */
const COMFORTABLE_THRESHOLD = 45;
const TIGHT_THRESHOLD = 15;

/** Target comfort buffer for leave recommendation */
const TARGET_COMFORT_FLIGHT = 45;
const TARGET_COMFORT_OTHER = 20;

// ============================================================================
// NAVIGATION-RELEVANT EVENT TYPES
// ============================================================================

/** Only compute buffer for events that involve travel */
const NAVIGATION_EVENT_TYPES = new Set([
  'DEPARTURE', 'CHECKIN', 'CHECKOUT', 'PICKUP', 'RETURN', 'EXPIRE', 'STOP', 'ACTIVITY',
]);

// ============================================================================
// MAIN
// ============================================================================

/**
 * Compute buffer status for the next critical action.
 *
 * @param nextAction - Resolved next action (from NextActionResolver)
 * @param drivePlan - Current drive plan (if navigation requires driving)
 * @returns BufferStatusResult — always returns a result; NOT_READY when data insufficient
 */
export function computeBufferStatus(
  nextAction: NextActionCardModel | null,
  drivePlan: DrivePlan | null,
): BufferStatusResult {
  const NOT_READY_RESULT: BufferStatusResult = {
    status: 'NOT_READY',
    bufferMinutes: null,
    recommendedLeaveInMinutes: null,
    reasons: [],
    uiLabel: '',
  };

  // ── Guard: no action ──
  if (!nextAction) {
    return { ...NOT_READY_RESULT, reasons: ['No next action available'] };
  }

  const eventType = nextAction.sourceWindow.eventType;

  // ── Guard: event type must involve navigation ──
  if (!NAVIGATION_EVENT_TYPES.has(eventType)) {
    return { ...NOT_READY_RESULT, reasons: [`Event type ${eventType} does not require buffer`] };
  }

  // ── Guard: must have navigation target implying travel ──
  if (nextAction.actionType !== 'NAVIGATE' || !nextAction.target) {
    return { ...NOT_READY_RESULT, reasons: ['No navigation target — buffer not applicable'] };
  }

  // ── Guard: minutesUntil must exist (parse-safe from ExecutionWindows) ──
  const minutesUntil = nextAction.sourceWindow.minutesUntil;
  if (minutesUntil === null || minutesUntil <= 0) {
    return { ...NOT_READY_RESULT, reasons: ['minutesUntil unavailable or past'] };
  }

  // ── Guard: drivePlan must exist with at least medium confidence ──
  if (!drivePlan) {
    return { ...NOT_READY_RESULT, reasons: ['No drive plan available'] };
  }
  if (drivePlan.confidence === 'low') {
    return { ...NOT_READY_RESULT, reasons: ['Drive plan confidence is low (degraded mode)'] };
  }
  if (!drivePlan.routeSummary) {
    return { ...NOT_READY_RESULT, reasons: ['No route summary in drive plan'] };
  }

  const driveDurationMinutes = drivePlan.routeSummary.durationMinutes;
  if (!driveDurationMinutes || driveDurationMinutes <= 0) {
    return { ...NOT_READY_RESULT, reasons: ['Drive duration unavailable'] };
  }

  // ── Compute buffer ──
  const prepMinutes = PREP_MINUTES[eventType] ?? 15;
  const reasons: string[] = [];

  // Risk reductions from DrivePlan flags
  let riskReduction = 0;
  const riskFlags = drivePlan.riskFlags || [];

  if (riskFlags.some(f => f.type === 'WEATHER_RISK')) {
    riskReduction += RISK_WEATHER_MINUTES;
    reasons.push('Weather risk: -10 min');
  }
  if (riskFlags.some(f => f.type === 'LONG_DRIVE')) {
    riskReduction += RISK_LONG_DRIVE_MINUTES;
    reasons.push('Long drive: -10 min');
  }
  if (riskFlags.some(f => f.type === 'TOLL_POSSIBLE')) {
    riskReduction += RISK_TOLL_MINUTES;
    reasons.push('Toll possible: -5 min');
  }

  // Cap risk reduction
  if (riskReduction > RISK_CAP_MINUTES) {
    riskReduction = RISK_CAP_MINUTES;
    reasons.push(`Risk reduction capped at ${RISK_CAP_MINUTES} min`);
  }

  const bufferMinutes = minutesUntil - driveDurationMinutes - prepMinutes - riskReduction;
  reasons.push(
    `minutesUntil=${minutesUntil}, drive=${driveDurationMinutes}, prep=${prepMinutes}, risk=${riskReduction}, buffer=${bufferMinutes}`
  );

  // ── Status classification ──
  let status: BufferStatus;
  let uiLabel: string;
  let uiDetail: string | undefined;

  if (bufferMinutes >= COMFORTABLE_THRESHOLD) {
    status = 'COMFORTABLE';
    uiLabel = 'Comfortable buffer';
  } else if (bufferMinutes >= TIGHT_THRESHOLD) {
    status = 'TIGHT';
    uiLabel = 'Tight buffer — consider leaving earlier';
  } else {
    status = 'HIGH_RISK';
    uiLabel = 'High risk — leave now if possible';
  }

  // ── Recommended leave time ──
  const targetComfort = eventType === 'DEPARTURE' ? TARGET_COMFORT_FLIGHT : TARGET_COMFORT_OTHER;
  const recommendedLeaveInMinutes = Math.max(0, bufferMinutes - targetComfort);

  return {
    status,
    bufferMinutes,
    recommendedLeaveInMinutes,
    reasons,
    uiLabel,
    uiDetail,
  };
}

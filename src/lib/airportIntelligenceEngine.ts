/**
 * v5.11.1: Airport Intelligence Engine
 *
 * Deterministic airport timing awareness using only canonical trip data
 * and orchestration context. Zero API calls, no TSA estimation, no gate logic.
 *
 * Provides:
 * - Airport timing state (very_early → missed_or_failed)
 * - Airport pressure level
 * - Deterministic risk flags
 * - Structured execution context for contextualExecutionEngine
 *
 * RULES:
 * - All timing anchored to flightDepartureTime + currentTime
 * - No live airport data
 * - No speculation
 * - No modification of canonicalTripState
 */

import type { CanonicalTripState } from '@/lib/canonicalTripState';
import type {
  OrchestrationResult,
  OrchestrationStep,
  DownstreamRiskLevel,
  BufferStatus,
} from '@/lib/movementOrchestrationEngine';

// ============================================================================
// TYPES
// ============================================================================

export type AirportTimingState =
  | 'very_early'
  | 'on_track'
  | 'tightening'
  | 'critical'
  | 'failure_imminent'
  | 'missed_or_failed';

export type AirportPressureLevel = 'low' | 'moderate' | 'high' | 'critical';

export type AirportRiskFlag =
  | 'airport_access_at_risk'
  | 'airport_access_not_started'
  | 'airport_buffer_degrading'
  | 'flight_dependency_pressure'
  | 'connection_chain_at_risk'
  | 'airport_chain_missed';

export type ExecutionRecommendationType = 'leave_now' | 'prepare' | 'monitor' | 'missed';

export type AirportConfidenceLevel = 'high' | 'medium' | 'low';

export interface AirportExecutionContext {
  executionUrgency: AirportPressureLevel;
  executionPressureSource: 'timing' | 'buffer' | 'dependency';
  executionRecommendationType: ExecutionRecommendationType;
  executionMessageHint: string;
}

export interface AirportIntelligenceResult {
  airportPressureLevel: AirportPressureLevel;
  airportTimingState: AirportTimingState;
  airportRiskFlags: AirportRiskFlag[];
  airportExecutionContext: AirportExecutionContext;
  airportConfidenceLevel: AirportConfidenceLevel;
  /** Flight departure time used for this evaluation (ISO string) */
  anchorFlightDeparture: string | null;
  /** Minutes until flight departure (null if unavailable) */
  minutesToDeparture: number | null;
}

// ============================================================================
// TIMING BOUNDARY CONSTANTS (minutes before departure)
// ============================================================================

const T_MINUS_120 = 120;
const T_MINUS_90 = 90;
const T_MINUS_60 = 60;
const T_MINUS_45 = 45;
const T_MINUS_30 = 30;

// ============================================================================
// NULL / NO-OP RESULT
// ============================================================================

const NO_AIRPORT_CONTEXT: AirportIntelligenceResult = {
  airportPressureLevel: 'low',
  airportTimingState: 'very_early',
  airportRiskFlags: [],
  airportExecutionContext: {
    executionUrgency: 'low',
    executionPressureSource: 'timing',
    executionRecommendationType: 'monitor',
    executionMessageHint: '',
  },
  airportConfidenceLevel: 'low',
  anchorFlightDeparture: null,
  minutesToDeparture: null,
};

// ============================================================================
// HELPERS
// ============================================================================

function parseMs(t: string | null | undefined): number | null {
  if (!t) return null;
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function toMin(ms: number): number {
  return Math.round(ms / 60000);
}

/**
 * Find the nearest upcoming flight departure from canonical timeline events.
 */
function findNearestFlightDeparture(
  tripState: CanonicalTripState,
  nowMs: number,
): { departureTime: string; departureMs: number } | null {
  const flightEvents = tripState.timelineEvents.filter(
    e =>
      e.bookingType === 'flight' &&
      (e.eventType === 'flight' || e.eventType === 'flight_departure'),
  );

  let nearest: { departureTime: string; departureMs: number } | null = null;
  let nearestDelta = Infinity;

  for (const fe of flightEvents) {
    const depStr = fe.departureLocalTime || fe.eventLocalDateTime || fe.datetime.toISOString();
    const depMs = parseMs(depStr);
    if (!depMs) continue;

    const delta = depMs - nowMs;
    // Only consider future or very-recently-past flights (within 30 min)
    if (delta > -(T_MINUS_30 * 60000) && delta < nearestDelta) {
      nearestDelta = delta;
      nearest = { departureTime: depStr, departureMs: depMs };
    }
  }

  return nearest;
}

/**
 * Find airport-related steps from orchestration output.
 */
function findAirportSteps(orchestration: OrchestrationResult | null): {
  accessStep: OrchestrationStep | null;
  processStep: OrchestrationStep | null;
  transferStep: OrchestrationStep | null;
} {
  if (!orchestration) return { accessStep: null, processStep: null, transferStep: null };

  const allSteps = orchestration.journeys.flatMap(j => j.steps);

  // Find first non-completed airport steps
  const accessStep = allSteps.find(
    s => s.stepType === 'airport_access' && s.status !== 'completed',
  ) ?? null;

  const processStep = allSteps.find(
    s => s.stepType === 'airport_process' && s.status !== 'completed',
  ) ?? null;

  const transferStep = allSteps.find(
    s => s.stepType === 'transfer' && s.status !== 'completed',
  ) ?? null;

  return { accessStep, processStep, transferStep };
}

// ============================================================================
// TIMING STATE DERIVATION
// ============================================================================

function deriveTimingState(
  minutesToDep: number,
  accessStep: OrchestrationStep | null,
  processStep: OrchestrationStep | null,
): AirportTimingState {
  // Past departure
  if (minutesToDep <= 0) return 'missed_or_failed';

  // Dependency failure
  if (accessStep?.status === 'missed' || processStep?.status === 'missed') {
    return 'missed_or_failed';
  }

  // Inside T-30
  if (minutesToDep <= T_MINUS_30) {
    if (accessStep && accessStep.status !== 'completed') return 'failure_imminent';
    return 'critical';
  }

  // Inside T-45
  if (minutesToDep <= T_MINUS_45) {
    if (accessStep && accessStep.status !== 'completed') return 'failure_imminent';
    return 'critical';
  }

  // Inside T-60
  if (minutesToDep <= T_MINUS_60) {
    // Buffer degrading or access not started
    if (accessStep && accessStep.status === 'upcoming') return 'tightening';
    if (accessStep?.bufferStatus === 'critical' || accessStep?.bufferStatus === 'tight') {
      return 'tightening';
    }
    return 'tightening';
  }

  // Inside T-120
  if (minutesToDep <= T_MINUS_120) {
    // Check for buffer pressure
    if (accessStep?.bufferStatus === 'critical') return 'tightening';
    return 'on_track';
  }

  // Well before T-120
  return 'very_early';
}

// ============================================================================
// PRESSURE LEVEL DERIVATION
// ============================================================================

function derivePressure(
  timingState: AirportTimingState,
  accessStep: OrchestrationStep | null,
): AirportPressureLevel {
  switch (timingState) {
    case 'very_early':
      return 'low';
    case 'on_track':
      // Minor pressure if buffer is tight
      if (accessStep?.bufferStatus === 'tight') return 'moderate';
      return 'low';
    case 'tightening':
      return 'high';
    case 'critical':
    case 'failure_imminent':
      return 'critical';
    case 'missed_or_failed':
      return 'critical';
  }
}

// ============================================================================
// RISK FLAG DERIVATION
// ============================================================================

function deriveRiskFlags(
  timingState: AirportTimingState,
  minutesToDep: number,
  accessStep: OrchestrationStep | null,
  orchestration: OrchestrationResult | null,
): AirportRiskFlag[] {
  const flags: AirportRiskFlag[] = [];

  // Airport access not started
  if (
    accessStep &&
    accessStep.status === 'upcoming' &&
    minutesToDep <= T_MINUS_90
  ) {
    flags.push('airport_access_not_started');
  }

  // Airport access at risk
  if (
    accessStep &&
    (accessStep.status === 'at_risk' || accessStep.bufferStatus === 'critical')
  ) {
    flags.push('airport_access_at_risk');
  }

  // Airport buffer degrading
  if (
    accessStep &&
    accessStep.bufferStatus === 'tight' &&
    minutesToDep <= T_MINUS_60
  ) {
    flags.push('airport_buffer_degrading');
  }

  // Flight dependency pressure
  if (
    orchestration &&
    orchestration.downstreamRiskLevel !== 'none' &&
    (timingState === 'tightening' || timingState === 'critical' || timingState === 'failure_imminent')
  ) {
    flags.push('flight_dependency_pressure');
  }

  // Connection chain at risk (multi-leg)
  if (orchestration) {
    const multiLegChain = orchestration.journeys.find(
      j => j.steps.filter(s => s.stepType === 'transfer').length > 1,
    );
    if (multiLegChain && multiLegChain.downstreamRiskLevel !== 'none') {
      flags.push('connection_chain_at_risk');
    }
  }

  // Airport chain missed
  if (timingState === 'missed_or_failed') {
    flags.push('airport_chain_missed');
  }

  return flags;
}

// ============================================================================
// EXECUTION CONTEXT DERIVATION
// ============================================================================

function deriveExecutionContext(
  timingState: AirportTimingState,
  pressure: AirportPressureLevel,
  accessStep: OrchestrationStep | null,
  minutesToDep: number,
  confidence: AirportConfidenceLevel,
): AirportExecutionContext {
  // Determine pressure source
  let pressureSource: 'timing' | 'buffer' | 'dependency' = 'timing';
  if (accessStep?.bufferStatus === 'critical' || accessStep?.bufferStatus === 'tight') {
    pressureSource = 'buffer';
  }
  if (accessStep?.status === 'blocked') {
    pressureSource = 'dependency';
  }

  // Determine recommendation type
  let recType: ExecutionRecommendationType = 'monitor';
  let hint = '';

  // Suppress strong urgency at low confidence
  const effectivePressure = confidence === 'low' && pressure === 'critical' ? 'high' : pressure;

  switch (timingState) {
    case 'very_early':
      recType = 'monitor';
      hint = '';
      break;
    case 'on_track':
      recType = 'monitor';
      if (accessStep?.bufferStatus === 'tight') {
        recType = 'prepare';
        hint = 'Airport timing is on track but buffer is limited';
      }
      break;
    case 'tightening':
      recType = 'prepare';
      hint = 'Airport access window is tightening';
      if (accessStep?.status === 'upcoming' && minutesToDep <= T_MINUS_60) {
        recType = 'leave_now';
        hint = 'Leave now to maintain airport arrival timing';
      }
      break;
    case 'critical':
      recType = 'leave_now';
      hint = 'Leave now to maintain airport arrival timing';
      if (accessStep?.status === 'active') {
        hint = 'Airport arrival timing is critical — proceed directly';
      }
      break;
    case 'failure_imminent':
      recType = 'leave_now';
      hint = 'Airport chain is at immediate risk';
      break;
    case 'missed_or_failed':
      recType = 'missed';
      hint = 'This airport departure window has likely passed';
      break;
  }

  return {
    executionUrgency: effectivePressure,
    executionPressureSource: pressureSource,
    executionRecommendationType: recType,
    executionMessageHint: hint,
  };
}

// ============================================================================
// CONFIDENCE DERIVATION
// ============================================================================

function deriveConfidence(
  anchorFlight: { departureTime: string; departureMs: number } | null,
  accessStep: OrchestrationStep | null,
  orchestration: OrchestrationResult | null,
): AirportConfidenceLevel {
  if (!anchorFlight) return 'low';

  const hasChain = orchestration && orchestration.journeys.length > 0;
  const hasAccessStep = accessStep !== null;

  if (hasChain && hasAccessStep) return 'high';
  if (hasChain || hasAccessStep) return 'medium';
  return 'medium'; // We have a flight but limited orchestration
}

// ============================================================================
// MAIN ENTRY
// ============================================================================

/**
 * Compute airport intelligence for the nearest upcoming flight.
 *
 * @param tripState - Canonical trip state
 * @param currentTime - Current time
 * @param orchestration - Movement orchestration output (optional)
 * @returns AirportIntelligenceResult — always returns a result
 */
export function computeAirportIntelligence(
  tripState: CanonicalTripState,
  currentTime: Date,
  orchestration: OrchestrationResult | null,
): AirportIntelligenceResult {
  const nowMs = currentTime.getTime();

  // ── Find anchor flight ──
  if (!tripState.hasFlights) return NO_AIRPORT_CONTEXT;

  const anchorFlight = findNearestFlightDeparture(tripState, nowMs);
  if (!anchorFlight) return NO_AIRPORT_CONTEXT;

  const minutesToDep = toMin(anchorFlight.departureMs - nowMs);

  // ── Find airport steps ──
  const { accessStep, processStep, transferStep } = findAirportSteps(orchestration);

  // ── Derive confidence ──
  const confidence = deriveConfidence(anchorFlight, accessStep, orchestration);

  // ── Derive timing state ──
  const timingState = deriveTimingState(minutesToDep, accessStep, processStep);

  // ── Derive pressure ──
  const pressure = derivePressure(timingState, accessStep);

  // ── Derive risk flags ──
  const riskFlags = deriveRiskFlags(timingState, minutesToDep, accessStep, orchestration);

  // ── Derive execution context ──
  const executionContext = deriveExecutionContext(
    timingState,
    pressure,
    accessStep,
    minutesToDep,
    confidence,
  );

  return {
    airportPressureLevel: pressure,
    airportTimingState: timingState,
    airportRiskFlags: riskFlags,
    airportExecutionContext: executionContext,
    airportConfidenceLevel: confidence,
    anchorFlightDeparture: anchorFlight.departureTime,
    minutesToDeparture: minutesToDep,
  };
}

/**
 * v5.11.0: Multi-Step Movement Orchestration Engine
 *
 * Canonical orchestration layer that models trip movement as linked step chains.
 * Builds chains from canonical trip state, tracks dependencies, detects
 * active/next steps, evaluates buffer integrity, and propagates downstream risk.
 *
 * RULES:
 * - No API calls
 * - No route generation
 * - No modification of canonicalTripState
 * - No fabricated times or schedules
 * - Chain integrity over completeness
 * - Deterministic and conservative
 */

import type {
  CanonicalTripState,
  CanonicalTimelineEvent,
} from '@/lib/canonicalTripState';

// ============================================================================
// TYPES
// ============================================================================

export type StepType =
  | 'drive'
  | 'transit'
  | 'walk'
  | 'airport_access'
  | 'airport_process'
  | 'transfer'
  | 'lodging_departure'
  | 'lodging_arrival'
  | 'event_access'
  | 'return_segment';

export type StepStatus =
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'at_risk'
  | 'blocked'
  | 'missed';

export type BufferStatus = 'safe' | 'tight' | 'critical' | 'unknown';

export type DownstreamRiskLevel = 'none' | 'elevated' | 'high' | 'critical';

export interface OrchestrationStep {
  stepId: string;
  chainId: string;
  stepType: StepType;
  origin: string;
  destination: string;
  plannedDepartureTime: string | null;
  plannedArrivalTime: string | null;
  requiredArrivalTime: string | null;
  dependencyStepId: string | null;
  upstreamStepIds: string[];
  downstreamStepIds: string[];
  status: StepStatus;
  bufferStatus: BufferStatus;
  bufferMinutes: number | null;
  riskLevel: DownstreamRiskLevel;
}

export interface OrchestratedJourney {
  chainId: string;
  steps: OrchestrationStep[];
  overallStatus: StepStatus;
  downstreamRiskLevel: DownstreamRiskLevel;
  impactedStepIds: string[];
}

export interface OrchestrationResult {
  journeys: OrchestratedJourney[];
  currentActiveStep: OrchestrationStep | null;
  nextStep: OrchestrationStep | null;
  overallJourneyStatus: StepStatus;
  downstreamRiskLevel: DownstreamRiskLevel;
  orchestrationContext: OrchestrationContext;
}

export interface OrchestrationContext {
  activeChainId: string | null;
  currentActiveStep: OrchestrationStep | null;
  nextStep: OrchestrationStep | null;
  downstreamRiskLevel: DownstreamRiskLevel;
  bufferStatus: BufferStatus;
  immediateDependencyPressure: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minutes before flight where airport access step should start */
const AIRPORT_ACCESS_LEAD_MIN = 120;

/** Buffer thresholds (minutes) */
const BUFFER_SAFE_MIN = 30;
const BUFFER_TIGHT_MIN = 15;

/** Minimum gap between events to model as a movement step (minutes) */
const MIN_MOVEMENT_GAP_MIN = 20;

// ============================================================================
// HELPERS
// ============================================================================

function toMinutes(ms: number): number {
  return Math.round(ms / 60000);
}

function parseTime(t: string | null | undefined): number | null {
  if (!t) return null;
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function stepId(chainId: string, idx: number): string {
  return `${chainId}::step-${idx}`;
}

function classifyBuffer(bufferMin: number | null): BufferStatus {
  if (bufferMin === null) return 'unknown';
  if (bufferMin >= BUFFER_SAFE_MIN) return 'safe';
  if (bufferMin >= BUFFER_TIGHT_MIN) return 'tight';
  return 'critical';
}

function deriveStepStatus(
  nowMs: number,
  departMs: number | null,
  arriveMs: number | null,
  bufferStatus: BufferStatus,
): StepStatus {
  if (departMs !== null && arriveMs !== null) {
    if (nowMs > arriveMs) return 'completed';
    if (nowMs >= departMs) return 'active';
  } else if (departMs !== null) {
    if (nowMs > departMs + 60 * 60000) return 'completed'; // 1hr past departure
    if (nowMs >= departMs) return 'active';
  }
  if (bufferStatus === 'critical') return 'at_risk';
  return 'upcoming';
}

// ============================================================================
// CHAIN CONSTRUCTION
// ============================================================================

interface RawStep {
  stepType: StepType;
  origin: string;
  destination: string;
  plannedDepartureTime: string | null;
  plannedArrivalTime: string | null;
  requiredArrivalTime: string | null;
  sourceEvent: CanonicalTimelineEvent;
}

function buildFlightChain(
  events: CanonicalTimelineEvent[],
  tripState: CanonicalTripState,
): RawStep[][] {
  const chains: RawStep[][] = [];

  // Find flight departure events
  const flightEvents = events.filter(
    e => e.bookingType === 'flight' && (e.eventType === 'flight' || e.eventType === 'flight_departure'),
  );

  for (const fe of flightEvents) {
    const chain: RawStep[] = [];
    const depCode = fe.departureAirportCode || '';
    const arrCode = fe.arrivalAirportCode || '';
    const depTime = fe.departureLocalTime || fe.eventLocalDateTime || fe.datetime.toISOString();
    const arrTime = fe.arrivalLocalTime || null;

    const depMs = parseTime(depTime);

    // Step 1: Airport access (get to departure airport)
    if (depCode && depMs) {
      const accessDepartMs = depMs - AIRPORT_ACCESS_LEAD_MIN * 60000;
      chain.push({
        stepType: 'airport_access',
        origin: tripState.trip.origin_address || tripState.trip.destination_city || 'origin',
        destination: depCode,
        plannedDepartureTime: new Date(accessDepartMs).toISOString(),
        plannedArrivalTime: null,
        requiredArrivalTime: depTime,
        sourceEvent: fe,
      });
    }

    // Step 2: Airport process (check-in, security, boarding)
    if (depCode) {
      chain.push({
        stepType: 'airport_process',
        origin: depCode,
        destination: depCode,
        plannedDepartureTime: null,
        plannedArrivalTime: depTime,
        requiredArrivalTime: depTime,
        sourceEvent: fe,
      });
    }

    // Step 3: Flight transfer (air segment)
    if (depCode && arrCode) {
      chain.push({
        stepType: 'transfer',
        origin: depCode,
        destination: arrCode,
        plannedDepartureTime: depTime,
        plannedArrivalTime: arrTime,
        requiredArrivalTime: null,
        sourceEvent: fe,
      });
    }

    // Step 4: Arrival to lodging/destination
    if (arrCode) {
      chain.push({
        stepType: 'lodging_arrival',
        origin: arrCode,
        destination: tripState.trip.destination_city || 'destination',
        plannedDepartureTime: arrTime,
        plannedArrivalTime: null,
        requiredArrivalTime: null,
        sourceEvent: fe,
      });
    }

    if (chain.length > 0) {
      chains.push(chain);
    }
  }

  return chains;
}

function buildEventAccessChains(
  events: CanonicalTimelineEvent[],
): RawStep[][] {
  const chains: RawStep[][] = [];

  const accessEvents = events.filter(e =>
    (e.eventType === 'activity_start' || e.eventType === 'engagement_start') &&
    e.hasExplicitTime,
  );

  for (const ae of accessEvents) {
    const eventTime = ae.eventLocalDateTime || ae.datetime.toISOString();
    const eventMs = parseTime(eventTime);
    if (!eventMs) continue;

    const accessDepartMs = eventMs - MIN_MOVEMENT_GAP_MIN * 60000;

    chains.push([{
      stepType: 'event_access',
      origin: 'current_location',
      destination: ae.address || ae.title,
      plannedDepartureTime: new Date(accessDepartMs).toISOString(),
      plannedArrivalTime: null,
      requiredArrivalTime: eventTime,
      sourceEvent: ae,
    }]);
  }

  return chains;
}

function buildLodgingChains(
  events: CanonicalTimelineEvent[],
): RawStep[][] {
  const chains: RawStep[][] = [];

  const checkouts = events.filter(e => e.eventType === 'hotel_checkout' && e.hasExplicitTime);
  const checkins = events.filter(e => e.eventType === 'hotel_checkin' && e.hasExplicitTime);

  for (const co of checkouts) {
    const coTime = co.eventLocalDateTime || co.datetime.toISOString();
    chains.push([{
      stepType: 'lodging_departure',
      origin: co.address || co.title,
      destination: 'next_destination',
      plannedDepartureTime: coTime,
      plannedArrivalTime: null,
      requiredArrivalTime: null,
      sourceEvent: co,
    }]);
  }

  for (const ci of checkins) {
    const ciTime = ci.eventLocalDateTime || ci.datetime.toISOString();
    chains.push([{
      stepType: 'lodging_arrival',
      origin: 'previous_location',
      destination: ci.address || ci.title,
      plannedDepartureTime: null,
      plannedArrivalTime: ciTime,
      requiredArrivalTime: ciTime,
      sourceEvent: ci,
    }]);
  }

  return chains;
}

// ============================================================================
// ORCHESTRATION
// ============================================================================

function assembleJourney(
  chainId: string,
  rawSteps: RawStep[],
  nowMs: number,
): OrchestratedJourney {
  const steps: OrchestrationStep[] = rawSteps.map((rs, idx) => {
    const sid = stepId(chainId, idx);
    const depMs = parseTime(rs.plannedDepartureTime);
    const arrMs = parseTime(rs.plannedArrivalTime);
    const reqMs = parseTime(rs.requiredArrivalTime);

    // Buffer: gap between planned arrival of upstream or this departure and required arrival
    let bufferMin: number | null = null;
    if (reqMs !== null && depMs !== null) {
      bufferMin = toMinutes(reqMs - depMs);
    } else if (reqMs !== null && arrMs !== null) {
      bufferMin = toMinutes(reqMs - arrMs);
    }

    const bufStatus = classifyBuffer(bufferMin);
    const status = deriveStepStatus(nowMs, depMs, arrMs, bufStatus);

    return {
      stepId: sid,
      chainId,
      stepType: rs.stepType,
      origin: rs.origin,
      destination: rs.destination,
      plannedDepartureTime: rs.plannedDepartureTime,
      plannedArrivalTime: rs.plannedArrivalTime,
      requiredArrivalTime: rs.requiredArrivalTime,
      dependencyStepId: idx > 0 ? stepId(chainId, idx - 1) : null,
      upstreamStepIds: idx > 0 ? [stepId(chainId, idx - 1)] : [],
      downstreamStepIds: idx < rawSteps.length - 1 ? [stepId(chainId, idx + 1)] : [],
      status,
      bufferStatus: bufStatus,
      bufferMinutes: bufferMin,
      riskLevel: 'none' as DownstreamRiskLevel,
    };
  });

  // Propagate downstream risk
  const impactedStepIds: string[] = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.status === 'at_risk' || s.status === 'blocked' || s.status === 'missed') {
      // Propagate to all downstream
      for (let j = i + 1; j < steps.length; j++) {
        const ds = steps[j];
        if (ds.status === 'completed') continue;
        if (s.status === 'missed') {
          ds.riskLevel = 'critical';
          ds.status = 'blocked';
        } else if (s.status === 'blocked') {
          ds.riskLevel = 'high';
          ds.status = 'blocked';
        } else {
          ds.riskLevel = ds.riskLevel === 'none' ? 'elevated' : ds.riskLevel;
        }
        impactedStepIds.push(ds.stepId);
      }
    }
    if (s.bufferStatus === 'critical' && s.status !== 'completed') {
      for (let j = i + 1; j < steps.length; j++) {
        const ds = steps[j];
        if (ds.status === 'completed') continue;
        if (ds.riskLevel === 'none') ds.riskLevel = 'elevated';
        if (!impactedStepIds.includes(ds.stepId)) impactedStepIds.push(ds.stepId);
      }
    }
  }

  // Overall status
  const activeSteps = steps.filter(s => s.status !== 'completed');
  let overallStatus: StepStatus = 'upcoming';
  if (steps.every(s => s.status === 'completed')) overallStatus = 'completed';
  else if (activeSteps.some(s => s.status === 'missed')) overallStatus = 'missed';
  else if (activeSteps.some(s => s.status === 'blocked')) overallStatus = 'blocked';
  else if (activeSteps.some(s => s.status === 'at_risk')) overallStatus = 'at_risk';
  else if (activeSteps.some(s => s.status === 'active')) overallStatus = 'active';

  // Downstream risk level
  const riskLevels = steps.map(s => s.riskLevel as string);
  let downstreamRisk: DownstreamRiskLevel = 'none';
  if (riskLevels.includes('critical')) downstreamRisk = 'critical';
  else if (riskLevels.includes('high')) downstreamRisk = 'high';
  else if (riskLevels.includes('elevated')) downstreamRisk = 'elevated';

  return {
    chainId,
    steps,
    overallStatus,
    downstreamRiskLevel: downstreamRisk,
    impactedStepIds: [...new Set(impactedStepIds)],
  };
}

// ============================================================================
// MAIN ENTRY
// ============================================================================

export function computeMovementOrchestration(
  tripState: CanonicalTripState,
  currentTime: Date,
): OrchestrationResult {
  const nowMs = currentTime.getTime();
  const events = tripState.timelineEvents;

  // Build all raw chains
  const flightChains = buildFlightChain(events, tripState);
  const eventChains = buildEventAccessChains(events);
  const lodgingChains = buildLodgingChains(events);

  const allRawChains = [...flightChains, ...eventChains, ...lodgingChains];

  // Sort chains by earliest departure/arrival time
  allRawChains.sort((a, b) => {
    const tA = parseTime(a[0]?.plannedDepartureTime) ?? parseTime(a[0]?.requiredArrivalTime) ?? Infinity;
    const tB = parseTime(b[0]?.plannedDepartureTime) ?? parseTime(b[0]?.requiredArrivalTime) ?? Infinity;
    return tA - tB;
  });

  // Assemble journeys
  const journeys: OrchestratedJourney[] = allRawChains.map((raw, idx) => {
    const chainId = `chain-${idx}`;
    return assembleJourney(chainId, raw, nowMs);
  });

  // Resolve active and next steps
  let currentActiveStep: OrchestrationStep | null = null;
  let nextStep: OrchestrationStep | null = null;

  const allSteps = journeys.flatMap(j => j.steps);

  // Active: first step with status 'active'
  currentActiveStep = allSteps.find(s => s.status === 'active') ?? null;

  // Next: first upcoming/at_risk step after active, or first upcoming if no active
  if (currentActiveStep) {
    const activeIdx = allSteps.indexOf(currentActiveStep);
    nextStep = allSteps.slice(activeIdx + 1).find(
      s => s.status === 'upcoming' || s.status === 'at_risk',
    ) ?? null;
  } else {
    nextStep = allSteps.find(
      s => s.status === 'upcoming' || s.status === 'at_risk',
    ) ?? null;
  }

  // Overall status
  let overallJourneyStatus: StepStatus = 'upcoming';
  if (journeys.length === 0) {
    overallJourneyStatus = 'upcoming';
  } else if (journeys.every(j => j.overallStatus === 'completed')) {
    overallJourneyStatus = 'completed';
  } else if (journeys.some(j => j.overallStatus === 'missed')) {
    overallJourneyStatus = 'missed';
  } else if (journeys.some(j => j.overallStatus === 'blocked')) {
    overallJourneyStatus = 'blocked';
  } else if (journeys.some(j => j.overallStatus === 'at_risk')) {
    overallJourneyStatus = 'at_risk';
  } else if (journeys.some(j => j.overallStatus === 'active')) {
    overallJourneyStatus = 'active';
  }

  // Downstream risk
  const journeyRisks = journeys.map(j => j.downstreamRiskLevel as string);
  let downstreamRiskLevel: DownstreamRiskLevel = 'none';
  if (journeyRisks.includes('critical')) downstreamRiskLevel = 'critical';
  else if (journeyRisks.includes('high')) downstreamRiskLevel = 'high';
  else if (journeyRisks.includes('elevated')) downstreamRiskLevel = 'elevated';

  // Active chain
  const activeChainId = currentActiveStep?.chainId ?? nextStep?.chainId ?? null;
  const activeStepBuffer = currentActiveStep?.bufferStatus ?? nextStep?.bufferStatus ?? 'unknown';
  const immediatePressure =
    (nextStep?.bufferStatus === 'critical' || nextStep?.bufferStatus === 'tight') &&
    (nextStep?.dependencyStepId !== null);

  return {
    journeys,
    currentActiveStep,
    nextStep,
    overallJourneyStatus,
    downstreamRiskLevel,
    orchestrationContext: {
      activeChainId,
      currentActiveStep,
      nextStep,
      downstreamRiskLevel,
      bufferStatus: activeStepBuffer,
      immediateDependencyPressure: immediatePressure || false,
    },
  };
}

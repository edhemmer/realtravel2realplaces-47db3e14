/**
 * v5.10.1: Multimodal Movement Decision Engine
 *
 * Single canonical layer that compares drive vs transit vs walk
 * and produces ONE clear recommended movement action.
 *
 * ARCHITECTURE:
 * - Consumes trafficIntelligenceEngine (drive) and transitIntelligenceEngine (transit)
 * - Walking computed internally via deterministic distance estimate
 * - Deterministic scoring: on-time viability, reliability, travel time
 * - Anti-flipping stability: narrow-margin decisions prefer more dependable option
 * - Caches combined results by routeKey with 3-minute TTL
 * - NO polling, NO intervals — on-demand only
 */

import {
  getTrafficIntelligence,
  type TrafficIntelligence,
  type CongestionLevel,
} from '@/lib/trafficIntelligenceEngine';
import {
  getTransitIntelligence,
  type TransitIntelligence,
  type TransitAdvisoryFlag,
} from '@/lib/transitIntelligenceEngine';
import { shouldFetchSource } from '@/lib/movementCallGovernance';

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export type MovementMode = 'drive' | 'transit' | 'walk';
export type UrgencyLevel = 'low' | 'moderate' | 'high';

export interface NormalizedMovementOption {
  mode: MovementMode;
  available: boolean;
  totalTravelMinutes: number;
  departureAt: string;
  arrivalAt: string;
  reliabilityScore: number; // 0-100, higher = more reliable
  delayRiskLevel: 'low' | 'moderate' | 'high';
  confidenceLevel: 'high' | 'medium' | 'low';
  transferCount: number;
  walkingMinutes: number;
  cutoffRisk: boolean;
  advisoryFlags: string[];
  sourceTimestamp: number;
}

export interface MultimodalDecision {
  recommendedMode: MovementMode;
  recommendedOption: NormalizedMovementOption;
  alternateOptions: NormalizedMovementOption[];
  timeSensitive: boolean;
  urgencyLevel: UrgencyLevel;
  decisionReasonSummary: string;
  lastUpdatedAt: number;
  source: 'live' | 'cached' | 'fallback';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WALK_ELIGIBILITY_MILES = 2.0;
const WALK_SPEED_MPH = 3.0;
const WALK_MAX_PRACTICAL_MIN = 45;
const EARTH_RADIUS_MI = 3959;

/** Cache TTL: 3 minutes */
const CACHE_TTL_MS = 3 * 60 * 1000;
const MAX_CACHE_ENTRIES = 15;

/** Narrow margin threshold for anti-flipping: 10% */
const NARROW_MARGIN_RATIO = 0.10;

// ============================================================================
// CACHE
// ============================================================================

interface CachedMultimodalEntry {
  decision: MultimodalDecision;
  fetchedAt: number;
}

const _multimodalCache = new Map<string, CachedMultimodalEntry>();

function generateMultimodalKey(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): string {
  const r = (n: number) => n.toFixed(4);
  const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
  return `mm:${r(originLat)},${r(originLng)}|${r(destLat)},${r(destLng)}|${bucket}`;
}

function getCachedDecision(key: string): CachedMultimodalEntry | null {
  const entry = _multimodalCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry;
}

function writeCachedDecision(key: string, decision: MultimodalDecision): void {
  if (!_multimodalCache.has(key) && _multimodalCache.size >= MAX_CACHE_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, e] of _multimodalCache) {
      if (e.fetchedAt < oldestTime) {
        oldestTime = e.fetchedAt;
        oldestKey = k;
      }
    }
    if (oldestKey) _multimodalCache.delete(oldestKey);
  }
  _multimodalCache.set(key, { decision, fetchedAt: Date.now() });
}

// ============================================================================
// HAVERSINE (internal, for walking distance)
// ============================================================================

function haversineDistanceMi(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MI * c;
}

// ============================================================================
// NORMALIZE: DRIVE
// ============================================================================

function normalizeDrive(
  traffic: TrafficIntelligence,
): NormalizedMovementOption {
  const now = new Date();
  const arrivalMs = now.getTime() + traffic.estimatedTravelTime * 60000;

  // Drive reliability: base 85, penalize congestion and incidents
  let reliability = 85;
  if (traffic.congestionLevel === 'moderate') reliability -= 10;
  if (traffic.congestionLevel === 'heavy') reliability -= 25;
  if (traffic.hasIncident) reliability -= 15;
  // Freshness penalty for non-live data
  if (traffic.source === 'haversine_fallback') reliability -= 20;
  if (traffic.source === 'cached') reliability -= 5;
  reliability = Math.max(0, Math.min(100, reliability));

  const delayRisk: 'low' | 'moderate' | 'high' =
    traffic.congestionLevel === 'heavy' || traffic.hasIncident ? 'high' :
    traffic.congestionLevel === 'moderate' ? 'moderate' : 'low';

  const flags: string[] = [];
  if (traffic.hasIncident) flags.push('incident_on_route');
  if (traffic.congestionLevel === 'heavy') flags.push('heavy_congestion');

  return {
    mode: 'drive',
    available: true,
    totalTravelMinutes: traffic.estimatedTravelTime,
    departureAt: now.toISOString(),
    arrivalAt: new Date(arrivalMs).toISOString(),
    reliabilityScore: reliability,
    delayRiskLevel: delayRisk,
    confidenceLevel: traffic.source === 'live' ? 'high' : traffic.source === 'cached' ? 'medium' : 'low',
    transferCount: 0,
    walkingMinutes: 0,
    cutoffRisk: false,
    advisoryFlags: flags,
    sourceTimestamp: traffic.lastUpdatedAt,
  };
}

// ============================================================================
// NORMALIZE: TRANSIT
// ============================================================================

function normalizeTransit(
  transit: TransitIntelligence,
): NormalizedMovementOption | null {
  if (!transit.available || !transit.recommendedRoute) return null;

  const route = transit.recommendedRoute;

  // Transit reliability: base 80
  let reliability = 80;
  if (transit.delayRiskLevel === 'moderate') reliability -= 10;
  if (transit.delayRiskLevel === 'high') reliability -= 25;
  reliability -= route.transferCount * 5;
  if (route.walkingMinutes > 12) reliability -= 5;
  if (transit.source === 'cached') reliability -= 5;
  // missed_cutoff state
  const hasMissedCutoff = transit.advisoryFlags.includes('missed_cutoff');
  if (hasMissedCutoff) reliability -= 30;
  const hasTimeSensitive = transit.advisoryFlags.includes('time_sensitive');
  reliability = Math.max(0, Math.min(100, reliability));

  return {
    mode: 'transit',
    available: !hasMissedCutoff,
    totalTravelMinutes: route.totalTravelMinutes,
    departureAt: route.departureAt,
    arrivalAt: route.arrivalAt,
    reliabilityScore: reliability,
    delayRiskLevel: transit.delayRiskLevel,
    confidenceLevel: transit.confidenceLevel,
    transferCount: route.transferCount,
    walkingMinutes: route.walkingMinutes,
    cutoffRisk: hasTimeSensitive || hasMissedCutoff,
    advisoryFlags: transit.advisoryFlags as string[],
    sourceTimestamp: transit.lastUpdatedAt,
  };
}

// ============================================================================
// NORMALIZE: WALK
// ============================================================================

function normalizeWalk(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): NormalizedMovementOption | null {
  const distanceMi = haversineDistanceMi(originLat, originLng, destLat, destLng);
  if (distanceMi > WALK_ELIGIBILITY_MILES) return null;

  // Walking estimate: straight-line * 1.3 factor for real streets
  const walkDistanceMi = distanceMi * 1.3;
  const walkMinutes = Math.round((walkDistanceMi / WALK_SPEED_MPH) * 60);

  if (walkMinutes > WALK_MAX_PRACTICAL_MIN) return null;

  const now = new Date();
  const arrivalMs = now.getTime() + walkMinutes * 60000;

  // Walk reliability: very high for short distances, degrades with distance
  let reliability = 95;
  if (walkMinutes > 20) reliability -= 5;
  if (walkMinutes > 30) reliability -= 10;
  reliability = Math.max(0, Math.min(100, reliability));

  return {
    mode: 'walk',
    available: true,
    totalTravelMinutes: walkMinutes,
    departureAt: now.toISOString(),
    arrivalAt: new Date(arrivalMs).toISOString(),
    reliabilityScore: reliability,
    delayRiskLevel: 'low',
    confidenceLevel: 'medium',
    transferCount: 0,
    walkingMinutes: walkMinutes,
    cutoffRisk: false,
    advisoryFlags: [],
    sourceTimestamp: Date.now(),
  };
}

// ============================================================================
// DETERMINISTIC SCORING + COMPARISON
// ============================================================================

interface ScoredOption {
  option: NormalizedMovementOption;
  score: number;
}

function computeDecisionScore(
  option: NormalizedMovementOption,
  arrivalDeadline?: string,
): number {
  if (!option.available) return -1;

  // Base: prefer shorter travel time (cap benefit at 120 min)
  const timeFactor = Math.max(0, 100 - option.totalTravelMinutes);

  // Reliability factor (0-100 mapped to 0-30 range)
  const reliabilityFactor = (option.reliabilityScore / 100) * 30;

  // Transfer penalty: -6 per transfer
  const transferPenalty = option.transferCount * 6;

  // Walking burden penalty: -1.5 per walking minute over 10
  const walkPenalty = Math.max(0, option.walkingMinutes - 10) * 1.5;

  // Cutoff risk penalty
  const cutoffPenalty = option.cutoffRisk ? 12 : 0;

  // Delay risk penalty
  const delayPenalty =
    option.delayRiskLevel === 'high' ? 15 :
    option.delayRiskLevel === 'moderate' ? 7 : 0;

  let score = timeFactor + reliabilityFactor - transferPenalty - walkPenalty - cutoffPenalty - delayPenalty;

  // Arrival deadline bonus/penalty
  if (arrivalDeadline) {
    const deadlineMs = new Date(arrivalDeadline).getTime();
    const arrivalMs = new Date(option.arrivalAt).getTime();
    if (arrivalMs <= deadlineMs) {
      // Bonus for on-time arrival, higher bonus for more buffer
      const bufferMin = (deadlineMs - arrivalMs) / 60000;
      score += Math.min(20, bufferMin * 0.5);
    } else {
      // Heavy penalty for missing deadline
      score -= 25;
    }
  }

  return Math.max(0, score);
}

function generateDecisionReason(
  recommended: NormalizedMovementOption,
  alternates: NormalizedMovementOption[],
  arrivalDeadline?: string,
): string {
  const mode = recommended.mode;

  if (arrivalDeadline) {
    const deadlineMs = new Date(arrivalDeadline).getTime();
    const arrivalMs = new Date(recommended.arrivalAt).getTime();
    if (arrivalMs <= deadlineMs) {
      return `${mode}: on-time, ${recommended.totalTravelMinutes} min, reliable`;
    }
    return `${mode}: best available, ${recommended.totalTravelMinutes} min`;
  }

  if (recommended.delayRiskLevel === 'low' && recommended.reliabilityScore >= 70) {
    return `${mode}: ${recommended.totalTravelMinutes} min, high reliability`;
  }

  return `${mode}: ${recommended.totalTravelMinutes} min, best option`;
}

function deriveUrgency(
  recommended: NormalizedMovementOption,
  arrivalDeadline?: string,
): UrgencyLevel {
  if (arrivalDeadline) {
    const deadlineMs = new Date(arrivalDeadline).getTime();
    const arrivalMs = new Date(recommended.arrivalAt).getTime();
    const bufferMin = (deadlineMs - arrivalMs) / 60000;
    if (bufferMin < 5) return 'high';
    if (bufferMin < 15) return 'moderate';
  }
  if (recommended.cutoffRisk) return 'high';
  if (recommended.delayRiskLevel === 'high') return 'moderate';
  return 'low';
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

/**
 * Compute the multimodal movement decision for a given route.
 *
 * Consumes existing traffic + transit engines. Adds walking estimate.
 * Returns ONE recommended mode with up to 2 alternates.
 *
 * This is a synchronous function that triggers background fetches
 * for underlying engines and returns the best available data.
 */
export function getMultimodalDecision(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  arrivalDeadline?: string,
): MultimodalDecision {
  const cacheKey = generateMultimodalKey(originLat, originLng, destLat, destLng);

  // Check cache first
  const cached = getCachedDecision(cacheKey);
  if (cached) return cached.decision;

  // Gather raw intelligence from source engines (governance checks happen inside each engine)
  const traffic = getTrafficIntelligence(originLat, originLng, destLat, destLng);

  // Only call transit if mode is potentially eligible (distance-based heuristic)
  const distanceMi = haversineDistanceMi(originLat, originLng, destLat, destLng);
  const transitEligible = distanceMi < 50; // transit rarely viable over 50 miles
  const transit = transitEligible
    ? getTransitIntelligence(originLat, originLng, destLat, destLng, arrivalDeadline)
    : null;

  // Normalize all options
  const driveOption = normalizeDrive(traffic);
  const transitOption = transit ? normalizeTransit(transit) : null;
  const walkOption = normalizeWalk(originLat, originLng, destLat, destLng);

  // Collect eligible options
  const candidates: ScoredOption[] = [];

  if (driveOption.available) {
    candidates.push({
      option: driveOption,
      score: computeDecisionScore(driveOption, arrivalDeadline),
    });
  }

  if (transitOption?.available) {
    candidates.push({
      option: transitOption,
      score: computeDecisionScore(transitOption, arrivalDeadline),
    });
  }

  if (walkOption?.available) {
    candidates.push({
      option: walkOption,
      score: computeDecisionScore(walkOption, arrivalDeadline),
    });
  }

  // Fallback: if no candidates, create a basic drive fallback
  if (candidates.length === 0) {
    const fallbackDrive = normalizeDrive(traffic);
    fallbackDrive.available = true; // Force available as last resort
    const decision: MultimodalDecision = {
      recommendedMode: 'drive',
      recommendedOption: fallbackDrive,
      alternateOptions: [],
      timeSensitive: false,
      urgencyLevel: 'low',
      decisionReasonSummary: 'drive: only option available',
      lastUpdatedAt: Date.now(),
      source: 'fallback',
    };
    writeCachedDecision(cacheKey, decision);
    return decision;
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Anti-flipping stability: if top two are within narrow margin,
  // prefer the one with higher reliability
  if (candidates.length >= 2) {
    const top = candidates[0];
    const second = candidates[1];
    const maxScore = Math.max(top.score, 1);
    const diff = (top.score - second.score) / maxScore;

    if (diff < NARROW_MARGIN_RATIO) {
      // Prefer higher reliability when scores are close
      if (second.option.reliabilityScore > top.option.reliabilityScore) {
        // Also check: fewer transfers and less cutoff risk
        const secondBetter =
          second.option.transferCount <= top.option.transferCount &&
          !second.option.cutoffRisk;
        if (secondBetter) {
          // Swap
          [candidates[0], candidates[1]] = [candidates[1], candidates[0]];
        }
      }
    }
  }

  const recommended = candidates[0].option;
  const alternates = candidates.slice(1, 3).map((c) => c.option);

  const timeSensitive = recommended.cutoffRisk ||
    (arrivalDeadline !== undefined && deriveUrgency(recommended, arrivalDeadline) !== 'low');

  const decision: MultimodalDecision = {
    recommendedMode: recommended.mode,
    recommendedOption: recommended,
    alternateOptions: alternates,
    timeSensitive,
    urgencyLevel: deriveUrgency(recommended, arrivalDeadline),
    decisionReasonSummary: generateDecisionReason(recommended, alternates, arrivalDeadline),
    lastUpdatedAt: Date.now(),
    source: traffic.source === 'live' || transit.source === 'live' ? 'live' : 'cached',
  };

  writeCachedDecision(cacheKey, decision);
  return decision;
}

/**
 * Clear multimodal cache (for testing).
 */
export function clearMultimodalCache(): void {
  _multimodalCache.clear();
}

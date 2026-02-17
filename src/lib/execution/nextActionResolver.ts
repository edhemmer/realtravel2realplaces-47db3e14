/**
 * v3.8.15: Next Action Resolver — Canonical Deterministic Action Priority
 *
 * Single resolver that produces ONE NextActionCardModel from:
 * - Execution windows (time-critical items)
 * - Canonical trip state
 *
 * PRIORITY ORDER (deterministic):
 * 1. Parking expiring soon (if minutesUntil available, HIGH criticality)
 * 2. Flight departure approaching
 * 3. Car pickup/return approaching
 * 4. Lodging check-in/check-out approaching
 * 5. Next scheduled tour stop (business-only)
 * 6. Otherwise "Next Up" timeline item
 *
 * NAVIGATION RULES:
 * - Flights: IATA only (dep/arr as appropriate) — never confirmation
 * - Lodging/Car/Parking/Stop: full address if available; otherwise no navigate
 * - Low confidence → VIEW_DETAILS (never navigate to wrong place)
 *
 * Max 1 critical alert shown at a time (no clutter).
 *
 * No date/time/timezone conversion. Uses "as-issued" strings for display.
 */

import type { ExecutionWindow, ExecutionEventType } from './executionWindows';
import type { CanonicalTimelineEvent } from '../canonicalTripState';

// ============================================================================
// TYPES
// ============================================================================

export type NextActionType =
  | 'NAVIGATE'
  | 'CHECKIN'
  | 'VIEW_DETAILS'
  | 'ADD_PARKING'
  | 'ADD_EXPENSE';

export interface NextActionCardModel {
  /** Primary title */
  title: string;
  /** Subtitle (time info, location, etc.) */
  subtitle: string;
  /** Action button type */
  actionType: NextActionType;
  /** Navigation target — IATA for flights, full address for others */
  target: string | null;
  /** Whether target is a valid IATA code (for flight navigate) */
  targetIsIata: boolean;
  /** Context label (e.g., "DEPARTURE TODAY", "PARKING EXPIRING") */
  contextLabel: string | null;
  /** Formatted countdown string (null if time not available) */
  countdown: string | null;
  /** Raw time text for display (as-issued, no conversion) */
  rawTimeText: string | null;
  /** Source execution window */
  sourceWindow: ExecutionWindow;
  /** Internal reason for this selection */
  _reason: string;
}

// ============================================================================
// PRIORITY ORDER (lower = higher priority)
// ============================================================================

const EVENT_TYPE_PRIORITY: Record<ExecutionEventType, number> = {
  EXPIRE: 0,      // Parking expiring
  DEPARTURE: 1,   // Flight departure
  RETURN: 2,      // Car return
  PICKUP: 3,      // Car pickup
  CHECKOUT: 4,    // Lodging checkout
  CHECKIN: 5,     // Lodging check-in
  STOP: 6,        // Tour stop
  ACTIVITY: 7,    // Activity
};

// ============================================================================
// CONTEXT LABELS
// ============================================================================

function resolveContextLabel(eventType: ExecutionEventType): string {
  switch (eventType) {
    case 'DEPARTURE': return 'DEPARTURE APPROACHING';
    case 'CHECKIN': return 'CHECK-IN APPROACHING';
    case 'CHECKOUT': return 'CHECKOUT APPROACHING';
    case 'PICKUP': return 'PICKUP APPROACHING';
    case 'RETURN': return 'RETURN APPROACHING';
    case 'EXPIRE': return 'PARKING EXPIRING';
    case 'STOP': return 'NEXT STOP';
    case 'ACTIVITY': return 'ACTIVITY APPROACHING';
  }
}

// ============================================================================
// COUNTDOWN FORMATTER (string-based, no timezone conversion)
// ============================================================================

function formatCountdown(minutesUntil: number | null): string | null {
  if (minutesUntil === null) return null;
  if (minutesUntil <= 0) return 'Now';
  if (minutesUntil < 60) return `In ${minutesUntil} min`;
  const hours = Math.floor(minutesUntil / 60);
  const mins = minutesUntil % 60;
  return mins > 0 ? `In ${hours}h ${mins}m` : `In ${hours}h`;
}

// ============================================================================
// NAVIGATION TARGET RESOLVER
// ============================================================================

function resolveTarget(window: ExecutionWindow): { target: string | null; isIata: boolean; actionType: NextActionType } {
  // Flights: IATA only
  if (window.eventType === 'DEPARTURE') {
    const iata = window.departureIata;
    if (iata && /^[A-Z]{3}$/.test(iata)) {
      return { target: `${iata} airport`, isIata: true, actionType: 'NAVIGATE' };
    }
    // No valid IATA → VIEW_DETAILS
    return { target: null, isIata: false, actionType: 'VIEW_DETAILS' };
  }

  // All others: full address if available
  if (window.address) {
    return { target: window.address, isIata: false, actionType: 'NAVIGATE' };
  }

  // No address → VIEW_DETAILS
  return { target: null, isIata: false, actionType: 'VIEW_DETAILS' };
}

// ============================================================================
// MAIN RESOLVER
// ============================================================================

/**
 * Resolve the single Next Action from execution windows.
 * Returns null if no actionable items exist.
 *
 * @param windows - Execution windows from buildExecutionWindows
 * @param tripType - Trip type for business-only gating (tour stops)
 */
export function resolveNextAction(
  windows: ExecutionWindow[],
  tripType?: string,
): NextActionCardModel | null {
  // Filter to future-only, non-past windows
  const candidates = windows.filter(w => !w.isPast);

  if (candidates.length === 0) return null;

  // Filter tour stops to business-only
  const eligible = candidates.filter(w => {
    if (w.eventType === 'STOP' && tripType !== 'business') return false;
    return true;
  });

  if (eligible.length === 0) return null;

  // Sort by priority:
  // 1. Criticality (HIGH first, then windows with minutesUntil, then those without)
  // 2. Event type priority
  // 3. minutesUntil ascending (sooner first)
  eligible.sort((a, b) => {
    // Windows with criticality sort first
    const aCrit = a.criticality ? criticalityOrder(a.criticality) : 99;
    const bCrit = b.criticality ? criticalityOrder(b.criticality) : 99;
    if (aCrit !== bCrit) return aCrit - bCrit;

    // Event type priority
    const aPri = EVENT_TYPE_PRIORITY[a.eventType];
    const bPri = EVENT_TYPE_PRIORITY[b.eventType];
    if (aPri !== bPri) return aPri - bPri;

    // minutesUntil ascending (sooner first)
    const aMins = a.minutesUntil ?? Infinity;
    const bMins = b.minutesUntil ?? Infinity;
    return aMins - bMins;
  });

  const winner = eligible[0];
  const { target, isIata, actionType } = resolveTarget(winner);

  // Build subtitle
  let subtitle = '';
  if (winner.eventType === 'DEPARTURE' && winner.departureIata && winner.arrivalIata) {
    subtitle = `${winner.departureIata} → ${winner.arrivalIata}`;
  } else if (winner.address) {
    subtitle = winner.address;
  } else {
    subtitle = winner.subtitle || '';
  }

  return {
    title: winner.title,
    subtitle,
    actionType,
    target,
    targetIsIata: isIata,
    contextLabel: winner.criticality ? resolveContextLabel(winner.eventType) : null,
    countdown: formatCountdown(winner.minutesUntil),
    rawTimeText: winner.timeText,
    sourceWindow: winner,
    _reason: `Priority: ${winner.eventType}, criticality: ${winner.criticality}, minutesUntil: ${winner.minutesUntil}`,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function criticalityOrder(c: 'HIGH' | 'MED' | 'LOW'): number {
  switch (c) {
    case 'HIGH': return 0;
    case 'MED': return 1;
    case 'LOW': return 2;
  }
}

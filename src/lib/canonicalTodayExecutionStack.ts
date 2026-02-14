/**
 * v3.10.9: Canonical TODAY Execution Stack
 *
 * SINGLE SOURCE OF TRUTH for all TODAY-related ordering.
 * All TODAY consumers (Critical Actions, Next Up, Today Timeline)
 * MUST derive from this stack — no independent re-sorting allowed.
 *
 * Produces one ordered list merging:
 *   - Canonical timeline events for today
 *   - Synthetic critical actions (CHECKOUT, GET_GAS, RETURN_RENTAL, DRIVE_SMART, FLIGHT)
 *   - AIRPORT_BUFFER urgency marker
 *   - isExecutionMode flag for departure urgency
 *
 * ORDERING CONTRACT:
 *   1. Critical actions in enforced order: CHECKOUT → GET_GAS → RETURN_RENTAL → DRIVE_SMART → FLIGHT
 *   2. Non-critical timeline events in time order (stable tie-breaker by id)
 *   3. Critical actions appear before timeline events at the same time
 *
 * EXECUTION MODE:
 *   Activated when flight departure today AND (now >= airportBuffer OR flight <= 4h away).
 *   In execution mode, criticalActions are filtered to departure-related types only.
 *
 * No Date(), no epoch math, no browser timezone conversions.
 */

import type { CanonicalTimelineEvent } from './canonicalTripState';
import {
  getTodayCriticalActionsWithBuffer,
  type TodayCriticalAction,
  type AirportBufferMarker,
  type CriticalActionType,
} from './canonicalTodayCriticalActions';
import { getLocalNowString } from './canonicalNextStop';

// ============================================================================
// TYPES
// ============================================================================

export interface TodayTimelineRow {
  /** Original canonical timeline event */
  event: CanonicalTimelineEvent;
  /** Extracted HH:MM or null */
  time: string | null;
  /** 12h formatted display */
  timeDisplay: string;
  /** Whether this event has already passed */
  isPast: boolean;
  /** v3.10.10: Location display for flights (IATA code) — never confirmation number */
  displayLocation?: string;
  /** v3.10.10: Sub-meta (e.g., confirmation number) — separate from location */
  displaySubMeta?: string;
}

export interface TodayExecutionOutput {
  /** Canonical critical actions in enforced order */
  criticalActions: TodayCriticalAction[];
  /** Today timeline rows in canonical time order (no re-sorting allowed downstream) */
  todayTimelineRows: TodayTimelineRow[];
  /** AIRPORT_BUFFER marker for urgency (may be null) */
  airportBuffer: AirportBufferMarker | null;
  /** v3.10.9: True when inside departure window (flight ≤4h or past airport buffer) */
  isExecutionMode: boolean;
  /** The "now" string used for this computation (for determinism checks) */
  computedAt: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Critical action types allowed during execution mode */
const EXECUTION_MODE_ALLOWED: Set<CriticalActionType> = new Set([
  'CHECKOUT',
  'GET_GAS',
  'RETURN_RENTAL',
  'DRIVE_SMART',
  'DRIVE_SMART_AIRPORT',
  'FLIGHT',
]);

// ============================================================================
// HELPERS (string-based, no Date())
// ============================================================================

function extractDate(dt: string | undefined): string | null {
  if (!dt) return null;
  const d = dt.substring(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function extractTime(dt: string | undefined): string | null {
  if (!dt) return null;
  const spaceMatch = dt.match(/^\d{4}-\d{2}-\d{2}\s+(\d{2}:\d{2})/);
  if (spaceMatch) return spaceMatch[1];
  const tMatch = dt.match(/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/);
  if (tMatch) return tMatch[1];
  return null;
}

function formatTime12h(time: string | null): string {
  if (!time) return '--:--';
  const h = parseInt(time.substring(0, 2));
  const m = time.substring(3, 5);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

/**
 * Convert HH:MM to total minutes. String-based, no Date().
 */
function timeToMinutes(time: string): number {
  return parseInt(time.substring(0, 2)) * 60 + parseInt(time.substring(3, 5));
}

/**
 * Detect departure execution mode.
 * True when: flight departure today AND (now >= bufferTime OR flight ≤ 4h away).
 * All comparisons are string/integer-based.
 */
function detectExecutionMode(
  nowTime: string,
  airportBuffer: AirportBufferMarker | null,
): boolean {
  if (!airportBuffer) return false;

  // Check: now >= airport buffer time
  if (nowTime >= airportBuffer.bufferTime) return true;

  // Check: flight departure ≤ 4 hours from now
  const nowMins = timeToMinutes(nowTime);
  const flightMins = timeToMinutes(airportBuffer.flightTime);
  const diffMins = flightMins - nowMins;

  return diffMins >= 0 && diffMins <= 240; // 4 hours = 240 minutes
}

// ============================================================================
// MAIN BUILDER
// ============================================================================

/**
 * Build the canonical TODAY execution stack.
 * Called ONCE per render cycle — all surfaces consume the output directly.
 *
 * @param timelineEvents - Full canonical timeline events
 * @param nowLocal - Optional override for testing (YYYY-MM-DD HH:MM)
 * @param returnLocationCoords - Rental return coords for gas proximity check
 * @param activeStayAddress - Active stay address for DRIVE_SMART origin fallback
 * @param activeParkingIds - Set of currently active parking IDs (for filtering)
 */
export function buildCanonicalTodayExecutionStack(
  timelineEvents: CanonicalTimelineEvent[],
  nowLocal?: string,
  returnLocationCoords?: { lat: number; lng: number } | null,
  activeStayAddress?: string | null,
  activeParkingIds?: Set<string>,
): TodayExecutionOutput {
  const nowStr = nowLocal ?? getLocalNowString();
  const todayDate = nowStr.substring(0, 10);
  const nowTime = nowStr.substring(11, 16);

  // 1. Get critical actions from canonical resolver (already in enforced order)
  const { actions: allCriticalActions, airportBuffer } = getTodayCriticalActionsWithBuffer(
    timelineEvents,
    nowStr,
    returnLocationCoords,
    activeStayAddress,
  );

  // 2. Detect execution mode
  const isExecutionMode = detectExecutionMode(nowTime, airportBuffer);

  // 3. Filter critical actions in execution mode (suppress non-essential)
  const criticalActions = isExecutionMode
    ? allCriticalActions.filter((a) => EXECUTION_MODE_ALLOWED.has(a.actionType))
    : allCriticalActions;

  // 4. Build today timeline rows (filtered, sorted ONCE here)
  const todayTimelineRows: TodayTimelineRow[] = [];

  for (const event of timelineEvents) {
    // Filter to today only
    if (event.sourceType === 'parking') {
      if (activeParkingIds && !activeParkingIds.has(event.sourceId)) continue;
      const eventDate = extractDate(event.eventLocalDateTime);
      if (eventDate !== todayDate) continue;
    } else {
      const eventDate = extractDate(event.eventLocalDateTime);
      if (eventDate !== todayDate) continue;
    }

    const eventTime = extractTime(event.eventLocalDateTime);

    // Stay check-in always visible; other past items still included but marked
    const isPast = eventTime ? eventTime < nowTime : false;

    // v3.10.10: Separate displayLocation (IATA) from displaySubMeta (confirmation)
    todayTimelineRows.push({
      event,
      time: eventTime,
      timeDisplay: formatTime12h(eventTime),
      isPast,
      displayLocation: event.departureAirportCode || undefined,
      displaySubMeta: event.confirmationNumber || undefined,
    });
  }

  // Sort by time (stable: tie-break by event id for determinism)
  todayTimelineRows.sort((a, b) => {
    const ta = a.time || '99:99';
    const tb = b.time || '99:99';
    const cmp = ta.localeCompare(tb);
    if (cmp !== 0) return cmp;
    return a.event.id.localeCompare(b.event.id);
  });

  return {
    criticalActions,
    todayTimelineRows,
    airportBuffer,
    isExecutionMode,
    computedAt: nowStr,
  };
}

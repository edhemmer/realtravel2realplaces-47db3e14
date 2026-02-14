/**
 * v3.8.6: Canonical Today Critical Actions Resolver
 *
 * Derives today's critical execution actions from the canonical timeline.
 * Powers NOW and any execution surface.
 *
 * ACTION TYPES (rendered in this order):
 *   1. CHECKOUT — stay checkout today
 *   2. RETURN_RENTAL — rental return / airport return / preflight today
 *   3. GET_GAS — synthetic: when rental return is ≤ 4 hours away
 *
 * Each action provides:
 *   - label: human-readable action name
 *   - time: HH:MM local time (or null if untimed)
 *   - navTarget: { address, lat?, lng? } for maps navigation
 *   - actionType: discriminated union key
 *
 * RULES:
 * - String-based time comparison only (no Date() for logic)
 * - GET_GAS appears when rental return is ≤ 240 minutes away
 * - GET_GAS navTarget uses device location if available, else return location
 */

import type { CanonicalTimelineEvent } from './canonicalTripState';
import { getLocalNowString } from './canonicalNextStop';
import { getCachedDeviceLocation } from './deviceLocation';

// ============================================================================
// TYPES
// ============================================================================

export type CriticalActionType = 'CHECKOUT' | 'RETURN_RENTAL' | 'GET_GAS';

export interface CriticalActionNavTarget {
  address?: string;
  lat?: number;
  lng?: number;
  /** For gas: search query */
  searchQuery?: string;
}

export interface TodayCriticalAction {
  id: string;
  actionType: CriticalActionType;
  label: string;
  /** HH:MM local time or null */
  time: string | null;
  /** Time formatted as 12h string */
  timeDisplay: string;
  navTarget: CriticalActionNavTarget;
  sourceId: string;
  sourceType: 'booking' | 'parking' | 'engagement';
}

// ============================================================================
// HELPERS
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

function timeToMinutes(time: string): number {
  return parseInt(time.substring(0, 2)) * 60 + parseInt(time.substring(3, 5));
}

// ============================================================================
// RESOLVER
// ============================================================================

/**
 * Resolve today's critical actions from canonical timeline events.
 * Returns actions in strict order: CHECKOUT → RETURN_RENTAL → GET_GAS
 */
export function getTodayCriticalActions(
  timelineEvents: CanonicalTimelineEvent[],
  nowLocal?: string,
): TodayCriticalAction[] {
  const nowStr = nowLocal ?? getLocalNowString();
  const todayDate = nowStr.substring(0, 10);
  const nowTime = nowStr.substring(11, 16);
  const nowMins = timeToMinutes(nowTime);

  const actions: TodayCriticalAction[] = [];
  let rentalReturnEvent: CanonicalTimelineEvent | null = null;
  let rentalReturnTime: string | null = null;

  // Pass 1: Collect CHECKOUT and RETURN_RENTAL from today's events
  for (const event of timelineEvents) {
    const eventDate = extractDate(event.eventLocalDateTime);
    if (eventDate !== todayDate) continue;

    const eventTime = extractTime(event.eventLocalDateTime);

    // v3.9.2: Stay checkout must remain visible until checkout time passes
    // Other events skip once passed
    if (eventTime && eventTime < nowTime && event.eventType !== 'hotel_checkout') continue;

    if (event.eventType === 'hotel_checkout') {
      actions.push({
        id: `critical-checkout-${event.sourceId}`,
        actionType: 'CHECKOUT',
        label: `Check out: ${event.title || 'Hotel'}`,
        time: eventTime,
        timeDisplay: formatTime12h(eventTime),
        navTarget: { address: event.address },
        sourceId: event.sourceId,
        sourceType: event.sourceType,
      });
    }

    if (event.eventType === 'rental_dropoff') {
      rentalReturnEvent = event;
      rentalReturnTime = eventTime;
      actions.push({
        id: `critical-return-${event.sourceId}`,
        actionType: 'RETURN_RENTAL',
        label: `Return: ${event.title || 'Rental'}`,
        time: eventTime,
        timeDisplay: formatTime12h(eventTime),
        navTarget: { address: event.address },
        sourceId: event.sourceId,
        sourceType: event.sourceType,
      });
    }
  }

  // Pass 2: Synthesize GET_GAS if rental return is ≤ 4 hours away
  if (rentalReturnEvent && rentalReturnTime) {
    const returnMins = timeToMinutes(rentalReturnTime);
    const minsUntilReturn = returnMins - nowMins;

    if (minsUntilReturn > 0 && minsUntilReturn <= 240) {
      // Prefer device location for gas search; fall back to return address
      const deviceCoords = getCachedDeviceLocation();
      const gasNav: CriticalActionNavTarget = deviceCoords
        ? { lat: deviceCoords.lat, lng: deviceCoords.lng, searchQuery: 'gas station' }
        : { address: rentalReturnEvent.address, searchQuery: 'gas station' };

      actions.push({
        id: `critical-gas-${rentalReturnEvent.sourceId}`,
        actionType: 'GET_GAS',
        label: 'Get gas before return',
        time: null, // Synthetic — no fixed time
        timeDisplay: `Return in ${Math.floor(minsUntilReturn / 60)}h ${minsUntilReturn % 60}m`,
        navTarget: gasNav,
        sourceId: rentalReturnEvent.sourceId,
        sourceType: rentalReturnEvent.sourceType,
      });
    }
  }

  // Sort by strict order: CHECKOUT(0) → RETURN_RENTAL(1) → GET_GAS(2)
  const ORDER: Record<CriticalActionType, number> = {
    CHECKOUT: 0,
    RETURN_RENTAL: 1,
    GET_GAS: 2,
  };
  actions.sort((a, b) => ORDER[a.actionType] - ORDER[b.actionType]);

  return actions;
}

// ============================================================================
// GAS MAPS URL BUILDER
// ============================================================================

/**
 * Build a Google Maps gas station search URL from a CriticalActionNavTarget.
 */
export function buildGasSearchUrl(navTarget: CriticalActionNavTarget): string {
  if (navTarget.lat != null && navTarget.lng != null) {
    return `https://www.google.com/maps/search/gas+station/@${navTarget.lat},${navTarget.lng},14z`;
  }
  if (navTarget.address) {
    return `https://www.google.com/maps/search/gas+station+near+${encodeURIComponent(navTarget.address)}`;
  }
  return 'https://www.google.com/maps/search/gas+station';
}

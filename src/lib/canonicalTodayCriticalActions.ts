/**
 * v3.10.6: Canonical Today Critical Actions Resolver
 *
 * Derives today's critical execution actions from the canonical timeline.
 * Powers NOW and any execution surface.
 *
 * ACTION TYPES (rendered in this order):
 *   1. CHECKOUT — stay checkout today
 *   2. GET_GAS — synthetic: when rental return exists today (45 min before return)
 *   3. RETURN_RENTAL — rental return / airport return / preflight today
 *
 * Each action provides:
 *   - label: human-readable action name
 *   - time: HH:MM local time (or null if untimed)
 *   - navTarget: { address, lat?, lng? } for maps navigation
 *   - actionType: discriminated union key
 *
 * RULES:
 * - String-based time comparison only (no Date() for logic)
 * - GET_GAS appears whenever rental return exists today (not yet passed)
 * - GET_GAS time = rental_return_time minus 45 minutes (string math)
 * - GET_GAS navTarget uses device location if within 20 mi of return, else return location
 * - No trip-city fallback for gas origin
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

/**
 * Subtract minutes from a HH:MM string using pure string/integer math.
 * Returns HH:MM (clamped to 00:00 floor).
 */
function subtractMinutesFromTime(time: string, minutes: number): string {
  const h = parseInt(time.substring(0, 2));
  const m = parseInt(time.substring(3, 5));
  let totalMins = h * 60 + m - minutes;
  if (totalMins < 0) totalMins = 0;
  const newH = Math.floor(totalMins / 60);
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Haversine distance in miles between two lat/lng pairs.
 * Pure math — no Date() or external dependencies.
 */
function haversineDistanceMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Determine if a rental return event type matches any known variant.
 */
function isRentalReturnEventType(eventType: string): boolean {
  return eventType === 'rental_dropoff' ||
    eventType === 'rental_return' ||
    eventType === 'car_return';
}

// ============================================================================
// RESOLVER
// ============================================================================

/**
 * Resolve today's critical actions from canonical timeline events.
 * Returns actions in strict order: CHECKOUT → GET_GAS → RETURN_RENTAL
 */
export function getTodayCriticalActions(
  timelineEvents: CanonicalTimelineEvent[],
  nowLocal?: string,
  /** Optional: return location coords for proximity check */
  returnLocationCoords?: { lat: number; lng: number } | null,
): TodayCriticalAction[] {
  const nowStr = nowLocal ?? getLocalNowString();
  const todayDate = nowStr.substring(0, 10);
  const nowTime = nowStr.substring(11, 16);

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

    if (isRentalReturnEventType(event.eventType)) {
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

  // Pass 2: Synthesize GET_GAS if rental return exists today (not yet passed)
  if (rentalReturnEvent) {
    // Gas time = rental return time minus 45 minutes (string math)
    const gasTime = rentalReturnTime
      ? subtractMinutesFromTime(rentalReturnTime, 45)
      : null;

    // Determine gas search origin:
    // If device location available AND within 20 miles of return location → device
    // Else → return location (no trip-city fallback)
    const deviceCoords = getCachedDeviceLocation();
    let useDevice = false;

    if (deviceCoords && returnLocationCoords) {
      const dist = haversineDistanceMiles(
        deviceCoords.lat, deviceCoords.lng,
        returnLocationCoords.lat, returnLocationCoords.lng
      );
      useDevice = dist <= 20;
    } else if (deviceCoords && !returnLocationCoords) {
      // No return coords to compare — use device as best guess
      useDevice = true;
    }

    const gasNav: CriticalActionNavTarget = useDevice && deviceCoords
      ? { lat: deviceCoords.lat, lng: deviceCoords.lng, searchQuery: 'gas station' }
      : { address: rentalReturnEvent.address, searchQuery: 'gas station' };

    actions.push({
      id: `critical-gas-${rentalReturnEvent.sourceId}`,
      actionType: 'GET_GAS',
      label: 'Get Gas',
      time: gasTime,
      timeDisplay: gasTime ? formatTime12h(gasTime) : 'Before return',
      navTarget: gasNav,
      sourceId: rentalReturnEvent.sourceId,
      sourceType: rentalReturnEvent.sourceType,
    });
  }

  // Sort by strict order: CHECKOUT(0) → GET_GAS(1) → RETURN_RENTAL(2)
  const ORDER: Record<CriticalActionType, number> = {
    CHECKOUT: 0,
    GET_GAS: 1,
    RETURN_RENTAL: 2,
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

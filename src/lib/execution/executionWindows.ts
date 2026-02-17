/**
 * v3.8.15: Execution Windows — Canonical Time-Critical Event Layer
 *
 * Generates executionWindow objects for time-critical items from the canonical timeline.
 * Uses confirmation "as-issued" strings for display — no timezone conversion or inference.
 *
 * minutesUntil is ONLY computed when the source provides a full parseable local datetime.
 * If datetime is not fully parseable, minutesUntil = null (no countdown, no urgency UI).
 *
 * RULES:
 * - No timezone conversion, inference, or shifting
 * - Store and display "as-issued" values exactly
 * - minutesUntil uses device local time WITHOUT timezone conversion
 *   (treats confirmation time as same-local display time)
 */

import type { CanonicalTimelineEvent } from '../canonicalTripState';
import { getLocalNowString } from '../canonicalNextStop';

// ============================================================================
// TYPES
// ============================================================================

export type ExecutionEventType =
  | 'DEPARTURE'
  | 'CHECKIN'
  | 'CHECKOUT'
  | 'PICKUP'
  | 'RETURN'
  | 'EXPIRE'
  | 'STOP'
  | 'ACTIVITY';

export type Criticality = 'HIGH' | 'MED' | 'LOW';

export interface ExecutionWindow {
  /** Source event ID */
  id: string;
  /** Source record ID */
  sourceId: string;
  /** Source type */
  sourceType: 'booking' | 'parking' | 'engagement';
  /** Booking type from canonical */
  bookingType: string;
  /** Classified event type */
  eventType: ExecutionEventType;
  /** Raw date text exactly as issued (YYYY-MM-DD) */
  dateText: string;
  /** Raw time text exactly as issued (HH:MM) or null if absent */
  timeText: string | null;
  /** Combined raw datetime for display */
  datetimeText: string | null;
  /** Criticality bucket (only set when minutesUntil is available) */
  criticality: Criticality | null;
  /** Minutes until event from device local time. null if time not parseable. */
  minutesUntil: number | null;
  /** Display title */
  title: string;
  /** Display subtitle */
  subtitle: string;
  /** Address for navigation */
  address: string | null;
  /** IATA departure code (flights only) */
  departureIata: string | null;
  /** IATA arrival code (flights only) */
  arrivalIata: string | null;
  /** Confirmation number */
  confirmationNumber: string | null;
  /** Whether this event has already passed */
  isPast: boolean;
}

// ============================================================================
// APPROACHING THRESHOLDS (fixed constants)
// ============================================================================

const THRESHOLD_HIGH_MINUTES = 180;   // ≤ 3 hours
const THRESHOLD_MED_MINUTES = 720;    // ≤ 12 hours
const THRESHOLD_LOW_MINUTES = 1440;   // ≤ 24 hours

// ============================================================================
// HELPERS (string-based, no Date() for logic)
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

/**
 * Compute minutesUntil ONLY when both date and time are parseable.
 * Uses device local time — treats event time as same-local (no TZ conversion).
 * Returns null if time is missing or ambiguous.
 */
function computeMinutesUntil(
  dateText: string,
  timeText: string | null,
  nowStr: string,
): number | null {
  if (!timeText) return null;

  const nowDate = nowStr.substring(0, 10);
  const nowTime = nowStr.substring(11, 16);

  // Same-day comparison using string-based minutes
  const nowDayMins = dayMinutes(nowDate, nowTime);
  const eventDayMins = dayMinutes(dateText, timeText);

  if (nowDayMins === null || eventDayMins === null) return null;
  return eventDayMins - nowDayMins;
}

/**
 * Convert YYYY-MM-DD + HH:MM to total minutes since epoch-ish reference.
 * Pure integer math for relative comparison only.
 */
function dayMinutes(date: string, time: string): number | null {
  const parts = date.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

  const timeParts = time.split(':');
  if (timeParts.length < 2) return null;
  const [h, min] = timeParts.map(Number);
  if (isNaN(h) || isNaN(min)) return null;

  // Approximate day count for relative comparison
  const dayCount = y * 365 + m * 30 + d;
  return dayCount * 1440 + h * 60 + min;
}

function classifyCriticality(minutesUntil: number | null): Criticality | null {
  if (minutesUntil === null) return null;
  if (minutesUntil <= 0) return null; // Past
  if (minutesUntil <= THRESHOLD_HIGH_MINUTES) return 'HIGH';
  if (minutesUntil <= THRESHOLD_MED_MINUTES) return 'MED';
  if (minutesUntil <= THRESHOLD_LOW_MINUTES) return 'LOW';
  return null;
}

/**
 * Map canonical event type to execution event type.
 */
function classifyEventType(eventType: string): ExecutionEventType | null {
  switch (eventType) {
    case 'flight':
    case 'flight_departure':
      return 'DEPARTURE';
    case 'hotel_checkin':
      return 'CHECKIN';
    case 'hotel_checkout':
      return 'CHECKOUT';
    case 'rental_pickup':
      return 'PICKUP';
    case 'rental_dropoff':
    case 'rental_return':
    case 'car_return':
      return 'RETURN';
    case 'parking_end':
    case 'parking_expiration':
      return 'EXPIRE';
    case 'engagement_start':
      return 'STOP';
    case 'activity_start':
      return 'ACTIVITY';
    default:
      return null;
  }
}

// ============================================================================
// BUILDER
// ============================================================================

/**
 * Build execution windows from canonical timeline events.
 * Only generates windows for time-critical event types.
 * 
 * @param timelineEvents - Full canonical timeline events
 * @param nowLocal - Optional override for testing (YYYY-MM-DD HH:MM)
 */
export function buildExecutionWindows(
  timelineEvents: CanonicalTimelineEvent[],
  nowLocal?: string,
): ExecutionWindow[] {
  const nowStr = nowLocal ?? getLocalNowString();
  const windows: ExecutionWindow[] = [];

  for (const event of timelineEvents) {
    const execType = classifyEventType(event.eventType);
    if (!execType) continue;

    const raw = event.eventLocalDateTime;
    const dateText = extractDate(raw);
    if (!dateText) continue;

    const timeText = extractTime(raw);
    const datetimeText = timeText ? `${dateText} ${timeText}` : dateText;

    const minutesUntil = computeMinutesUntil(dateText, timeText, nowStr);
    const criticality = classifyCriticality(minutesUntil);
    const isPast = minutesUntil !== null ? minutesUntil <= 0 : false;

    windows.push({
      id: event.id,
      sourceId: event.sourceId,
      sourceType: event.sourceType,
      bookingType: event.bookingType,
      eventType: execType,
      dateText,
      timeText,
      datetimeText,
      criticality,
      minutesUntil,
      title: event.title,
      subtitle: event.subtitle,
      address: event.address || null,
      departureIata: event.departureAirportCode || null,
      arrivalIata: event.arrivalAirportCode || null,
      confirmationNumber: event.confirmationNumber || null,
      isPast,
    });
  }

  return windows;
}

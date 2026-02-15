/**
 * v3.12.0: Canonical Drive Engine — Single Source of Truth
 *
 * ALL drive-related operational intelligence and signals are produced here.
 * No other file may implement toll/closure/weather/reroute/parking-expiring rules.
 *
 * DETERMINISTIC: Given same inputs, returns same signals.
 * NO TIMEZONE MATH: Uses YYYY-MM-DD string comparisons and explicit time helpers only.
 * NO Date() PARSING: No parseISO, no new Date(string), no startOfDay/endOfDay.
 */

import type { CanonicalTimelineEvent } from './canonicalTripState';
import type { Trip, Booking, Parking } from '@/types/database';
import type { DeviceCoords } from './deviceLocation';
import type { WeatherCondition } from './canonicalWeather';
import { getParkingWindowMs } from './canonicalParkingHighlight';
import { timeToMinutes } from './timeOnly';

// ============================================================================
// TYPES (strict, exported for consumers)
// ============================================================================

export type DriveSignalType =
  | 'TOLL_ACK_REQUIRED'
  | 'TOLL_REMINDER_TODAY'
  | 'WEATHER_ROUTE_RISK'
  | 'ROAD_CLOSURE_RISK'
  | 'DRIVE_REROUTE_SUGGESTION'
  | 'PARKING_EXPIRING_SOON';

export type DriveSignalSeverity = 'info' | 'warning' | 'critical';

export interface DriveSignal {
  id: string;
  type: DriveSignalType;
  severity: DriveSignalSeverity;
  title: string;
  message: string;
  actionLabel?: string;
  actionTarget?: {
    tab: 'parking' | 'bookings' | 'now' | 'alerts';
    recordId?: string;
  };
  related?: {
    bookingId?: string;
    parkingId?: string;
    segmentId?: string;
  };
  /** YYYY-MM-DD only — no conversion, no guessing */
  effectiveDate?: string;
  /** 'h:mm a' or null — no conversion, no guessing */
  effectiveTime?: string | null;
}

// ============================================================================
// INPUT MODEL (explicit, deterministic)
// ============================================================================

export interface DriveEngineWeatherContext {
  /** Weather condition for today at destination, if already fetched */
  todayCondition?: WeatherCondition;
  /** Precipitation chance for today (0-100), if available */
  todayPrecipChance?: number;
}

export interface DriveEngineInput {
  trip: Trip;
  bookings: Booking[];
  parkingList: Parking[];
  canonicalTimelineEvents: CanonicalTimelineEvent[];
  deviceLocationCoords: DeviceCoords | null;
  weatherContext?: DriveEngineWeatherContext;
  /** Canonical today date — YYYY-MM-DD, injected by caller */
  todayDateOnly: string;
  /** Override for testing — YYYY-MM-DD HH:MM format */
  nowLocal?: string;
}

// ============================================================================
// HELPERS (string-based, no Date())
// ============================================================================

/**
 * Build a local "YYYY-MM-DDTHH:mm" string for parking comparison.
 * nowLocal MUST be provided by caller — no internal clock access.
 */
function getLocalNowNorm(nowLocal: string): string {
  // Normalize: "YYYY-MM-DD HH:MM" → "YYYY-MM-DDTHH:MM"
  const norm = nowLocal.length >= 16 && nowLocal[10] === ' '
    ? nowLocal.substring(0, 10) + 'T' + nowLocal.substring(11, 16)
    : nowLocal.substring(0, 16);
  return norm;
}

/**
 * Format HH:MM (24h) to 12h display string. Pure string ops.
 */
function formatTime12h(time: string): string {
  const h = parseInt(time.substring(0, 2));
  const m = time.substring(3, 5);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

/**
 * Subtract minutes from HH:MM string. Integer math only.
 */
function subtractMinutes(time: string, minutes: number): string {
  const h = parseInt(time.substring(0, 2));
  const m = parseInt(time.substring(3, 5));
  let totalMins = h * 60 + m - minutes;
  if (totalMins < 0) totalMins = 0;
  const newH = Math.floor(totalMins / 60);
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// ============================================================================
// SIGNAL RESOLVERS (each returns DriveSignal[] — rules live ONLY here)
// ============================================================================

/**
 * PARKING_EXPIRING_SOON: Emitted when any parking record is active AND
 * expires within 60 minutes of now. Severity escalates at 15 min.
 *
 * Uses canonical parking window (string comparison, no Date()).
 */
function resolveParkingExpiringSignals(
  parkingList: Parking[],
  nowNorm: string,
  todayDate: string,
): DriveSignal[] {
  const signals: DriveSignal[] = [];

  for (const parking of parkingList) {
    const window = getParkingWindowMs(parking);
    if (!window) continue;

    // Is parking currently active?
    if (nowNorm < window.startNorm || nowNorm >= window.endNorm) continue;

    // Calculate minutes until expiry using canonical timeToMinutes
    const nowTimeStr = nowNorm.substring(11, 16);
    const endTimeStr = window.endNorm.substring(11, 16);
    const nowMins = timeToMinutes(nowTimeStr);
    const endMins = timeToMinutes(endTimeStr);

    // Only compare within same day (parking window already validated)
    const nowDate = nowNorm.substring(0, 10);
    const endDate = window.endNorm.substring(0, 10);

    if (nowMins == null || endMins == null) continue;
    if (nowDate !== endDate) {
      if (endDate > nowDate) continue; // Expires on a future day — not "soon"
      continue;
    }

    const minutesUntilExpiry = endMins - nowMins;

    if (minutesUntilExpiry <= 0 || minutesUntilExpiry > 60) continue;

    const severity: DriveSignalSeverity = minutesUntilExpiry <= 15 ? 'critical' : 'warning';
    const displayEndTimeStr = window.endNorm.substring(11, 16);

    signals.push({
      id: `drive-parking-expiring-${parking.id}`,
      type: 'PARKING_EXPIRING_SOON',
      severity,
      title: minutesUntilExpiry <= 15
        ? `Parking Expiring NOW`
        : `Parking Expiring Soon`,
      message: `${parking.label} expires in ${minutesUntilExpiry} min${parking.level_section_space ? ` (${parking.level_section_space})` : ''}`,
      actionLabel: parking.address ? 'Navigate' : undefined,
      actionTarget: { tab: 'parking', recordId: parking.id },
      related: { parkingId: parking.id },
      effectiveDate: todayDate,
      effectiveTime: formatTime12h(displayEndTimeStr),
    });
  }

  return signals;
}

/**
 * WEATHER_ROUTE_RISK: Emitted when today's weather at destination indicates
 * driving hazards (rain, snow, ice, sleet). Only fires if weather context
 * is already available (no new fetching).
 */
function resolveWeatherRouteRiskSignals(
  weatherContext: DriveEngineWeatherContext | undefined,
  todayDate: string,
  hasDriveSegmentToday: boolean,
): DriveSignal[] {
  if (!weatherContext || !hasDriveSegmentToday) return [];

  const hazardConditions: WeatherCondition[] = ['rain', 'snow', 'ice', 'sleet'];
  const condition = weatherContext.todayCondition;
  const precip = weatherContext.todayPrecipChance;

  if (!condition) return [];

  const isHazard = hazardConditions.includes(condition);
  const highPrecip = precip != null && precip >= 50;

  if (!isHazard && !highPrecip) return [];

  const conditionLabel = condition === 'ice' ? 'icy conditions'
    : condition === 'sleet' ? 'sleet'
    : condition === 'snow' ? 'snow'
    : 'rain';

  return [{
    id: `drive-weather-risk-${todayDate}`,
    type: 'WEATHER_ROUTE_RISK',
    severity: (condition === 'ice' || condition === 'snow') ? 'critical' : 'warning',
    title: 'Weather Route Risk',
    message: `${conditionLabel.charAt(0).toUpperCase() + conditionLabel.slice(1)} expected today${precip != null ? ` (${precip}% chance)` : ''}. Drive with caution.`,
    actionTarget: { tab: 'alerts' },
    effectiveDate: todayDate,
    effectiveTime: null,
  }];
}

/**
 * TOLL_ACK_REQUIRED / TOLL_REMINDER_TODAY: Emitted based on bookings with
 * toll-relevant transport segments. Currently, toll data is not stored in the
 * schema, so these signals are structurally defined but will only fire when
 * toll data becomes available in existing fields.
 *
 * Placeholder resolver — returns empty until toll data exists in bookings.
 */
function resolveTollSignals(
  _bookings: Booking[],
  _todayDate: string,
): DriveSignal[] {
  // Toll data is not yet stored in the booking schema.
  // When toll fields are added, this resolver will produce signals.
  return [];
}

/**
 * ROAD_CLOSURE_RISK / DRIVE_REROUTE_SUGGESTION: Emitted based on external
 * route intelligence. Currently, no external route API is integrated.
 *
 * Placeholder resolver — returns empty until route data source exists.
 */
function resolveRouteSignals(
  _bookings: Booking[],
  _timelineEvents: CanonicalTimelineEvent[],
  _todayDate: string,
): DriveSignal[] {
  // External route intelligence API not yet integrated.
  // When available, this resolver will produce closure/reroute signals.
  return [];
}

// ============================================================================
// MAIN ENGINE (pure, deterministic)
// ============================================================================

/**
 * Compute all drive-related signals from stored data.
 * Called once per render cycle — all surfaces consume the output.
 *
 * DETERMINISTIC: Same inputs → same output.
 * NO TIMEZONE MATH: String comparisons only.
 */
export function computeDriveSignals(input: DriveEngineInput): DriveSignal[] {
  const todayDate = input.todayDateOnly;
  // nowLocal is required for time-based parking comparisons; fall back to todayDate + midnight
  const nowNorm = getLocalNowNorm(input.nowLocal ?? (todayDate + ' 00:00'));

  // Detect if there's a drive-relevant segment today (rental, transport, flight)
  const hasDriveSegmentToday = input.bookings.some(b => {
    const bookingDate = b.start_datetime.substring(0, 10);
    const endDate = b.end_datetime?.substring(0, 10);
    return (
      (b.booking_type === 'car_rental' || b.booking_type === 'transport') &&
      (bookingDate <= todayDate && (endDate ? endDate >= todayDate : bookingDate === todayDate))
    );
  });

  // Collect signals from all resolvers
  const signals: DriveSignal[] = [
    ...resolveParkingExpiringSignals(input.parkingList, nowNorm, todayDate),
    ...resolveWeatherRouteRiskSignals(input.weatherContext, todayDate, hasDriveSegmentToday),
    ...resolveTollSignals(input.bookings, todayDate),
    ...resolveRouteSignals(input.bookings, input.canonicalTimelineEvents, todayDate),
  ];

  // Sort by severity: critical → warning → info (stable within each group)
  const SEVERITY_ORDER: Record<DriveSignalSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  signals.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return signals;
}

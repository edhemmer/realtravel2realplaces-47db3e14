/**
 * v4.0.0: Drive Intelligence Helper — Canonical Logic Module
 *
 * Pure, typesafe functions for drive-mode intelligence.
 * Consumes canonical trip state, weather, parking, and vehicle profile.
 * NO React, NO UI, NO external HTTP calls, NO Date() parsing of stored strings.
 *
 * Future "Drive Mode" views and CarPlay integrations will call this module.
 */

import type {
  CanonicalTripState,
  CanonicalTimelineEvent,
} from './canonicalTripState';
import type { WeatherSnapshot } from './canonicalWeather';
import type { Parking } from '@/types/database';
import { getParkingWindowMs } from './canonicalParkingHighlight';
import { timeToMinutes } from './timeOnly';

// ============================================================================
// TYPES
// ============================================================================

/**
 * A drive-relevant leg in the canonical timeline.
 */
export interface DriveSegment {
  /** Unique segment id (derived from source event id) */
  id: string;
  /** What kind of drive this represents */
  kind:
    | 'DRIVE_TRIP'
    | 'DRIVE_TO_AIRPORT'
    | 'DRIVE_TO_STAY'
    | 'DRIVE_BETWEEN_STOPS'
    | 'DRIVE_RENTAL';
  /** Display label */
  label: string;
  /** Canonical timeline event backing this segment */
  sourceEvent: CanonicalTimelineEvent;
  /** YYYY-MM-DD of the segment */
  dateStr: string;
  /** HH:MM local time (null if untimed) */
  timeStr: string | null;
  /** Sort key for ordering: "YYYY-MM-DD HH:MM" */
  sortKey: string;
}

/**
 * A navigation target for a drive segment.
 */
export interface DriveNavigationTarget {
  /** Display label (e.g., "Downtown Denver Stay") */
  label: string;
  /** Full address if available, otherwise city/state fallback */
  addressString: string;
  /** Latitude (pass-through from canonical; undefined if not available) */
  lat?: number;
  /** Longitude (pass-through from canonical; undefined if not available) */
  lng?: number;
}

/**
 * A driver alert (toll, fuel, weather, traffic, parking).
 */
export type DriveAlertType = 'TOLL' | 'FUEL' | 'WEATHER' | 'TRAFFIC' | 'PARKING';
export type DriveAlertSeverity = 'info' | 'warning' | 'critical';

export interface DriveAlert {
  type: DriveAlertType;
  severity: DriveAlertSeverity;
  message: string;
}

/**
 * Fuel status for a segment.
 */
export type FuelStatus = 'OK_FOR_SEGMENT' | 'REFUEL_RECOMMENDED' | 'UNKNOWN';

export interface FuelProjection {
  fuelStatus: FuelStatus;
  message: string;
}

/**
 * Weather risk for a drive segment.
 */
export interface WeatherRisk {
  hasRisk: boolean;
  severity: DriveAlertSeverity;
  message: string;
}

/**
 * Parking status summary.
 */
export type ParkingStatusEnum = 'NONE' | 'ACTIVE' | 'NEAR_EXPIRY';

export interface ParkingStatus {
  status: ParkingStatusEnum;
  remainingMinutes: number | null;
  expiryTimestamp: string | null;
}

/**
 * A lightweight route preview.
 */
export interface RoutePreview {
  distanceMiles: number | null;
  durationMinutes: number | null;
  waypoints: string[];
}

/**
 * Toll status for a segment.
 */
export interface TollStatus {
  hasTolls: boolean;
  supportedByUserTransponder: boolean | null;
  message: string;
}

/**
 * User vehicle profile (optional).
 */
export interface UserVehicleProfile {
  /** Estimated miles per tank */
  avgMilesPerTank?: number | null;
  /** Tank size in gallons */
  tankSizeGallons?: number | null;
}

/**
 * User transponder info.
 */
export interface UserTransponders {
  /** E.g., ['E-ZPass', 'SunPass'] */
  names: string[];
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

const DRIVE_RELEVANT_EVENT_TYPES = new Set([
  'flight',
  'flight_departure',
  'hotel_checkin',
  'hotel_checkout',
  'rental_pickup',
  'rental_dropoff',
  'activity_start',
  'transport_departure',
]);

function extractDate(eventLocalDateTime?: string): string | null {
  if (!eventLocalDateTime) return null;
  const d = eventLocalDateTime.substring(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function extractTime(eventLocalDateTime?: string): string | null {
  if (!eventLocalDateTime) return null;
  const sp = eventLocalDateTime.match(/^\d{4}-\d{2}-\d{2}[\sT](\d{2}:\d{2})/);
  return sp ? sp[1] : null;
}

function segmentKind(event: CanonicalTimelineEvent): DriveSegment['kind'] {
  switch (event.eventType) {
    case 'flight':
    case 'flight_departure':
      return 'DRIVE_TO_AIRPORT';
    case 'hotel_checkin':
    case 'hotel_checkout':
      return 'DRIVE_TO_STAY';
    case 'rental_pickup':
    case 'rental_dropoff':
      return 'DRIVE_RENTAL';
    case 'activity_start':
    case 'transport_departure':
      return 'DRIVE_BETWEEN_STOPS';
    default:
      return 'DRIVE_TRIP';
  }
}

function segmentLabel(event: CanonicalTimelineEvent): string {
  if (event.title) return event.title;
  if (event.eventType === 'flight' || event.eventType === 'flight_departure') {
    const codes = [event.departureAirportCode, event.arrivalAirportCode].filter(Boolean).join(' → ');
    return codes || 'Flight';
  }
  return event.subtitle || 'Drive';
}

function buildSortKey(dateStr: string, timeStr: string | null): string {
  return `${dateStr} ${timeStr ?? '99:99'}`;
}

/** Build local now string: "YYYY-MM-DD HH:MM" */
function localNowString(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

function buildDriveSegments(events: CanonicalTimelineEvent[]): DriveSegment[] {
  const segments: DriveSegment[] = [];
  for (const ev of events) {
    if (!DRIVE_RELEVANT_EVENT_TYPES.has(ev.eventType)) continue;
    const dateStr = extractDate(ev.eventLocalDateTime);
    if (!dateStr) continue;
    const timeStr = extractTime(ev.eventLocalDateTime);
    segments.push({
      id: `drive-seg-${ev.id}`,
      kind: segmentKind(ev),
      label: segmentLabel(ev),
      sourceEvent: ev,
      dateStr,
      timeStr,
      sortKey: buildSortKey(dateStr, timeStr),
    });
  }
  segments.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return segments;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Determine the current or next drive-relevant segment.
 * Returns null if no drive segment is relevant.
 */
export function getActiveDriveSegment(
  tripState: CanonicalTripState | null,
  now: Date,
  _deviceLocation?: { lat: number; lng: number } | null,
): DriveSegment | null {
  if (!tripState) return null;
  const segments = buildDriveSegments(tripState.timelineEvents);
  if (segments.length === 0) return null;

  const nowStr = localNowString(now);

  // Find first future or current-day segment
  for (const seg of segments) {
    if (seg.sortKey >= nowStr) return seg;
  }

  // All past — return the most recent one
  return segments[segments.length - 1];
}

/**
 * For the given segment, return a navigation target using full address when available.
 */
export function getNavigationTarget(
  tripState: CanonicalTripState | null,
  activeSegment: DriveSegment | null,
): DriveNavigationTarget | null {
  if (!tripState || !activeSegment) return null;

  const ev = activeSegment.sourceEvent;

  // Prefer full address
  if (ev.address && ev.address.trim().length > 0) {
    return {
      label: activeSegment.label,
      addressString: ev.address.trim(),
    };
  }

  // Fallback to trip destination city/state
  const trip = tripState.trip;
  const cityState = [trip.destination_city, trip.destination_state, trip.destination_country]
    .filter(Boolean)
    .join(', ');

  if (!cityState) return null;

  return {
    label: activeSegment.label,
    addressString: cityState,
  };
}

/**
 * Return a lightweight route preview structure.
 * Uses trip estimated_miles when available; no external API calls.
 */
export function getRoutePreview(
  tripState: CanonicalTripState | null,
  _activeSegment: DriveSegment | null,
): RoutePreview {
  const empty: RoutePreview = { distanceMiles: null, durationMinutes: null, waypoints: [] };
  if (!tripState) return empty;

  const miles = tripState.trip.estimated_miles ?? null;
  // Rough estimate: 60 mph average
  const duration = miles != null ? Math.round(miles / 60 * 60) : null;

  const waypoints: string[] = [];
  if (tripState.trip.destination_city) {
    waypoints.push(tripState.trip.destination_city);
  }

  return {
    distanceMiles: miles,
    durationMinutes: duration,
    waypoints,
  };
}

/**
 * Determine toll status for a segment.
 * Currently, no live toll data is available; returns conservative defaults.
 */
export function getTollStatus(
  _tripState: CanonicalTripState | null,
  _activeSegment: DriveSegment | null,
  userTransponders?: UserTransponders,
): TollStatus {
  // No toll data available yet — conservative unknown
  const hasTransponders = userTransponders && userTransponders.names.length > 0;

  return {
    hasTolls: false,
    supportedByUserTransponder: hasTransponders ? null : null,
    message: 'Toll information not yet available for this route.',
  };
}

/**
 * Compute fuel projection for a drive segment.
 */
export function getFuelProjection(
  tripState: CanonicalTripState | null,
  _activeSegment: DriveSegment | null,
  userVehicleProfile?: UserVehicleProfile,
): FuelProjection {
  if (!tripState) {
    return { fuelStatus: 'UNKNOWN', message: 'No trip data available.' };
  }

  const miles = tripState.trip.estimated_miles;
  const range = userVehicleProfile?.avgMilesPerTank;

  if (!miles || !range || range <= 0) {
    return { fuelStatus: 'UNKNOWN', message: 'Set your vehicle range in Account for fuel estimates.' };
  }

  const RESERVE = 50;
  const usable = range - RESERVE;

  if (usable <= 0) {
    return { fuelStatus: 'UNKNOWN', message: 'Vehicle range too low for fuel estimation.' };
  }

  if (miles <= usable) {
    return {
      fuelStatus: 'OK_FOR_SEGMENT',
      message: `${miles} mi trip is within your ${range} mi tank range (${RESERVE} mi reserve).`,
    };
  }

  const stops = Math.ceil(miles / usable) - 1;
  return {
    fuelStatus: 'REFUEL_RECOMMENDED',
    message: `${miles} mi trip exceeds single-tank range. ~${stops} fuel stop${stops > 1 ? 's' : ''} recommended.`,
  };
}

/**
 * Identify weather risk for a drive segment's date window.
 */
export function getWeatherRisk(
  tripState: CanonicalTripState | null,
  activeSegment: DriveSegment | null,
  weatherByKey?: Record<string, WeatherSnapshot>,
): WeatherRisk {
  const noRisk: WeatherRisk = { hasRisk: false, severity: 'info', message: '' };
  if (!tripState || !activeSegment || !weatherByKey) return noRisk;

  const dateStr = activeSegment.dateStr;

  // Find any weather snapshot matching this date
  for (const key of Object.keys(weatherByKey)) {
    if (!key.startsWith(`${dateStr}::`)) continue;
    const snap = weatherByKey[key];
    const hazards: Set<string> = new Set(['rain', 'snow', 'ice', 'sleet']);

    if (hazards.has(snap.condition)) {
      const severity: DriveAlertSeverity =
        snap.condition === 'ice' || snap.condition === 'snow' ? 'critical' : 'warning';
      const label =
        snap.condition === 'ice' ? 'Icy conditions'
        : snap.condition === 'snow' ? 'Snow'
        : snap.condition === 'sleet' ? 'Sleet'
        : 'Rain';
      const city = snap.city ? ` near ${snap.city}` : '';
      return {
        hasRisk: true,
        severity,
        message: `${label} expected${city}.`,
      };
    }
  }

  return noRisk;
}

/**
 * Summarize active parking timer for the current trip.
 */
export function getParkingStatus(
  tripState: CanonicalTripState | null,
  nowLocal?: string,
): ParkingStatus {
  const none: ParkingStatus = { status: 'NONE', remainingMinutes: null, expiryTimestamp: null };
  if (!tripState) return none;

  // Find parking from trip bookings via canonical timeline — but we need raw parking records.
  // We look through the trip's canonical items or bookings indirectly.
  // Since we only have tripState here, check for parking timeline events.
  // For precise parking window, we'd need the Parking[] records. We check if any parking event
  // is in the timeline with a parking_end type.
  // However, without raw Parking records we can't compute precise minutes.
  // Return NONE — callers that have Parking[] should use getParkingStatusFromRecords instead.
  return none;
}

/**
 * Compute parking status from raw parking records.
 * nowLocal must be "YYYY-MM-DD HH:MM" or "YYYY-MM-DDTHH:MM" format.
 */
export function getParkingStatusFromRecords(
  parkingList: Parking[],
  nowLocal: string,
): ParkingStatus {
  const none: ParkingStatus = { status: 'NONE', remainingMinutes: null, expiryTimestamp: null };
  if (!parkingList.length) return none;

  // Normalize now
  const nowNorm = nowLocal.length >= 16 && nowLocal[10] === ' '
    ? nowLocal.substring(0, 10) + 'T' + nowLocal.substring(11, 16)
    : nowLocal.substring(0, 16);

  for (const parking of parkingList) {
    const window = getParkingWindowMs(parking);
    if (!window) continue;
    if (nowNorm < window.startNorm || nowNorm >= window.endNorm) continue;

    // Active parking found — compute remaining minutes
    const nowTimeStr = nowNorm.substring(11, 16);
    const endDate = window.endNorm.substring(0, 10);
    const nowDate = nowNorm.substring(0, 10);
    const endTimeStr = window.endNorm.substring(11, 16);

    if (nowDate !== endDate) {
      // Multi-day — just report active
      return { status: 'ACTIVE', remainingMinutes: null, expiryTimestamp: window.endNorm };
    }

    const nowMins = timeToMinutes(nowTimeStr);
    const endMins = timeToMinutes(endTimeStr);

    if (nowMins == null || endMins == null) {
      return { status: 'ACTIVE', remainingMinutes: null, expiryTimestamp: window.endNorm };
    }

    const remaining = endMins - nowMins;
    const status: ParkingStatusEnum = remaining <= 15 ? 'NEAR_EXPIRY' : 'ACTIVE';

    return {
      status,
      remainingMinutes: remaining > 0 ? remaining : 0,
      expiryTimestamp: window.endNorm,
    };
  }

  return none;
}

// ============================================================================
// COMBINED ALERTS
// ============================================================================

const SEVERITY_RANK: Record<DriveAlertSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

const MAX_ALERTS = 3;

/**
 * Combine toll, fuel, weather, parking into an ordered array of up to 3 alerts.
 *
 * Priority: critical weather > parking near expiry > tolls without transponder > fuel.
 */
export function getDriveAlerts(
  tripState: CanonicalTripState | null,
  activeSegment: DriveSegment | null,
  options?: {
    weatherByKey?: Record<string, WeatherSnapshot>;
    userVehicleProfile?: UserVehicleProfile;
    userTransponders?: UserTransponders;
    parkingList?: Parking[];
    nowLocal?: string;
  },
): DriveAlert[] {
  const alerts: DriveAlert[] = [];

  // Weather
  const weather = getWeatherRisk(
    tripState,
    activeSegment,
    options?.weatherByKey,
  );
  if (weather.hasRisk) {
    alerts.push({ type: 'WEATHER', severity: weather.severity, message: weather.message });
  }

  // Parking
  if (options?.parkingList && options.nowLocal) {
    const parking = getParkingStatusFromRecords(options.parkingList, options.nowLocal);
    if (parking.status === 'NEAR_EXPIRY') {
      alerts.push({
        type: 'PARKING',
        severity: 'critical',
        message: `Parking expires in ${parking.remainingMinutes ?? 0} min.`,
      });
    }
  }

  // Tolls
  const toll = getTollStatus(tripState, activeSegment, options?.userTransponders);
  if (toll.hasTolls && !toll.supportedByUserTransponder) {
    alerts.push({
      type: 'TOLL',
      severity: 'warning',
      message: toll.message,
    });
  }

  // Fuel
  const fuel = getFuelProjection(tripState, activeSegment, options?.userVehicleProfile);
  if (fuel.fuelStatus === 'REFUEL_RECOMMENDED') {
    alerts.push({ type: 'FUEL', severity: 'info', message: fuel.message });
  }

  // Sort by severity desc, cap at MAX_ALERTS
  alerts.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  return alerts.slice(0, MAX_ALERTS);
}

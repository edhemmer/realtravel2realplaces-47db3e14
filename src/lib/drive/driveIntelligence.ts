/**
 * v3.8.16: Drive Intelligence — Canonical DrivePlan Producer
 *
 * Single source of truth for drive trip intelligence.
 * Consumes trip data + weather envelope + route provider to produce DrivePlan.
 * All Drive UI surfaces consume DrivePlan only.
 *
 * DETERMINISTIC: Same inputs → same output.
 * No timezone/date math. Dates used as stored.
 */

import type {
  DriveTripCanonical,
  DrivePlan,
  DriveRiskFlag,
  DriveFuelPlan,
  DriveFuelIntelligence,
  FuelStopZone,
  DriveNavigationTarget,
  LocationRef,
  DrivePreferences,
} from '@/types/drive';
import type { WeatherEngineResult } from '@/lib/weatherEngine';
import { getRoute } from './routeProvider';
import { resolveMapsDestination, buildMapsDirectionsUrl } from '@/lib/mapsDestination';

// ============================================================================
// THRESHOLDS (fixed constants — no heuristics)
// ============================================================================

const LONG_DRIVE_THRESHOLD_MINUTES = 240; // 4 hours
const WEATHER_RISK_CONDITIONS = ['rain', 'snow', 'mixed'];
const MAX_RISK_FLAGS = 3;

// v3.11.0: Fuel stop zone constants
const RESERVE_FACTOR = 0.20;
const MIN_FIRST_STOP_MILES = 120;
const FIRST_STOP_RANGE_FACTOR = 0.45;
const AVOID_ARRIVAL_BUFFER_MILES = 30;
const STOP_ZONE_RADIUS_MILES = 5;

// ============================================================================
// RISK FLAG RESOLVERS
// ============================================================================

function resolveTollRisk(routeHasTolls?: boolean): DriveRiskFlag | null {
  // Only flag when route metadata explicitly indicates tolls
  if (routeHasTolls) {
    return { type: 'TOLL_POSSIBLE', label: 'Tolls', severity: 'info' };
  }
  return null;
}

function resolveWeatherRisk(weather: WeatherEngineResult | null): DriveRiskFlag | null {
  if (!weather) return null;

  const { summary } = weather;
  if (
    WEATHER_RISK_CONDITIONS.includes(summary.precipTypeHint) &&
    (summary.hasRain || summary.hasSnow)
  ) {
    const label = summary.hasSnow ? 'Snow risk' : 'Rain expected';
    return { type: 'WEATHER_RISK', label, severity: 'warning' };
  }
  return null;
}

function resolveLongDriveRisk(durationMinutes?: number): DriveRiskFlag | null {
  if (durationMinutes != null && durationMinutes >= LONG_DRIVE_THRESHOLD_MINUTES) {
    const hours = Math.round(durationMinutes / 60);
    return { type: 'LONG_DRIVE', label: `${hours}h+ drive`, severity: 'info' };
  }
  return null;
}

// ============================================================================
// FUEL PLAN
// ============================================================================

function computeFuelPlan(
  distanceMiles: number | undefined,
  preferences?: DrivePreferences,
): DriveFuelPlan | null {
  if (!preferences?.vehicleRangeMiles || !distanceMiles) return null;

  const range = preferences.vehicleRangeMiles;
  if (distanceMiles <= range * 0.8) {
    // No stops needed — within safe range
    return {
      estimatedStops: 0,
      spacingMiles: 0,
      tripMiles: distanceMiles,
      vehicleRangeMiles: range,
    };
  }

  // Fuel up every 80% of range (safety margin)
  const safeRange = Math.round(range * 0.8);
  const stops = Math.ceil(distanceMiles / safeRange) - 1;
  const spacing = stops > 0 ? Math.round(distanceMiles / (stops + 1)) : 0;

  return {
    estimatedStops: stops,
    spacingMiles: spacing,
    tripMiles: distanceMiles,
    vehicleRangeMiles: range,
  };
}

// ============================================================================
// v3.11.0: FUEL STOP ZONE COMPUTATION
// ============================================================================

/**
 * Interpolate a lat/lng along a straight line between origin and destination
 * at a given fraction (0..1). Returns null if coords are unavailable.
 */
function interpolateLatLng(
  origin: LocationRef | undefined,
  destination: LocationRef,
  fraction: number,
): { lat: number; lng: number } | null {
  const oLat = origin?.lat;
  const oLng = origin?.lng;
  const dLat = destination.lat;
  const dLng = destination.lng;
  if (oLat == null || oLng == null || dLat == null || dLng == null) return null;
  return {
    lat: oLat + (dLat - oLat) * fraction,
    lng: oLng + (dLng - oLng) * fraction,
  };
}

/**
 * Compute fuel stop zones along a route.
 * Returns zones (areas, not specific stations) with mile markers and approximate coordinates.
 */
function computeFuelStopZones(
  totalDistanceMiles: number,
  rangeMiles: number,
  safeRangeMiles: number,
  origin: LocationRef | undefined,
  destination: LocationRef,
): FuelStopZone[] {
  // No stops needed if within safe range
  if (totalDistanceMiles <= safeRangeMiles) return [];

  const firstStopAt = Math.max(MIN_FIRST_STOP_MILES, Math.floor(rangeMiles * FIRST_STOP_RANGE_FACTOR));
  const repeatEvery = firstStopAt;
  const arrivalCutoff = totalDistanceMiles - AVOID_ARRIVAL_BUFFER_MILES;

  // Generate mile markers
  const markers: number[] = [];
  let marker = firstStopAt;
  while (marker < arrivalCutoff) {
    markers.push(marker);
    marker += repeatEvery;
  }

  // Ensure last segment doesn't exceed safe range
  const lastMarker = markers.length > 0 ? markers[markers.length - 1] : 0;
  if ((totalDistanceMiles - lastMarker) > safeRangeMiles && lastMarker < arrivalCutoff) {
    // Insert an additional marker
    const additional = totalDistanceMiles - safeRangeMiles;
    if (additional > lastMarker && additional < arrivalCutoff) {
      markers.push(Math.round(additional));
    }
  }

  // Deduplicate and sort
  const uniqueMarkers = [...new Set(markers)].sort((a, b) => a - b);

  return uniqueMarkers.map((m, i) => ({
    id: `fuel-zone-${i}`,
    mileMarker: m,
    targetLatLng: interpolateLatLng(origin, destination, m / totalDistanceMiles),
    radiusMiles: STOP_ZONE_RADIUS_MILES,
  }));
}

// ============================================================================
// WEATHER LINE
// ============================================================================

function resolveWeatherLine(weather: WeatherEngineResult | null): string | null {
  if (!weather) return null;

  const { summary, weatherMode } = weather;
  const confidence = weatherMode === 'FORECAST_PRIMARY' ? '' : ' (typical)';

  if (summary.hasSnow) return `Possible snow${confidence}`;
  if (summary.hasRain) return `Likely rain${confidence}`;
  if (summary.windHint === 'windy') return `Windy${confidence}`;
  return `Clear${confidence}`;
}

// ============================================================================
// NAVIGATION TARGETS
// ============================================================================

function buildNavigationTargets(canonical: DriveTripCanonical): DriveNavigationTarget[] {
  const targets: DriveNavigationTarget[] = [];

  // Primary: destination only (never confirmation numbers or arbitrary strings)
  const dest = canonical.destination;
  const mapsDest = resolveMapsDestination({
    address: dest.type === 'ADDRESS' ? dest.value : undefined,
    locationLabel: dest.type === 'PLACE' ? dest.value : undefined,
    city: dest.city,
    state: dest.state,
    country: dest.country,
    lat: dest.lat,
    lng: dest.lng,
  });

  if (mapsDest) {
    targets.push({
      label: 'Navigate',
      url: buildMapsDirectionsUrl(mapsDest),
      isPrimary: true,
    });
  }

  return targets;
}

// ============================================================================
// MAIN: BUILD DRIVE PLAN
// ============================================================================

export interface BuildDrivePlanInput {
  canonical: DriveTripCanonical;
  weather: WeatherEngineResult | null;
  /** Whether route metadata indicates tolls */
  routeHasTolls?: boolean;
  /** v3.10.9: Whether user has Pro/Business plan */
  isPro?: boolean;
  /** v3.10.9: User's avg miles per tank (from profile) */
  avgMilesPerTank?: number | null;
}

/**
 * Build a canonical DrivePlan from trip data, weather, and route info.
 * All Drive UI surfaces must consume this output — no per-component logic.
 */
export function buildDrivePlan(input: BuildDrivePlanInput): DrivePlan {
  const { canonical, weather, routeHasTolls, isPro, avgMilesPerTank } = input;

  // Get route summary
  const routeResult = getRoute(
    canonical.origin,
    canonical.destination,
    canonical.departDateText,
  );

  // Build risk flags (deterministic, capped at MAX)
  const riskFlags: DriveRiskFlag[] = [];
  const tollRisk = resolveTollRisk(routeHasTolls);
  if (tollRisk) riskFlags.push(tollRisk);
  const weatherRisk = resolveWeatherRisk(weather);
  if (weatherRisk) riskFlags.push(weatherRisk);
  const longDrive = resolveLongDriveRisk(routeResult.summary?.durationMinutes);
  if (longDrive) riskFlags.push(longDrive);

  // Fuel plan
  const fuelPlan = computeFuelPlan(
    routeResult.summary?.distanceMiles,
    canonical.preferences,
  );

  // Weather line
  const weatherLine = resolveWeatherLine(weather);

  // Navigation targets
  const navigationTargets = buildNavigationTargets(canonical);

  // v3.10.9 + v3.11.0: Fuel intelligence gating + stop zones
  let fuelIntelligence: DriveFuelIntelligence;
  if (!isPro) {
    fuelIntelligence = { enabled: false, reason: 'PLAN_REQUIRED', stopZones: [] };
  } else if (!avgMilesPerTank || avgMilesPerTank <= 0) {
    fuelIntelligence = { enabled: false, reason: 'MISSING_VEHICLE_RANGE', stopZones: [] };
  } else {
    // v3.11.0: Compute stop zones
    const safeRangeMiles = Math.floor(avgMilesPerTank * (1 - RESERVE_FACTOR));
    const totalDistance = routeResult.summary?.distanceMiles;

    if (!totalDistance) {
      fuelIntelligence = {
        enabled: true,
        reason: 'ROUTE_DISTANCE_MISSING',
        rangeMiles: avgMilesPerTank,
        safeRangeMiles,
        stopZones: [],
      };
    } else {
      const stopZones = computeFuelStopZones(
        totalDistance,
        avgMilesPerTank,
        safeRangeMiles,
        canonical.origin,
        canonical.destination,
      );
      fuelIntelligence = {
        enabled: true,
        rangeMiles: avgMilesPerTank,
        safeRangeMiles,
        stopZones,
      };
    }
  }

  // Overall confidence
  const confidence = routeResult.confidence === 'low' && canonical.confidence === 'low'
    ? 'low'
    : routeResult.confidence === 'low' || canonical.confidence === 'low'
      ? 'medium'
      : 'medium'; // 'high' requires real route API

  return {
    routeSummary: routeResult.summary,
    riskFlags: riskFlags.slice(0, MAX_RISK_FLAGS),
    fuelPlan,
    fuelIntelligence,
    weatherLine,
    navigationTargets,
    confidence,
    degradedReason: routeResult.degradedReason,
  };
}

// ============================================================================
// HELPER: Build DriveTripCanonical from Trip row
// ============================================================================

export function tripToDriveCanonical(trip: {
  origin_address?: string | null;
  destination_address?: string | null;
  destination_city: string;
  destination_state?: string | null;
  destination_country: string;
  start_date: string;
  estimated_miles?: number | null;
}): DriveTripCanonical {
  // Resolve origin
  let origin: LocationRef | undefined;
  if (trip.origin_address && trip.origin_address.trim()) {
    origin = {
      type: 'ADDRESS',
      value: trip.origin_address,
    };
  }

  // Resolve destination
  const destination: LocationRef = trip.destination_address?.trim()
    ? {
        type: 'ADDRESS',
        value: trip.destination_address,
        city: trip.destination_city,
        state: trip.destination_state || undefined,
        country: trip.destination_country,
      }
    : {
        type: 'CITY',
        value: null,
        city: trip.destination_city,
        state: trip.destination_state || undefined,
        country: trip.destination_country,
      };

  return {
    origin,
    destination,
    departDateText: trip.start_date,
    confidence: trip.destination_address ? 'medium' : 'low',
  };
}

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
}

/**
 * Build a canonical DrivePlan from trip data, weather, and route info.
 * All Drive UI surfaces must consume this output — no per-component logic.
 */
export function buildDrivePlan(input: BuildDrivePlanInput): DrivePlan {
  const { canonical, weather, routeHasTolls } = input;

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

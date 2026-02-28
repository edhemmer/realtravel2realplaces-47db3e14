/**
 * v3.11.3: Drive Intelligence — Canonical DrivePlan Producer
 *
 * Single source of truth for drive trip intelligence.
 * Consumes trip data + weather envelope + route provider to produce DrivePlan.
 * All Drive UI surfaces consume DrivePlan only.
 *
 * DETERMINISTIC: Same inputs → same output.
 * No timezone/date math. Dates used as stored.
 * No network I/O. No async. Pure logic only.
 */

import type {
  DriveTripCanonical,
  DrivePlan,
  DriveRiskFlag,
  DriveFuelPlan,
  DriveFuelIntelligence,
  DriveSuggestionsEligibility,
  FuelStopZone,
  DriveNavigationTarget,
  LocationRef,
  DrivePreferences,
} from '@/types/drive';
import type { WeatherEngineResult } from '@/lib/weatherEngine';
import { getRoute } from './routeProvider';
import { resolveMapsDestination, buildMapsDirectionsUrl } from '@/lib/mapsDestination';
import { projectMileMarker, hasRouteGeometry, type RouteGeometry } from './routeGeometry';
import { approximateStateName, approximateCityCoords, approximateNearestCity } from './stateGeoLookup';

// ============================================================================
// THRESHOLDS (fixed constants — no heuristics)
// ============================================================================

const LONG_DRIVE_THRESHOLD_MINUTES = 240; // 4 hours
const WEATHER_RISK_CONDITIONS = ['rain', 'snow', 'mixed'];
const MAX_RISK_FLAGS = 3;

// v3.12.1: Fuel stop zone constants — 50-mile reserve buffer per user spec
const RESERVE_BUFFER_MILES = 50;
const AVOID_ARRIVAL_BUFFER_MILES = 50;
const STOP_ZONE_RADIUS_MILES = 10;

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
  const usableRange = range - RESERVE_BUFFER_MILES;
  if (usableRange <= 0) return null;

  if (distanceMiles <= usableRange) {
    return {
      estimatedStops: 0,
      spacingMiles: 0,
      tripMiles: distanceMiles,
      vehicleRangeMiles: range,
    };
  }

  // How many stops needed to keep each leg ≤ usableRange
  const stops = Math.ceil(distanceMiles / usableRange) - 1;
  // Even spacing across all legs
  const spacing = stops > 0 ? Math.round(distanceMiles / (stops + 1)) : 0;

  return {
    estimatedStops: stops,
    spacingMiles: spacing,
    tripMiles: distanceMiles,
    vehicleRangeMiles: range,
  };
}

// ============================================================================
// v3.11.0 + v3.11.1: FUEL STOP ZONE COMPUTATION (Route Geometry Projection)
// ============================================================================

/**
 * Generate a stable zone ID from mile marker and coordinates.
 */
function stableZoneId(mileMarker: number, latLng: { lat: number; lng: number } | null): string {
  if (!latLng) return `fuel-zone-${mileMarker}`;
  const rLat = latLng.lat.toFixed(5);
  const rLng = latLng.lng.toFixed(5);
  return `${mileMarker}-${rLat}-${rLng}`;
}

/**
 * Compute fuel stop zones along a route.
 *
 * Algorithm: Given tank range and 50-mile reserve, the usable range per leg
 * is (range - 50). We place stops at even intervals so no leg exceeds usable range.
 * A "top off" zone is added near the destination if the final leg > 60% of usable range
 * to avoid arriving on fumes.
 */
function computeFuelStopZones(
  totalDistanceMiles: number,
  rangeMiles: number,
  safeRangeMiles: number,
  geometry: RouteGeometry | undefined,
): FuelStopZone[] {
  // No stops needed if within safe range
  if (totalDistanceMiles <= safeRangeMiles) return [];

  // Calculate number of stops needed
  const numStops = Math.ceil(totalDistanceMiles / safeRangeMiles) - 1;
  if (numStops <= 0) return [];

  // Even spacing: divide trip into (numStops + 1) equal legs
  const legLength = Math.round(totalDistanceMiles / (numStops + 1));

  // Generate mile markers at each stop point
  const markers: number[] = [];
  for (let i = 1; i <= numStops; i++) {
    const marker = legLength * i;
    // Don't place stops within 50 miles of destination
    if (marker < totalDistanceMiles - AVOID_ARRIVAL_BUFFER_MILES) {
      markers.push(marker);
    }
  }

  // If the final leg after last marker is > 70% of safe range,
  // add a "top off" zone to avoid arriving on fumes
  const lastMarker = markers.length > 0 ? markers[markers.length - 1] : 0;
  const finalLeg = totalDistanceMiles - lastMarker;
  // Only add top-off if the final leg would leave less than the reserve buffer
  // (i.e., the final leg exceeds usable range — shouldn't happen with even spacing,
  // but catches edge cases from rounding or skipped markers near destination)
  if (finalLeg > safeRangeMiles && lastMarker > 0) {
    const topOff = lastMarker + Math.round(safeRangeMiles * 0.75);
    if (topOff < totalDistanceMiles - 30) {
      markers.push(topOff);
    }
  }

  // Deduplicate and sort
  const uniqueMarkers = [...new Set(markers)].sort((a, b) => a - b);

  // Project each marker onto route geometry and resolve area labels
  return uniqueMarkers.map((m, idx) => {
    const latLng = geometry ? projectMileMarker(geometry, m) : null;
    let areaLabel: string | undefined;
    if (latLng) {
      const cityLabel = approximateNearestCity(latLng.lat, latLng.lng);
      if (cityLabel) {
        areaLabel = cityLabel;
      } else {
        const state = approximateStateName(latLng.lat, latLng.lng);
        if (state) areaLabel = `${state} area`;
      }
    }
    const isTopOff = idx === uniqueMarkers.length - 1 && uniqueMarkers.length > numStops;
    return {
      id: stableZoneId(m, latLng),
      mileMarker: m,
      targetLatLng: latLng,
      radiusMiles: STOP_ZONE_RADIUS_MILES,
      areaLabel: isTopOff && areaLabel ? `top off ${areaLabel}` : areaLabel,
    };
  });
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

  // Merge vehicle range into preferences for fuel plan computation
  const effectivePreferences: DrivePreferences = {
    ...canonical.preferences,
    ...(avgMilesPerTank && avgMilesPerTank > 0 ? { vehicleRangeMiles: avgMilesPerTank } : {}),
  };

  // Get route summary
  const routeResult = getRoute(
    canonical.origin,
    canonical.destination,
    canonical.departDateText,
  );

  // Use estimated_miles from trip as fallback when route provider can't compute
  const effectiveDistanceMiles = routeResult.summary?.distanceMiles ?? canonical.estimatedMiles ?? undefined;

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
    effectiveDistanceMiles,
    effectivePreferences,
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
    const safeRangeMiles = avgMilesPerTank - RESERVE_BUFFER_MILES;
    const totalDistance = effectiveDistanceMiles;

    if (!totalDistance) {
      fuelIntelligence = {
        enabled: true,
        reason: 'ROUTE_DISTANCE_MISSING',
        rangeMiles: avgMilesPerTank,
        safeRangeMiles,
        stopZones: [],
      };
    } else {
      // v3.11.1: Build route geometry for projection
      const routeGeo: RouteGeometry = {
        steps: routeResult.summary?.steps,
        polyline: routeResult.summary?.polyline,
        origin: canonical.origin?.lat != null && canonical.origin?.lng != null
          ? { lat: canonical.origin.lat, lng: canonical.origin.lng }
          : undefined,
      };

      // Check if real geometry is available
      let geoAvailable = hasRouteGeometry(routeGeo);

      // Fallback: use linear interpolation between origin and destination coords
      if (!geoAvailable) {
        const oLat = canonical.origin?.lat;
        const oLng = canonical.origin?.lng;
        const dLat = canonical.destination.lat;
        const dLng = canonical.destination.lng;
        if (oLat != null && oLng != null && dLat != null && dLng != null) {
          routeGeo.polyline = [
            { lat: oLat, lng: oLng },
            { lat: dLat, lng: dLng },
          ];
          geoAvailable = true;
        }
      }

      const stopZones = computeFuelStopZones(
        totalDistance,
        avgMilesPerTank,
        safeRangeMiles,
        geoAvailable ? routeGeo : undefined,
      );

      fuelIntelligence = {
        enabled: true,
        rangeMiles: avgMilesPerTank,
        safeRangeMiles,
        stopZones,
        ...((!geoAvailable && stopZones.length > 0) ? { reason: 'ROUTE_GEOMETRY_MISSING' as const } : {}),
      };
    }
  }

  // v3.11.3: Suggestions eligibility (pure logic, no I/O)
  let suggestions: DriveSuggestionsEligibility;
  if (!isPro) {
    suggestions = { eligible: false, reason: 'PLAN_REQUIRED' };
  } else if (!avgMilesPerTank || avgMilesPerTank <= 0) {
    suggestions = { eligible: false, reason: 'MISSING_VEHICLE_RANGE' };
  } else {
    // Find first stop zone with coordinates
    const firstZoneWithCoords = fuelIntelligence.stopZones.find(z => z.targetLatLng !== null);
    if (firstZoneWithCoords?.targetLatLng) {
      suggestions = {
        eligible: true,
        nextWindowCenter: firstZoneWithCoords.targetLatLng,
      };
    } else {
      suggestions = { eligible: false, reason: 'WINDOW_COORDS_MISSING' };
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
    suggestions,
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
  // Resolve origin with approximate coordinates
  let origin: LocationRef | undefined;
  if (trip.origin_address && trip.origin_address.trim()) {
    // Try to resolve coords from the address (city extraction is approximate)
    const originCoords = approximateCityCoords(trip.origin_address);
    origin = {
      type: 'ADDRESS',
      value: trip.origin_address,
      ...(originCoords ? { lat: originCoords.lat, lng: originCoords.lng } : {}),
    };
  }

  // Resolve destination with approximate coordinates
  const destCoords = approximateCityCoords(trip.destination_city, trip.destination_state);
  const destination: LocationRef = trip.destination_address?.trim()
    ? {
        type: 'ADDRESS',
        value: trip.destination_address,
        city: trip.destination_city,
        state: trip.destination_state || undefined,
        country: trip.destination_country,
        ...(destCoords ? { lat: destCoords.lat, lng: destCoords.lng } : {}),
      }
    : {
        type: 'CITY',
        value: null,
        city: trip.destination_city,
        state: trip.destination_state || undefined,
        country: trip.destination_country,
        ...(destCoords ? { lat: destCoords.lat, lng: destCoords.lng } : {}),
      };

  return {
    origin,
    destination,
    departDateText: trip.start_date,
    estimatedMiles: trip.estimated_miles ?? undefined,
    confidence: trip.destination_address ? 'medium' : 'low',
  };
}

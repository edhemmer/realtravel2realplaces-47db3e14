/**
 * v3.11.1: Route Geometry Projection
 *
 * Projects a mile marker onto actual route geometry (steps or polyline).
 * Returns an accurate lat/lng on the route at the given distance.
 *
 * Supports two geometry sources:
 *   1. Steps (preferred) — each step has distanceMiles + end coordinate
 *   2. Polyline (fallback) — array of lat/lng points, distances computed via haversine
 */

import type { RoutePolylinePoint, RouteStep } from '@/types/drive';

// ============================================================================
// CONSTANTS
// ============================================================================

const EARTH_RADIUS_MI = 3959;

// ============================================================================
// HAVERSINE (internal, for polyline segment distances)
// ============================================================================

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistanceMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MI * c;
}

// ============================================================================
// LINEAR INTERPOLATION BETWEEN TWO POINTS
// ============================================================================

function interpolate(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  fraction: number,
): { lat: number; lng: number } {
  return {
    lat: lat1 + (lat2 - lat1) * fraction,
    lng: lng1 + (lng2 - lng1) * fraction,
  };
}

// ============================================================================
// PROJECT VIA STEPS (preferred)
// ============================================================================

function projectOntoSteps(
  steps: RouteStep[],
  mileMarker: number,
  origin?: { lat: number; lng: number },
): { lat: number; lng: number } | null {
  if (steps.length === 0) return null;

  let cumulative = 0;
  // Derive start coordinates: first step start is origin, subsequent from previous end
  let prevLat = steps[0].startLat ?? origin?.lat;
  let prevLng = steps[0].startLng ?? origin?.lng;

  for (const step of steps) {
    const startLat = prevLat ?? step.endLat;
    const startLng = prevLng ?? step.endLng;
    const nextCum = cumulative + step.distanceMiles;

    if (nextCum >= mileMarker) {
      // Mile marker falls within this step
      const remaining = mileMarker - cumulative;
      const fraction = step.distanceMiles > 0 ? remaining / step.distanceMiles : 0;
      return interpolate(startLat, startLng, step.endLat, step.endLng, Math.min(fraction, 1));
    }

    cumulative = nextCum;
    prevLat = step.endLat;
    prevLng = step.endLng;
  }

  // Mile marker exceeds total step distance — return last point
  const last = steps[steps.length - 1];
  return { lat: last.endLat, lng: last.endLng };
}

// ============================================================================
// PROJECT VIA POLYLINE (fallback)
// ============================================================================

function projectOntoPolyline(
  points: RoutePolylinePoint[],
  mileMarker: number,
): { lat: number; lng: number } | null {
  if (points.length < 2) return null;

  let cumulative = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const segDist = haversineDistanceMi(prev.lat, prev.lng, curr.lat, curr.lng);
    const nextCum = cumulative + segDist;

    if (nextCum >= mileMarker) {
      const remaining = mileMarker - cumulative;
      const fraction = segDist > 0 ? remaining / segDist : 0;
      return interpolate(prev.lat, prev.lng, curr.lat, curr.lng, Math.min(fraction, 1));
    }

    cumulative = nextCum;
  }

  // Past end — return last point
  const last = points[points.length - 1];
  return { lat: last.lat, lng: last.lng };
}

// ============================================================================
// PUBLIC API
// ============================================================================

export interface RouteGeometry {
  steps?: RouteStep[];
  polyline?: RoutePolylinePoint[];
  origin?: { lat: number; lng: number };
}

/**
 * Check whether usable route geometry exists.
 */
export function hasRouteGeometry(geo: RouteGeometry | undefined): boolean {
  if (!geo) return false;
  if (geo.steps && geo.steps.length > 0) return true;
  if (geo.polyline && geo.polyline.length >= 2) return true;
  return false;
}

/**
 * Project a mile marker onto route geometry.
 * Returns null if geometry is insufficient.
 */
export function projectMileMarker(
  geo: RouteGeometry,
  mileMarker: number,
): { lat: number; lng: number } | null {
  // Prefer steps
  if (geo.steps && geo.steps.length > 0) {
    return projectOntoSteps(geo.steps, mileMarker, geo.origin);
  }
  // Fallback to polyline
  if (geo.polyline && geo.polyline.length >= 2) {
    return projectOntoPolyline(geo.polyline, mileMarker);
  }
  return null;
}

/**
 * v3.8.16: Canonical Drive Types
 *
 * Single canonical models for drive trip intelligence.
 * All Drive UI surfaces consume DrivePlan only.
 */

// ============================================================================
// LOCATION REFERENCE
// ============================================================================

export type LocationRefType = 'ADDRESS' | 'PLACE' | 'CURRENT_LOCATION' | 'CITY';

export interface LocationRef {
  type: LocationRefType;
  /** Full address or place name */
  value: string | null;
  /** City name (for fallback/display) */
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

// ============================================================================
// DRIVE TRIP CANONICAL
// ============================================================================

export interface DriveTripCanonical {
  origin?: LocationRef;
  destination: LocationRef;
  /** Date as stored (YYYY-MM-DD) — no conversion */
  departDateText: string;
  /** Time as entered by user — optional */
  departTimeText?: string;
  /** Waypoints (future) */
  waypoints?: LocationRef[];
  /** User preferences (future — vehicle profile, avoid tolls, etc.) */
  preferences?: DrivePreferences;
  /** Confidence in the data */
  confidence: 'high' | 'medium' | 'low';
}

export interface DrivePreferences {
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  /** Vehicle range in miles (if vehicle profile exists) */
  vehicleRangeMiles?: number;
  /** Average MPG (if vehicle profile exists) */
  vehicleMpg?: number;
}

// ============================================================================
// DRIVE PLAN (single output consumed by all UI)
// ============================================================================

export interface DrivePlan {
  /** Route summary */
  routeSummary: DriveRouteSummary | null;
  /** Risk flags (max 3) */
  riskFlags: DriveRiskFlag[];
  /** Fuel plan (only when vehicle profile exists) */
  fuelPlan: DriveFuelPlan | null;
  /** v3.10.9: Fuel intelligence gating */
  fuelIntelligence: DriveFuelIntelligence;
  /** v3.11.3: Suggestions eligibility */
  suggestions: DriveSuggestionsEligibility;
  /** Weather on route (from canonical WeatherEngine) */
  weatherLine: string | null;
  /** Navigation targets */
  navigationTargets: DriveNavigationTarget[];
  /** Overall confidence */
  confidence: 'high' | 'medium' | 'low';
  /** Reason for low confidence (if applicable) */
  degradedReason?: string;
}

/** v3.11.3: Suggestions eligibility (canonical — no network I/O) */
export interface DriveSuggestionsEligibility {
  eligible: boolean;
  reason?: 'PLAN_REQUIRED' | 'MISSING_VEHICLE_RANGE' | 'WINDOW_COORDS_MISSING';
  /** Center of the next fuel window (first stop zone with coords) */
  nextWindowCenter?: { lat: number; lng: number };
}

/** v3.10.9 + v3.11.0: Fuel intelligence gating and stop zones */
export interface DriveFuelIntelligence {
  enabled: boolean;
  reason?: 'PLAN_REQUIRED' | 'MISSING_VEHICLE_RANGE' | 'ROUTE_DISTANCE_MISSING' | 'ROUTE_GEOMETRY_MISSING';
  /** v3.11.0: Range parameters (only when enabled) */
  rangeMiles?: number;
  safeRangeMiles?: number;
  /** v3.11.0: Suggested fuel stop zones along the route */
  stopZones: FuelStopZone[];
}

/** v3.11.0: A suggested fuel stop area along the route */
export interface FuelStopZone {
  id: string;
  /** Mile marker along the route */
  mileMarker: number;
  /** Approximate lat/lng on the route at this distance */
  targetLatLng: { lat: number; lng: number } | null;
  /** Search radius in miles */
  radiusMiles: number;
}

export interface DriveRouteSummary {
  /** Distance in miles */
  distanceMiles: number;
  /** Estimated duration in minutes */
  durationMinutes: number;
  /** Primary route label (e.g., "via I-85") */
  routeLabel?: string;
  /** Route geometry: decoded polyline points */
  polyline?: RoutePolylinePoint[];
  /** Route geometry: step-level segments */
  steps?: RouteStep[];
}

/** A point on a decoded route polyline */
export interface RoutePolylinePoint {
  lat: number;
  lng: number;
}

/** A step in route directions with distance and endpoint */
export interface RouteStep {
  /** Distance of this step in miles */
  distanceMiles: number;
  /** End coordinate of this step */
  endLat: number;
  endLng: number;
  /** Start coordinate of this step (optional; inferred from previous step if missing) */
  startLat?: number;
  startLng?: number;
}

export type DriveRiskFlagType = 'TOLL_POSSIBLE' | 'WEATHER_RISK' | 'LONG_DRIVE';

export interface DriveRiskFlag {
  type: DriveRiskFlagType;
  label: string;
  severity: 'info' | 'warning';
}

export interface DriveFuelPlan {
  /** Estimated fuel stops needed */
  estimatedStops: number;
  /** Suggested spacing in miles */
  spacingMiles: number;
  /** Total trip miles vs vehicle range */
  tripMiles: number;
  vehicleRangeMiles: number;
}

export interface DriveNavigationTarget {
  /** Label for the button */
  label: string;
  /** Google Maps URL (destination only, no fake origins) */
  url: string;
  /** Whether this is the primary navigation action */
  isPrimary: boolean;
}

// ============================================================================
// LEGACY (kept for backward compat — will be removed in future)
// ============================================================================

export type DriveRouteMeta = {
  routeId: string;
  hasTolls: boolean;
  primaryDurationMinutes: number;
  alternateDurationMinutes?: number;
  hasClosure?: boolean;
};

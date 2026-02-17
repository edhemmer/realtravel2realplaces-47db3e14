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
  /** Weather on route (from canonical WeatherEngine) */
  weatherLine: string | null;
  /** Navigation targets */
  navigationTargets: DriveNavigationTarget[];
  /** Overall confidence */
  confidence: 'high' | 'medium' | 'low';
  /** Reason for low confidence (if applicable) */
  degradedReason?: string;
}

export interface DriveRouteSummary {
  /** Distance in miles */
  distanceMiles: number;
  /** Estimated duration in minutes */
  durationMinutes: number;
  /** Primary route label (e.g., "via I-85") */
  routeLabel?: string;
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

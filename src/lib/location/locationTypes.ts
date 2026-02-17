/**
 * v3.12.2: Canonical Location Reference Types
 * 
 * Single source of truth for structured location references across the app.
 * Every timeline item, weather anchor, explore origin, and maps target
 * resolves through these types.
 */

// ============================================================================
// LOCATION REF
// ============================================================================

export type LocationRefKind = 'AIRPORT' | 'STAY' | 'PLACE' | 'CITY';

export interface LocationRef {
  /** What kind of location this represents */
  kind: LocationRefKind;
  /** Stable key for dedup/caching (e.g., IATA code, stayId, placeId) */
  key: string;
  /** Human-readable display label */
  label: string;
  /** IATA code (airports only) */
  iata?: string;
  /** Latitude (when resolvable) */
  lat?: number;
  /** Longitude (when resolvable) */
  lng?: number;
  /** Full street address (stays, places) */
  address?: string;
  /** City name */
  city?: string;
  /** State/region */
  state?: string;
  /** Country */
  country?: string;
}

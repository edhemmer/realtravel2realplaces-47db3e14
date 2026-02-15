/**
 * v3.13.0: Canonical Drive Route Metadata
 *
 * Minimal structure for route-level intelligence (tolls, closures, durations).
 * Injected optionally into DriveEngine — no behavioral changes until future patches.
 */
export type DriveRouteMeta = {
  routeId: string;
  hasTolls: boolean;
  primaryDurationMinutes: number;
  alternateDurationMinutes?: number;
  hasClosure?: boolean;
};

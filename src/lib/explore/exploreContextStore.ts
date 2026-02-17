/**
 * v3.12.4: Explore Context Store
 * 
 * Trip-scoped context for Explore origin selection.
 * Stores per-trip context (default: TRIP level).
 * Resets when switching trips.
 */

import type { ExploreContext } from '@/lib/location/exploreContext';

// ============================================================================
// STORE (module-level singleton)
// ============================================================================

let _currentTripId: string | null = null;
let _currentContext: ExploreContext = { kind: 'TRIP' };

/**
 * Get the current explore context for a trip.
 * Resets to TRIP context if tripId changed.
 */
export function getExploreContext(tripId: string): ExploreContext {
  if (_currentTripId !== tripId) {
    _currentTripId = tripId;
    _currentContext = { kind: 'TRIP' };
  }
  return _currentContext;
}

/**
 * Set explore context for a specific trip.
 */
export function setExploreContext(tripId: string, context: ExploreContext): void {
  _currentTripId = tripId;
  _currentContext = context;
}

/**
 * Reset explore context to default (TRIP level).
 */
export function clearExploreContext(tripId: string): void {
  if (_currentTripId === tripId) {
    _currentContext = { kind: 'TRIP' };
  }
}

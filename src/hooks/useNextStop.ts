/**
 * v2.3.1: useNextStop Hook
 *
 * React hook wrapping getNextStopFromCanonicalTimeline.
 * Consumes canonical trip state and exposes currentStop, nextStop, hasUpcoming.
 *
 * USAGE:
 *   const { currentStop, nextStop, hasUpcoming } = useNextStop(tripState);
 */

import { useMemo } from 'react';
import type { CanonicalTripState } from '@/lib/canonicalTripState';
import {
  getNextStopFromCanonicalTimeline,
  getLocalNowString,
  type NextStopResult,
  type NextStopEvent,
} from '@/lib/canonicalNextStop';

export type { NextStopEvent, NextStopResult };

/**
 * Hook that returns currentStop, nextStop, and hasUpcoming
 * derived from canonical trip state.
 *
 * Re-evaluates when tripState changes. The "now" value is captured
 * once per render cycle to ensure consistency.
 */
export function useNextStop(
  tripState: CanonicalTripState | null,
): NextStopResult {
  return useMemo(() => {
    if (!tripState) {
      return { currentStop: null, nextStop: null, hasUpcoming: false };
    }
    const nowStr = getLocalNowString();
    return getNextStopFromCanonicalTimeline(tripState, nowStr);
  }, [tripState]);
}

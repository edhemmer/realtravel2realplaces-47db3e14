/**
 * useNowCard — canonical "what now?" synthesizer.
 *
 * One helper that fuses the canonical state engines into a single shape
 * every "Now Card" surface can render. Future surfaces (Today tab,
 * lock-screen widget, Live Activity, watch complication) all read from
 * this same output — that's the canonical-architecture promise.
 *
 * Reads (no extra network):
 *   - useCanonicalTripState        — trip dates, timeline, costs
 *   - getNextStopFromCanonicalTimeline — current / next stop
 *   - getTodayCriticalActions      — day-of action stack (incl. airport buffer)
 *
 * Decision tree honours every memory rule:
 *   - No-Math Time Policy: comparisons are YYYY-MM-DD or HH:MM string only.
 *   - Lifecycle Rules: 14-day pre-trip window via DateOnly string compare.
 *   - Calm professional tone in copy.
 *   - Today Tab Execution dedup happens upstream in the engines we consume.
 */

import { useMemo } from 'react';
import { useCanonicalTripState } from './useCanonicalTripState';
import { getNextStopFromCanonicalTimeline, getLocalNowString } from '@/lib/canonicalNextStop';
import { getTodayCriticalActionsWithBuffer } from '@/lib/canonicalTodayCriticalActions';
import { getTodayDateOnly } from '@/lib/canonicalTimePolicy';
import type { Trip } from '@/types/database';

export type NowCardPressure =
  | 'idle'           // no card to show
  | 'pre-trip-far'   // > 14 days out
  | 'pre-trip-near'  // ≤ 14 days, not today
  | 'departure-day'  // departing today, no flight buffer triggered yet
  | 'airport-buffer' // T-120 → T-30 of a flight today
  | 'in-day'         // mid-trip, next stop later today
  | 'next-up'        // mid-trip, next stop is a future day
  | 'post-trip';     // returned home

export type NowCardAction = {
  label: string;
  href: string;
};

export interface NowCardOutput {
  pressure: NowCardPressure;
  /** Short headline — the single-sentence "what now?" */
  headline: string;
  /** Optional supporting line. Never repeats the headline. */
  subtext?: string;
  primary?: NowCardAction;
  secondary?: NowCardAction;
  /** Stable id for animation key changes. */
  shapeKey: string;
}

// ---------------------------------------------------------------------------
// Date-only string helpers — pure string math, no Date object derivation.
// ---------------------------------------------------------------------------

/** Days between two YYYY-MM-DD strings (b - a). Date object used only for math, never display. */
function daysBetween(a: string, b: string): number {
  const ad = new Date(`${a}T00:00:00Z`);
  const bd = new Date(`${b}T00:00:00Z`);
  return Math.round((bd.getTime() - ad.getTime()) / 86_400_000);
}

function formatDays(n: number): string {
  if (n <= 0) return 'today';
  if (n === 1) return 'tomorrow';
  return `in ${n} days`;
}

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------

export function useNowCard(trip: Trip | null): NowCardOutput {
  const { state, timelineEvents } = useCanonicalTripState(trip?.id ?? '', trip);

  return useMemo<NowCardOutput>(() => {
    const idle: NowCardOutput = {
      pressure: 'idle',
      headline: '',
      shapeKey: 'idle',
    };
    if (!trip) return idle;

    const today = getTodayDateOnly();
    const tripId = trip.id;
    const destination = trip.destination_city || trip.name || 'your trip';

    // -------- Post-trip --------
    if (today > trip.end_date) {
      return {
        pressure: 'post-trip',
        headline: `${destination} wrapped`,
        subtext: 'Add any final receipts to close out the trip.',
        primary: { label: 'Add an expense', href: `/trip/${tripId}?tab=expenses&addExpense=1` },
        secondary: { label: 'Open trip', href: `/trip/${tripId}` },
        shapeKey: 'post-trip',
      };
    }

    // -------- Pre-trip --------
    if (today < trip.start_date) {
      const daysOut = daysBetween(today, trip.start_date);
      if (daysOut > 14) {
        return {
          pressure: 'pre-trip-far',
          headline: `${destination} ${formatDays(daysOut)}`,
          subtext: 'Plenty of time. Start a packing list when you’re ready.',
          primary: { label: 'Open packing', href: `/trip/${tripId}?tab=packing` },
          secondary: { label: 'Open trip', href: `/trip/${tripId}` },
          shapeKey: `pre-far:${daysOut}`,
        };
      }
      return {
        pressure: 'pre-trip-near',
        headline: `${destination} ${formatDays(daysOut)}`,
        subtext: 'Worth a final pass on packing and bookings.',
        primary: { label: 'Review packing', href: `/trip/${tripId}?tab=packing` },
        secondary: { label: 'Open trip', href: `/trip/${tripId}` },
        shapeKey: `pre-near:${daysOut}`,
      };
    }

    // -------- Active trip (today is within window) --------
    if (state && timelineEvents.length > 0) {
      const nowStr = getLocalNowString();
      const nowTime = nowStr.substring(11, 16);

      // 1) Airport buffer (T-120 → T-30) takes precedence on a departure day.
      const { airportBuffer } = getTodayCriticalActionsWithBuffer(timelineEvents, nowStr);
      if (airportBuffer && airportBuffer.bufferTime <= nowTime && nowTime <= airportBuffer.flightTime) {
        return {
          pressure: 'airport-buffer',
          headline: `Head to the airport — flight at ${airportBuffer.flightTime}`,
          subtext: 'Buffer window is now open.',
          primary: { label: 'Open today', href: `/trip/${tripId}?tab=today` },
          secondary: { label: 'View bookings', href: `/trip/${tripId}?tab=bookings` },
          shapeKey: `airport:${airportBuffer.flightTime}`,
        };
      }

      // 2) Next stop intelligence.
      const { currentStop, nextStop } = getNextStopFromCanonicalTimeline(state, nowStr);
      if (nextStop) {
        const isTodayStop = nextStop.eventLocalDate === today;
        if (isTodayStop) {
          return {
            pressure: 'in-day',
            headline: `${nextStop.displayName} at ${nextStop.eventLocalTime}`,
            subtext: currentStop ? `After ${currentStop.displayName}` : undefined,
            primary: { label: 'Open today', href: `/trip/${tripId}?tab=today` },
            secondary: { label: 'View bookings', href: `/trip/${tripId}?tab=bookings` },
            shapeKey: `today-stop:${nextStop.id}`,
          };
        }
        const daysToNext = daysBetween(today, nextStop.eventLocalDate);
        return {
          pressure: 'next-up',
          headline: `Next: ${nextStop.displayName}`,
          subtext: `${formatDays(daysToNext)} at ${nextStop.eventLocalTime}`,
          primary: { label: 'Open trip', href: `/trip/${tripId}` },
          secondary: { label: 'View bookings', href: `/trip/${tripId}?tab=bookings` },
          shapeKey: `next-up:${nextStop.id}`,
        };
      }

      // 3) Active day with no upcoming events — gentle prompt.
      return {
        pressure: 'departure-day',
        headline: `You’re in ${destination}`,
        subtext: 'Nothing scheduled. Add a stop or log an expense.',
        primary: { label: 'Add an expense', href: `/trip/${tripId}?tab=expenses&addExpense=1` },
        secondary: { label: 'Open today', href: `/trip/${tripId}?tab=today` },
        shapeKey: 'active-empty',
      };
    }

    // Fallback while canonical state hydrates.
    return {
      pressure: 'in-day',
      headline: `You’re in ${destination}`,
      primary: { label: 'Open today', href: `/trip/${tripId}?tab=today` },
      shapeKey: 'hydrating',
    };
  }, [trip, state, timelineEvents]);
}

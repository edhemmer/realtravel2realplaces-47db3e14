/**
 * v4.0.6: Offline Timeline Execution Window
 *
 * Filters canonical timeline events to today + tomorrow when offline.
 * Uses the existing canonical per-item day derived from eventLocalDateTime.
 * Does not re-sort, re-parse, or mutate the source array.
 */

import type { CanonicalTripState, CanonicalTimelineEvent } from '@/lib/canonicalTripState';

/**
 * Get the device-local YYYY-MM-DD string for today.
 */
function getLocalDateKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Extract the canonical day key from a timeline event.
 * Prefers eventLocalDateTime (first 10 chars) → falls back to datetime Date object.
 */
function eventDayKey(event: CanonicalTimelineEvent): string {
  if (event.eventLocalDateTime && event.eventLocalDateTime.length >= 10) {
    return event.eventLocalDateTime.substring(0, 10);
  }
  const d = event.datetime;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns timeline events for today and tomorrow only.
 * Preserves canonical ordering — no re-sort.
 *
 * @param state - The canonical trip state (may come from cache)
 * @returns Filtered timeline events for the 2-day execution window
 */
export function getOfflineTimelineWindow(
  state: CanonicalTripState | null
): CanonicalTimelineEvent[] {
  if (!state || !state.timelineEvents) return [];

  const today = getLocalDateKey(0);
  const tomorrow = getLocalDateKey(1);
  const allowedDays = new Set([today, tomorrow]);

  return state.timelineEvents.filter((event) => allowedDays.has(eventDayKey(event)));
}

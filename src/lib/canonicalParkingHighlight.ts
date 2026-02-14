/**
 * v3.7.1: Canonical Parking Highlight Resolver
 *
 * Single source of truth for determining active parking in the NOW tab.
 * Shared by NowCommandCenter and any "today highlight" component.
 *
 * RULES:
 * - Only returns parking that is currently active (nowMs within [startMs, endMs))
 * - Never returns expired or future-only parking
 * - Time extraction uses the same fields the Parking screen uses
 * - Never uses createdAt/updatedAt for display
 */

import type { Parking } from '@/types/database';

export interface ParkingWindow {
  startMs: number;
  endMs: number;
}

export interface ActiveParkingHighlight {
  parking: Parking;
  startMs: number;
  endMs: number;
  status: 'active';
}

/**
 * Extract { startMs, endMs } from a parking record using the same datetime
 * fields the Parking screen uses: start_datetime and end_datetime.
 *
 * Returns null if either field is missing or unparseable.
 */
export function getParkingWindowMs(parking: Parking): ParkingWindow | null {
  if (!parking.start_datetime || !parking.end_datetime) return null;

  const startMs = new Date(parking.start_datetime).getTime();
  const endMs = new Date(parking.end_datetime).getTime();

  if (isNaN(startMs) || isNaN(endMs)) return null;
  if (endMs <= startMs) return null;

  return { startMs, endMs };
}

/**
 * Determine if any parking record is currently active for the given trip.
 *
 * Selection rules (ALL must be true):
 * 1. Belongs to the current trip (caller filters by tripId via useParking)
 * 2. Has valid start_datetime
 * 3. Has valid end_datetime
 * 4. nowMs >= startMs AND nowMs < endMs
 *
 * Returns the first active parking found, or null.
 */
export function getNowParkingHighlight(
  parkingList: Parking[],
  nowMs: number
): ActiveParkingHighlight | null {
  for (const parking of parkingList) {
    const window = getParkingWindowMs(parking);
    if (!window) continue;

    if (nowMs >= window.startMs && nowMs < window.endMs) {
      return {
        parking,
        startMs: window.startMs,
        endMs: window.endMs,
        status: 'active',
      };
    }
  }

  return null;
}

/**
 * Format a timestamp (ms) to a local 12h time string like "2:18 PM".
 * Uses the browser's local timezone — consistent with the Parking screen.
 */
export function formatParkingTime12h(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

/**
 * v3.8.8: Canonical Parking Highlight Resolver
 *
 * Single source of truth for determining active parking in the NOW tab.
 * Shared by NowCommandCenter and any "today highlight" component.
 *
 * RULES:
 * - Only returns parking that is currently active (now within [start, end))
 * - Never returns expired or future-only parking
 * - Uses string-based comparison — NO new Date() for time logic or display
 * - Time extraction uses canonicalTimeNormalizer (same path as flights/stays)
 */

import type { Parking } from '@/types/database';
import { formatLocalTimeDirect } from './canonicalTimeNormalizer';

export interface ParkingWindow {
  /** Normalized start string YYYY-MM-DDTHH:mm for comparison */
  startNorm: string;
  /** Normalized end string YYYY-MM-DDTHH:mm for comparison */
  endNorm: string;
}

export interface ActiveParkingHighlight {
  parking: Parking;
  /** Normalized start YYYY-MM-DDTHH:mm */
  startNorm: string;
  /** Normalized end YYYY-MM-DDTHH:mm */
  endNorm: string;
  status: 'active';
}

/**
 * v3.8.8: Build a local "YYYY-MM-DDTHH:mm" string from device Date.now().
 */
function getLocalNowNorm(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/**
 * v3.8.8: Normalize a stored datetime string to YYYY-MM-DDTHH:mm for comparison.
 * Strips timezone suffixes, normalizes separators. Pure string ops — no Date().
 */
function normalizeToComparable(s: string): string {
  let n = s.trim();
  // Normalize space separator to T
  if (n.length >= 16 && n[10] === ' ') {
    n = n.substring(0, 10) + 'T' + n.substring(11);
  }
  // Strip timezone suffixes (Z, +00, +00:00, -05:00, etc.)
  n = n.replace(/Z$/i, '').replace(/[+-]\d{2}:?\d{0,2}$/, '');
  // Return first 16 chars: YYYY-MM-DDTHH:mm
  return n.substring(0, 16);
}

/**
 * v3.8.8: Extract { startNorm, endNorm } from a parking record using local wall-time columns.
 * Falls back to start_datetime/end_datetime for legacy records.
 * Pure string comparison — NO new Date() math.
 */
export function getParkingWindowMs(parking: Parking): ParkingWindow | null {
  const startStr = parking.start_local_datetime || parking.start_datetime;
  const endStr = parking.end_local_datetime || parking.end_datetime;
  if (!startStr || !endStr) return null;

  const startNorm = normalizeToComparable(startStr);
  const endNorm = normalizeToComparable(endStr);

  // Validate format: must be at least YYYY-MM-DDTHH:mm
  if (startNorm.length < 16 || endNorm.length < 16) return null;
  if (endNorm <= startNorm) return null;

  return { startNorm, endNorm };
}

/**
 * Determine if any parking record is currently active for the given trip.
 *
 * v3.8.8: Uses pure string comparison — no Date() objects.
 * nowMs parameter is IGNORED (kept for API compat); uses device local time string.
 *
 * Returns the first active parking found, or null.
 */
export function getNowParkingHighlight(
  parkingList: Parking[],
  _nowMs?: number
): ActiveParkingHighlight | null {
  const nowNorm = getLocalNowNorm();

  for (const parking of parkingList) {
    const window = getParkingWindowMs(parking);
    if (!window) continue;

    if (nowNorm >= window.startNorm && nowNorm < window.endNorm) {
      return {
        parking,
        startNorm: window.startNorm,
        endNorm: window.endNorm,
        status: 'active',
      };
    }
  }

  return null;
}

/**
 * v3.8.8: Format parking time using canonical time normalizer.
 * Takes a raw stored datetime string (not ms) — same path as flights/stays.
 * Returns "7:30 PM" format or null.
 */
export function formatParkingTime(datetimeStr: string | null | undefined): string | null {
  return formatLocalTimeDirect(datetimeStr);
}

/**
 * @deprecated v3.8.8: Use formatParkingTime(datetimeStr) instead.
 * Kept for backward compatibility. Converts ms back to locale string.
 */
export function formatParkingTime12h(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

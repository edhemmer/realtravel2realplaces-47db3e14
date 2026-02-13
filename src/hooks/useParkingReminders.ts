/**
 * v2.5.5: Canonical Parking Reminders Hook
 *
 * Deterministic, data-derived parking reminders that survive:
 * - App backgrounding / phone sleep
 * - Page refresh / session resume
 * - Tab navigation
 *
 * Architecture:
 * 1. Derives reminder timestamps purely from parking.end_datetime + user offset
 * 2. Persists acknowledgment in localStorage (keyed by parking ID + expiry)
 * 3. On load/resume: recalculates state, catches up missed reminders
 * 4. Sets in-session timers for future reminders (supplementary only)
 * 5. Auto-recomputes when parking data or preferences change
 *
 * Does NOT rely on in-memory timers alone.
 * Does NOT add push notifications or new reminder types.
 */

import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { Parking } from '@/types/database';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useForegroundResume } from '@/hooks/useForegroundResume';
import { parseISO, addMinutes, differenceInMinutes, isBefore, isAfter } from 'date-fns';
import type { TravelAlert } from '@/hooks/useTravelAlerts';

// ============================================================================
// ACKNOWLEDGMENT PERSISTENCE (localStorage)
// ============================================================================

const ACK_KEY_PREFIX = 'parking_reminder_ack_';

/** Build a deterministic key for a specific parking reminder */
function buildAckKey(parkingId: string, endDatetime: string): string {
  return `${ACK_KEY_PREFIX}${parkingId}_${endDatetime}`;
}

/** Check if a reminder has been acknowledged */
function isAcknowledged(parkingId: string, endDatetime: string): boolean {
  try {
    return localStorage.getItem(buildAckKey(parkingId, endDatetime)) === '1';
  } catch {
    return false;
  }
}

/** Mark a reminder as acknowledged */
export function acknowledgeParkingReminder(parkingId: string, endDatetime: string): void {
  try {
    localStorage.setItem(buildAckKey(parkingId, endDatetime), '1');
  } catch {
    // Ignore storage errors
  }
}

/** Clean up stale ack entries (older than 7 days) */
function cleanupStaleAcks(): void {
  try {
    const now = Date.now();
    const keys = Object.keys(localStorage).filter(k => k.startsWith(ACK_KEY_PREFIX));
    for (const key of keys) {
      // Extract the datetime portion and check if it's old
      const parts = key.replace(ACK_KEY_PREFIX, '').split('_');
      const dtStr = parts[parts.length - 1];
      if (dtStr) {
        try {
          const dt = new Date(dtStr);
          if (now - dt.getTime() > 7 * 86_400_000) {
            localStorage.removeItem(key);
          }
        } catch {
          // Invalid date, clean it up
          localStorage.removeItem(key);
        }
      }
    }
  } catch {
    // Ignore
  }
}

// ============================================================================
// CANONICAL STATE
// ============================================================================

export type ParkingReminderState = 'future' | 'active' | 'missed' | 'acknowledged' | 'expired';

export interface CanonicalParkingReminder {
  parkingId: string;
  label: string;
  endDatetime: string;
  reminderDatetime: string;
  offsetMinutes: number;
  state: ParkingReminderState;
  minutesUntilExpiry: number;
  address?: string;
  levelSectionSpace?: string;
}

/**
 * Compute the canonical state for a single parking reminder.
 * Pure function — no side effects.
 */
function computeReminderState(
  parking: Parking,
  offsetMinutes: number,
  now: Date
): CanonicalParkingReminder | null {
  if (!parking.end_datetime) return null;

  const expirationTime = parseISO(parking.end_datetime);
  const reminderTime = addMinutes(expirationTime, -offsetMinutes);
  const minutesUntilExpiry = differenceInMinutes(expirationTime, now);
  const acked = isAcknowledged(parking.id, parking.end_datetime);

  let state: ParkingReminderState;

  if (acked) {
    state = 'acknowledged';
  } else if (isAfter(now, expirationTime)) {
    // Parking already expired — no longer actionable
    state = 'expired';
  } else if (isAfter(now, reminderTime)) {
    // Reminder window is active (reminder time has passed, parking hasn't expired)
    state = 'active';
  } else if (isBefore(now, reminderTime)) {
    // Reminder hasn't fired yet
    state = 'future';
  } else {
    state = 'future';
  }

  return {
    parkingId: parking.id,
    label: parking.label,
    endDatetime: parking.end_datetime,
    reminderDatetime: reminderTime.toISOString(),
    offsetMinutes,
    state,
    minutesUntilExpiry: Math.max(0, minutesUntilExpiry),
    address: parking.address || undefined,
    levelSectionSpace: parking.level_section_space || undefined,
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function useParkingReminders(parkingList: Parking[]): TravelAlert[] {
  const { data: prefs } = useNotificationPreferences();
  const [tick, setTick] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // User preference for offset (default 15 minutes)
  const offsetMinutes = prefs?.parking_expiry_minutes_before ?? 15;
  const enabled = prefs?.parking_expiry_enabled ?? true;

  // Force re-evaluation on foreground resume
  useForegroundResume(useCallback(() => {
    setTick(t => t + 1);
  }, []), 2000);

  // Cleanup stale acks on mount
  useEffect(() => {
    cleanupStaleAcks();
  }, []);

  // Compute canonical reminder states — deterministic from data
  const reminders = useMemo(() => {
    if (!enabled) return [];
    const now = new Date();
    return parkingList
      .map(p => computeReminderState(p, offsetMinutes, now))
      .filter((r): r is CanonicalParkingReminder => r !== null);
    // tick is included to force recalculation on resume
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parkingList, offsetMinutes, enabled, tick]);

  // Set in-session timers for future reminders (supplementary — not sole mechanism)
  useEffect(() => {
    // Clear previous timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const now = Date.now();
    reminders
      .filter(r => r.state === 'future')
      .forEach(r => {
        const msUntilReminder = new Date(r.reminderDatetime).getTime() - now;
        if (msUntilReminder > 0 && msUntilReminder < 3_600_000) {
          // Only set timers for reminders within the next hour (reasonable session length)
          const timer = setTimeout(() => {
            setTick(t => t + 1); // Force re-evaluation → state transitions to 'active'
          }, msUntilReminder);
          timersRef.current.push(timer);
        }
      });

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [reminders]);

  // Convert active/missed reminders to TravelAlert format
  const alerts = useMemo((): TravelAlert[] => {
    return reminders
      .filter(r => r.state === 'active')
      .map(r => ({
        id: `parking-canonical-${r.parkingId}`,
        type: 'parking_expiry' as const,
        severity: (r.minutesUntilExpiry <= 15 ? 'critical' : 'warning') as 'critical' | 'warning',
        title: r.minutesUntilExpiry <= 15 ? '🚨 Parking Expiring NOW!' : '🅿️ Parking Expiring Soon',
        message: `${r.label} expires in ${r.minutesUntilExpiry} minutes${r.levelSectionSpace ? ` (${r.levelSectionSpace})` : ''}`,
        actionLabel: r.address ? 'Open Maps' : undefined,
        actionUrl: r.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.address)}` : undefined,
        relatedId: r.parkingId,
        timestamp: new Date(),
      }));
  }, [reminders]);

  return alerts;
}

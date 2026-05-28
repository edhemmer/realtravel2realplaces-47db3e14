/**
 * Local Notifications — canonical native helper.
 *
 * Single source of truth for on-device scheduled notifications (iOS/Android).
 * Web bundle: every function is a safe no-op so calling code never needs to
 * branch on platform.
 *
 * Scope (this module only):
 *  - Permission request
 *  - Schedule/cancel by deterministic numeric id
 *  - Reconciliation (replace full set for a given "kind")
 *
 * The orchestration of WHICH reminders to schedule lives in
 * useNativeReminderSync — this file just exposes primitives.
 */

import { isNativePlatform } from './platform';

export interface ScheduledReminder {
  /** Stable numeric id derived from the source row's UUID. */
  id: number;
  title: string;
  body: string;
  /** Absolute future moment to fire the notification. */
  at: Date;
  /** Optional deep-link payload (tripId, recordId, tab). */
  extra?: Record<string, string | undefined>;
}

let permissionRequested = false;

/**
 * Ask the OS for permission. Idempotent within a session.
 * Returns true when the app may schedule notifications.
 */
export async function ensureLocalNotificationPermission(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;
    if (current.display === 'denied') return false;
    if (permissionRequested) return false;
    permissionRequested = true;
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (err) {
    console.warn('[localNotifications] permission check failed:', err);
    return false;
  }
}

/**
 * Convert a UUID to a stable positive 31-bit integer for use as a
 * LocalNotifications id. The same UUID always produces the same id, which
 * makes reconciliation safe to call repeatedly.
 */
export function uuidToNotificationId(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = (hash * 31 + uuid.charCodeAt(i)) | 0;
  }
  // Force positive 31-bit range (LocalNotifications requires Int32).
  return Math.abs(hash) % 2_147_483_647;
}

/**
 * Reconcile the OS scheduled-notification set for a given "kind" namespace.
 *
 * Strategy: cancel the entire set of previously-scheduled ids for this kind
 * that no longer appear in `desired`, then schedule the remaining desired
 * items. This guarantees the OS state matches `desired` after the call.
 *
 * `kind` is just used so different reminder sources don't trample each
 * other's pending list — we track ids per kind in memory.
 */
const scheduledIdsByKind = new Map<string, Set<number>>();

export async function reconcileLocalReminders(
  kind: string,
  desired: ScheduledReminder[],
): Promise<void> {
  if (!isNativePlatform()) return;
  const granted = await ensureLocalNotificationPermission();
  if (!granted) return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    const previous = scheduledIdsByKind.get(kind) ?? new Set<number>();
    const desiredIds = new Set(desired.map((d) => d.id));

    // Cancel ids we previously owned but no longer want.
    const toCancel = [...previous].filter((id) => !desiredIds.has(id));
    if (toCancel.length > 0) {
      await LocalNotifications.cancel({
        notifications: toCancel.map((id) => ({ id })),
      }).catch(() => {});
    }

    // Filter out anything already in the past (OS will reject and warn).
    const now = Date.now();
    const future = desired.filter((d) => d.at.getTime() > now + 5_000);

    if (future.length > 0) {
      await LocalNotifications.schedule({
        notifications: future.map((d) => ({
          id: d.id,
          title: d.title,
          body: d.body,
          schedule: { at: d.at, allowWhileIdle: true },
          extra: d.extra ?? {},
        })),
      });
    }

    scheduledIdsByKind.set(kind, desiredIds);
  } catch (err) {
    console.warn(`[localNotifications] reconcile(${kind}) failed:`, err);
  }
}

/** Cancel every reminder this app has scheduled (e.g. on sign-out). */
export async function cancelAllLocalReminders(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }
    scheduledIdsByKind.clear();
  } catch (err) {
    console.warn('[localNotifications] cancelAll failed:', err);
  }
}

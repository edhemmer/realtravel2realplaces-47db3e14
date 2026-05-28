/**
 * Haptics — canonical helper for tactile feedback on commit-style interactions.
 *
 * One concept = one helper. All commit feedback in the app should call
 * `haptic(intent)` rather than reaching for `@capacitor/haptics` directly.
 *
 * On web this is a zero-cost no-op (guarded by `isNativePlatform`).
 *
 * Intents — pick the one that matches the meaning, not the raw style:
 *   commit       Primary action succeeded (save, add, send, mark done).
 *   toggle       Discrete on/off flip (checkbox, switch, packed item).
 *   success      Notification-style success (toast.success).
 *   warning      Notification-style warning (toast.warning).
 *   error        Notification-style failure (toast.error, validation fail).
 *   destructive  Delete / remove confirmation.
 *   select       Light selection feedback (segmented control, tab).
 */

import { isNativePlatform } from './nativeBootstrap';

export type HapticIntent =
  | 'commit'
  | 'toggle'
  | 'success'
  | 'warning'
  | 'error'
  | 'destructive'
  | 'select';

export async function haptic(intent: HapticIntent = 'commit'): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    switch (intent) {
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        return;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        return;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        return;
      case 'destructive':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        return;
      case 'commit':
        await Haptics.impact({ style: ImpactStyle.Medium });
        return;
      case 'toggle':
        await Haptics.impact({ style: ImpactStyle.Light });
        return;
      case 'select':
        await Haptics.selectionChanged();
        return;
    }
  } catch {
    /* plugin missing on web bundle — no-op */
  }
}

// Backwards-compatible thin aliases (existing call-sites, if any).
export const hapticImpact = (style: 'light' | 'medium' | 'heavy' = 'light') =>
  haptic(style === 'heavy' ? 'destructive' : style === 'medium' ? 'commit' : 'toggle');
export const hapticSuccess = () => haptic('success');

/**
 * Haptic helpers. No-op on web; dynamic import keeps the web bundle clean.
 *
 * Canonical entry: `haptic(intent)` — maps semantic intents to a concrete
 * Capacitor Haptics call. Use the named helpers (`tapHaptic`, `successHaptic`)
 * for direct call sites that don't need an intent.
 */
import { isNativePlatform } from './nativeBootstrap';

export type HapticIntent =
  | 'select'   // light tick — hover/focus/selection
  | 'toggle'   // light tick — switch on/off
  | 'commit'   // medium tap — primary CTA
  | 'success'  // success notification
  | 'warning'  // warning notification
  | 'error';   // error notification

export async function haptic(intent: HapticIntent): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    switch (intent) {
      case 'select':
      case 'toggle':
        await Haptics.impact({ style: ImpactStyle.Light });
        return;
      case 'commit':
        await Haptics.impact({ style: ImpactStyle.Medium });
        return;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        return;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        return;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        return;
    }
  } catch { /* no-op */ }
}

export const tapHaptic = () => haptic('commit');
export const successHaptic = () => haptic('success');

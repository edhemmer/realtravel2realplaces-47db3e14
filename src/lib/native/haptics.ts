/**
 * Haptic helpers. No-op on web; dynamic import keeps the web bundle clean.
 */
import { isNativePlatform } from './nativeBootstrap';

export async function tapHaptic(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch { /* no-op */ }
}

export async function successHaptic(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch { /* no-op */ }
}

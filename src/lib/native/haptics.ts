/**
 * Haptics — safe wrapper that no-ops on web.
 *
 * Use on confirm / commit interactions (Next Action acknowledge, expense
 * added, navigation launched). Never on every tap.
 */

import { isNativePlatform } from './nativeBootstrap';

type Impact = 'light' | 'medium' | 'heavy';

export async function hapticImpact(style: Impact = 'light'): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] });
  } catch {
    /* no-op */
  }
}

export async function hapticSuccess(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* no-op */
  }
}

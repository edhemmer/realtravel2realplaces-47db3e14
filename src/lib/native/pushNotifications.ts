/**
 * Native push notification registration.
 *
 * Registers the device with APNs/FCM via Capacitor, then upserts the token
 * into the `device_tokens` table so the backend can deliver pushes.
 *
 * No-op on web — uses dynamic imports so the web bundle stays clean.
 */
import { supabase } from '@/integrations/supabase/client';

export async function registerPushNotifications(): Promise<void> {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Ensure we have permission
    const status = await PushNotifications.checkPermissions();
    let granted = status.receive === 'granted';
    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === 'granted';
    }
    if (!granted) return;

    // Token handler — fires once APNs/FCM issues a device token
    await PushNotifications.addListener('registration', async (token) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
      await supabase
        .from('device_tokens')
        .upsert(
          {
            user_id: user.id,
            token: token.value,
            platform,
          },
          { onConflict: 'user_id,token' },
        );
    });

    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push] registration error:', err);
    });

    await PushNotifications.register();
  } catch (err) {
    console.warn('[push] init skipped:', err);
  }
}

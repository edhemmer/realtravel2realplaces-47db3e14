/**
 * Native push notification registration.
 *
 * Registers the device with APNs/FCM via Capacitor, then upserts the token
 * into the `device_tokens` table so the backend can deliver pushes.
 *
 * No-op on web. Dynamic imports keep the web bundle clean.
 */
import { supabase } from '@/integrations/supabase/client';

const TOKEN_STORAGE_KEY = 'rt2rp-native-push-token';

let registrationStarted = false;
let authListenerStarted = false;

type NativePushPlatform = 'ios' | 'android' | 'web';

async function persistDeviceToken(token: string, platform: NativePushPlatform): Promise<void> {
  if (!token) return;

  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ token, platform }));
  } catch {
    // Storage can fail in restricted modes; registration still continues.
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('device_tokens')
    .upsert(
      {
        user_id: user.id,
        token,
        platform,
      },
      { onConflict: 'user_id,token' },
    );

  if (error) {
    console.warn('[push] token persistence failed:', error);
  }
}

async function persistStoredTokenAfterAuth(): Promise<void> {
  try {
    const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return;

    const stored = JSON.parse(raw) as { token?: string; platform?: NativePushPlatform };
    if (!stored.token || !stored.platform) return;
    await persistDeviceToken(stored.token, stored.platform);
  } catch {
    // Ignore malformed old storage values.
  }
}

function listenForAuthTokenPersistence(): void {
  if (authListenerStarted) return;
  authListenerStarted = true;

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
      window.setTimeout(() => {
        void persistStoredTokenAfterAuth();
      }, 0);
    }
  });
}

export async function registerPushNotifications(): Promise<void> {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return;

  listenForAuthTokenPersistence();

  if (registrationStarted) {
    await persistStoredTokenAfterAuth();
    return;
  }
  registrationStarted = true;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const status = await PushNotifications.checkPermissions();
    let granted = status.receive === 'granted';
    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === 'granted';
    }
    if (!granted) return;

    await PushNotifications.addListener('registration', async (token) => {
      const platform = Capacitor.getPlatform() as NativePushPlatform;
      await persistDeviceToken(token.value, platform);
    });

    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push] registration error:', err);
    });

    await PushNotifications.register();
    await persistStoredTokenAfterAuth();
  } catch (err) {
    console.warn('[push] init skipped:', err);
    registrationStarted = false;
  }
}

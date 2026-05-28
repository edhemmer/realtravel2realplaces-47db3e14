/**
 * Native (iOS/Android) bootstrap.
 *
 * Runs only when the app is hosted inside a Capacitor shell. On the web it's
 * a no-op so the existing PWA / browser behaviour is unaffected.
 *
 * Responsibilities:
 *  - Status bar: dark text on light background, matching the brand surface.
 *  - Splash screen: hide as soon as React has mounted.
 *  - Keyboard: keep input focused content above the keyboard.
 *  - Back-grounding: notify the existing foreground-resume system.
 */

export async function bootstrapNativePlatform(): Promise<void> {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return;

  // Auto-haptic every success / error / warning toast app-wide.
  try {
    const { installHapticToast } = await import('./installHapticToast');
    installHapticToast();
  } catch { /* no-op */ }

  // Register for APNs/FCM and persist the device token (no-op without permission).
  try {
    const { registerPushNotifications } = await import('./pushNotifications');
    void registerPushNotifications();
  } catch { /* no-op */ }




  const platform = Capacitor.getPlatform();
  document.documentElement.dataset.nativePlatform = platform;

  try {
    const [{ StatusBar, Style }, { SplashScreen }, { Keyboard }, { App }] = await Promise.all([
      import('@capacitor/status-bar'),
      import('@capacitor/splash-screen'),
      import('@capacitor/keyboard'),
      import('@capacitor/app'),
    ]);

    // iOS: keep the WebView below the status bar/Dynamic Island instead of letting it draw underneath.
    await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});

    // NOTE: StatusBar style + background color are owned by ThemeProvider
    // (src/contexts/ThemeContext.tsx) so they stay in sync with light/dark mode.
    // Avoid setting them here — would race with the theme effect.
    void Style; // keep import referenced


    // Hide splash once React is up
    await SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});

    // Keyboard — push content up rather than overlay
    Keyboard.setResizeMode({ mode: 'native' as never }).catch(() => {});

    // Forward app resume events to the existing useForegroundResume listener
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        window.dispatchEvent(new Event('visibilitychange'));
      }
    });
  } catch (err) {
    // Native plugins missing in dev / web — safe to ignore.
    console.warn('[native] bootstrap skipped:', err);
  }
}

/** True when running inside a Capacitor native shell. Safe on web. */
export function isNativePlatform(): boolean {
  try {
    // Lazy require avoids a hard dependency on web bundles.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return !!cap?.isNativePlatform?.();
  } catch {
    return false;
  }
}

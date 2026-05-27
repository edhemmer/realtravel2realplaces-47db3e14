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

  try {
    const [{ StatusBar, Style }, { SplashScreen }, { Keyboard }, { App }] = await Promise.all([
      import('@capacitor/status-bar'),
      import('@capacitor/splash-screen'),
      import('@capacitor/keyboard'),
      import('@capacitor/app'),
    ]);

    // Status bar — light surface, dark glyphs
    await StatusBar.setStyle({ style: Style.Light }).catch(() => {});

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

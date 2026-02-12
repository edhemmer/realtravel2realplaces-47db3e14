/**
 * v2.3.4: useForegroundResume
 *
 * Fires a callback once when the app returns to foreground (tab becomes visible).
 * Debounced to prevent rapid-fire on fast app switching.
 *
 * Mobile-safe: uses visibilitychange (broadly supported on iOS/Android browsers).
 * No polling. No timers that run continuously. Single listener at mount.
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * @param onResume - Callback fired once per foreground resume event
 * @param debounceMs - Minimum gap between consecutive fires (default 2000ms)
 */
export function useForegroundResume(onResume: () => void, debounceMs = 2000): void {
  const lastFiredRef = useRef(0);
  const callbackRef = useRef(onResume);
  callbackRef.current = onResume;

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState !== 'visible') return;

    const now = Date.now();
    if (now - lastFiredRef.current < debounceMs) return;

    lastFiredRef.current = now;
    callbackRef.current();
  }, [debounceMs]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);
}

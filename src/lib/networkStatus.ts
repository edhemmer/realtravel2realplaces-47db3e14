/**
 * v4.1.0: Network Status Helper
 *
 * Single source of truth for connectivity state.
 *
 * - Web: `navigator.onLine` + `online`/`offline` window events.
 * - Capacitor native (iOS/Android): `@capacitor/network` plugin, because
 *   `navigator.onLine` inside WKWebView is unreliable (often stuck false
 *   on cold launch, and `online`/`offline` events don't always fire).
 *
 * The native path is lazy-loaded so web bundles aren't affected. A small
 * module-level cache keeps the most recent native status synchronous,
 * matching the existing `isOnline()` signature.
 */

// ────────────────────────────────────────────────────────────────────────
// Native bridge state (only used inside Capacitor shells)
// ────────────────────────────────────────────────────────────────────────

let nativeListenersInit = false;
let nativeOnlineCache: boolean | null = null;
const nativeSubscribers = new Set<(online: boolean) => void>();

function isNativeShell(): boolean {
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return !!cap?.isNativePlatform?.();
  } catch {
    return false;
  }
}

async function initNativeNetwork(): Promise<void> {
  if (nativeListenersInit) return;
  nativeListenersInit = true;
  try {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    nativeOnlineCache = status.connected;
    await Network.addListener('networkStatusChange', (s) => {
      nativeOnlineCache = s.connected;
      nativeSubscribers.forEach((cb) => {
        try {
          cb(s.connected);
        } catch {
          // ignore subscriber errors
        }
      });
    });
  } catch {
    // Plugin missing — fall back to web behavior on next call
    nativeListenersInit = false;
  }
}

// Kick off native init as soon as this module loads inside a Capacitor shell.
if (typeof window !== 'undefined' && isNativeShell()) {
  void initNativeNetwork();
}

// ────────────────────────────────────────────────────────────────────────
// Public API (unchanged signatures)
// ────────────────────────────────────────────────────────────────────────

/** Returns current online status. */
export function isOnline(): boolean {
  if (isNativeShell()) {
    // First call before init resolves — assume online to avoid false offline UI flash.
    return nativeOnlineCache ?? true;
  }
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/** Subscribe to online/offline transitions. Returns unsubscribe function. */
export function subscribeToNetworkChanges(
  callback: (online: boolean) => void
): () => void {
  if (isNativeShell()) {
    // Ensure native listener is wired before we register the subscriber.
    void initNativeNetwork();
    nativeSubscribers.add(callback);
    return () => {
      nativeSubscribers.delete(callback);
    };
  }

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

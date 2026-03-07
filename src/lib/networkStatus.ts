/**
 * v4.0.0: Network Status Helper
 * 
 * Exposes connectivity state using browser APIs.
 * Used by the offline cache layer to determine hydration strategy.
 */

/** Returns current online status */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/** Subscribe to online/offline transitions. Returns unsubscribe function. */
export function subscribeToNetworkChanges(
  callback: (online: boolean) => void
): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

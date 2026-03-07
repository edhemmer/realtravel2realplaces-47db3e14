/**
 * v4.0.0: Offline Trip Cache
 * 
 * Manages IndexedDB storage for canonicalTripState snapshots.
 * Snapshots are read-only fallbacks — cloud data always has priority.
 * 
 * Database: rt2rp_offline_cache
 * Object store: trip_cache
 * Key: tripId
 */

import type { CanonicalTripState } from '@/lib/canonicalTripState';

const DB_NAME = 'rt2rp_offline_cache';
const STORE_NAME = 'trip_cache';
const DB_VERSION = 3;

interface CachedSnapshot {
  tripId: string;
  state: CanonicalTripState;
  savedAt: number; // epoch ms
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'tripId' });
      }
      if (!db.objectStoreNames.contains('expense_queue')) {
        db.createObjectStore('expense_queue', { keyPath: 'clientExpenseId' });
      }
      if (!db.objectStoreNames.contains('weather_snapshot')) {
        db.createObjectStore('weather_snapshot', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('explore_essentials')) {
        db.createObjectStore('explore_essentials', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a full canonical trip state snapshot to IndexedDB.
 */
export async function saveTripSnapshot(
  tripId: string,
  state: CanonicalTripState
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record: CachedSnapshot = { tripId, state, savedAt: Date.now() };
    store.put(record);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    // Silent failure — cache is best-effort
    console.warn('[offlineTripCache] saveTripSnapshot failed:', e);
  }
}

/**
 * Load a cached canonical trip state snapshot from IndexedDB.
 * Returns null if no snapshot exists or IndexedDB is unavailable.
 */
export async function loadTripSnapshot(
  tripId: string
): Promise<CanonicalTripState | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(tripId);
    const result = await new Promise<CachedSnapshot | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as CachedSnapshot | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result?.state ?? null;
  } catch (e) {
    console.warn('[offlineTripCache] loadTripSnapshot failed:', e);
    return null;
  }
}

/**
 * Remove a cached snapshot for a specific trip.
 */
export async function clearTripSnapshot(tripId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(tripId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn('[offlineTripCache] clearTripSnapshot failed:', e);
  }
}

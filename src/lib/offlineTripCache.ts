/**
 * v4.1.1: Offline Trip Cache
 *
 * Manages IndexedDB storage for canonicalTripState snapshots.
 * Snapshots are read-only fallbacks — cloud data always has priority.
 *
 * SECURITY:
 * - All RT2RP offline stores are cleared when the authenticated user changes
 *   or signs out.
 * - A non-sensitive local owner marker survives app restarts so a later account
 *   cannot inherit stale IndexedDB data even if the prior clear was interrupted.
 */

import type { CanonicalTripState } from '@/lib/canonicalTripState';

const DB_NAME = 'rt2rp_offline_cache';
const STORE_NAME = 'trip_cache';
const DB_VERSION = 3;
const OFFLINE_OWNER_KEY = 'rt2rp.offline-cache-owner-user-id';
const OFFLINE_STORES = ['trip_cache', 'expense_queue', 'weather_snapshot', 'explore_essentials'] as const;

/** Local snapshot age only. This never implies provider-backed data is current. */
export const TRIP_SNAPSHOT_RECENT_FOR_MS = 6 * 60 * 60 * 1000;
export type TripSnapshotAgeStatus = 'recent' | 'stale';

export interface CachedTripSnapshot {
  tripId: string;
  state: CanonicalTripState;
  savedAt: number;
}

export interface TripSnapshotReadResult extends CachedTripSnapshot {
  ageMs: number;
  ageStatus: TripSnapshotAgeStatus;
}

export function getTripSnapshotAgeStatus(savedAt: number, now: number = Date.now()) {
  const ageMs = Math.max(0, now - savedAt);
  return { ageMs, ageStatus: ageMs <= TRIP_SNAPSHOT_RECENT_FOR_MS ? 'recent' as const : 'stale' as const };
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
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'tripId' });
      if (!db.objectStoreNames.contains('expense_queue')) db.createObjectStore('expense_queue', { keyPath: 'clientExpenseId' });
      if (!db.objectStoreNames.contains('weather_snapshot')) db.createObjectStore('weather_snapshot', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('explore_essentials')) db.createObjectStore('explore_essentials', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getOfflineDataOwner(): string | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(OFFLINE_OWNER_KEY); }
  catch { return null; }
}

export function setOfflineDataOwner(userId: string | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (userId) localStorage.setItem(OFFLINE_OWNER_KEY, userId);
    else localStorage.removeItem(OFFLINE_OWNER_KEY);
  } catch (error) {
    console.warn('[offlineTripCache] unable to persist cache owner marker:', error);
  }
}

export async function saveTripSnapshot(tripId: string, state: CanonicalTripState): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ tripId, state, savedAt: Date.now() } satisfies CachedTripSnapshot);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn('[offlineTripCache] saveTripSnapshot failed:', e);
  }
}

export async function loadTripSnapshotRecord(tripId: string): Promise<TripSnapshotReadResult | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(tripId);
    const result = await new Promise<CachedTripSnapshot | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as CachedTripSnapshot | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result ? { ...result, ...getTripSnapshotAgeStatus(result.savedAt) } : null;
  } catch (e) {
    console.warn('[offlineTripCache] loadTripSnapshotRecord failed:', e);
    return null;
  }
}

/** Backward-compatible reader. New UI should retain snapshot metadata. */
export async function loadTripSnapshot(tripId: string): Promise<CanonicalTripState | null> {
  return (await loadTripSnapshotRecord(tripId))?.state ?? null;
}

export async function clearTripSnapshot(tripId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(tripId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn('[offlineTripCache] clearTripSnapshot failed:', e);
  }
}

export async function clearAllOfflineData(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  let db: IDBDatabase | null = null;
  try {
    db = await openDB();
    const stores = OFFLINE_STORES.filter((name) => db!.objectStoreNames.contains(name));
    if (stores.length === 0) { db.close(); return; }
    const tx = db.transaction(stores, 'readwrite');
    for (const storeName of stores) tx.objectStore(storeName).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Offline cache clear aborted'));
    });
    db.close();
  } catch (e) {
    db?.close();
    console.error('[offlineTripCache] clearAllOfflineData failed:', e);
    throw e;
  }
}

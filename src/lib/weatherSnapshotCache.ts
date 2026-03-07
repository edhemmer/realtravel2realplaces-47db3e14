/**
 * v4.0.4: Weather Snapshot Cache
 *
 * Saves weather display payloads to IndexedDB for offline fallback.
 * Only stores the fields needed by the existing weather UI.
 *
 * Database: rt2rp_offline_cache
 * Object store: weather_snapshot
 * Key: compound tripId + locationKey
 */

import type { WeatherEngineResult } from '@/lib/weatherEngine';

const DB_NAME = 'rt2rp_offline_cache';
const STORE_NAME = 'weather_snapshot';
const DB_VERSION = 3;

export interface WeatherSnapshotRecord {
  /** Compound key: tripId::locationKey */
  id: string;
  tripId: string;
  locationKey: string;
  weatherDisplayPayload: WeatherEngineResult;
  lastSyncedAt: number; // epoch ms
}

// ── Location key builder ──

/** Build stable location key from rounded coordinates (2 decimal ≈ ~1km) */
export function buildLocationKey(lat: number, lng: number): string {
  return `${Math.round(lat * 100) / 100},${Math.round(lng * 100) / 100}`;
}

/** Haversine distance in miles between two coords */
export function haversineDistanceMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── IndexedDB ──

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('trip_cache')) {
        db.createObjectStore('trip_cache', { keyPath: 'tripId' });
      }
      if (!db.objectStoreNames.contains('expense_queue')) {
        db.createObjectStore('expense_queue', { keyPath: 'clientExpenseId' });
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('explore_essentials')) {
        db.createObjectStore('explore_essentials', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Public API ──

/**
 * Save a weather display payload snapshot.
 * Only overwrites if newer than existing record.
 */
export async function saveWeatherSnapshot(
  tripId: string,
  locationKey: string,
  weatherDisplayPayload: WeatherEngineResult
): Promise<void> {
  try {
    const db = await openDB();
    const id = `${tripId}::${locationKey}`;
    const now = Date.now();

    // Check existing
    const tx1 = db.transaction(STORE_NAME, 'readonly');
    const getReq = tx1.objectStore(STORE_NAME).get(id);
    const existing = await new Promise<WeatherSnapshotRecord | undefined>((res, rej) => {
      getReq.onsuccess = () => res(getReq.result as WeatherSnapshotRecord | undefined);
      getReq.onerror = () => rej(getReq.error);
    });

    // Only overwrite if newer
    if (existing && existing.lastSyncedAt >= now) {
      db.close();
      return;
    }

    const record: WeatherSnapshotRecord = {
      id,
      tripId,
      locationKey,
      weatherDisplayPayload,
      lastSyncedAt: now,
    };

    const tx2 = db.transaction(STORE_NAME, 'readwrite');
    tx2.objectStore(STORE_NAME).put(record);
    await new Promise<void>((res, rej) => {
      tx2.oncomplete = () => res();
      tx2.onerror = () => rej(tx2.error);
    });
    db.close();
  } catch (e) {
    console.warn('[weatherSnapshotCache] saveWeatherSnapshot failed:', e);
  }
}

/**
 * Load weather snapshot for a trip + location key.
 */
export async function loadWeatherSnapshot(
  tripId: string,
  locationKey: string
): Promise<WeatherSnapshotRecord | null> {
  try {
    const db = await openDB();
    const id = `${tripId}::${locationKey}`;
    const tx = db.transaction(STORE_NAME, 'readonly');
    const getReq = tx.objectStore(STORE_NAME).get(id);
    const result = await new Promise<WeatherSnapshotRecord | undefined>((res, rej) => {
      getReq.onsuccess = () => res(getReq.result as WeatherSnapshotRecord | undefined);
      getReq.onerror = () => rej(getReq.error);
    });
    db.close();
    return result ?? null;
  } catch (e) {
    console.warn('[weatherSnapshotCache] loadWeatherSnapshot failed:', e);
    return null;
  }
}

/**
 * Load all weather snapshots for a trip (any location key).
 */
export async function loadAllWeatherSnapshots(
  tripId: string
): Promise<WeatherSnapshotRecord[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    const all = await new Promise<WeatherSnapshotRecord[]>((res, rej) => {
      request.onsuccess = () => res(request.result as WeatherSnapshotRecord[]);
      request.onerror = () => rej(request.error);
    });
    db.close();
    return all.filter(r => r.tripId === tripId);
  } catch (e) {
    console.warn('[weatherSnapshotCache] loadAllWeatherSnapshots failed:', e);
    return [];
  }
}

/**
 * Format lastSyncedAt for display.
 */
export function formatSnapshotTimestamp(epochMs: number): string {
  const d = new Date(epochMs);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

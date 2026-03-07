/**
 * v4.0.4: Explore Essentials Cache
 *
 * Caches a subset of Explore results (practical categories only)
 * for offline fallback display.
 *
 * Database: rt2rp_offline_cache
 * Object store: explore_essentials
 * Key: compound tripId + locationKey
 */

import type { AttractionSuggestion } from '@/types/attraction';
import { buildLocationKey, haversineDistanceMiles } from '@/lib/weatherSnapshotCache';

const DB_NAME = 'rt2rp_offline_cache';
const STORE_NAME = 'explore_essentials';
const DB_VERSION = 3;

/** Categories considered essential for offline display */
const ESSENTIAL_CATEGORIES = new Set([
  'gas', 'gas_station', 'gas station',
  'food', 'restaurant',
  'medical', 'hospital', 'urgent care',
  'pharmacy',
  'grocery',
  'parking', 'parking garage',
]);

export interface EssentialPlace {
  id: string;
  name: string;
  category: string;
  address?: string;
  rating?: number;
  distanceMiles?: number;
}

export interface ExploreEssentialsRecord {
  id: string; // compound: tripId::locationKey
  tripId: string;
  locationKey: string;
  places: EssentialPlace[];
  lastSyncedAt: number;
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
      if (!db.objectStoreNames.contains('weather_snapshot')) {
        db.createObjectStore('weather_snapshot', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Public API ──

/** Re-export for consumers */
export { buildLocationKey, haversineDistanceMiles };

/**
 * Extract essential places from full Explore results.
 */
export function extractEssentials(attractions: AttractionSuggestion[]): EssentialPlace[] {
  return attractions
    .filter(a => {
      const cat = a.category.toLowerCase();
      return Array.from(ESSENTIAL_CATEGORIES).some(ec => cat.includes(ec));
    })
    .slice(0, 30)
    .map(a => ({
      id: a.id,
      name: a.name,
      category: a.category,
      address: a.locationSummary,
      rating: a.rating,
      distanceMiles: a.distanceMiles,
    }));
}

/**
 * Save essentials. Only overwrites if newer.
 */
export async function saveExploreEssentials(
  tripId: string,
  locationKey: string,
  places: EssentialPlace[]
): Promise<void> {
  try {
    const db = await openDB();
    const id = `${tripId}::${locationKey}`;
    const now = Date.now();

    const tx1 = db.transaction(STORE_NAME, 'readonly');
    const getReq = tx1.objectStore(STORE_NAME).get(id);
    const existing = await new Promise<ExploreEssentialsRecord | undefined>((res, rej) => {
      getReq.onsuccess = () => res(getReq.result as ExploreEssentialsRecord | undefined);
      getReq.onerror = () => rej(getReq.error);
    });

    if (existing && existing.lastSyncedAt >= now) {
      db.close();
      return;
    }

    const record: ExploreEssentialsRecord = { id, tripId, locationKey, places, lastSyncedAt: now };
    const tx2 = db.transaction(STORE_NAME, 'readwrite');
    tx2.objectStore(STORE_NAME).put(record);
    await new Promise<void>((res, rej) => {
      tx2.oncomplete = () => res();
      tx2.onerror = () => rej(tx2.error);
    });
    db.close();
  } catch (e) {
    console.warn('[exploreEssentialsCache] saveExploreEssentials failed:', e);
  }
}

/**
 * Load cached essentials for a trip + location key.
 */
export async function loadExploreEssentials(
  tripId: string,
  locationKey: string
): Promise<ExploreEssentialsRecord | null> {
  try {
    const db = await openDB();
    const id = `${tripId}::${locationKey}`;
    const tx = db.transaction(STORE_NAME, 'readonly');
    const getReq = tx.objectStore(STORE_NAME).get(id);
    const result = await new Promise<ExploreEssentialsRecord | undefined>((res, rej) => {
      getReq.onsuccess = () => res(getReq.result as ExploreEssentialsRecord | undefined);
      getReq.onerror = () => rej(getReq.error);
    });
    db.close();
    return result ?? null;
  } catch (e) {
    console.warn('[exploreEssentialsCache] loadExploreEssentials failed:', e);
    return null;
  }
}

/**
 * Load all essentials for a trip (any location key).
 */
export async function loadAllExploreEssentials(
  tripId: string
): Promise<ExploreEssentialsRecord[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    const all = await new Promise<ExploreEssentialsRecord[]>((res, rej) => {
      request.onsuccess = () => res(request.result as ExploreEssentialsRecord[]);
      request.onerror = () => rej(request.error);
    });
    db.close();
    return all.filter(r => r.tripId === tripId);
  } catch (e) {
    console.warn('[exploreEssentialsCache] loadAllExploreEssentials failed:', e);
    return [];
  }
}

/** Distance threshold for stale location warning (miles) */
export const DISTANCE_THRESHOLD_MILES = 15;

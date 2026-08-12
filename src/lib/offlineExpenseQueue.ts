/**
 * v4.1.0: Offline Expense Queue
 *
 * Manages IndexedDB-backed queue for expenses created while offline.
 * Expenses are stored locally, rendered immediately, and synced with a durable
 * server-side idempotency key so reconnect/retry cannot create duplicates.
 *
 * Database: rt2rp_offline_cache
 * Object store: expense_queue
 * Key: clientExpenseId
 */

import { supabase } from '@/integrations/supabase/client';

const DB_NAME = 'rt2rp_offline_cache';
const STORE_NAME = 'expense_queue';
const DB_VERSION = 3; // shared with trip/weather/explore offline stores
const MAX_RETRIES = 5;

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface QueuedExpense {
  clientExpenseId: string;
  tripId: string;
  expensePayload: Record<string, unknown>;
  createdAt: number; // epoch ms
  syncStatus: SyncStatus;
  retryCount: number;
  serverExpenseId?: string;
}

// ── IndexedDB helpers ──

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'clientExpenseId' });
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

function txWrite(db: IDBDatabase): IDBObjectStore {
  return db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
}

function txRead(db: IDBDatabase): IDBObjectStore {
  return db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
}

// ── Public API ──

/** Generate a UUID v4 client-side */
export function generateClientId(): string {
  return crypto.randomUUID();
}

/**
 * Build the exact server payload used for replay.
 * The client id is persisted in Postgres and protected by a unique index.
 */
export function buildExpenseSyncPayload(record: QueuedExpense): Record<string, unknown> {
  return {
    ...record.expensePayload,
    client_expense_id: record.clientExpenseId,
  };
}

/** Enqueue an expense for offline sync */
export async function enqueueExpense(record: QueuedExpense): Promise<void> {
  try {
    const db = await openDB();
    const store = txWrite(db);
    store.put(record);
    await new Promise<void>((res, rej) => {
      store.transaction.oncomplete = () => res();
      store.transaction.onerror = () => rej(store.transaction.error);
    });
    db.close();
  } catch (e) {
    console.error('[offlineExpenseQueue] enqueueExpense failed:', e);
    throw e;
  }
}

/** Get all queued expenses for a specific trip */
export async function getQueuedExpenses(tripId?: string): Promise<QueuedExpense[]> {
  try {
    const db = await openDB();
    const store = txRead(db);
    const request = store.getAll();
    const results = await new Promise<QueuedExpense[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as QueuedExpense[]);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (tripId) return results.filter(r => r.tripId === tripId);
    return results;
  } catch (e) {
    console.warn('[offlineExpenseQueue] getQueuedExpenses failed:', e);
    return [];
  }
}

/** Update a queued record */
export async function updateQueuedExpense(
  clientExpenseId: string,
  updates: Partial<QueuedExpense>
): Promise<void> {
  try {
    const db = await openDB();
    const store = txRead(db);
    const getReq = store.get(clientExpenseId);
    const existing = await new Promise<QueuedExpense | undefined>((res, rej) => {
      getReq.onsuccess = () => res(getReq.result as QueuedExpense | undefined);
      getReq.onerror = () => rej(getReq.error);
    });
    if (!existing) { db.close(); return; }

    const updated = { ...existing, ...updates };
    const writeStore = txWrite(db);
    writeStore.put(updated);
    await new Promise<void>((res, rej) => {
      writeStore.transaction.oncomplete = () => res();
      writeStore.transaction.onerror = () => rej(writeStore.transaction.error);
    });
    db.close();
  } catch (e) {
    console.error('[offlineExpenseQueue] updateQueuedExpense failed:', e);
  }
}

/** Remove a queued expense after confirmed server reconciliation or user delete */
export async function removeQueuedExpense(clientExpenseId: string): Promise<void> {
  try {
    const db = await openDB();
    const store = txWrite(db);
    store.delete(clientExpenseId);
    await new Promise<void>((res, rej) => {
      store.transaction.oncomplete = () => res();
      store.transaction.onerror = () => rej(store.transaction.error);
    });
    db.close();
  } catch (e) {
    console.error('[offlineExpenseQueue] removeQueuedExpense failed:', e);
  }
}

// ── Queue Processor ──

let processingLock = false;

/**
 * Process the offline expense queue.
 *
 * Exactly-once financial identity is enforced by `client_expense_id`:
 * - every queued record keeps one stable UUID;
 * - every replay sends that UUID to Postgres;
 * - Postgres has a unique index on the UUID;
 * - upsert targets that unique key, so a retry reconciles the existing row
 *   instead of creating a second expense.
 *
 * The in-memory lock prevents duplicate processors within one runtime; the
 * database uniqueness guarantee protects retries across reloads/processes.
 */
export async function processOfflineExpenseQueue(
  onSynced?: (clientId: string, serverId: string, tripId: string) => void
): Promise<void> {
  if (processingLock) return;
  processingLock = true;

  try {
    const all = await getQueuedExpenses();
    const pending = all
      .filter(r => r.syncStatus === 'pending' || r.syncStatus === 'failed')
      .filter(r => r.retryCount < MAX_RETRIES)
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const record of pending) {
      await updateQueuedExpense(record.clientExpenseId, { syncStatus: 'syncing' });

      try {
        const payload = buildExpenseSyncPayload(record);

        const { data, error } = await supabase
          .from('expenses')
          .upsert(payload as never, { onConflict: 'client_expense_id' })
          .select()
          .single();

        if (error) throw error;

        // Only remove local intent after the server has returned the canonical row.
        await removeQueuedExpense(record.clientExpenseId);
        onSynced?.(record.clientExpenseId, data.id, record.tripId);
      } catch (err) {
        console.warn('[offlineExpenseQueue] sync failed for', record.clientExpenseId, err);
        await updateQueuedExpense(record.clientExpenseId, {
          syncStatus: 'failed',
          retryCount: record.retryCount + 1,
        });
      }
    }
  } finally {
    processingLock = false;
  }
}

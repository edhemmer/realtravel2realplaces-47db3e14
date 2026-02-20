/**
 * v4.1.0: In-Memory Import Batch Store
 *
 * Temporary holding area for multi-confirmation import batches.
 * ALL parsed confirmations from a single import action are accumulated
 * here before trip creation.
 *
 * RULES:
 * - One batchId per import action
 * - upsertImportBatch appends/merges — never replaces
 * - clearImportBatch removes the batch after trip creation
 * - No persistence — purely in-memory for the current session
 */

import type { ImportBatch, ParsedConfirmation } from './types';
import { generateBatchId } from './types';

// ============================================================================
// STORE
// ============================================================================

const batchStore = new Map<string, ImportBatch>();

/**
 * Create a new empty batch and return its ID.
 */
export function createImportBatch(): string {
  const batchId = generateBatchId();
  batchStore.set(batchId, {
    batchId,
    createdAt: new Date(),
    items: [],
  });
  return batchId;
}

/**
 * Append parsed confirmations to an existing batch.
 * If the batch doesn't exist, creates it.
 * Deduplicates by confirmationNumber (if present).
 *
 * @returns The updated batch
 */
export function upsertImportBatch(
  batchId: string,
  confirmations: ParsedConfirmation[],
): ImportBatch {
  let batch = batchStore.get(batchId);

  if (!batch) {
    batch = {
      batchId,
      createdAt: new Date(),
      items: [],
    };
    batchStore.set(batchId, batch);
  }

  for (const conf of confirmations) {
    // Dedup by confirmationNumber if present
    if (conf.confirmationNumber) {
      const existing = batch.items.find(
        item => item.confirmationNumber === conf.confirmationNumber,
      );
      if (existing) {
        // Merge: fill missing fields from new confirmation
        mergeConfirmation(existing, conf);
        continue;
      }
    }

    // Also dedup by confirmationId (same parse result added twice)
    const existingById = batch.items.find(
      item => item.confirmationId === conf.confirmationId,
    );
    if (existingById) continue;

    batch.items.push(conf);
  }

  return batch;
}

/**
 * Get an existing batch by ID.
 * Returns null if not found.
 */
export function getImportBatch(batchId: string): ImportBatch | null {
  return batchStore.get(batchId) || null;
}

/**
 * Remove a batch from the store (after trip creation).
 */
export function clearImportBatch(batchId: string): void {
  batchStore.delete(batchId);
}

/**
 * Get the current active batch ID (most recent).
 * Returns null if no batches exist.
 */
export function getActiveBatchId(): string | null {
  let latest: ImportBatch | null = null;
  for (const batch of batchStore.values()) {
    if (!latest || batch.createdAt > latest.createdAt) {
      latest = batch;
    }
  }
  return latest?.batchId || null;
}

/**
 * Clear all batches (e.g., on session reset).
 */
export function clearAllBatches(): void {
  batchStore.clear();
}

// ============================================================================
// MERGE HELPER
// ============================================================================

/**
 * Merge incoming confirmation fields into existing one.
 * Only fills null/empty fields — never overwrites existing data.
 */
function mergeConfirmation(
  existing: ParsedConfirmation,
  incoming: ParsedConfirmation,
): void {
  if (!existing.vendorName && incoming.vendorName) {
    existing.vendorName = incoming.vendorName;
  }
  if (!existing.rawStartString && incoming.rawStartString) {
    existing.rawStartString = incoming.rawStartString;
    existing.startDate = incoming.startDate;
  }
  if (!existing.rawEndString && incoming.rawEndString) {
    existing.rawEndString = incoming.rawEndString;
    existing.endDate = incoming.endDate;
  }
  if (existing.totalCost === null && incoming.totalCost !== null) {
    existing.totalCost = incoming.totalCost;
    existing.costCurrency = incoming.costCurrency;
    existing.isTotalForBooking = incoming.isTotalForBooking;
  }
  if (!existing.propertyName && incoming.propertyName) {
    existing.propertyName = incoming.propertyName;
  }
  if (!existing.address && incoming.address) {
    existing.address = incoming.address;
  }

  // Merge legs (append new legs not already present)
  for (const incomingLeg of incoming.legs) {
    const exists = existing.legs.some(
      l =>
        l.originCode === incomingLeg.originCode &&
        l.destinationCode === incomingLeg.destinationCode &&
        l.rawDepartureString === incomingLeg.rawDepartureString,
    );
    if (!exists) {
      existing.legs.push(incomingLeg);
    }
  }
}

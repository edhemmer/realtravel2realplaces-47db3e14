/**
 * v4.1.0: Finalize Import Batch
 *
 * The single entry point for committing a batch import to the database.
 * Reads the full ImportBatch, computes trip frame, creates the trip,
 * timeline items, and expenses, then clears the batch.
 *
 * RULES:
 * - Reads full batch — never partial
 * - Computes trip frame from ALL items
 * - Creates trip, timeline, expenses in sequence
 * - Clears batch on completion
 * - Returns structured result for UI consumption
 */

import { getImportBatch, clearImportBatch } from './importBatchStore';
import { computeTripFrame, tripFrameToDateTokens } from './tripFrame';
import { createTimelineFromConfirmations } from './createTimelineFromConfirmations';
import { buildExpensesFromConfirmations } from './buildExpensesFromConfirmations';
import type { ExpenseRecord } from './types';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface FinalizeResult {
  success: boolean;
  tripId: string | null;
  bookingIds: string[];
  expenseCount: number;
  error: string | null;
}

// ============================================================================
// CORE
// ============================================================================

/**
 * Finalize an import batch: create trip + timeline + expenses.
 *
 * @param batchId - The batch to finalize
 * @param userId - The authenticated user's ID
 * @param tripName - Name for the trip (from wizard or auto-derived)
 * @param tripMeta - Additional trip metadata (destination, type, etc.)
 */
export async function finalizeImportBatch(
  batchId: string,
  userId: string,
  tripName: string,
  tripMeta?: {
    destinationCity?: string;
    destinationState?: string;
    destinationCountry?: string;
    tripType?: 'business' | 'personal' | 'mixed';
    transportationMode?: 'flight' | 'drive' | 'unspecified';
  },
): Promise<FinalizeResult> {
  const batch = getImportBatch(batchId);

  if (!batch || batch.items.length === 0) {
    return {
      success: false,
      tripId: null,
      bookingIds: [],
      expenseCount: 0,
      error: 'No import batch found or batch is empty',
    };
  }

  try {
    // 1. Compute trip frame from the full batch
    const frame = computeTripFrame(batch);

    if (!frame) {
      return {
        success: false,
        tripId: null,
        bookingIds: [],
        expenseCount: 0,
        error: 'Could not determine trip dates from confirmations',
      };
    }

    const { startDateToken, endDateToken } = tripFrameToDateTokens(frame);

    // 2. Create the trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        user_id: userId,
        name: tripName || 'Imported Trip',
        start_date: startDateToken,
        end_date: endDateToken,
        destination_city: tripMeta?.destinationCity || null,
        destination_state: tripMeta?.destinationState || null,
        destination_country: tripMeta?.destinationCountry || null,
        trip_type: tripMeta?.tripType || 'personal',
        transportation_mode: tripMeta?.transportationMode || 'unspecified',
      })
      .select('id')
      .single();

    if (tripError || !trip) {
      console.error('[finalizeImportBatch] Trip creation failed:', tripError);
      return {
        success: false,
        tripId: null,
        bookingIds: [],
        expenseCount: 0,
        error: `Trip creation failed: ${tripError?.message || 'Unknown error'}`,
      };
    }

    const tripId = trip.id;

    // 3. Create timeline items (bookings) from all confirmations
    const bookingIds = await createTimelineFromConfirmations(tripId, batch.items);

    // 4. Build and persist expenses
    const expenseRecords = buildExpensesFromConfirmations(tripId, batch.items);
    let persistedExpenseCount = 0;

    if (expenseRecords.length > 0) {
      persistedExpenseCount = await persistExpenses(tripId, expenseRecords);
    }

    // 5. Clear the batch
    clearImportBatch(batchId);

    return {
      success: true,
      tripId,
      bookingIds,
      expenseCount: persistedExpenseCount,
      error: null,
    };
  } catch (err: any) {
    console.error('[finalizeImportBatch] Unexpected error:', err);
    return {
      success: false,
      tripId: null,
      bookingIds: [],
      expenseCount: 0,
      error: err.message || 'Unexpected error during import',
    };
  }
}

// ============================================================================
// EXPENSE PERSISTENCE
// ============================================================================

async function persistExpenses(
  tripId: string,
  records: ExpenseRecord[],
): Promise<number> {
  let count = 0;

  for (const rec of records) {
    const { error } = await supabase
      .from('expenses')
      .insert({
        trip_id: tripId,
        date: rec.date,
        category: rec.category as any,
        description: rec.description,
        amount: rec.amount,
        currency: rec.currency,
        notes: rec.notes || null,
      });

    if (error) {
      console.error('[persistExpenses] Insert error:', error.message, rec);
    } else {
      count++;
    }
  }

  return count;
}

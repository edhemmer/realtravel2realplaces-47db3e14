/**
 * useBookingExpenseSync — Canonical retroactive expense repair hook
 * 
 * v4.9.5: Moved from ExpensesTab tab-level effect to a canonical hook
 * that runs at the container/shell level on trip load.
 * 
 * This ensures every booking has a linked expense (priced or [needs_pricing])
 * regardless of which tab the user views first. NOW, PLAN, EXPENSES, and
 * reports all see identical, fully-linked booking→expense state.
 * 
 * ARCHITECTURE:
 * - Runs ONCE per trip load (guarded by ref + dependency check)
 * - Non-blocking: failures are logged, never surfaced as errors
 * - Invalidates ['expenses', tripId] after any repairs so React Query
 *   delivers updated data to all consumers
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Booking, Expense } from '@/types/database';
import { extractBookingIdFromNotes, syncExpenseFromBooking } from '@/lib/bookingExpenseSync';

interface UseBookingExpenseSyncOptions {
  tripId: string;
  bookings: Booking[];
  expenses: Expense[];
  bookingsLoading: boolean;
  expensesLoading: boolean;
  homeCurrency: string;
}

/**
 * Canonical hook that ensures every booking has a linked expense.
 * Must be called at the container/shell level, NOT inside tab components.
 */
export function useBookingExpenseSync({
  tripId,
  bookings,
  expenses,
  bookingsLoading,
  expensesLoading,
  homeCurrency,
}: UseBookingExpenseSyncOptions): void {
  const queryClient = useQueryClient();
  const syncAttemptedRef = useRef(false);
  // Reset when tripId changes
  const tripIdRef = useRef(tripId);
  if (tripIdRef.current !== tripId) {
    tripIdRef.current = tripId;
    syncAttemptedRef.current = false;
  }

  useEffect(() => {
    if (syncAttemptedRef.current || bookingsLoading || expensesLoading || !bookings.length) return;

    // Find bookings without a linked expense
    const linkedBookingIds = new Set(
      expenses.map(e => extractBookingIdFromNotes(e.notes)).filter(Boolean)
    );
    const unlinkedBookings = bookings.filter(b => !linkedBookingIds.has(b.id));

    if (unlinkedBookings.length === 0) {
      syncAttemptedRef.current = true;
      return;
    }

    syncAttemptedRef.current = true;

    // Sync in background — non-blocking
    (async () => {
      let repaired = 0;
      for (const booking of unlinkedBookings) {
        try {
          await syncExpenseFromBooking(booking as any, homeCurrency);
          repaired++;
        } catch {
          // Non-blocking — log only
          console.warn('[useBookingExpenseSync] Failed to sync expense for booking', booking.id);
        }
      }
      if (repaired > 0) {
        queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      }
    })();
  }, [bookings, expenses, bookingsLoading, expensesLoading, homeCurrency, tripId, queryClient]);
}

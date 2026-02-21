/**
 * useBookingExpenseSync — Canonical retroactive expense repair hook
 * 
 * v4.9.6: PNR-aware grouping — for multi-leg flights sharing a confirmation
 * number, only ONE expense is created (linked to the earliest leg).
 * Non-canonical legs in the same PNR group do NOT get separate expenses.
 * 
 * This ensures every PNR/booking has a corresponding expense record
 * (priced or [needs_pricing]) regardless of which tab the user views first.
 * 
 * ARCHITECTURE:
 * - Runs ONCE per trip load (guarded by ref + dependency check)
 * - Non-blocking: failures are logged, never surfaced as errors
 * - Invalidates ['expenses', tripId] after any repairs
 * - Groups flight bookings by confirmation_number to prevent per-leg expenses
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Booking, Expense } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
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
 * Get the canonical booking for a PNR group (earliest departure).
 * For multi-leg flights, only the canonical booking gets an expense.
 */
function getCanonicalBookingPerPNR(bookings: Booking[]): {
  canonicalBookings: Booking[];
  nonCanonicalBookingIds: Set<string>;
} {
  // Separate flights from non-flights
  const flights = bookings.filter(b => b.booking_type === 'flight');
  const nonFlights = bookings.filter(b => b.booking_type !== 'flight');

  // Group flights by confirmation_number
  const pnrGroups = new Map<string, Booking[]>();
  const ungroupedFlights: Booking[] = [];

  for (const flight of flights) {
    const conf = (flight.confirmation_number || '').trim().toUpperCase();
    if (!conf || conf.length < 3) {
      ungroupedFlights.push(flight);
      continue;
    }
    if (!pnrGroups.has(conf)) pnrGroups.set(conf, []);
    pnrGroups.get(conf)!.push(flight);
  }

  const canonicalBookings: Booking[] = [...nonFlights, ...ungroupedFlights];
  const nonCanonicalBookingIds = new Set<string>();

  for (const [, group] of pnrGroups) {
    if (group.length === 1) {
      canonicalBookings.push(group[0]);
      continue;
    }

    // Sort by start_datetime to find canonical (earliest) booking
    const sorted = [...group].sort((a, b) => {
      const aTime = a.start_datetime || '';
      const bTime = b.start_datetime || '';
      return aTime < bTime ? -1 : aTime > bTime ? 1 : 0;
    });

    // Canonical = first leg; it gets the PNR's total cost
    const canonical = sorted[0];

    // If the canonical has no cost but another leg does, use that cost
    let bestCostBooking = canonical;
    if (!canonical.total_cost || Number(canonical.total_cost) <= 0) {
      const withCost = sorted.find(b => b.total_cost && Number(b.total_cost) > 0);
      if (withCost) {
        bestCostBooking = withCost;
      }
    }

    // If the cost lives on a non-canonical leg, migrate it to canonical for sync
    if (bestCostBooking.id !== canonical.id) {
      // Create a shallow copy with the cost from the best source
      canonicalBookings.push({
        ...canonical,
        total_cost: bestCostBooking.total_cost,
        my_share: bestCostBooking.my_share,
      });
    } else {
      canonicalBookings.push(canonical);
    }

    // Mark all other legs as non-canonical
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].id !== canonical.id) {
        nonCanonicalBookingIds.add(sorted[i].id);
      }
    }
  }

  return { canonicalBookings, nonCanonicalBookingIds };
}

/**
 * Canonical hook that ensures every booking/PNR has exactly one linked expense.
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

    const { canonicalBookings, nonCanonicalBookingIds } = getCanonicalBookingPerPNR(bookings);

    // Build set of booking IDs that already have linked expenses
    const linkedBookingIds = new Set(
      expenses.map(e => extractBookingIdFromNotes(e.notes)).filter(Boolean)
    );

    // Find canonical bookings without a linked expense
    const unlinkedCanonical = canonicalBookings.filter(b => !linkedBookingIds.has(b.id));

    // Find orphan expenses linked to non-canonical legs (should be removed)
    const orphanExpenses = expenses.filter(e => {
      const linkedId = extractBookingIdFromNotes(e.notes);
      return linkedId && nonCanonicalBookingIds.has(linkedId);
    });

    if (unlinkedCanonical.length === 0 && orphanExpenses.length === 0) {
      syncAttemptedRef.current = true;
      return;
    }

    syncAttemptedRef.current = true;

    // Sync in background — non-blocking
    (async () => {
      let changed = 0;

      // Create missing canonical expenses
      for (const booking of unlinkedCanonical) {
        try {
          await syncExpenseFromBooking(booking as any, homeCurrency);
          changed++;
        } catch {
          console.warn('[useBookingExpenseSync] Failed to sync expense for booking', booking.id);
        }
      }

      // Delete orphan expenses for non-canonical legs
      for (const orphan of orphanExpenses) {
        try {
          await supabase.from('expenses').delete().eq('id', orphan.id);
          changed++;
        } catch {
          console.warn('[useBookingExpenseSync] Failed to delete orphan expense', orphan.id);
        }
      }

      if (changed > 0) {
        queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      }
    })();
  }, [bookings, expenses, bookingsLoading, expensesLoading, homeCurrency, tripId, queryClient]);
}

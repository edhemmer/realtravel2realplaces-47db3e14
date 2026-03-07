/**
 * TripExpensesContainer - Container component for Trip Expenses tab
 * 
 * Patch 2.2.2: Canonical trip containers & bug-fix-at-source architecture
 * 
 * This container:
 * - Fetches expense data through canonical hooks
 * - Uses canonical cost summary from useCanonicalTripState
 * - Handles loading/error/empty states consistently
 * 
 * CANONICAL HELPERS USED:
 * - useExpenses() for expenses list
 * - useBookings() for booking-linked expenses
 * - calculateTripCostSummary() for totals (via canonical state)
 * 
 * IMPORTANT: Only bookings/expenses/parking are included in cost calculations.
 * Tours/Engagements are NEVER included in cost totals.
 */

import { Trip } from '@/types/database';
import { useExpenses, useOfflineExpenseSync } from '@/hooks/useExpenses';
import { useBookings } from '@/hooks/useBookings';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBookingExpenseSync } from '@/hooks/useBookingExpenseSync';
import { TripSectionLoading, TripSectionError } from '@/components/trips/TripSectionStates';
import { ExpensesTab } from '@/components/trips/tabs/ExpensesTab';

interface TripExpensesContainerProps {
  tripId: string;
  trip?: Trip;
  /** v2.3.5: Signal to auto-open Add Expense dialog */
  autoOpenAdd?: boolean;
  onAutoOpenConsumed?: () => void;
}

/**
 * Container that wires canonical hooks to ExpensesTab
 * 
 * v4.9.5: Owns the canonical booking→expense retroactive repair via
 * useBookingExpenseSync. This ensures repairs happen at container level,
 * not inside tab components, so all views see consistent data.
 * 
 * Tours are excluded from all cost calculations.
 */
export function TripExpensesContainer({ tripId, trip, autoOpenAdd, onAutoOpenConsumed }: TripExpensesContainerProps) {
  // Canonical data fetching
  const { data: expenses = [], isLoading: expensesLoading, error: expensesError, refreshQueued } = useExpenses(tripId);
  
  // v4.0.3: Process offline expense queue on reconnect
  useOfflineExpenseSync(tripId);
  const { data: bookings = [], isLoading: bookingsLoading, error: bookingsError } = useBookings(tripId);
  const { data: userProfile } = useUserProfile();
  const homeCurrency = userProfile?.preferred_currency || 'USD';
  
  // v4.9.5: Canonical retroactive repair — ensures every booking has a linked expense
  useBookingExpenseSync({
    tripId,
    bookings,
    expenses,
    bookingsLoading,
    expensesLoading,
    homeCurrency,
  });
  
  const isLoading = expensesLoading || bookingsLoading;
  const hasError = expensesError || bookingsError;
  
  if (isLoading) {
    return <TripSectionLoading message="Loading expenses..." />;
  }
  
  if (hasError) {
    return (
      <TripSectionError 
        message="We couldn't load your expenses. Please try again."
      />
    );
  }
  
  return (
    <ExpensesTab tripId={tripId} autoOpenAdd={autoOpenAdd} onAutoOpenConsumed={onAutoOpenConsumed} />
  );
}

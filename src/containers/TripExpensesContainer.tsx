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
import { useExpenses } from '@/hooks/useExpenses';
import { useBookings } from '@/hooks/useBookings';
import { TripSectionLoading, TripSectionError } from '@/components/trips/TripSectionStates';
import { ExpensesTab } from '@/components/trips/tabs/ExpensesTab';

interface TripExpensesContainerProps {
  tripId: string;
  trip?: Trip;
}

/**
 * Container that wires canonical hooks to ExpensesTab
 * 
 * ExpensesTab internally uses:
 * - calculateTripCostSummary() for cost totals
 * - normalizeFlightBookingCosts() for Frontier-style cost normalization
 * 
 * Tours are excluded from all cost calculations.
 */
export function TripExpensesContainer({ tripId, trip }: TripExpensesContainerProps) {
  // Canonical data fetching
  const { isLoading: expensesLoading, error: expensesError } = useExpenses(tripId);
  const { isLoading: bookingsLoading, error: bookingsError } = useBookings(tripId);
  
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
  
  // Render the presentational view
  // ExpensesTab handles its own data fetching and mutations internally
  return (
    <ExpensesTab tripId={tripId} />
  );
}

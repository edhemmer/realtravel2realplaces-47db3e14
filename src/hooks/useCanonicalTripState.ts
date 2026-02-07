/**
 * v2.0.7: Canonical Trip State Hook
 * 
 * React hook providing canonical trip state as the single source of truth
 * for trip dates, timeline events, and costs.
 * 
 * USAGE:
 * All components displaying trip dates, times, or costs should use this hook
 * rather than fetching data independently and calculating their own values.
 */

import { useMemo } from 'react';
import { Trip, Booking, Expense, Parking } from '@/types/database';
import { 
  getCanonicalTripState, 
  CanonicalTripState,
  CanonicalDateRange,
  CanonicalTimelineEvent,
  CanonicalCostSummary,
} from '@/lib/canonicalTripState';
import { useBookings } from './useBookings';
import { useExpenses } from './useExpenses';
import { useParking } from './useParking';

// Re-export types for convenience
export type { 
  CanonicalTripState, 
  CanonicalDateRange, 
  CanonicalTimelineEvent, 
  CanonicalCostSummary,
};

interface UseCanonicalTripStateResult {
  /** Complete canonical trip state */
  state: CanonicalTripState | null;
  /** Loading state */
  isLoading: boolean;
  /** Quick accessors */
  dateRange: CanonicalDateRange | null;
  timelineEvents: CanonicalTimelineEvent[];
  costs: CanonicalCostSummary | null;
  hasFlights: boolean;
  hasStays: boolean;
  hasRentals: boolean;
  hasActivities: boolean;
  hasParking: boolean;
}

/**
 * Hook to get canonical trip state with automatic data fetching
 * 
 * @param tripId - The trip ID to fetch state for
 * @param trip - The trip record (must be provided)
 * @returns Canonical trip state with loading indicator
 */
export function useCanonicalTripState(
  tripId: string,
  trip: Trip | null
): UseCanonicalTripStateResult {
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(tripId);
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(tripId);
  const { data: parkingList = [], isLoading: parkingLoading } = useParking(tripId);
  
  const isLoading = bookingsLoading || expensesLoading || parkingLoading || !trip;
  
  // Memoize the canonical state calculation
  const state = useMemo(() => {
    if (!trip) return null;
    return getCanonicalTripState(trip, bookings, expenses, parkingList);
  }, [trip, bookings, expenses, parkingList]);
  
  return {
    state,
    isLoading,
    dateRange: state?.dateRange ?? null,
    timelineEvents: state?.timelineEvents ?? [],
    costs: state?.costs ?? null,
    hasFlights: state?.hasFlights ?? false,
    hasStays: state?.hasStays ?? false,
    hasRentals: state?.hasRentals ?? false,
    hasActivities: state?.hasActivities ?? false,
    hasParking: state?.hasParking ?? false,
  };
}

/**
 * Lightweight version that uses pre-fetched data
 * Use this when data is already available from parent component
 * 
 * @param trip - The trip record
 * @param bookings - Pre-fetched bookings
 * @param expenses - Pre-fetched expenses
 * @param parkingList - Pre-fetched parking entries
 * @returns Canonical trip state (memoized)
 */
export function useCanonicalTripStateFromData(
  trip: Trip | null,
  bookings: Booking[],
  expenses: Expense[],
  parkingList: Parking[]
): CanonicalTripState | null {
  return useMemo(() => {
    if (!trip) return null;
    return getCanonicalTripState(trip, bookings, expenses, parkingList);
  }, [trip, bookings, expenses, parkingList]);
}

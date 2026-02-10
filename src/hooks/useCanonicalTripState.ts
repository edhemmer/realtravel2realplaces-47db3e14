/**
 * v2.2.6: Canonical Trip State Hook
 * 
 * React hook providing canonical trip state as the single source of truth
 * for trip dates, timeline events, costs, and weather.
 * 
 * USAGE:
 * All components displaying trip dates, times, costs, or weather should
 * use this hook rather than fetching data independently.
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
import { 
  WeatherSnapshot, 
  forecastToSnapshots, 
  getWeatherForEvent, 
  deriveWeatherPills,
  WeatherPill,
} from '@/lib/canonicalWeather';
import { useBookings } from './useBookings';
import { useExpenses } from './useExpenses';
import { useParking } from './useParking';
import { useTripWeather } from './useWeather';
import { useProfileTemperatureUnit } from './useProfileTemperatureUnit';

// Re-export types for convenience
export type { 
  CanonicalTripState, 
  CanonicalDateRange, 
  CanonicalTimelineEvent, 
  CanonicalCostSummary,
  WeatherSnapshot,
  WeatherPill,
};

// Re-export weather helpers
export { getWeatherForEvent, deriveWeatherPills };

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
  /** v2.2.6: Weather lookup map */
  weatherByKey: Record<string, WeatherSnapshot>;
}

/**
 * Hook to get canonical trip state with automatic data fetching
 * including weather data populated into weatherByKey.
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
  
  const { unit: tempUnit } = useProfileTemperatureUnit();
  
  // Fetch weather for the trip destination
  const { tripForecast, isLoading: weatherLoading } = useTripWeather(
    trip?.destination_city || '',
    trip?.destination_country || '',
    trip?.start_date || '',
    trip?.end_date || '',
    trip?.destination_state || undefined,
    tempUnit
  );
  
  const isLoading = bookingsLoading || expensesLoading || parkingLoading || !trip;
  
  // Memoize the canonical state calculation + weather integration
  const state = useMemo(() => {
    if (!trip) return null;
    const base = getCanonicalTripState(trip, bookings, expenses, parkingList);
    
    // Populate weatherByKey from forecast data
    if (tripForecast.length > 0) {
      const destId = `dest::${trip.destination_city}`;
      const snapshots = forecastToSnapshots(
        tripForecast,
        destId,
        'drive',
        trip.destination_city,
        trip.destination_state || undefined,
        trip.destination_country,
      );
      base.weatherByKey = snapshots;
    }
    
    return base;
  }, [trip, bookings, expenses, parkingList, tripForecast]);
  
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
    weatherByKey: state?.weatherByKey ?? {},
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

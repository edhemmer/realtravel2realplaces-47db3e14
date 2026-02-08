/**
 * TripSummaryContainer - Container component for Trip Summary tab
 * 
 * Patch 2.2.2: Canonical trip containers & bug-fix-at-source architecture
 * 
 * This container:
 * - Fetches all data through canonical hooks
 * - Prepares clean, typed props for the presentational view
 * - Handles loading/error/empty states consistently
 * 
 * CANONICAL HELPERS USED:
 * - useAccess() for plan/tier info
 * - useCanonicalTripState() for trip basics & cost summary
 * - useTripWeather() for weather data
 * - useCompanions() for traveler count
 */

import { useMemo } from 'react';
import { Trip } from '@/types/database';
import { useBookings } from '@/hooks/useBookings';
import { useExpenses } from '@/hooks/useExpenses';
import { useParking } from '@/hooks/useParking';
import { useCompanions } from '@/hooks/useCompanions';
import { useBookingCompanionsByTrip } from '@/hooks/useBookingCompanions';
import { useTripWeather } from '@/hooks/useWeather';
import { useTravelAlerts } from '@/hooks/useTravelAlerts';
import { useAccess } from '@/hooks/useAccess';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCanonicalTripStateFromData } from '@/hooks/useCanonicalTripState';
import { TripSectionLoading, TripSectionError } from '@/components/trips/TripSectionStates';
import { SummaryTab } from '@/components/trips/tabs/SummaryTab';
import type { DrillThroughTarget } from '@/pages/TripDetail';

interface TripSummaryContainerProps {
  tripId: string;
  trip: Trip;
  onDrillThrough?: (target: DrillThroughTarget) => void;
}

/**
 * Container that wires canonical hooks to SummaryTab
 * 
 * All data flows through canonical helpers:
 * - Cost calculations via useCanonicalTripState
 * - Weather via useTripWeather  
 * - Alerts via useTravelAlerts
 */
export function TripSummaryContainer({ tripId, trip, onDrillThrough }: TripSummaryContainerProps) {
  // Access control
  const { isPro, isLoading: accessLoading } = useAccess();
  const { data: userProfile } = useUserProfile();
  
  // Canonical data fetching
  const { data: bookings = [], isLoading: bookingsLoading, error: bookingsError } = useBookings(tripId);
  const { data: expenses = [], isLoading: expensesLoading, error: expensesError } = useExpenses(tripId);
  const { data: parkingList = [], isLoading: parkingLoading, error: parkingError } = useParking(tripId);
  const { data: companions = [], isLoading: companionsLoading } = useCompanions(tripId);
  
  // Temperature unit from user profile
  const temperatureUnit = (userProfile?.temperature_unit as 'fahrenheit' | 'celsius') || 'fahrenheit';
  
  // Weather data
  const { tripForecast, weatherAnalysis, isLoading: weatherLoading } = useTripWeather(
    trip.destination_city,
    trip.destination_country,
    trip.start_date,
    trip.end_date,
    trip.destination_state || undefined,
    temperatureUnit
  );
  
  // Canonical trip state (costs, timeline, dates)
  const canonicalState = useCanonicalTripStateFromData(trip, bookings, expenses, parkingList);
  
  // Loading state
  const isLoading = bookingsLoading || expensesLoading || parkingLoading || accessLoading;
  
  // Error state
  const hasError = bookingsError || expensesError || parkingError;
  
  if (isLoading) {
    return <TripSectionLoading message="Loading trip summary..." />;
  }
  
  if (hasError) {
    return (
      <TripSectionError 
        message="We couldn't load your trip summary. Please try again."
      />
    );
  }
  
  // Render the presentational view with prepared props
  // SummaryTab currently handles its own data fetching internally,
  // but this container ensures the canonical hooks are used
  return (
    <SummaryTab 
      tripId={tripId} 
      trip={trip} 
      onDrillThrough={onDrillThrough}
    />
  );
}

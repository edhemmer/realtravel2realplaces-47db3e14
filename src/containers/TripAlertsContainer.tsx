/**
 * TripAlertsContainer - Container component for Trip Alerts display
 * 
 * Patch 2.2.2: Canonical trip containers & bug-fix-at-source architecture
 * 
 * This container:
 * - Fetches alert data through canonical hooks
 * - Combines weather alerts, departure reminders, parking expiry
 * - Handles loading/error/empty states consistently
 * 
 * CANONICAL HELPERS USED:
 * - useTripWeather() for weather-based alerts
 * - useTravelAlerts() for combined alert generation
 * - useAccess() for plan-gated alert features
 */

import { Trip, Booking, Parking } from '@/types/database';
import { useBookings } from '@/hooks/useBookings';
import { useParking } from '@/hooks/useParking';
import { useTravelAlerts } from '@/hooks/useTravelAlerts';
import { useUserProfile } from '@/hooks/useUserProfile';
import { TripSectionLoading, TripSectionError, EmptyAlertsState } from '@/components/trips/TripSectionStates';
import { TravelAlertsCard } from '@/components/trips/TravelAlertsCard';

interface TripAlertsContainerProps {
  tripId: string;
  trip: Trip;
  className?: string;
}

/**
 * Container that wires canonical hooks to TravelAlertsCard
 * 
 * Uses useTravelAlerts() which generates alerts from:
 * - Weather changes (via useTripWeather)
 * - Departure reminders (from flight bookings)
 * - Parking expiry warnings
 */
export function TripAlertsContainer({ tripId, trip, className }: TripAlertsContainerProps) {
  const { data: userProfile } = useUserProfile();
  const { data: bookings = [], isLoading: bookingsLoading, error: bookingsError } = useBookings(tripId);
  const { data: parkingList = [], isLoading: parkingLoading, error: parkingError } = useParking(tripId);
  
  const temperatureUnit = (userProfile?.temperature_unit as 'fahrenheit' | 'celsius') || 'fahrenheit';
  
  // Get travel alerts using canonical hook
  const { alerts, hasAlerts, weatherLoading } = useTravelAlerts(
    trip, 
    bookings, 
    parkingList,
    temperatureUnit
  );
  
  const isLoading = bookingsLoading || parkingLoading || weatherLoading;
  const hasError = bookingsError || parkingError;
  
  if (isLoading) {
    return <TripSectionLoading message="Checking alerts..." />;
  }
  
  if (hasError) {
    return (
      <TripSectionError 
        message="We couldn't load alerts for this trip."
      />
    );
  }
  
  // Empty state when no alerts
  if (!hasAlerts || alerts.length === 0) {
    return <EmptyAlertsState className={className} />;
  }
  
  // Render alerts card
  return <TravelAlertsCard alerts={alerts} className={className} />;
}

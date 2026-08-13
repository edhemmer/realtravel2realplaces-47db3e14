/**
 * TripAlertsContainer - Container component for Trip Alerts display
 *
 * Prefers shell-computed alerts on desktop and falls back to the canonical
 * alert hook elsewhere. Empty means "no alert recorded from available data";
 * it is never represented as proof of a live all-clear.
 */

import { Trip } from '@/types/database';
import { useBookings } from '@/hooks/useBookings';
import { useParking } from '@/hooks/useParking';
import { useTravelAlerts } from '@/hooks/useTravelAlerts';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useDesktopTripShell } from './DesktopTripShell';
import { TripSectionLoading, TripSectionError } from '@/components/trips/TripSectionStates';
import { TruthfulEmptyAlertsState } from '@/components/trips/TruthfulEmptyAlertsState';
import { TravelAlertsCard } from '@/components/trips/TravelAlertsCard';

interface TripAlertsContainerProps {
  tripId: string;
  trip: Trip;
  className?: string;
}

export function TripAlertsContainer({ tripId, trip, className }: TripAlertsContainerProps) {
  const shell = useDesktopTripShell();
  const { data: userProfile } = useUserProfile();
  const { data: bookings = [], isLoading: bookingsLoading, error: bookingsError } = useBookings(tripId);
  const { data: parkingList = [], isLoading: parkingLoading, error: parkingError } = useParking(tripId);
  const temperatureUnit = (userProfile?.temperature_unit as 'fahrenheit' | 'celsius') || 'fahrenheit';

  const { alerts: fallbackAlerts, hasAlerts: fallbackHasAlerts, weatherLoading } = useTravelAlerts(
    trip,
    bookings,
    parkingList,
    temperatureUnit,
  );

  const alerts = shell ? shell.alerts : fallbackAlerts;
  const hasAlerts = shell ? shell.hasAlerts : fallbackHasAlerts;
  const isLoading = shell ? shell.isAlertsLoading : bookingsLoading || parkingLoading || weatherLoading;
  const hasError = bookingsError || parkingError;

  if (isLoading) return <TripSectionLoading message="Checking available alert signals..." />;

  if (hasError) {
    return <TripSectionError message="We couldn't load all trip data needed for alerts." />;
  }

  if (!hasAlerts || alerts.length === 0) {
    return <TruthfulEmptyAlertsState className={className} />;
  }

  return <TravelAlertsCard alerts={alerts} className={className} />;
}

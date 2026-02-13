/**
 * TripAlertsContainer - Container component for Trip Alerts display
 * 
 * Patch 2.2.2: Canonical trip containers & bug-fix-at-source architecture
 * v2.6.12: Consumes DesktopTripShell context when available (no redundant alert computation)
 * 
 * This container:
 * - Checks DesktopTripShell context first for pre-computed alerts (desktop path)
 * - Falls back to independent hooks (mobile path / standalone use)
 * - Handles loading/error/empty states consistently
 * 
 * CANONICAL HELPERS USED:
 * - useDesktopTripShell() for shell-provided alerts (desktop)
 * - useTravelAlerts() for combined alert generation (fallback)
 */

import { Trip } from '@/types/database';
import { useBookings } from '@/hooks/useBookings';
import { useParking } from '@/hooks/useParking';
import { useTravelAlerts } from '@/hooks/useTravelAlerts';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useDesktopTripShell } from './DesktopTripShell';
import { TripSectionLoading, TripSectionError, EmptyAlertsState } from '@/components/trips/TripSectionStates';
import { TravelAlertsCard } from '@/components/trips/TravelAlertsCard';

interface TripAlertsContainerProps {
  tripId: string;
  trip: Trip;
  className?: string;
}

/**
 * Container that wires canonical hooks to TravelAlertsCard.
 * v2.6.12: Prefers shell-provided alerts on desktop to avoid redundant computation.
 */
export function TripAlertsContainer({ tripId, trip, className }: TripAlertsContainerProps) {
  // v2.6.12: Check shell context first (desktop path)
  const shell = useDesktopTripShell();
  
  // Fallback hooks — only compute independently when shell is not available
  const { data: userProfile } = useUserProfile();
  const { data: bookings = [], isLoading: bookingsLoading, error: bookingsError } = useBookings(tripId);
  const { data: parkingList = [], isLoading: parkingLoading, error: parkingError } = useParking(tripId);
  
  const temperatureUnit = (userProfile?.temperature_unit as 'fahrenheit' | 'celsius') || 'fahrenheit';
  
  // Fallback alert computation (mobile path)
  const { alerts: fallbackAlerts, hasAlerts: fallbackHasAlerts, weatherLoading } = useTravelAlerts(
    trip, 
    bookings, 
    parkingList,
    temperatureUnit
  );
  
  // v2.6.12: Use shell-provided alerts when available
  const alerts = shell ? shell.alerts : fallbackAlerts;
  const hasAlerts = shell ? shell.hasAlerts : fallbackHasAlerts;
  
  const isLoading = shell
    ? shell.isAlertsLoading
    : bookingsLoading || parkingLoading || weatherLoading;
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

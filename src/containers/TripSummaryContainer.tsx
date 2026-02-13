/**
 * TripSummaryContainer - Container component for Trip Summary tab
 * 
 * Patch 2.2.2: Canonical trip containers & bug-fix-at-source architecture
 * v2.6.12: Consumes DesktopTripShell context when available (no redundant computation)
 * 
 * This container:
 * - Checks DesktopTripShell context first (desktop path)
 * - Falls back to independent hooks (mobile path / standalone use)
 * - Handles loading/error/empty states consistently
 * 
 * CANONICAL HELPERS USED:
 * - useDesktopTripShell() for shell-provided state (desktop)
 * - useAccess() for plan/tier info (fallback)
 * - useCanonicalTripState() for trip basics & cost summary (fallback)
 * - useTripWeather() for weather data (fallback)
 */

import { Trip } from '@/types/database';
import { useBookings } from '@/hooks/useBookings';
import { useExpenses } from '@/hooks/useExpenses';
import { useParking } from '@/hooks/useParking';
import { useCompanions } from '@/hooks/useCompanions';
import { useAccess } from '@/hooks/useAccess';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCanonicalTripStateFromData } from '@/hooks/useCanonicalTripState';
import { useDesktopTripShell } from './DesktopTripShell';
import { TripSectionLoading, TripSectionError } from '@/components/trips/TripSectionStates';
import { SummaryTab } from '@/components/trips/tabs/SummaryTab';
import type { DrillThroughTarget } from '@/pages/TripDetail';

interface TripSummaryContainerProps {
  tripId: string;
  trip: Trip;
  onDrillThrough?: (target: DrillThroughTarget) => void;
  /** v2.6.12: Max alerts on mobile NOW tab */
  maxVisibleAlerts?: number;
  /** v2.6.12: Navigate to full alerts view */
  onViewAllAlerts?: () => void;
}

/**
 * Container that wires canonical hooks to SummaryTab.
 * v2.6.12: Prefers shell-provided state on desktop to avoid redundant computation.
 */
export function TripSummaryContainer({ tripId, trip, onDrillThrough, maxVisibleAlerts, onViewAllAlerts }: TripSummaryContainerProps) {
  // v2.6.12: Check shell context first (desktop path)
  const shell = useDesktopTripShell();
  
  // Fallback hooks — only compute when shell is not available (mobile path)
  const { isPro, isLoading: accessLoading } = useAccess();
  const { data: bookings = [], isLoading: bookingsLoading, error: bookingsError } = useBookings(tripId);
  const { data: expenses = [], isLoading: expensesLoading, error: expensesError } = useExpenses(tripId);
  const { data: parkingList = [], isLoading: parkingLoading, error: parkingError } = useParking(tripId);
  
  // Loading state — shell-aware
  const isLoading = shell
    ? shell.isLoading || shell.isCanonicalLoading
    : bookingsLoading || expensesLoading || parkingLoading || accessLoading;
  
  // Error state (shell doesn't expose errors — raw hooks always run via React Query dedup)
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
  
  // Render the presentational view
  // SummaryTab handles its own data display internally
  return (
    <SummaryTab 
      tripId={tripId} 
      trip={trip} 
      onDrillThrough={onDrillThrough}
      maxVisibleAlerts={maxVisibleAlerts}
      onViewAllAlerts={onViewAllAlerts}
    />
  );
}

/**
 * TripSummaryContainer - Container component for Trip Summary tab
 *
 * Patch 2.2.2: Canonical trip containers & bug-fix-at-source architecture
 * v2.6.12: Consumes DesktopTripShell context when available (no redundant computation)
 *
 * Promise-standard note:
 * Today currently uses SummaryTab on both desktop and mobile so unverified
 * readiness certification is not exposed while the command-board readiness
 * model is being rewritten around evidence-backed coverage.
 */

import { Trip } from '@/types/database';
import { useBookings } from '@/hooks/useBookings';
import { useExpenses } from '@/hooks/useExpenses';
import { useParking } from '@/hooks/useParking';
import { useAccess } from '@/hooks/useAccess';
import { useDesktopTripShell } from './DesktopTripShell';
import { TripSectionLoading, TripSectionError } from '@/components/trips/TripSectionStates';
import { SummaryTab } from '@/components/trips/tabs/SummaryTab';
import { AppModuleHeader } from '@/components/trips/AppModuleHeader';
import { LayoutDashboard } from 'lucide-react';
import type { DrillThroughTarget } from '@/pages/TripDetail';

interface TripSummaryContainerProps {
  tripId: string;
  trip: Trip;
  onDrillThrough?: (target: DrillThroughTarget) => void;
  maxVisibleAlerts?: number;
  onViewAllAlerts?: () => void;
  onExploreTab?: () => void;
}

export function TripSummaryContainer({ tripId, trip, onDrillThrough, maxVisibleAlerts, onViewAllAlerts, onExploreTab }: TripSummaryContainerProps) {
  const shell = useDesktopTripShell();

  const { isLoading: accessLoading } = useAccess();
  const { isLoading: bookingsLoading, error: bookingsError } = useBookings(tripId);
  const { isLoading: expensesLoading, error: expensesError } = useExpenses(tripId);
  const { isLoading: parkingLoading, error: parkingError } = useParking(tripId);

  const isLoading = shell
    ? shell.isLoading || shell.isCanonicalLoading
    : bookingsLoading || expensesLoading || parkingLoading || accessLoading;

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

  return (
    <div className="space-y-4">
      <AppModuleHeader
        icon={LayoutDashboard}
        eyebrow="Today"
        title="Today"
        description="The current trip view: recorded alerts, timeline, travel context, receipts, and the next details you may need."
        status={shell?.hasAlerts ? `${shell.criticalAlertCount} critical alerts` : 'Trip context'}
        statusTone={shell?.criticalAlertCount ? 'cached' : 'neutral'}
      />
      <SummaryTab
        tripId={tripId}
        trip={trip}
        onDrillThrough={onDrillThrough}
        maxVisibleAlerts={maxVisibleAlerts}
        onViewAllAlerts={onViewAllAlerts}
        onExploreTab={onExploreTab}
      />
    </div>
  );
}

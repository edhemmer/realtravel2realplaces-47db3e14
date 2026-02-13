/**
 * v3.1.0: NowCommandCenter Container
 *
 * Mobile-only execution-first command center for the NOW tab.
 * Replaces TripSummaryContainer on mobile — desktop unchanged.
 *
 * RENDER TREE:
 * 1. NextCriticalActionCard — countdown to next event
 * 2. ActiveAlertsStack — max 3, severity-ordered
 * 3. TodayCompactTimeline — today-only events, past dimmed
 * 4. StickyQuickOpsStrip — icon-only actions above bottom nav
 *
 * REMOVED FROM NOW (relocated to PLAN/desktop):
 * - Multi-day timeline
 * - Full booking cards
 * - Destination info
 * - Trip totals
 * - Explore content
 */

import { useState, useCallback, useMemo } from 'react';
import { Trip, Booking } from '@/types/database';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';
import { useBookings } from '@/hooks/useBookings';
import { useParking } from '@/hooks/useParking';
import { useTravelAlerts } from '@/hooks/useTravelAlerts';
import { useUserProfile } from '@/hooks/useUserProfile';
import { TravelAlertsCard } from '@/components/trips/TravelAlertsCard';
import { GasExpenseDialog } from '@/components/trips/GasExpenseDialog';
import { NextCriticalActionCard } from '@/components/trips/now/NextCriticalActionCard';
import { TodayCompactTimeline } from '@/components/trips/now/TodayCompactTimeline';
import { StickyQuickOpsStrip } from '@/components/trips/now/StickyQuickOpsStrip';
import { TripSectionLoading } from '@/components/trips/TripSectionStates';
import { getLocalNowString } from '@/lib/canonicalNextStop';

interface NowCommandCenterProps {
  tripId: string;
  trip: Trip;
  onViewFullTimeline: () => void;
  onAddExpense: () => void;
  onExplore: () => void;
  onParking: () => void;
  onViewAllAlerts: () => void;
}

/**
 * Check if today is a rental return day (for Gas button visibility).
 */
function isRentalReturnDay(bookings: Booking[]): boolean {
  const todayDate = getLocalNowString().substring(0, 10);
  return bookings.some(
    (b) =>
      b.booking_type === 'car_rental' &&
      b.end_datetime &&
      b.end_datetime.substring(0, 10) === todayDate
  );
}

export function NowCommandCenter({
  tripId,
  trip,
  onViewFullTimeline,
  onAddExpense,
  onExplore,
  onParking,
  onViewAllAlerts,
}: NowCommandCenterProps) {
  const { timelineEvents, isLoading } = useCanonicalTripState(tripId, trip);
  const { data: bookings = [] } = useBookings(tripId);
  const { data: parkingList = [] } = useParking(tripId);
  const { data: userProfile } = useUserProfile();
  const temperatureUnit = (userProfile?.temperature_unit as 'fahrenheit' | 'celsius') || 'fahrenheit';

  const { alerts, hasAlerts } = useTravelAlerts(trip, bookings, parkingList, temperatureUnit);

  const [gasDialogOpen, setGasDialogOpen] = useState(false);

  const showGas = useMemo(() => isRentalReturnDay(bookings), [bookings]);

  if (isLoading) {
    return <TripSectionLoading message="Loading trip..." />;
  }

  return (
    <div className="space-y-4 pb-20">
      {/* 1. NextCriticalActionCard */}
      <NextCriticalActionCard tripId={tripId} trip={trip} />

      {/* 2. ActiveAlertsStack — max 3, severity-ordered */}
      {hasAlerts && (
        <TravelAlertsCard
          alerts={alerts}
          maxVisible={3}
          onViewAllAlerts={onViewAllAlerts}
        />
      )}

      {/* 3. TodayCompactTimeline */}
      <TodayCompactTimeline
        timelineEvents={timelineEvents}
        onViewFullTimeline={onViewFullTimeline}
      />

      {/* 4. StickyQuickOpsStrip */}
      <StickyQuickOpsStrip
        onAddExpense={onAddExpense}
        onExplore={onExplore}
        onParking={onParking}
        tripName={trip.name}
      />

      {/* Gas Expense Dialog */}
      <GasExpenseDialog
        tripId={tripId}
        open={gasDialogOpen}
        onOpenChange={setGasDialogOpen}
      />
    </div>
  );
}

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
import { CalendarDays, ChevronRight } from 'lucide-react';
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
  onParking: () => void;
  onViewAllAlerts: () => void;
  onAddExpense: () => void;
  onExplore: () => void;
  onTimeline: () => void;
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
  onParking,
  onViewAllAlerts,
  onAddExpense,
  onExplore,
  onTimeline,
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
    <div className="space-y-5 pb-20">
      {/* 1. Quick Actions — above NextCriticalActionCard */}
      <div className="mb-1">
        <StickyQuickOpsStrip
          onAddExpense={onAddExpense}
          onExplore={onExplore}
        />
      </div>

      {/* 2. Timeline secondary row */}
      <button
        className="md:hidden w-full flex items-center gap-3 px-4 h-12 bg-primary/5 border border-border/40 rounded-xl hover:bg-primary/10 active:bg-primary/15 transition-colors"
        onClick={onTimeline}
        aria-label="View Timeline"
      >
        <CalendarDays className="w-5 h-5 text-primary" />
        <span className="flex-1 text-left text-sm font-medium text-foreground">Timeline</span>
        <ChevronRight className="w-4 h-4 text-primary/60" />
      </button>

      {/* 2. NextCriticalActionCard */}
      <NextCriticalActionCard tripId={tripId} trip={trip} />

      {/* 3. ActiveAlertsStack — max 3, severity-ordered */}
      {hasAlerts && (
        <TravelAlertsCard
          alerts={alerts}
          maxVisible={3}
          onViewAllAlerts={onViewAllAlerts}
        />
      )}

      {/* 4. TodayCompactTimeline */}
      <TodayCompactTimeline
        timelineEvents={timelineEvents}
        onViewFullTimeline={onViewFullTimeline}
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

/**
 * v3.10.9: NowCommandCenter Container
 *
 * Mobile-only execution-first command center for the NOW tab.
 * 
 * CANONICAL SINGLE SOURCE: Calls buildCanonicalTodayExecutionStack ONCE
 * and passes pre-sorted output to all child surfaces. No child re-sorts.
 *
 * v3.10.9: Reads isExecutionMode from stack to show DEPARTURE MODE label.
 */

import { useState, useMemo, useCallback } from 'react';
import { Trip, Booking } from '@/types/database';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';
import { useBookings } from '@/hooks/useBookings';
import { useParking } from '@/hooks/useParking';
import { useTravelAlerts } from '@/hooks/useTravelAlerts';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useDriveEngine } from '@/hooks/useDriveEngine';
import { TravelAlertsCard } from '@/components/trips/TravelAlertsCard';
import { CalendarDays, ChevronRight, AlertTriangle } from 'lucide-react';
import { GasExpenseDialog } from '@/components/trips/GasExpenseDialog';
import { NextCriticalActionCard } from '@/components/trips/now/NextCriticalActionCard';
import { TodayCompactTimeline } from '@/components/trips/now/TodayCompactTimeline';
import { TodayCriticalActionsCard } from '@/components/trips/now/TodayCriticalActionsCard';
import { StickyQuickOpsStrip } from '@/components/trips/now/StickyQuickOpsStrip';
import { TripSectionLoading } from '@/components/trips/TripSectionStates';
import { getLocalNowString } from '@/lib/canonicalNextStop';
import { getNowParkingHighlight } from '@/lib/canonicalParkingHighlight';
import { buildCanonicalTodayExecutionStack } from '@/lib/canonicalTodayExecutionStack';
import { useForegroundResume } from '@/hooks/useForegroundResume';
import { QuickExpenseDialog } from '@/components/trips/QuickExpenseDialog';
import type { TravelAlert } from '@/hooks/useTravelAlerts';
import type { DriveSignal } from '@/lib/driveEngine';

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

/**
 * Check if trip is currently active (today within trip date range).
 */
function isTripActive(trip: Trip): boolean {
  const today = getLocalNowString().substring(0, 10);
  return today >= trip.start_date && today <= trip.end_date;
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

  const { alerts: travelAlerts, hasAlerts: hasTravelAlerts } = useTravelAlerts(trip, bookings, parkingList, temperatureUnit);

  // v3.12.0: Canonical Drive Engine — single source of drive intelligence
  const { signals: driveSignals } = useDriveEngine({ tripId, trip });

  const [gasDialogOpen, setGasDialogOpen] = useState(false);
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false);
  const [resumeTick, setResumeTick] = useState(0);

  // v3.7.1: Recompute on foreground resume
  useForegroundResume(() => setResumeTick((t) => t + 1));

  const showGas = useMemo(() => isRentalReturnDay(bookings), [bookings]);
  const tripIsActive = useMemo(() => isTripActive(trip), [trip]);

  // v3.9.6: When trip is active, open quick expense dialog in-place instead of navigating
  const handleAddExpense = useCallback(() => {
    if (tripIsActive) {
      setQuickExpenseOpen(true);
    } else {
      onAddExpense();
    }
  }, [tripIsActive, onAddExpense]);

  // v3.10.7: Derive active stay address for DRIVE_SMART origin fallback
  const activeStayAddress = useMemo(() => {
    const todayDate = getLocalNowString().substring(0, 10);
    const activeStay = bookings.find(
      (b) =>
        b.booking_type === 'stay' &&
        b.start_datetime.substring(0, 10) <= todayDate &&
        b.end_datetime &&
        b.end_datetime.substring(0, 10) >= todayDate
    );
    return activeStay?.address || null;
  }, [bookings]);

  // v3.7.1: Canonical active parking highlight
  const activeParkingHighlight = useMemo(
    () => getNowParkingHighlight(parkingList, Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parkingList, resumeTick]
  );

  // v3.7.1: Set of active parking source IDs for TodayCompactTimeline filtering
  const activeParkingIds = useMemo(() => {
    if (!activeParkingHighlight) return new Set<string>();
    return new Set([activeParkingHighlight.parking.id]);
  }, [activeParkingHighlight]);

  // v3.10.8: SINGLE canonical TODAY execution stack — computed ONCE
  const todayExecution = useMemo(
    () => buildCanonicalTodayExecutionStack(
      timelineEvents,
      undefined,
      undefined,
      activeStayAddress,
      activeParkingIds,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timelineEvents, activeStayAddress, activeParkingIds, resumeTick]
  );

  // v3.12.0: Map DriveSignal[] → TravelAlert[] for unified rendering
  const mergedAlerts = useMemo((): TravelAlert[] => {
    const driveAlerts: TravelAlert[] = driveSignals.map((s): TravelAlert => ({
      id: s.id,
      type: s.type === 'PARKING_EXPIRING_SOON' ? 'parking_expiry'
        : s.type === 'WEATHER_ROUTE_RISK' ? 'severe_weather'
        : 'departure_reminder',
      severity: s.severity,
      title: s.title,
      message: s.message,
      actionLabel: s.actionLabel,
      actionUrl: undefined,
      relatedId: s.related?.parkingId || s.related?.bookingId,
      timestamp: new Date(),
    }));

    // Merge: drive signals first (they're drive-specific), then existing travel alerts
    // Deduplicate parking alerts: if Drive Engine already covers a parking ID, skip from travelAlerts
    const driveParking = new Set(
      driveSignals
        .filter(s => s.type === 'PARKING_EXPIRING_SOON' && s.related?.parkingId)
        .map(s => s.related!.parkingId!)
    );
    const filteredTravel = travelAlerts.filter(a =>
      !(a.type === 'parking_expiry' && a.relatedId && driveParking.has(a.relatedId))
    );

    const combined = [...driveAlerts, ...filteredTravel];
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return combined.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [driveSignals, travelAlerts]);

  if (isLoading) {
    return <TripSectionLoading message="Loading trip..." />;
  }

  return (
    <div className="space-y-5 pb-20">
      {/* 1. Quick Actions */}
      <div className="mb-1">
        <StickyQuickOpsStrip
          onAddExpense={handleAddExpense}
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

      {/* v3.10.9: Departure Mode label bar */}
      {todayExecution.isExecutionMode && (
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
          <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
            Departure Mode
          </span>
        </div>
      )}

      {/* 3. Critical Today Actions — from canonical stack (pre-sorted, no re-sort) */}
      <TodayCriticalActionsCard criticalActions={todayExecution.criticalActions} />

      {/* 4. NextCriticalActionCard */}
      <NextCriticalActionCard tripId={tripId} trip={trip} />

      {/* 5. ActiveAlertsStack — max 3, severity-ordered, merged with Drive Engine signals */}
      {(hasTravelAlerts || driveSignals.length > 0) && (
        <TravelAlertsCard
          alerts={mergedAlerts}
          maxVisible={3}
          onViewAllAlerts={onViewAllAlerts}
        />
      )}

      {/* 6. TodayCompactTimeline — from canonical stack (pre-sorted, no re-sort) */}
      <TodayCompactTimeline todayTimelineRows={todayExecution.todayTimelineRows} />

      {/* Gas Expense Dialog */}
      <GasExpenseDialog
        tripId={tripId}
        open={gasDialogOpen}
        onOpenChange={setGasDialogOpen}
      />

      {/* v3.9.6: Quick Expense Dialog — in-place for active trips */}
      <QuickExpenseDialog
        tripId={tripId}
        open={quickExpenseOpen}
        onOpenChange={setQuickExpenseOpen}
      />
    </div>
  );
}

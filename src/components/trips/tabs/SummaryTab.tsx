import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';
import { Bell, Calendar, Download, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useBookings } from '@/hooks/useBookings';
import { useParking } from '@/hooks/useParking';
import { useExpenses } from '@/hooks/useExpenses';
import { useEngagementEvents } from '@/hooks/useTripEvents';
import { useCompanions } from '@/hooks/useCompanions';
import { useBookingCompanionsByTrip } from '@/hooks/useBookingCompanions';
import { useTravelAlerts } from '@/hooks/useTravelAlerts';
import { useAccess } from '@/hooks/useAccess';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useDriveEngine } from '@/hooks/useDriveEngine';
import { useTripReadiness } from '@/hooks/useTripReadiness';
import { setExploreContext } from '@/lib/explore/exploreContextStore';
import { generateTripICS, downloadICSFile } from '@/lib/icsGenerator';
import { logExpenseDebug } from '@/lib/expenseCalculations';
import { getCanonicalTripState, CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import { DatetimeFormatPreference } from '@/lib/displayFormats';
import { isOnline } from '@/lib/networkStatus';
import { getOfflineTimelineWindow } from '@/lib/getOfflineTimelineWindow';
import { Trip } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TripBriefSection } from '@/components/trips/TripBriefSection';
import { TripCommandLoop } from '@/components/trips/TripCommandLoop';
import { TravelAlertsCard } from '@/components/trips/TravelAlertsCard';
import { FlightSummaryCard } from '@/components/trips/FlightSummaryCard';
import { DriveSummaryCard } from '@/components/trips/DriveSummaryCard';
import { GasExpenseDialog } from '@/components/trips/GasExpenseDialog';
import { ExpenseReminderBanner } from '@/components/trips/ExpenseReminderBanner';
import { TripHealthChecklist } from '@/components/trips/TripHealthChecklist';
import { FirstTripHint } from '@/components/trips/FirstTripHint';
import { AirportSnapshotCard } from '@/components/trips/AirportSnapshotCard';
import { TripTimeline } from '@/components/trips/TripTimeline';
import type { DrillThroughTarget } from '@/pages/TripDetail';

interface SummaryTabProps {
  tripId: string;
  trip: Trip;
  onDrillThrough?: (target: DrillThroughTarget) => void;
  maxVisibleAlerts?: number;
  onViewAllAlerts?: () => void;
  onExploreTab?: () => void;
}

function DriveSummaryCardWrapper({ trip, onAddGasExpense }: { trip: Trip; onAddGasExpense: () => void }) {
  const { drivePlan } = useDriveEngine({ tripId: trip.id, trip });
  return <DriveSummaryCard trip={trip as any} drivePlan={drivePlan} onAddGasExpense={onAddGasExpense} />;
}

export function SummaryTab({ tripId, trip, onDrillThrough, maxVisibleAlerts, onViewAllAlerts, onExploreTab }: SummaryTabProps) {
  const navigate = useNavigate();
  const [gasDialogOpen, setGasDialogOpen] = useState(false);
  const { data: bookings = [] } = useBookings(tripId);
  const { data: parkingList = [] } = useParking(tripId);
  const { data: expenses = [] } = useExpenses(tripId);
  const { data: companions = [] } = useCompanions(tripId);
  const { data: bookingCompanions = [] } = useBookingCompanionsByTrip(tripId);
  const { data: userProfile } = useUserProfile();
  const { isPro } = useAccess();
  const { data: engagementEvents = [] } = useEngagementEvents(tripId);
  const temperatureUnit = (userProfile?.temperature_unit as 'fahrenheit' | 'celsius') || 'fahrenheit';

  const canonicalState = useMemo(() => {
    return getCanonicalTripState(trip, bookings, expenses, parkingList, engagementEvents);
  }, [trip, bookings, expenses, parkingList, engagementEvents]);

  const { timelineEvents: fullTimeline, costs: costSummary } = canonicalState;
  const online = isOnline();
  const timeline = useMemo(() => {
    if (online) return fullTimeline;
    return getOfflineTimelineWindow(canonicalState);
  }, [online, fullTimeline, canonicalState]);

  const { alerts, hasAlerts } = useTravelAlerts(trip, bookings, parkingList, temperatureUnit);
  const { brief: tripBrief } = useTripReadiness(tripId, trip);

  const handleBriefAction = useCallback((target: string) => {
    if (target.startsWith('/')) {
      navigate(target);
      return;
    }

    if (target.startsWith('#')) {
      const el = document.getElementById(target.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [navigate]);

  const hasFlights = canonicalState.hasFlights;
  const transportationMode = (trip as any).transportation_mode === 'unspecified'
    ? (hasFlights ? 'flight' : 'unspecified')
    : (trip as any).transportation_mode;
  const tripDays = differenceInDays(parseISO(trip.end_date), parseISO(trip.start_date)) + 1;

  useEffect(() => {
    if (expenses.length > 0 || bookings.length > 0 || parkingList.length > 0) {
      logExpenseDebug(tripId, expenses, costSummary);
    }
  }, [tripId, expenses, bookings, parkingList, costSummary]);

  const handleTimelineClick = (event: CanonicalTimelineEvent) => {
    if (!onDrillThrough) return;

    if (event.sourceType === 'parking') {
      onDrillThrough({ tab: 'parking', recordId: event.sourceId });
      return;
    }

    onDrillThrough({ tab: 'bookings', recordId: event.sourceId });
  };

  const downloadCalendar = () => {
    try {
      const icsContent = generateTripICS({
        trip,
        bookings,
        parkingList,
        includeReminders: true,
      });

      const filename = `${trip.name.replace(/[^a-z0-9]/gi, '_')}.ics`;
      downloadICSFile(icsContent, filename);

      toast.success('Calendar downloaded with all reminders!', {
        description: 'Import to your calendar app to receive notifications',
      });
    } catch (error) {
      toast.error('Failed to generate calendar');
    }
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <TripCommandLoop
        tripId={tripId}
        trip={trip}
        canonicalState={canonicalState}
        bookings={bookings}
        expenses={expenses}
        parkingList={parkingList}
        alerts={alerts}
        onExplore={onExploreTab}
        onDrillThrough={onDrillThrough}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="space-y-4">
          {hasAlerts && (
            <TravelAlertsCard
              alerts={alerts}
              maxVisible={maxVisibleAlerts}
              onViewAllAlerts={onViewAllAlerts}
            />
          )}

          <Card className="rt-command-panel">
            <CardHeader className="border-b border-border/35 px-4 py-4 md:px-5">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Calendar className="h-4 w-4 text-primary" />
                Timeline
              </CardTitle>
              <CardDescription className="text-xs">
                {tripDays} day{tripDays !== 1 ? 's' : ''} · {timeline.length} event{timeline.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-5">
              {!online && timeline.length > 0 && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-border/35 bg-muted/35 px-3 py-2">
                  <WifiOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Offline mode</p>
                    <p className="text-[11px] text-muted-foreground/70">Showing the next cached trip steps.</p>
                  </div>
                </div>
              )}
              {!online && timeline.length === 0 && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border/35 bg-muted/25 px-3 py-6">
                  <WifiOff className="h-4 w-4 text-muted-foreground/60" />
                  <p className="text-xs text-muted-foreground">Reconnect to refresh this trip.</p>
                </div>
              )}
              <TripTimeline
                events={timeline}
                datetimeFormat={userProfile?.preferred_datetime_format as DatetimeFormatPreference}
                onEventClick={handleTimelineClick}
                onExploreNearby={onExploreTab ? (eventId) => {
                  setExploreContext(tripId, { kind: 'TIMELINE_ITEM', id: eventId });
                  onExploreTab();
                } : undefined}
              />
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          {tripBrief && <TripBriefSection brief={tripBrief} onAction={handleBriefAction} />}

          {bookings.length <= 1 && <FirstTripHint bookingsCount={bookings.length} />}

          <ExpenseReminderBanner trip={trip} expenses={expenses} />

          {transportationMode === 'drive' ? (
            <DriveSummaryCardWrapper trip={trip} onAddGasExpense={() => setGasDialogOpen(true)} />
          ) : (
            <>
              <FlightSummaryCard bookings={bookings} companions={companions} bookingCompanions={bookingCompanions} />
              {hasFlights && <AirportSnapshotCard bookings={bookings} />}
            </>
          )}

          {isPro && onDrillThrough && (
            <TripHealthChecklist
              trip={trip}
              bookings={bookings}
              parkingList={parkingList}
              expenses={expenses}
              preferredCurrency={userProfile?.preferred_currency}
              onNavigate={onDrillThrough}
            />
          )}

          <Card className="rt-kpi-panel">
            <CardContent className="flex flex-col gap-3 p-4">
              <div>
                <p className="rt-muted-label">Calendar handoff</p>
                <p className="mt-1 text-sm text-muted-foreground">Export a backup when you want trip reminders outside RT2RP.</p>
              </div>
              <Button onClick={downloadCalendar} variant="outline" className="rt-secondary-action w-full">
                <Download className="mr-2 h-4 w-4" />
                Download calendar
              </Button>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Bell className="h-3 w-3" />
                Includes 30-minute reminders.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      <GasExpenseDialog tripId={tripId} open={gasDialogOpen} onOpenChange={setGasDialogOpen} />
    </div>
  );
}

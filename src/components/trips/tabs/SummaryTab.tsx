import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookings } from '@/hooks/useBookings';
import { setExploreContext } from '@/lib/explore/exploreContextStore';
import { useParking } from '@/hooks/useParking';
import { useExpenses } from '@/hooks/useExpenses';
import { useEngagementEvents } from '@/hooks/useTripEvents';
import { useCompanions } from '@/hooks/useCompanions';
import { useBookingCompanionsByTrip } from '@/hooks/useBookingCompanions';
import { useTripWeather } from '@/hooks/useWeather';
import { useTravelAlerts } from '@/hooks/useTravelAlerts';
import { useAccess } from '@/hooks/useAccess';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useDriveEngine } from '@/hooks/useDriveEngine';
import { useTripReadiness } from '@/hooks/useTripReadiness';
import { TripBriefSection } from '@/components/trips/TripBriefSection';
import { Trip, Booking, Parking, Companion } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TravelAlertsCard } from '@/components/trips/TravelAlertsCard';
import { FlightSummaryCard } from '@/components/trips/FlightSummaryCard';
import { DriveSummaryCard } from '@/components/trips/DriveSummaryCard';
import { GasExpenseDialog } from '@/components/trips/GasExpenseDialog';
import { ExpenseReminderBanner } from '@/components/trips/ExpenseReminderBanner';
import { CompanionDetailDialog } from '@/components/trips/CompanionDetailDialog';
import { UpcomingEventsWidget } from '@/components/trips/UpcomingEventsWidget';
import { TripHealthChecklist } from '@/components/trips/TripHealthChecklist';
import { FirstTripHint } from '@/components/trips/FirstTripHint';
import { AirportSnapshotCard } from '@/components/trips/AirportSnapshotCard';
import { TripTimeline } from '@/components/trips/TripTimeline';
import { generateTripICS, downloadICSFile } from '@/lib/icsGenerator';
import { resolveMapsDestination, openMapsDestination } from '@/lib/mapsDestination';
import { logExpenseDebug } from '@/lib/expenseCalculations';
import { 
  getCanonicalTripState, 
  CanonicalTimelineEvent,
} from '@/lib/canonicalTripState';
import { normalizeCondition } from '@/lib/canonicalWeather';
import { 
  formatTripDateRangeWithDuration,
  DatetimeFormatPreference,
} from '@/lib/displayFormats';
import { 
  Calendar, MapPin, Download,
  Cloud, Sun, CloudRain, Snowflake, Info, Bell
} from 'lucide-react';
import { format, parseISO, isAfter, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

// v2.0.7: Drill-through target type
import type { DrillThroughTarget } from '@/pages/TripDetail';

interface SummaryTabProps {
  tripId: string;
  trip: Trip;
  onDrillThrough?: (target: DrillThroughTarget) => void;
  /** v2.6.12: Max alerts visible on NOW tab (progressive disclosure) */
  maxVisibleAlerts?: number;
  /** v2.6.12: Navigate to full alerts view */
  onViewAllAlerts?: () => void;
  /** v3.12.4: Navigate to Explore tab */
  onExploreTab?: () => void;
}

// v3.8.16: Wrapper to wire DrivePlan into DriveSummaryCard
function DriveSummaryCardWrapper({ trip, onAddGasExpense }: { trip: Trip; onAddGasExpense: () => void }) {
  const { drivePlan } = useDriveEngine({ tripId: trip.id, trip });
  return <DriveSummaryCard trip={trip as any} drivePlan={drivePlan} onAddGasExpense={onAddGasExpense} />;
}

// v3.8.6: Destination links moved to DestinationInfoCard

export function SummaryTab({ tripId, trip, onDrillThrough, maxVisibleAlerts, onViewAllAlerts, onExploreTab }: SummaryTabProps) {
  const navigate = useNavigate();
  const [gasDialogOpen, setGasDialogOpen] = useState(false);
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [companionDialogOpen, setCompanionDialogOpen] = useState(false);
  const { data: bookings = [] } = useBookings(tripId);
  const { data: parkingList = [] } = useParking(tripId);
  const { data: expenses = [] } = useExpenses(tripId);
  const { data: companions = [] } = useCompanions(tripId);
  const { data: bookingCompanions = [] } = useBookingCompanionsByTrip(tripId);
  const { data: userProfile } = useUserProfile();
  const { isPro } = useAccess();
  const { data: engagementEvents = [] } = useEngagementEvents(tripId);
  const temperatureUnit = (userProfile?.temperature_unit as 'fahrenheit' | 'celsius') || 'fahrenheit';
  const { tripForecast, weatherAnalysis, isLoading: weatherLoading } = useTripWeather(
    trip.destination_city,
    trip.destination_country,
    trip.start_date,
    trip.end_date,
    trip.destination_state || undefined,
    temperatureUnit
  );
  
  // v2.0.7: Get canonical trip state - SINGLE SOURCE OF TRUTH for dates, times, costs
  const canonicalState = useMemo(() => {
    return getCanonicalTripState(trip, bookings, expenses, parkingList, engagementEvents);
  }, [trip, bookings, expenses, parkingList, engagementEvents]);
  
  // Extract canonical values
  const { dateRange, timelineEvents: timeline, costs: costSummary } = canonicalState;
  
  // Travel alerts for weather changes, departure reminders, parking expiry
  const { alerts, hasAlerts, criticalCount } = useTravelAlerts(trip, bookings, parkingList, temperatureUnit);

  // v3.12.0: Trip Readiness Brief
  const { brief: tripBrief } = useTripReadiness(tripId, trip);

  // Brief card action handler
  const handleBriefAction = useCallback((target: string) => {
    if (target.startsWith('/')) {
      navigate(target);
    } else if (target.startsWith('#')) {
      const el = document.getElementById(target.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [navigate]);

  // Determine transportation mode - auto-detect if unspecified
  const hasFlights = canonicalState.hasFlights;
  const transportationMode = (trip as any).transportation_mode === 'unspecified' 
    ? (hasFlights ? 'flight' : 'unspecified')
    : (trip as any).transportation_mode;

  const tripDays = differenceInDays(parseISO(trip.end_date), parseISO(trip.start_date)) + 1;

  // v2.0.7: Use canonical cost summary (single source of truth)
  const { 
    bookingsTotal: bookingsCost, 
    parkingTotal: parkingCost, 
    expensesTotal: expensesCost,
    totalCost,
    bookingsMyShare,
    parkingMyShare,
    expensesMyShare,
    totalMyShare: myOutOfPocket 
  } = costSummary;

  // Debug logging - runs when any cost data changes
  useEffect(() => {
    if (expenses.length > 0 || bookings.length > 0 || parkingList.length > 0) {
      logExpenseDebug(tripId, expenses, costSummary);
    }
  }, [tripId, expenses, bookings, parkingList, costSummary]);

  // v2.0.7: Timeline events are now provided by canonical state - no local calculation needed

  // v2.0.7: Handle timeline item click for drill-through
  const handleTimelineClick = (event: CanonicalTimelineEvent) => {
    if (!onDrillThrough) return;
    
    if (event.sourceType === 'parking') {
      onDrillThrough({ tab: 'parking', recordId: event.sourceId });
    } else {
      // flight, stay, car_rental, activity all go to bookings
      onDrillThrough({ tab: 'bookings', recordId: event.sourceId });
    }
  };

  // Parking status for card display
  const now = new Date();
  const upcomingParkingExpiration = parkingList
    .filter((p: Parking) => p.end_datetime && isAfter(parseISO(p.end_datetime), now))
    .sort((a: Parking, b: Parking) => parseISO(a.end_datetime!).getTime() - parseISO(b.end_datetime!).getTime())[0];

  // v2.1.21: getEventIcon moved to TripTimeline component

  const getWeatherIcon = (condition: string) => {
    const normalized = normalizeCondition(condition);
    switch (normalized) {
      case 'rain': return <CloudRain className="w-4 h-4" />;
      case 'snow':
      case 'ice':
      case 'sleet': return <Snowflake className="w-4 h-4" />;
      case 'sunny': return <Sun className="w-4 h-4" />;
      default: return <Cloud className="w-4 h-4" />;
    }
  };

  const openInMaps = (address: string) => {
    const dest = resolveMapsDestination({ address });
    if (dest) openMapsDestination(dest);
    else window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
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
    <div className="space-y-3 md:space-y-5">
      {/* v3.12.0: Trip Brief */}
      {tripBrief && <TripBriefSection brief={tripBrief} onAction={handleBriefAction} />}

      {/* Destination Header */}
      <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-background border-border/40 shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <MapPin className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold tracking-tight">{trip.destination_state ? `${trip.destination_city}, ${trip.destination_state}, ${trip.destination_country}` : `${trip.destination_city}, ${trip.destination_country}`}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatTripDateRangeWithDuration(trip.start_date, trip.end_date, tripDays)}
              </p>
            </div>
          </div>
          {/* v2.1.1: Pro-only Upcoming Events strip with drill-through */}
          <UpcomingEventsWidget tripId={tripId} onDrillThrough={onDrillThrough} />
        </CardContent>
      </Card>

      {/* v2.1.29: First-trip completion nudge - shown when only 1 booking */}
      <FirstTripHint bookingsCount={bookings.length} />

      {/* Daily Expense Reminder Banner */}
      <ExpenseReminderBanner trip={trip} expenses={expenses} />

      {/* Travel Alerts - Weather changes, departure reminders, parking expiry */}
      {hasAlerts && (
        <TravelAlertsCard 
          alerts={alerts} 
          maxVisible={maxVisibleAlerts}
          onViewAllAlerts={onViewAllAlerts}
        />
      )}

      {/* TSA Warning Card removed — TSA indicators globally removed */}

      {/* Flight or Drive Summary based on transportation mode */}
      {transportationMode === 'drive' ? (
        <DriveSummaryCardWrapper trip={trip} onAddGasExpense={() => setGasDialogOpen(true)} />
      ) : (
        <>
          <FlightSummaryCard bookings={bookings} companions={companions} bookingCompanions={bookingCompanions} />
          {/* v2.0.4: Airport Snapshot Card - shows for trips with flights */}
          <AirportSnapshotCard bookings={bookings} />
        </>
      )}

      {/* Gas Expense Dialog for drive trips */}
      <GasExpenseDialog tripId={tripId} open={gasDialogOpen} onOpenChange={setGasDialogOpen} />

      {/* Companion Detail Dialog for TSA warning clicks */}
      <CompanionDetailDialog
        companion={selectedCompanion}
        trip={trip}
        open={companionDialogOpen}
        onOpenChange={setCompanionDialogOpen}
        canEdit={true}
      />

      {/* v1.2.10: Removed duplicate Cost Summary and Parking cards - these are now shown only in TripHeaderWidgets */}

      {/* v2.1.0: Pro-only Trip Health Checklist */}
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

      {/* v3.8.6: Destination Info moved to Trip header — see DestinationInfoCard */}

      {/* Calendar Export */}
      <div className="flex flex-col sm:flex-row gap-2 items-start py-2">
        <Button onClick={downloadCalendar} variant="outline" className="w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" />
          Download Trip Calendar (.ics)
        </Button>
        <p className="text-xs text-muted-foreground sm:ml-2 sm:self-center">
          <Bell className="w-3 h-3 inline mr-1" />
          Includes 30-min reminders for all events
        </p>
      </div>

      {/* v2.6.13: Tighter section divider on mobile */}
      <div className="border-t border-border/20 my-0.5 md:my-1" />

      {/* Timeline */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Trip Timeline
          </CardTitle>
          <CardDescription className="text-xs">{tripDays} day{tripDays !== 1 ? 's' : ''} • {timeline.length} event{timeline.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* v2.1.21: Extracted to TripTimeline component with continuous vertical line */}
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
    </div>
  );
}


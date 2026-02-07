import { useState, useEffect, useMemo } from 'react';
import { useBookings } from '@/hooks/useBookings';
import { useParking } from '@/hooks/useParking';
import { useExpenses } from '@/hooks/useExpenses';
import { useCompanions } from '@/hooks/useCompanions';
import { useBookingCompanionsByTrip } from '@/hooks/useBookingCompanions';
import { useTripWeather } from '@/hooks/useWeather';
import { useTravelAlerts } from '@/hooks/useTravelAlerts';
import { useAccess } from '@/hooks/useAccess';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Trip, Booking, Parking, Companion } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TravelAlertsCard } from '@/components/trips/TravelAlertsCard';
import { FlightSummaryCard } from '@/components/trips/FlightSummaryCard';
import { DriveSummaryCard } from '@/components/trips/DriveSummaryCard';
import { GasExpenseDialog } from '@/components/trips/GasExpenseDialog';
import { ExpenseReminderBanner } from '@/components/trips/ExpenseReminderBanner';
import { TsaWarningCard } from '@/components/trips/TsaWarningCard';
import { CompanionDetailDialog } from '@/components/trips/CompanionDetailDialog';
import { UpcomingEventsWidget } from '@/components/trips/UpcomingEventsWidget';
import { TripHealthChecklist } from '@/components/trips/TripHealthChecklist';
import { FirstTripHint } from '@/components/trips/FirstTripHint';
import { AirportSnapshotCard } from '@/components/trips/AirportSnapshotCard';
import { generateTripICS, downloadICSFile } from '@/lib/icsGenerator';
import { logExpenseDebug } from '@/lib/expenseCalculations';
import { UNKNOWN_TIME_PLACEHOLDER } from '@/lib/datetimeIntegrity';
import { 
  getCanonicalTripState, 
  CanonicalTimelineEvent,
} from '@/lib/canonicalTripState';
import { 
  Plane, Building2, Car, Calendar, MapPin, DollarSign, 
  AlertTriangle, Download, ExternalLink, Clock, PartyPopper,
  Cloud, Sun, CloudRain, Snowflake, Thermometer, Info, Globe, Utensils, Camera, Bell,
  CircleParking, Compass, Ticket, TrainFront, Bus, TramFront, Ship
} from 'lucide-react';
import { format, parseISO, isAfter, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

// v2.0.7: Drill-through target type
import type { DrillThroughTarget } from '@/pages/TripDetail';

interface SummaryTabProps {
  tripId: string;
  trip: Trip;
  onDrillThrough?: (target: DrillThroughTarget) => void;
}

/*
 * FUTURE (Business-only): Trip Summary Enhancements
 * ==================================================
 * Business tier will add advanced summary capabilities:
 * 
 * - Stop-level breakdown (for multi-stop tours)
 * - Business expense compliance summary
 * - Per-diem tracking widget
 * - Trip report generation (PDF export)
 * - Custom branding for exported reports
 * 
 * Implementation will use the <BusinessOnly> wrapper from
 * src/components/access to gate these features.
 * 
 * Entry points to annotate when implementing:
 * - Report generation button in header
 * - Stop timeline visualization
 * - Compliance status indicators
 */

// Helper to safely open external URLs in new tab
const openExternalUrl = (url: string | null | undefined) => {
  if (!url) return;
  // Ensure URL has protocol
  const safeUrl = url.startsWith('http://') || url.startsWith('https://') 
    ? url 
    : `https://${url}`;
  window.open(safeUrl, '_blank', 'noopener,noreferrer');
};

// Destination info links by country/region
const getDestinationLinks = (city: string, state: string | undefined, country: string) => {
  const searchQuery = encodeURIComponent(`${city}${state ? ` ${state}` : ''} ${country}`);
  const yelpQuery = encodeURIComponent(`${city}${state ? `, ${state}` : ''}`);
  
  return {
    generalInfo: [
      { label: 'Travel Guide', url: `https://www.tripadvisor.com/Search?q=${searchQuery}`, icon: Globe },
      { label: 'Weather', url: `https://www.weather.com/weather/today/l/${searchQuery}`, icon: Cloud },
      { label: 'Local Events', url: `https://www.eventbrite.com/d/${searchQuery.toLowerCase().replace(/\s+/g, '-')}/events/`, icon: Calendar },
    ],
    dining: [
      { label: 'Yelp Restaurants', url: `https://www.yelp.com/search?find_desc=Restaurants&find_loc=${yelpQuery}&attrs=RestaurantsPriceRange2.1,RestaurantsPriceRange2.2`, icon: Utensils },
      { label: 'Google Maps Dining', url: `https://www.google.com/maps/search/restaurants+${searchQuery}`, icon: MapPin },
    ],
    attractions: [
      { label: 'Top Attractions', url: `https://www.tripadvisor.com/Attractions-${searchQuery}`, icon: Camera },
      { label: 'Things to Do', url: `https://www.google.com/search?q=things+to+do+${searchQuery}`, icon: PartyPopper },
    ],
  };
};

export function SummaryTab({ tripId, trip, onDrillThrough }: SummaryTabProps) {
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
  const { tripForecast, weatherAnalysis, isLoading: weatherLoading } = useTripWeather(
    trip.destination_city,
    trip.destination_country,
    trip.start_date,
    trip.end_date
  );
  
  // v2.0.7: Get canonical trip state - SINGLE SOURCE OF TRUTH for dates, times, costs
  const canonicalState = useMemo(() => {
    return getCanonicalTripState(trip, bookings, expenses, parkingList);
  }, [trip, bookings, expenses, parkingList]);
  
  // Extract canonical values
  const { dateRange, timelineEvents: timeline, costs: costSummary } = canonicalState;
  
  // Travel alerts for weather changes, departure reminders, parking expiry
  const { alerts, hasAlerts, criticalCount } = useTravelAlerts(trip, bookings, parkingList);

  // Determine transportation mode - auto-detect if unspecified
  const hasFlights = canonicalState.hasFlights;
  const transportationMode = (trip as any).transportation_mode === 'unspecified' 
    ? (hasFlights ? 'flight' : 'unspecified')
    : (trip as any).transportation_mode;

  const tripDays = differenceInDays(parseISO(trip.end_date), parseISO(trip.start_date)) + 1;
  const destinationLinks = getDestinationLinks(trip.destination_city, trip.destination_state, trip.destination_country);
  const destinationDisplay = trip.destination_state 
    ? `${trip.destination_city}, ${trip.destination_state}, ${trip.destination_country}`
    : `${trip.destination_city}, ${trip.destination_country}`;

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

  const getEventIcon = (type: string, transportMode?: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-4 h-4" />;
      case 'stay': return <Building2 className="w-4 h-4" />;
      case 'car_rental': return <Car className="w-4 h-4" />;
      case 'parking': return <CircleParking className="w-4 h-4" />;
      case 'activity': return <Compass className="w-4 h-4" />; // v2.1.19: Distinct icon for activities
      case 'transport':
        switch (transportMode) {
          case 'train': return <TrainFront className="w-4 h-4" />;
          case 'bus': return <Bus className="w-4 h-4" />;
          case 'metro': return <TramFront className="w-4 h-4" />;
          case 'ferry': return <Ship className="w-4 h-4" />;
          default: return <TrainFront className="w-4 h-4" />;
        }
      default: return <PartyPopper className="w-4 h-4" />;
    }
  };

  const getWeatherIcon = (condition: string) => {
    if (condition.includes('Rain') || condition.includes('Shower')) return <CloudRain className="w-4 h-4" />;
    if (condition.includes('Snow')) return <Snowflake className="w-4 h-4" />;
    if (condition.includes('Clear') || condition.includes('Sunny')) return <Sun className="w-4 h-4" />;
    return <Cloud className="w-4 h-4" />;
  };

  const openInMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
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
    <div className="space-y-8">
      {/* Destination Header */}
      <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-background border-border/40">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">{destinationDisplay}</h2>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(trip.start_date), 'MMM d')} - {format(parseISO(trip.end_date), 'MMM d, yyyy')} • {tripDays} day{tripDays !== 1 ? 's' : ''}
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
        <TravelAlertsCard alerts={alerts} />
      )}

      {/* TSA/Companion Warnings - Enhanced component with companion checks */}
      {transportationMode !== 'drive' && (
        <TsaWarningCard 
          bookings={bookings} 
          companions={companions} 
          bookingCompanions={bookingCompanions}
          onCompanionClick={(companion) => {
            setSelectedCompanion(companion);
            setCompanionDialogOpen(true);
          }}
        />
      )}

      {/* Flight or Drive Summary based on transportation mode */}
      {transportationMode === 'drive' ? (
        <DriveSummaryCard trip={trip as any} onAddGasExpense={() => setGasDialogOpen(true)} />
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

      {/* Section Divider */}
      <div className="border-t border-border/30" />

      {/* Destination Info & Recommendations */}
      <Card className="border-border/40">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            Destination Info & Recommendations
          </CardTitle>
          <CardDescription>Local links, dining (4+ stars, $-$$), and attractions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Globe className="w-4 h-4" /> General Info
              </h4>
              <div className="space-y-1">
                {destinationLinks.generalInfo.map((link) => (
                  <Button key={link.label} variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" onClick={() => openExternalUrl(link.url)}>
                    <link.icon className="w-3 h-3 mr-2" />
                    {link.label}
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Utensils className="w-4 h-4" /> Dining (4+ ⭐, $-$$)
              </h4>
              <div className="space-y-1">
                {destinationLinks.dining.map((link) => (
                  <Button key={link.label} variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" onClick={() => openExternalUrl(link.url)}>
                    <link.icon className="w-3 h-3 mr-2" />
                    {link.label}
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Camera className="w-4 h-4" /> Attractions
              </h4>
              <div className="space-y-1">
                {destinationLinks.attractions.map((link) => (
                  <Button key={link.label} variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" onClick={() => openExternalUrl(link.url)}>
                    <link.icon className="w-3 h-3 mr-2" />
                    {link.label}
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Section Divider */}
      <div className="border-t border-border/30" />

      {/* Timeline */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Trip Timeline
          </CardTitle>
          <CardDescription>{tripDays} day{tripDays !== 1 ? 's' : ''} • {timeline.length} event{timeline.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          {timeline.length > 0 ? (
            <div className="space-y-4">
              {timeline.map((event, index) => (
                <div 
                  key={event.id} 
                  className="flex gap-4 animate-slide-in cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors" 
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handleTimelineClick(event)}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {getEventIcon(event.bookingType, event.transportMode)}
                    </div>
                    {index < timeline.length - 1 && (
                      <div className="w-px h-full bg-border mt-2 min-h-[20px]" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.subtitle}</p>
                        {/* v2.1.19: Activity-specific badges */}
                        {event.bookingType === 'activity' && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {event.ticketRequired && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1 gap-0.5">
                                <Ticket className="w-2.5 h-2.5" />
                                Ticket
                              </Badge>
                            )}
                            {event.ticketsPurchased && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 bg-accent">
                                Tickets purchased
                              </Badge>
                            )}
                            {event.activitySource && (
                              <span className="text-[10px] text-muted-foreground">
                                {event.activitySource === 'explore' ? 'From Explore' : 
                                 event.activitySource === 'confirmation' ? 'From confirmation' : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs shrink-0">
                        <p className="font-medium">{format(event.datetime, 'MMM d')}</p>
                         {/* v2.1.8: Show "--:--" in red if no explicit time */}
                         <p className={event.hasExplicitTime ? 'text-muted-foreground' : 'text-destructive font-medium'}>
                          {event.hasExplicitTime 
                            ? format(event.datetime, 'h:mm a') 
                             : UNKNOWN_TIME_PLACEHOLDER}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-1">
                      {event.address && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => openInMaps(event.address!)}
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          Maps
                        </Button>
                      )}
                      {event.linkUrl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => openExternalUrl(event.linkUrl)}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8 text-sm">
              No events yet. Add bookings and parking to build your timeline.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


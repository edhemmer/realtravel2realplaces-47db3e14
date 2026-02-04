import { useState, useEffect } from 'react';
import { useBookings } from '@/hooks/useBookings';
import { useParking } from '@/hooks/useParking';
import { useExpenses } from '@/hooks/useExpenses';
import { useCompanions } from '@/hooks/useCompanions';
import { useBookingCompanionsByTrip } from '@/hooks/useBookingCompanions';
import { useTripWeather } from '@/hooks/useWeather';
import { useTravelAlerts } from '@/hooks/useTravelAlerts';
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
import { generateTripICS, downloadICSFile } from '@/lib/icsGenerator';
import { calculateTripCostSummary, logExpenseDebug } from '@/lib/expenseCalculations';
import { calculateTripDateRange } from '@/lib/tripDateCalculations';
import { 
  Plane, Building2, Car, Calendar, MapPin, DollarSign, 
  AlertTriangle, Download, ExternalLink, Clock, PartyPopper,
  Cloud, Sun, CloudRain, Snowflake, Thermometer, Info, Globe, Utensils, Camera, Bell,
  CircleParking
} from 'lucide-react';
import { format, parseISO, isAfter, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

interface SummaryTabProps {
  tripId: string;
  trip: Trip;
}

interface TimelineEvent {
  id: string;
  type: 'flight' | 'stay' | 'car_rental' | 'activity' | 'parking';
  eventType?: 'check-in' | 'check-out' | 'departure' | 'pickup' | 'dropoff';
  title: string;
  subtitle: string;
  datetime: Date;
  endDatetime?: Date;
  address?: string;
  linkUrl?: string;
}

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

export function SummaryTab({ tripId, trip }: SummaryTabProps) {
  const [gasDialogOpen, setGasDialogOpen] = useState(false);
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [companionDialogOpen, setCompanionDialogOpen] = useState(false);
  const { data: bookings = [] } = useBookings(tripId);
  const { data: parkingList = [] } = useParking(tripId);
  const { data: expenses = [] } = useExpenses(tripId);
  const { data: companions = [] } = useCompanions(tripId);
  const { data: bookingCompanions = [] } = useBookingCompanionsByTrip(tripId);
  const { tripForecast, weatherAnalysis, isLoading: weatherLoading } = useTripWeather(
    trip.destination_city,
    trip.destination_country,
    trip.start_date,
    trip.end_date
  );
  
  // Travel alerts for weather changes, departure reminders, parking expiry
  const { alerts, hasAlerts, criticalCount } = useTravelAlerts(trip, bookings, parkingList);

  // Determine transportation mode - auto-detect if unspecified
  const hasFlights = bookings.some(b => b.booking_type === 'flight');
  const transportationMode = (trip as any).transportation_mode === 'unspecified' 
    ? (hasFlights ? 'flight' : 'unspecified')
    : (trip as any).transportation_mode;

  const tripDays = differenceInDays(parseISO(trip.end_date), parseISO(trip.start_date)) + 1;
  const destinationLinks = getDestinationLinks(trip.destination_city, trip.destination_state, trip.destination_country);
  const destinationDisplay = trip.destination_state 
    ? `${trip.destination_city}, ${trip.destination_state}, ${trip.destination_country}`
    : `${trip.destination_city}, ${trip.destination_country}`;

  // Calculate costs using shared utility (single source of truth)
  const costSummary = calculateTripCostSummary(expenses, bookings, parkingList);
  
  // Destructure for easier use in template
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

  // Build timeline with correct "key times" per booking type
  // - Flights: show DEPARTURE time (start_datetime)
  // - Stays: show CHECK-IN time (start_datetime) AND CHECK-OUT (end_datetime as separate event)
  // - Rentals: show PICKUP time (start_datetime)
  const buildTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    
    bookings.forEach((b: Booking) => {
      if (b.booking_type === 'flight') {
        // Flight: show departure time
        events.push({
          id: b.id,
          type: 'flight',
          eventType: 'departure',
          title: b.airline || b.vendor_name,
          subtitle: `Flight Departure - ${b.confirmation_number || 'No confirmation'}`,
          datetime: parseISO(b.start_datetime),
          endDatetime: b.end_datetime ? parseISO(b.end_datetime) : undefined,
          address: b.address,
          linkUrl: b.link_url,
        });
      } else if (b.booking_type === 'stay') {
        // Stay: show check-in event
        events.push({
          id: `${b.id}-checkin`,
          type: 'stay',
          eventType: 'check-in',
          title: b.property_name || b.vendor_name,
          subtitle: `Check In - ${b.stay_type || 'Stay'}${b.confirmation_number ? ` - ${b.confirmation_number}` : ''}`,
          datetime: parseISO(b.start_datetime),
          address: b.address,
          linkUrl: b.link_url,
        });
        // Stay: show check-out event on end date (if available)
        if (b.end_datetime) {
          events.push({
            id: `${b.id}-checkout`,
            type: 'stay',
            eventType: 'check-out',
            title: b.property_name || b.vendor_name,
            subtitle: `Check Out - ${b.stay_type || 'Stay'}`,
            datetime: parseISO(b.end_datetime),
            address: b.address,
            linkUrl: b.link_url,
          });
        }
      } else if (b.booking_type === 'car_rental') {
        // Rental: show pickup time
        events.push({
          id: `${b.id}-pickup`,
          type: 'car_rental',
          eventType: 'pickup',
          title: b.rental_company || b.vendor_name,
          subtitle: `Car Pickup${b.confirmation_number ? ` - ${b.confirmation_number}` : ''}`,
          datetime: parseISO(b.start_datetime),
          address: b.pickup_location || b.address,
          linkUrl: b.link_url,
        });
        // Rental: show drop-off event on end date (if available)
        if (b.end_datetime) {
          events.push({
            id: `${b.id}-dropoff`,
            type: 'car_rental',
            eventType: 'dropoff',
            title: b.rental_company || b.vendor_name,
            subtitle: `Car Drop-off`,
            datetime: parseISO(b.end_datetime),
            address: b.return_location || b.pickup_location || b.address,
            linkUrl: b.link_url,
          });
        }
      } else {
        // Activity: use start time
        events.push({
          id: b.id,
          type: 'activity',
          title: b.vendor_name,
          subtitle: `Activity - ${b.confirmation_number || 'No confirmation'}`,
          datetime: parseISO(b.start_datetime),
          endDatetime: b.end_datetime ? parseISO(b.end_datetime) : undefined,
          address: b.address,
          linkUrl: b.link_url,
        });
      }
    });
    
    // Add parking events - v1.2.7: separate start and end events for parking
    parkingList.forEach((p: Parking) => {
      // Parking start event
      events.push({
        id: `${p.id}-start`,
        type: 'parking',
        eventType: 'pickup', // reusing eventType for parking start
        title: p.label,
        subtitle: `Parking Start - ${p.parking_type}`,
        datetime: parseISO(p.start_datetime),
        address: p.address,
      });
      // Parking end event (if end_datetime available)
      if (p.end_datetime) {
        events.push({
          id: `${p.id}-end`,
          type: 'parking',
          eventType: 'dropoff', // reusing eventType for parking end
          title: p.label,
          subtitle: `Parking End - ${p.parking_type}`,
          datetime: parseISO(p.end_datetime),
          address: p.address,
        });
      }
    });
    
    return events.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
  };
  
  const timeline = buildTimelineEvents();

  // Parking status for card display
  const now = new Date();
  const upcomingParkingExpiration = parkingList
    .filter((p: Parking) => p.end_datetime && isAfter(parseISO(p.end_datetime), now))
    .sort((a: Parking, b: Parking) => parseISO(a.end_datetime!).getTime() - parseISO(b.end_datetime!).getTime())[0];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-4 h-4" />;
      case 'stay': return <Building2 className="w-4 h-4" />;
      case 'car_rental': return <Car className="w-4 h-4" />;
      case 'parking': return <CircleParking className="w-4 h-4" />;
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
    <div className="space-y-6">
      {/* Destination Header */}
      <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-background border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">{destinationDisplay}</h2>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(trip.start_date), 'MMM d')} - {format(parseISO(trip.end_date), 'MMM d, yyyy')} • {tripDays} day{tripDays !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {/* v2.0.3: Pro-only Upcoming Events */}
          <UpcomingEventsWidget tripId={tripId} />
        </CardContent>
      </Card>

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
        <FlightSummaryCard bookings={bookings} companions={companions} bookingCompanions={bookingCompanions} />
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

      {/* Destination Info & Recommendations */}
      <Card>
        <CardHeader>
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
      <div className="flex flex-col sm:flex-row gap-2 items-start">
        <Button onClick={downloadCalendar} variant="outline" className="w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" />
          Download Trip Calendar (.ics)
        </Button>
        <p className="text-xs text-muted-foreground sm:ml-2 sm:self-center">
          <Bell className="w-3 h-3 inline mr-1" />
          Includes 30-min reminders for all events
        </p>
      </div>

      {/* Timeline */}
      <Card>
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
                <div key={event.id} className="flex gap-4 animate-slide-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {getEventIcon(event.type)}
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
                      </div>
                      <div className="text-right text-xs shrink-0">
                        <p className="font-medium">{format(event.datetime, 'MMM d')}</p>
                        <p className="text-muted-foreground">{format(event.datetime, 'h:mm a')}</p>
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


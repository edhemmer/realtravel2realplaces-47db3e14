import { useBookings } from '@/hooks/useBookings';
import { useParking } from '@/hooks/useParking';
import { useExpenses } from '@/hooks/useExpenses';
import { Trip, Booking, Parking } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plane, Building2, Car, Calendar, MapPin, DollarSign, 
  AlertTriangle, Download, ExternalLink, Clock, PartyPopper
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addMinutes } from 'date-fns';

interface SummaryTabProps {
  tripId: string;
  trip: Trip;
}

interface TimelineEvent {
  id: string;
  type: 'flight' | 'stay' | 'car_rental' | 'activity' | 'parking';
  title: string;
  subtitle: string;
  datetime: Date;
  endDatetime?: Date;
  address?: string;
  linkUrl?: string;
}

export function SummaryTab({ tripId, trip }: SummaryTabProps) {
  const { data: bookings = [] } = useBookings(tripId);
  const { data: parkingList = [] } = useParking(tripId);
  const { data: expenses = [] } = useExpenses(tripId);

  // Calculate costs
  const bookingsCost = bookings.reduce((sum, b) => sum + Number(b.total_cost || 0), 0);
  const parkingCost = parkingList.reduce((sum, p) => sum + Number(p.total_cost || 0), 0);
  const expensesCost = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalCost = bookingsCost + parkingCost + expensesCost;

  const bookingsMyShare = bookings.reduce((sum, b) => sum + Number(b.my_share || 0), 0);
  const parkingMyShare = parkingList.reduce((sum, p) => sum + Number(p.my_share || 0), 0);
  const expensesMyShare = expenses.reduce((sum, e) => sum + Number(e.my_share || 0), 0);
  const myOutOfPocket = bookingsMyShare + parkingMyShare + expensesMyShare;

  // Build timeline
  const timeline: TimelineEvent[] = [
    ...bookings.map((b: Booking) => ({
      id: b.id,
      type: b.booking_type as TimelineEvent['type'],
      title: b.booking_type === 'flight' ? `${b.airline || b.vendor_name}` : b.property_name || b.vendor_name,
      subtitle: b.booking_type === 'flight' ? `Flight - ${b.confirmation_number || 'No confirmation'}` : 
               b.booking_type === 'stay' ? `${b.stay_type || 'Stay'} - ${b.confirmation_number || ''}` :
               b.booking_type === 'car_rental' ? `Car Rental - ${b.rental_company || b.vendor_name}` :
               `Activity - ${b.vendor_name}`,
      datetime: parseISO(b.start_datetime),
      endDatetime: b.end_datetime ? parseISO(b.end_datetime) : undefined,
      address: b.address,
      linkUrl: b.link_url,
    })),
    ...parkingList.map((p: Parking) => ({
      id: p.id,
      type: 'parking' as const,
      title: p.label,
      subtitle: `Parking - ${p.parking_type}`,
      datetime: parseISO(p.start_datetime),
      endDatetime: p.end_datetime ? parseISO(p.end_datetime) : undefined,
      address: p.address,
    })),
  ].sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

  // Preflight checks
  const flightsWithoutTSA = bookings.filter(
    (b: Booking) => b.booking_type === 'flight' && !b.tsa_precheck_number
  );
  const flightsWithoutFF = bookings.filter(
    (b: Booking) => b.booking_type === 'flight' && !b.frequent_flyer_number
  );

  // Parking expiration
  const now = new Date();
  const upcomingParkingExpiration = parkingList
    .filter((p: Parking) => p.end_datetime && isAfter(parseISO(p.end_datetime), now))
    .sort((a: Parking, b: Parking) => parseISO(a.end_datetime!).getTime() - parseISO(b.end_datetime!).getTime())[0];

  const parkingExpiringsSoon = parkingList.filter((p: Parking) => {
    if (!p.end_datetime) return false;
    const expirationTime = parseISO(p.end_datetime);
    const alertTime = addMinutes(now, 15);
    return isAfter(expirationTime, now) && isBefore(expirationTime, alertTime);
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-4 h-4" />;
      case 'stay': return <Building2 className="w-4 h-4" />;
      case 'car_rental': return <Car className="w-4 h-4" />;
      case 'parking': return <Car className="w-4 h-4" />;
      default: return <PartyPopper className="w-4 h-4" />;
    }
  };

  const openInMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  const downloadCalendar = () => {
    const events: string[] = [];
    
    // Add trip dates
    events.push(createICSEvent(
      `Trip: ${trip.name}`,
      `${trip.destination_city}, ${trip.destination_country}`,
      parseISO(trip.start_date),
      parseISO(trip.end_date),
      true
    ));

    // Add bookings
    bookings.forEach((b: Booking) => {
      events.push(createICSEvent(
        b.booking_type === 'flight' ? `Flight: ${b.airline || b.vendor_name}` :
        b.booking_type === 'stay' ? `Stay: ${b.property_name || b.vendor_name}` :
        `${b.booking_type}: ${b.vendor_name}`,
        b.address || '',
        parseISO(b.start_datetime),
        b.end_datetime ? parseISO(b.end_datetime) : undefined
      ));
    });

    // Add parking with expiration
    parkingList.forEach((p: Parking) => {
      if (p.end_datetime) {
        events.push(createICSEvent(
          `Parking Expires: ${p.label}`,
          p.address || '',
          addMinutes(parseISO(p.end_datetime), -15),
          parseISO(p.end_datetime)
        ));
      }
    });

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Real Travel//EN
${events.join('\n')}
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.name.replace(/[^a-z0-9]/gi, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {(flightsWithoutTSA.length > 0 || flightsWithoutFF.length > 0 || parkingExpiringsSoon.length > 0) && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              Pre-Flight Checks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {flightsWithoutTSA.map((f: Booking) => (
              <div key={`tsa-${f.id}`} className="text-sm flex items-center gap-2">
                <Badge variant="outline" className="text-warning border-warning">Missing TSA</Badge>
                <span>{f.airline || f.vendor_name} - {f.passenger_name || 'Passenger'}</span>
              </div>
            ))}
            {flightsWithoutFF.map((f: Booking) => (
              <div key={`ff-${f.id}`} className="text-sm flex items-center gap-2">
                <Badge variant="outline" className="text-muted-foreground">No FF#</Badge>
                <span>{f.airline || f.vendor_name}</span>
              </div>
            ))}
            {parkingExpiringsSoon.map((p: Parking) => (
              <div key={`park-${p.id}`} className="text-sm flex items-center gap-2">
                <Badge variant="destructive">Expiring Soon!</Badge>
                <span>{p.label}</span>
                {p.address && (
                  <Button size="sm" variant="link" className="h-auto p-0" onClick={() => openInMaps(p.address!)}>
                    <MapPin className="w-3 h-3 mr-1" />
                    Open in Maps
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cost Summary & Parking */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Cost Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Trip Total Cost</span>
                <span className="text-2xl font-bold">${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-muted-foreground">My Out-of-Pocket</span>
                <span className="text-xl font-semibold text-primary">${myOutOfPocket.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              Parking Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingParkingExpiration ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Next Expiration</span>
                </div>
                <div>
                  <p className="font-semibold">{upcomingParkingExpiration.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(upcomingParkingExpiration.end_datetime!), 'PPp')}
                  </p>
                </div>
                {upcomingParkingExpiration.address && (
                  <Button size="sm" variant="outline" onClick={() => openInMaps(upcomingParkingExpiration.address!)}>
                    <MapPin className="w-3 h-3 mr-1" />
                    Open in Maps
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No active parking</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calendar Export */}
      <Button onClick={downloadCalendar} variant="outline" className="w-full sm:w-auto">
        <Download className="w-4 h-4 mr-2" />
        Download Trip Calendar (.ics)
      </Button>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Trip Timeline
          </CardTitle>
          <CardDescription>All events in chronological order</CardDescription>
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
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">{event.subtitle}</p>
                      </div>
                      <div className="text-right text-sm shrink-0">
                        <p className="font-medium">{format(event.datetime, 'MMM d')}</p>
                        <p className="text-muted-foreground">{format(event.datetime, 'h:mm a')}</p>
                      </div>
                    </div>
                    {event.address && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1 h-auto p-1 text-xs"
                        onClick={() => openInMaps(event.address!)}
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        {event.address.slice(0, 40)}...
                      </Button>
                    )}
                    {event.linkUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1 h-auto p-1 text-xs"
                        onClick={() => window.open(event.linkUrl, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Booking
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No events yet. Add bookings and parking to build your timeline.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function createICSEvent(
  title: string,
  location: string,
  start: Date,
  end?: Date,
  allDay: boolean = false
): string {
  const formatDate = (date: Date, allDay: boolean) => {
    if (allDay) {
      return format(date, 'yyyyMMdd');
    }
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@realtravel`;
  
  return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(new Date(), false)}
DTSTART${allDay ? ';VALUE=DATE' : ''}:${formatDate(start, allDay)}
${end ? `DTEND${allDay ? ';VALUE=DATE' : ''}:${formatDate(end, allDay)}` : ''}
SUMMARY:${title}
${location ? `LOCATION:${location}` : ''}
END:VEVENT`;
}

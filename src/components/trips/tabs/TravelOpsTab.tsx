import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeDollarSign,
  Building2,
  Car,
  CloudSun,
  Gauge,
  Map,
  Navigation,
  Plane,
  RadioTower,
  Route,
  ShieldCheck,
  TrainFront,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trip, Booking } from '@/types/database';
import { useBookings } from '@/hooks/useBookings';
import { useExpenses } from '@/hooks/useExpenses';
import { useParking } from '@/hooks/useParking';
import { useTripWeather } from '@/hooks/useWeather';
import { useAccess } from '@/hooks/useAccess';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';
import { isOnline } from '@/lib/networkStatus';
import { cn } from '@/lib/utils';
import { getAirportByCode, type Airport } from '@/lib/airportData';

interface TravelOpsTabProps {
  tripId: string;
  trip: Trip;
}

interface AirportOps {
  code: string;
  airport?: Airport;
  role: 'Depart' | 'Arrive';
}

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function mapSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function transitUrl(trip: Trip) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${trip.destination_city}, ${trip.destination_country}`)}&travelmode=transit`;
}

function localTransitSearchUrl(trip: Trip) {
  return mapSearchUrl(`public transit stations near ${trip.destination_city}, ${trip.destination_country}`);
}

function getUniqueAirports(bookings: Booking[]): AirportOps[] {
  const seen = new Map<string, AirportOps>();
  bookings
    .filter((booking) => booking.booking_type === 'flight')
    .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))
    .forEach((booking) => {
      const dep = booking.departure_airport_code?.trim().toUpperCase();
      const arr = booking.arrival_airport_code?.trim().toUpperCase();
      if (dep && dep.length === 3 && !seen.has(dep)) {
        seen.set(dep, { code: dep, role: 'Depart', airport: getAirportByCode(dep) });
      }
      if (arr && arr.length === 3 && !seen.has(arr)) {
        seen.set(arr, { code: arr, role: 'Arrive', airport: getAirportByCode(arr) });
      }
    });
  return Array.from(seen.values());
}

function getEventTimestamp(eventLocalDateTime?: string, datetime?: Date): number {
  if (eventLocalDateTime && eventLocalDateTime.length >= 10) {
    const parsed = new Date(eventLocalDateTime.replace(' ', 'T')).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }
  const fallback = datetime?.getTime?.();
  return Number.isFinite(fallback) ? fallback : 0;
}

function formatEventTime(eventLocalDateTime?: string, datetime?: Date): string {
  const timestamp = getEventTimestamp(eventLocalDateTime, datetime);
  if (!timestamp) return 'Time TBD';
  return format(new Date(timestamp), 'MMM d, h:mm a');
}

function OpsMetric({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'watch';
}) {
  return (
    <Card className={cn(
      'overflow-hidden border-border/50 bg-card/90 shadow-sm',
      tone === 'good' && 'border-emerald-500/20 bg-emerald-500/5',
      tone === 'watch' && 'border-amber-500/25 bg-amber-500/7',
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="truncate text-lg font-bold leading-tight text-foreground">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OpsWindow({
  icon,
  title,
  detail,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/50 bg-card/95 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 rounded-full text-[10px]">
            {badge}
          </Badge>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function TravelOpsTab({ tripId, trip }: TravelOpsTabProps) {
  const { data: bookings = [] } = useBookings(tripId);
  const { data: expenses = [] } = useExpenses(tripId);
  const { data: parking = [] } = useParking(tripId);
  const { isPro, canAccessBusinessFeatures } = useAccess();
  const { timelineEvents, costs, hasFlights, hasStays, hasRentals } = useCanonicalTripState(tripId, trip);
  const weather = useTripWeather(
    trip.destination_city,
    trip.destination_country,
    trip.start_date,
    trip.end_date,
    trip.destination_state,
  );

  const online = isOnline();
  const airports = useMemo(() => getUniqueAirports(bookings), [bookings]);
  const upcoming = useMemo(
    () => timelineEvents
      .filter((event) => getEventTimestamp(event.eventLocalDateTime, event.datetime) >= Date.now())
      .slice(0, 4),
    [timelineEvents],
  );
  const nextBooking = useMemo(
    () => bookings
      .filter((booking) => new Date(booking.start_datetime).getTime() >= Date.now())
      .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))[0],
    [bookings],
  );

  const expenseTotal = expenses.reduce((sum, expense) => sum + (expense.converted_amount ?? expense.my_share ?? expense.amount ?? 0), 0);
  const parkingTotal = parking.reduce((sum, item) => sum + (item.my_share ?? item.total_cost ?? 0), 0);
  const readinessItems = [
    bookings.length > 0,
    hasFlights ? airports.length > 0 : true,
    weather.data !== undefined || weather.isLoading,
    online,
    trip.transportation_mode === 'drive' || hasFlights || hasRentals,
    expenses.length > 0 || canAccessBusinessFeatures || isPro,
  ];
  const readiness = Math.round((readinessItems.filter(Boolean).length / readinessItems.length) * 100);
  const mapQuery = `${trip.destination_city}, ${trip.destination_country}`;
  const sponsorSlots = [hasFlights ? 'Airline' : 'Travel', hasStays ? 'Lodging' : 'Stay', hasRentals || trip.transportation_mode === 'drive' ? 'Rental / Gas' : 'Transport'];

  return (
    <div className="space-y-5 pb-20">
      <section className="overflow-hidden rounded-2xl border border-border/50 bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),hsl(var(--card))_48%,hsl(var(--accent)/0.12))] p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-primary text-primary-foreground">TravelOps</Badge>
              <Badge variant="outline" className="rounded-full">
                {online ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
                {online ? 'Live windows' : 'Offline cache'}
              </Badge>
              <Badge variant="outline" className="rounded-full">Low-credit mode</Badge>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Manage the trip in real time
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Timeline, movement, airports, local transit, weather, money, offline readiness, and future sponsor inventory in one daily-use command layer.
            </p>
          </div>
          <div className="min-w-[220px] rounded-2xl border border-border/50 bg-background/70 p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Trip readiness
              <span className="text-foreground">{readiness}%</span>
            </div>
            <Progress value={readiness} className="h-2" />
            <p className="mt-2 text-xs text-muted-foreground">Uses existing canonical engines and cached provider windows.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OpsMetric icon={<Route className="h-5 w-5" />} label="Next move" value={nextBooking?.vendor_name || (trip.transportation_mode === 'drive' ? 'Drive cockpit' : 'Add booking')} tone={nextBooking ? 'good' : 'watch'} />
        <OpsMetric icon={<Plane className="h-5 w-5" />} label="Airports" value={airports.length ? airports.map((a) => a.code).join(' / ') : 'None linked'} tone={airports.length ? 'good' : 'neutral'} />
        <OpsMetric icon={<CloudSun className="h-5 w-5" />} label="Weather" value={weather.current ? `${weather.current.temperature}F ${weather.current.condition}` : 'Checking'} tone={weather.weatherAnalysis?.hasRain || weather.weatherAnalysis?.hasSnow ? 'watch' : 'good'} />
        <OpsMetric icon={<BadgeDollarSign className="h-5 w-5" />} label="Managed spend" value={currency((costs?.totalCost ?? 0) + expenseTotal + parkingTotal)} tone="neutral" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <OpsWindow
          icon={<Map className="h-5 w-5" />}
          title="Interactive destination map"
          detail="Embeds a free Google Maps place window now; native iOS can bolt into Apple/Google maps without burning Places search credits."
          badge="No API key"
        >
          <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/30">
            <iframe
              title={`${trip.destination_city} map`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
              className="h-[280px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" className="rounded-full">
              <a href={mapSearchUrl(mapQuery)} target="_blank" rel="noreferrer">
                <Navigation className="mr-2 h-4 w-4" />
                Open map
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <a href={transitUrl(trip)} target="_blank" rel="noreferrer">
                <TrainFront className="mr-2 h-4 w-4" />
                Transit route
              </a>
            </Button>
            {trip.transportation_mode === 'drive' && (
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link to={`/trip/${tripId}/drive`}>
                  <Car className="mr-2 h-4 w-4" />
                  Drive cockpit
                </Link>
              </Button>
            )}
          </div>
        </OpsWindow>

        <OpsWindow
          icon={<Gauge className="h-5 w-5" />}
          title="Execution stack"
          detail="The next few operational moments the traveler actually needs today."
          badge="Canonical"
        >
          <div className="space-y-2">
            {upcoming.length > 0 ? upcoming.map((event) => (
              <div key={event.id} className="rounded-xl border border-border/50 bg-background/70 p-3">
                <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
                <p className="text-xs text-muted-foreground">{formatEventTime(event.eventLocalDateTime, event.datetime)}</p>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-border/70 p-5 text-center text-sm text-muted-foreground">
                No upcoming timeline items yet.
              </div>
            )}
          </div>
        </OpsWindow>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <OpsWindow
          icon={<Building2 className="h-5 w-5" />}
          title="Airport windows"
          detail="Official maps, parking, and airport pages beat scraping, reduce support risk, and cost zero credits."
          badge="Official links"
        >
          <div className="space-y-2">
            {airports.length > 0 ? airports.map(({ code, role, airport }) => (
              <div key={code} className="rounded-xl border border-border/50 bg-background/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{code} <span className="font-medium text-muted-foreground">/ {role}</span></p>
                    <p className="text-xs text-muted-foreground">{airport?.name || 'Airport details'}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {airport?.mapUrl && <Button asChild size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs"><a href={airport.mapUrl} target="_blank" rel="noreferrer">Map</a></Button>}
                    {airport?.parkingUrl && <Button asChild size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs"><a href={airport.parkingUrl} target="_blank" rel="noreferrer">Park</a></Button>}
                  </div>
                </div>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">Add flight bookings to unlock terminal maps and airport operation links.</p>
            )}
          </div>
        </OpsWindow>

        <OpsWindow
          icon={<TrainFront className="h-5 w-5" />}
          title="Local transit window"
          detail="HERE Transit is already governed and cached; outbound maps provide a credit-free fallback for local agencies."
          badge="3-min cache"
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 bg-background/70 p-3">
              <p className="text-sm font-semibold">Transit readiness</p>
              <p className="text-xs text-muted-foreground">Use live HERE when coordinates exist; otherwise open local station maps.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="rounded-full">
                <a href={localTransitSearchUrl(trip)} target="_blank" rel="noreferrer">Nearby transit</a>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <a href={transitUrl(trip)} target="_blank" rel="noreferrer">Directions</a>
              </Button>
            </div>
          </div>
        </OpsWindow>

        <OpsWindow
          icon={<RadioTower className="h-5 w-5" />}
          title="Future paid banner rail"
          detail="Reserved inventory for airline, lodging, rental car, and mobility partners without showing ads yet."
          badge="Ready"
        >
          <div className="space-y-2">
            {sponsorSlots.map((slot) => (
              <div key={slot} className="flex items-center justify-between rounded-xl border border-dashed border-border/70 bg-muted/20 p-3">
                <span className="text-sm font-semibold text-foreground">{slot}</span>
                <Badge variant="outline" className="rounded-full text-[10px]">Logo banner</Badge>
              </div>
            ))}
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-700">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Kept separate from core travel tools so monetization does not damage trust.
            </div>
          </div>
        </OpsWindow>
      </section>
    </div>
  );
}

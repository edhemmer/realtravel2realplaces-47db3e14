import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeDollarSign,
  Building2,
  Car,
  CheckCircle2,
  Clock3,
  CloudSun,
  Gauge,
  LayoutDashboard,
  MapPinned,
  Map,
  Navigation,
  Plane,
  Plus,
  Route,
  ShieldCheck,
  TrainFront,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AppModuleHeader } from '@/components/trips/AppModuleHeader';
import { Trip, Booking } from '@/types/database';
import { useBookings } from '@/hooks/useBookings';
import { useExpenses } from '@/hooks/useExpenses';
import { useParking } from '@/hooks/useParking';
import { useTripWeather } from '@/hooks/useWeather';
import { useAccess } from '@/hooks/useAccess';
import { useLiveDriveRoute } from '@/hooks/useLiveDriveRoute';
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

function destinationLabel(trip: Trip) {
  return [trip.destination_city, trip.destination_country].filter(Boolean).join(', ') || trip.name || 'Trip destination';
}

function routeOriginLabel(trip: Trip) {
  return trip.origin_address?.trim() || '';
}

function routeDestinationLabel(trip: Trip) {
  return trip.destination_address?.trim() || destinationLabel(trip);
}

function routeDirectionsUrl(trip: Trip) {
  const destination = routeDestinationLabel(trip);
  const origin = routeOriginLabel(trip);
  const params = new URLSearchParams({
    api: '1',
    destination,
    travelmode: 'driving',
  });
  if (origin) params.set('origin', origin);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function routeMapEmbedUrl(trip: Trip) {
  const destination = routeDestinationLabel(trip);
  const origin = routeOriginLabel(trip);
  if (origin) {
    return `https://www.google.com/maps?output=embed&saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination)}`;
  }
  return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(destination)}`;
}

function transitUrl(trip: Trip) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationLabel(trip))}&travelmode=transit`;
}

function localTransitSearchUrl(trip: Trip) {
  return mapSearchUrl(`public transit stations near ${destinationLabel(trip)}`);
}

function bookingTimestamp(booking: Booking): number {
  const raw = booking.start_datetime || booking.end_datetime || '';
  const timestamp = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareBookingsByTime(a: Booking, b: Booking): number {
  return bookingTimestamp(a) - bookingTimestamp(b);
}

function isUpcomingBooking(booking: Booking): boolean {
  const timestamp = bookingTimestamp(booking);
  return timestamp > 0 && timestamp >= Date.now();
}

function bookingLabel(booking: Booking) {
  return booking.vendor_name || booking.property_name || booking.rental_company || booking.booking_type;
}

function getUniqueAirports(bookings: Booking[]): AirportOps[] {
  const seen = new Map<string, AirportOps>();
  bookings
    .filter((booking) => booking.booking_type === 'flight')
    .sort(compareBookingsByTime)
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
      'rt-command-panel',
      tone === 'good' && 'border-emerald-500/20 bg-emerald-500/5',
      tone === 'watch' && 'border-amber-500/25 bg-amber-500/7',
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="rt-icon-tile h-10 w-10">
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

function GuidanceStep({
  icon,
  label,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <div className="rt-kpi-panel flex gap-3 p-3">
      <div className="rt-icon-tile">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </div>
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
    <Card className="rt-command-panel">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rt-icon-tile">
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

function statusToneClass(tone: 'live' | 'cached' | 'setup' | 'neutral' | 'warning') {
  switch (tone) {
    case 'live':
      return 'border-emerald-500/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300';
    case 'cached':
      return 'border-sky-500/25 bg-sky-500/8 text-sky-700 dark:text-sky-300';
    case 'setup':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200';
    case 'warning':
      return 'border-red-500/25 bg-red-500/8 text-red-700 dark:text-red-300';
    default:
      return 'border-border/70 bg-card/70 text-muted-foreground';
  }
}

function TrustSignal({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'live' | 'cached' | 'setup' | 'neutral' | 'warning';
}) {
  return (
    <div className={cn('rounded-xl border px-3 py-2.5', statusToneClass(tone))}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</p>
        <p className="shrink-0 text-xs font-bold">{value}</p>
      </div>
      <p className="mt-1 text-xs leading-relaxed opacity-85">{detail}</p>
    </div>
  );
}

export function TravelOpsTab({ tripId, trip }: TravelOpsTabProps) {
  const { data: bookings = [] } = useBookings(tripId);
  const { data: expenses = [] } = useExpenses(tripId);
  const { data: parking = [] } = useParking(tripId);
  const { isPro, canAccessBusinessFeatures } = useAccess();
  const weather = useTripWeather(
    trip.destination_city,
    trip.destination_country,
    trip.start_date,
    trip.end_date,
    trip.destination_state,
  );
  const liveDriveRoute = useLiveDriveRoute(trip);

  const online = isOnline();
  const isDriveTrip = trip.transportation_mode === 'drive';
  const hasFlights = bookings.some((booking) => booking.booking_type === 'flight');
  const hasRentals = bookings.some((booking) => booking.booking_type === 'car_rental');
  const airports = useMemo(() => getUniqueAirports(bookings), [bookings]);
  const upcoming = useMemo(
    () => bookings
      .filter(isUpcomingBooking)
      .sort(compareBookingsByTime)
      .slice(0, 4),
    [bookings],
  );
  const nextBooking = useMemo(
    () => bookings
      .filter(isUpcomingBooking)
      .sort(compareBookingsByTime)[0],
    [bookings],
  );

  const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.converted_amount ?? expense.my_share ?? expense.amount ?? 0), 0);
  const parkingTotal = parking.reduce((sum, item) => sum + Number(item.my_share ?? item.total_cost ?? 0), 0);
  const routeSummary = liveDriveRoute.route?.summary || null;
  const routeStatusLabel =
    liveDriveRoute.status === 'live' ? 'Live route'
    : liveDriveRoute.status === 'estimate' ? 'Estimated route'
    : liveDriveRoute.status === 'needs_origin' ? 'Needs origin'
    : liveDriveRoute.status === 'needs_destination' ? 'Needs destination'
    : 'Route unavailable';
  const routeStatusTone =
    liveDriveRoute.status === 'live' ? 'live'
    : liveDriveRoute.status === 'estimate' ? 'cached'
    : liveDriveRoute.status === 'needs_origin' || liveDriveRoute.status === 'needs_destination' ? 'setup'
    : 'warning';
  const routeDistanceLabel = routeSummary
    ? `${routeSummary.distanceMiles} mi / ${Math.round(routeSummary.durationMinutes / 60 * 10) / 10} hr`
    : trip.estimated_miles
      ? `${trip.estimated_miles} mi estimate`
      : 'Add route details';
  const readinessItems = [
    bookings.length > 0,
    hasFlights ? airports.length > 0 : true,
    weather.data !== undefined || weather.isLoading,
    online,
    isDriveTrip ? liveDriveRoute.status === 'live' || liveDriveRoute.status === 'estimate' : hasFlights || hasRentals,
    expenses.length > 0 || canAccessBusinessFeatures || isPro,
  ];
  const readiness = Math.round((readinessItems.filter(Boolean).length / readinessItems.length) * 100);
  const mapQuery = destinationLabel(trip);
  const routeDestination = routeDestinationLabel(trip);
  const routeOrigin = routeOriginLabel(trip);
  const nextMoveLabel = nextBooking ? bookingLabel(nextBooking) : (isDriveTrip ? `Plan route to ${routeDestination}` : 'Add first booking');
  const bookingCostTotal = bookings.reduce((sum, booking) => sum + Number(booking.my_share ?? booking.total_cost ?? 0), 0);
  const managedSpend = bookingCostTotal + expenseTotal + parkingTotal;

  return (
    <div className="rt-page-stack pb-20">
      <AppModuleHeader
        icon={LayoutDashboard}
        eyebrow="Move"
        title="Travel command"
        description="Use this before and during travel to see movement, route confidence, airport windows, local transit, weather, spend, and the next operational step."
        status={online ? 'Live windows' : 'Offline cache'}
        statusTone={online ? 'live' : 'cached'}
      >
          <div className="rt-kpi-panel min-w-[220px] p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Trip readiness
              <span className="text-foreground">{readiness}%</span>
            </div>
            <Progress value={readiness} className="h-2" />
            <p className="mt-2 text-xs text-muted-foreground">Trip readiness</p>
          </div>
      </AppModuleHeader>

      <section className="grid gap-3 lg:grid-cols-3">
        <GuidanceStep icon={<CheckCircle2 className="h-5 w-5" />} label="1. Know the next step" detail={nextMoveLabel} />
        <GuidanceStep icon={<Map className="h-5 w-5" />} label="2. Review the route" detail={isDriveTrip ? 'Preview directions, route options, gas, and stops before departure.' : `Map, transit, airport, and weather context for ${mapQuery}.`} />
        <GuidanceStep icon={<ShieldCheck className="h-5 w-5" />} label="3. Keep proof and notes" detail={isDriveTrip ? 'Add stops along the route, then keep receipts and notes tied to the trip.' : 'Capture receipts, parking, notes, and business context while details are fresh.'} />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <TrustSignal
          label="Route truth"
          value={isDriveTrip ? routeStatusLabel : hasFlights ? 'Air-aware' : 'Timeline'}
          detail={isDriveTrip ? liveDriveRoute.detail : hasFlights ? 'Flight records unlock airport windows and status checks.' : 'Add flight, rail, car, or drive details to improve movement intelligence.'}
          tone={isDriveTrip ? routeStatusTone : hasFlights ? 'live' : 'neutral'}
        />
        <TrustSignal
          label="Weather truth"
          value={weather.current ? 'Weather ready' : weather.isLoading ? 'Checking' : 'Needs refresh'}
          detail={weather.current ? `${weather.current.condition}, ${weather.current.temperature}F at the trip area.` : 'RT2RP will show live or seasonal weather depending on the trip window.'}
          tone={weather.current ? (weather.weatherAnalysis?.hasRain || weather.weatherAnalysis?.hasSnow ? 'setup' : 'live') : weather.isLoading ? 'cached' : 'neutral'}
        />
        <TrustSignal
          label="Cost control"
          value="Gated"
          detail="Provider-backed calls are cached and only made when route or place context is specific enough to be useful."
          tone="cached"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OpsMetric icon={<Route className="h-5 w-5" />} label="Next step" value={nextMoveLabel} tone={nextBooking || upcoming.length || isDriveTrip ? 'good' : 'watch'} />
        <OpsMetric icon={<Plane className="h-5 w-5" />} label="Airports" value={airports.length ? airports.map((a) => a.code).join(' / ') : 'None linked'} tone={airports.length ? 'good' : 'neutral'} />
        <OpsMetric icon={<CloudSun className="h-5 w-5" />} label="Weather" value={weather.current ? `${weather.current.temperature}F ${weather.current.condition}` : 'Checking'} tone={weather.weatherAnalysis?.hasRain || weather.weatherAnalysis?.hasSnow ? 'watch' : 'good'} />
        <OpsMetric icon={<Clock3 className="h-5 w-5" />} label="Route timing" value={isDriveTrip ? routeDistanceLabel : 'By timeline'} tone={liveDriveRoute.status === 'live' ? 'good' : liveDriveRoute.status === 'estimate' ? 'neutral' : 'watch'} />
      </section>

      {isDriveTrip && (
        <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <OpsWindow
            icon={<Route className="h-5 w-5" />}
            title="Drive route"
            detail={liveDriveRoute.status === 'live' ? 'Provider-backed distance and traffic timing are ready. Compare options before departure.' : liveDriveRoute.detail}
            badge={routeStatusLabel}
          >
            <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/30">
              <iframe
                title={`Driving route to ${routeDestination}`}
                src={routeMapEmbedUrl(trip)}
                className="h-[320px] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button asChild size="sm" className="rounded-full">
                <a href={routeDirectionsUrl(trip)} target="_blank" rel="noreferrer">
                  <Navigation className="mr-2 h-4 w-4" />
                  Route options
                </a>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link to={`/trip/${tripId}?tab=tour`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add stop
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <a href={mapSearchUrl(`gas stations between ${routeOrigin || 'current location'} and ${routeDestination}`)} target="_blank" rel="noreferrer">
                  <Car className="mr-2 h-4 w-4" />
                  Gas on route
                </a>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link to={`/trip/${tripId}/drive`}>
                  <Gauge className="mr-2 h-4 w-4" />
                  Drive cockpit
                </Link>
              </Button>
            </div>
          </OpsWindow>

          <OpsWindow
            icon={<MapPinned className="h-5 w-5" />}
            title="Route details"
            detail="The route can be reviewed even before the active travel window. Add an origin for better door-to-door planning."
            badge={routeOrigin ? 'Door-to-door' : 'Destination'}
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Origin</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{routeOrigin || 'Current location when navigation starts'}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Destination</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{routeDestination}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {liveDriveRoute.status === 'live' ? 'Live distance and timing' : 'Route distance and timing'}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {routeSummary
                    ? `${routeSummary.distanceMiles} miles / ${routeSummary.durationMinutes} minutes${liveDriveRoute.route?.trafficDelayMinutes ? ` / ${liveDriveRoute.route.trafficDelayMinutes} min traffic delay` : ''}`
                    : trip.estimated_miles ? `${trip.estimated_miles} miles from trip setup` : 'Add origin and destination details'}
                </p>
              </div>
              <div className={cn('rounded-xl border p-3', statusToneClass(routeStatusTone))}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Provider state</p>
                <p className="mt-1 text-sm font-semibold">{routeStatusLabel}</p>
                <p className="mt-1 text-xs leading-relaxed opacity-85">{liveDriveRoute.detail}</p>
              </div>
            </div>
          </OpsWindow>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <OpsWindow
          icon={<Map className="h-5 w-5" />}
          title={isDriveTrip ? 'Destination area map' : 'Interactive destination map'}
          detail={isDriveTrip ? 'Use this after route planning to inspect the arrival area, nearby transit, parking, and destination context.' : "A low-cost destination window for checking the area. Native iOS can hand off to the user's preferred map app."}
          badge="Map handoff"
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
            {isDriveTrip && (
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
          title="Next timed items"
          detail="The next timed items from the trip itinerary."
          badge="Timeline"
        >
          <div className="space-y-2">
            {upcoming.length > 0 ? upcoming.map((event) => (
              <div key={event.id} className="rounded-xl border border-border/50 bg-background/70 p-3">
                <p className="truncate text-sm font-semibold text-foreground">{bookingLabel(event)}</p>
                <p className="text-xs text-muted-foreground">{formatEventTime(event.start_datetime)}</p>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-border/70 p-5 text-center text-sm text-muted-foreground">
                No upcoming timeline items yet.
              </div>
            )}
          </div>
        </OpsWindow>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <OpsWindow
          icon={<Building2 className="h-5 w-5" />}
          title="Airport maps"
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
          title="Local transit"
          detail="Live transit can be cached when coordinates exist; outbound local station maps provide a credit-free fallback."
          badge="3-min cache"
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 bg-background/70 p-3">
              <p className="text-sm font-semibold">Transit readiness</p>
              <p className="text-xs text-muted-foreground">Use cached live data when available; otherwise open local agency and station maps.</p>
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
      </section>
    </div>
  );
}

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Building2, Clock, ExternalLink, Map, ParkingCircle, Plane, RadioTower, TrainFront } from 'lucide-react';
import { AppModuleHeader } from '@/components/trips/AppModuleHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBookings } from '@/hooks/useBookings';
import { getAirportByCode, type Airport } from '@/lib/airportData';
import { cn } from '@/lib/utils';
import type { Booking, Trip } from '@/types/database';

interface AirportTabProps {
  tripId: string;
  trip: Trip;
}

interface AirportUse {
  code: string;
  role: 'Depart' | 'Arrive';
  airport?: Airport;
  booking: Booking;
}

function normalizeIata(code?: string | null): string | null {
  const value = code?.trim().toUpperCase();
  return value && /^[A-Z]{3}$/.test(value) ? value : null;
}

function flightNumber(booking: Booking): string | null {
  return ((booking as any).flight_number || '').trim() || null;
}

function flightStatusSearchUrl(booking: Booking): string {
  const flight = flightNumber(booking);
  const query = [
    flight,
    booking.airline,
    booking.vendor_name,
    booking.departure_airport_code,
    booking.arrival_airport_code,
    'flight status',
  ].filter(Boolean).join(' ');
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function airportWideStatusUrl(code: string): string {
  return `https://www.flightaware.com/live/airport/K${code}`;
}

function officialFlightSearchUrl(code: string): string {
  if (code === 'ORD') return 'https://www.flychicago.com/ohare/myflight/flightsearch/Pages/default.aspx';
  if (code === 'MDW') return 'https://www.flychicago.com/midway/myflight/flightsearch/Pages/default.aspx';
  return airportWideStatusUrl(code);
}

function formatTime(value?: string | null): string {
  if (!value) return 'Time not set';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return format(date, 'EEE, MMM d, h:mm a');
}

function airportLabel(use: AirportUse): string {
  return use.airport ? `${use.code} - ${use.airport.name}` : `${use.code} airport`;
}

function collectAirports(bookings: Booking[]): AirportUse[] {
  const seen = new Set<string>();
  const rows: AirportUse[] = [];

  bookings
    .filter((booking) => booking.booking_type === 'flight')
    .sort((a, b) => (a.start_datetime || '').localeCompare(b.start_datetime || ''))
    .forEach((booking) => {
      const dep = normalizeIata(booking.departure_airport_code);
      const arr = normalizeIata(booking.arrival_airport_code);
      if (dep && !seen.has(`${dep}:Depart`)) {
        seen.add(`${dep}:Depart`);
        rows.push({ code: dep, role: 'Depart', airport: getAirportByCode(dep), booking });
      }
      if (arr && !seen.has(`${arr}:Arrive`)) {
        seen.add(`${arr}:Arrive`);
        rows.push({ code: arr, role: 'Arrive', airport: getAirportByCode(arr), booking });
      }
    });

  return rows;
}

export function AirportTab({ tripId, trip }: AirportTabProps) {
  const { data: bookings = [], isLoading, error } = useBookings(tripId);
  const flightBookings = useMemo(
    () => bookings
      .filter((booking) => booking.booking_type === 'flight')
      .sort((a, b) => (a.start_datetime || '').localeCompare(b.start_datetime || '')),
    [bookings],
  );
  const airports = useMemo(() => collectAirports(bookings), [bookings]);
  const now = Date.now();
  const nextFlight = useMemo(
    () => flightBookings.find((booking) => {
      const time = new Date(booking.start_datetime || '').getTime();
      return Number.isFinite(time) && time >= now;
    }) || flightBookings[0] || null,
    [flightBookings, now],
  );
  const primaryAirportCode = normalizeIata(nextFlight?.departure_airport_code) || normalizeIata(nextFlight?.arrival_airport_code) || airports[0]?.code || null;

  return (
    <div className="rt-page-stack pb-20">
      <AppModuleHeader
        icon={Building2}
        eyebrow="Airport"
        title="Airport and flight window"
        description="Terminal maps, official airport links, parking, transit, and flight-status checks in one place for the travel day."
        status={primaryAirportCode ? `${primaryAirportCode} context` : 'Add flight'}
        statusTone={primaryAirportCode ? 'neutral' : 'setup'}
      />

      {isLoading && (
        <Card className="rt-command-panel">
          <CardContent className="p-6 text-sm text-muted-foreground">Loading airport context...</CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 text-sm text-muted-foreground">We could not load your flight records. Try again from the trip timeline.</CardContent>
        </Card>
      )}

      {!isLoading && !error && flightBookings.length === 0 && (
        <Card className="rt-command-panel">
          <CardContent className="p-6">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <div className="rt-icon-tile mb-3 h-12 w-12">
                <Plane className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">No flight is connected yet</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Add or import a flight confirmation so RT2RP can show your airport map, parking, flight status, and airport timing without making you search.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {nextFlight && (
        <Card className="rt-command-panel overflow-hidden">
          <div className="border-b border-border/40 bg-primary/6 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="rt-muted-label">Next flight</p>
                <h3 className="text-xl font-bold">
                  {flightNumber(nextFlight) || nextFlight.airline || nextFlight.vendor_name || 'Flight'}
                </h3>
              </div>
              <Badge variant="outline" className="rounded-full">
                {normalizeIata(nextFlight.departure_airport_code) || '---'} to {normalizeIata(nextFlight.arrival_airport_code) || '---'}
              </Badge>
            </div>
          </div>
          <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-semibold">{formatTime(nextFlight.start_datetime)}</span>
              </p>
              <p className="text-muted-foreground">
                {nextFlight.confirmation_number ? `Confirmation ${nextFlight.confirmation_number}` : 'Confirmation not stored'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="rounded-full">
                <a href={flightStatusSearchUrl(nextFlight)} target="_blank" rel="noreferrer">
                  <RadioTower className="mr-2 h-4 w-4" />
                  Check flight status
                </a>
              </Button>
              {primaryAirportCode && (
                <Button asChild variant="outline" className="rounded-full">
                  <a href={officialFlightSearchUrl(primaryAirportCode)} target="_blank" rel="noreferrer">
                    Official airport search
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {primaryAirportCode && (
        <Card className="rt-command-panel">
          <CardContent className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAirportAction icon={<RadioTower className="h-4 w-4" />} label="Airport delays" href={airportWideStatusUrl(primaryAirportCode)} />
            <QuickAirportAction icon={<Map className="h-4 w-4" />} label="Terminal map" href={getAirportByCode(primaryAirportCode)?.mapUrl || airportWideStatusUrl(primaryAirportCode)} />
            <QuickAirportAction icon={<ParkingCircle className="h-4 w-4" />} label="Parking" href={getAirportByCode(primaryAirportCode)?.parkingUrl || airportWideStatusUrl(primaryAirportCode)} />
            <QuickAirportAction icon={<TrainFront className="h-4 w-4" />} label="Transit" href={getAirportByCode(primaryAirportCode)?.transportUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${primaryAirportCode} airport transit`)}`} />
          </CardContent>
        </Card>
      )}

      {airports.length > 0 && (
        <section className="grid gap-3 lg:grid-cols-2">
          {airports.map((airportUse) => (
            <Card key={`${airportUse.code}-${airportUse.role}`} className="rt-command-panel">
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="rt-muted-label">{airportUse.role}</p>
                    <h3 className="text-lg font-bold">{airportLabel(airportUse)}</h3>
                    <p className="text-xs text-muted-foreground">
                      Linked to {flightNumber(airportUse.booking) || airportUse.booking.vendor_name || 'flight'} on {formatTime(airportUse.booking.start_datetime)}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn('rounded-full', airportUse.role === 'Depart' && 'border-primary/30 bg-primary/8')}>
                    {airportUse.code}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <QuickAirportAction icon={<Map className="h-4 w-4" />} label="Map" href={airportUse.airport?.mapUrl || airportWideStatusUrl(airportUse.code)} />
                  <QuickAirportAction icon={<RadioTower className="h-4 w-4" />} label="Status" href={officialFlightSearchUrl(airportUse.code)} />
                  <QuickAirportAction icon={<ParkingCircle className="h-4 w-4" />} label="Parking" href={airportUse.airport?.parkingUrl || airportWideStatusUrl(airportUse.code)} />
                  <QuickAirportAction icon={<ExternalLink className="h-4 w-4" />} label="Airport site" href={airportUse.airport?.officialUrl || airportWideStatusUrl(airportUse.code)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

function QuickAirportAction({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Button asChild variant="outline" className="h-11 justify-start rounded-xl">
      <a href={href} target="_blank" rel="noreferrer">
        {icon}
        <span className="ml-2">{label}</span>
      </a>
    </Button>
  );
}

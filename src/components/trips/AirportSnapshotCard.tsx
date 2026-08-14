/**
 * Airport Snapshot Card
 * Displays unique airports from saved flight records with factual map and
 * official-airport links when those references are available.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Plane } from 'lucide-react';
import { Booking } from '@/types/database';
import { tripHasAirportSegments } from '@/lib/airportContext';
import { getAirportByCode } from '@/lib/airportData';
import { validateIATA } from '@/lib/flightDisplayUtils';
import { AirportRow, type AirportDisplay } from '@/components/trips/AirportRow';

function getAllUniqueAirports(bookings: Booking[]): AirportDisplay[] {
  const seen = new Map<string, AirportDisplay>();

  const flights = bookings
    .filter((booking) => booking.booking_type === 'flight')
    .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));

  for (const flight of flights) {
    const depCode = validateIATA(flight.departure_airport_code);
    if (depCode && !seen.has(depCode)) {
      const airport = getAirportByCode(depCode);
      seen.set(depCode, {
        code: depCode,
        label: airport?.city || flight.departure_airport_name || depCode,
        airport: airport || undefined,
      });
    }

    const arrCode = validateIATA(flight.arrival_airport_code);
    if (arrCode && !seen.has(arrCode)) {
      const airport = getAirportByCode(arrCode);
      seen.set(arrCode, {
        code: arrCode,
        label: airport?.city || flight.arrival_airport_name || arrCode,
        airport: airport || undefined,
      });
    }
  }

  return Array.from(seen.values());
}

export function AirportSnapshotCard({ bookings }: { bookings: Booking[] }) {
  if (!tripHasAirportSegments(bookings)) return null;

  const airports = getAllUniqueAirports(bookings);
  if (airports.length === 0) return null;

  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Plane className="w-3.5 h-3.5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">
              Saved airports
            </h3>

            <div className="space-y-1.5">
              {airports.map((airport) => (
                <AirportRow key={airport.code} display={airport} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

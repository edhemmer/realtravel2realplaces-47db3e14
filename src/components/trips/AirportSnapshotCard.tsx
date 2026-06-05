/**
 * v2.1.0: Airport Snapshot Card
 * Displays all unique airports for trips with flights
 * Includes tier-aware info access and map links
 */

import { Card, CardContent } from '@/components/ui/card';
import { Plane } from 'lucide-react';
import { Booking } from '@/types/database';
import { tripHasAirportSegments } from '@/lib/airportContext';
import { getAirportByCode, Airport } from '@/lib/airportData';
import { validateIATA } from '@/lib/flightDisplayUtils';
import { useIsPro } from '@/hooks/useSubscription';
import { AirportRow, type AirportDisplay } from '@/components/trips/AirportRow';

/**
 * Collects all unique airports from flight bookings, preserving first-seen order.
 */
function getAllUniqueAirports(bookings: Booking[]): AirportDisplay[] {
  const seen = new Map<string, AirportDisplay>();

  const flights = bookings
    .filter(b => b.booking_type === 'flight')
    .sort((a, b) => (a.start_datetime < b.start_datetime ? -1 : a.start_datetime > b.start_datetime ? 1 : 0));

  for (const flight of flights) {
    const f = flight as Booking & {
      departure_airport_code?: string | null;
      departure_airport_name?: string | null;
      arrival_airport_code?: string | null;
      arrival_airport_name?: string | null;
    };

    const depCode = validateIATA(f.departure_airport_code);
    if (depCode && !seen.has(depCode)) {
      const airport = getAirportByCode(depCode);
      seen.set(depCode, {
        code: depCode,
        label: airport?.city || f.departure_airport_name || depCode,
        airport: airport || undefined,
      });
    }

    const arrCode = validateIATA(f.arrival_airport_code);
    if (arrCode && !seen.has(arrCode)) {
      const airport = getAirportByCode(arrCode);
      seen.set(arrCode, {
        code: arrCode,
        label: airport?.city || f.arrival_airport_name || arrCode,
        airport: airport || undefined,
      });
    }
  }

  return Array.from(seen.values());
}

export function AirportSnapshotCard({ bookings }: { bookings: Booking[] }) {
  const isPro = useIsPro();

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
              Airport Snapshot
            </h3>

            <div className="space-y-1.5">
              {airports.map((a) => (
                <AirportRow key={a.code} display={a} isPro={isPro} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

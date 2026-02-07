/**
 * v2.0.4: Airport Snapshot Card
 * Displays primary departure/arrival airports for trips with flights
 * Honest, expectation-setting UI - no live data or navigation promises
 */

import { Card, CardContent } from '@/components/ui/card';
import { Plane } from 'lucide-react';
import { Booking } from '@/types/database';
import { tripHasAirportSegments } from '@/lib/airportContext';

interface AirportSnapshotCardProps {
  bookings: Booking[];
}

interface AirportDisplay {
  code: string;
  label: string; // "City" or "Airport Name" as fallback
}

/**
 * Extracts primary departure and arrival airports from flight bookings
 * Uses first flight's departure and last flight's arrival as "primary" endpoints
 */
function getPrimaryAirports(bookings: Booking[]): {
  departure: AirportDisplay | null;
  arrival: AirportDisplay | null;
} {
  const flights = bookings
    .filter(b => b.booking_type === 'flight')
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  if (flights.length === 0) {
    return { departure: null, arrival: null };
  }

  // Cast to access new airport columns (until types regenerate)
  const firstFlight = flights[0] as Booking & {
    departure_airport_code?: string | null;
    departure_airport_name?: string | null;
  };
  
  const lastFlight = flights[flights.length - 1] as Booking & {
    arrival_airport_code?: string | null;
    arrival_airport_name?: string | null;
  };

  let departure: AirportDisplay | null = null;
  let arrival: AirportDisplay | null = null;

  // Extract departure from first flight
  if (firstFlight.departure_airport_code) {
    departure = {
      code: firstFlight.departure_airport_code.toUpperCase(),
      label: firstFlight.departure_airport_name || firstFlight.departure_airport_code.toUpperCase(),
    };
  }

  // Extract arrival from last flight
  if (lastFlight.arrival_airport_code) {
    arrival = {
      code: lastFlight.arrival_airport_code.toUpperCase(),
      label: lastFlight.arrival_airport_name || lastFlight.arrival_airport_code.toUpperCase(),
    };
  }

  return { departure, arrival };
}

export function AirportSnapshotCard({ bookings }: AirportSnapshotCardProps) {
  // Only render for trips with flight segments
  if (!tripHasAirportSegments(bookings)) {
    return null;
  }

  const { departure, arrival } = getPrimaryAirports(bookings);

  // Don't show if no airport data is available yet
  if (!departure && !arrival) {
    return null;
  }

  return (
    <Card className="border-border/40">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Plane className="w-4 h-4 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold mb-2">Airport Snapshot</h3>
            
            <div className="space-y-1.5">
              {departure && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">From:</span>
                  <span className="font-medium">{departure.code}</span>
                  <span className="text-muted-foreground">–</span>
                  <span className="truncate text-muted-foreground">{departure.label}</span>
                </div>
              )}
              
              {arrival && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">To:</span>
                  <span className="font-medium">{arrival.code}</span>
                  <span className="text-muted-foreground">–</span>
                  <span className="truncate text-muted-foreground">{arrival.label}</span>
                </div>
              )}
            </div>

            {/* Expectation-setting subtitle */}
            <p className="text-[11px] text-muted-foreground/70 mt-3 italic">
              Airport tools in development — snapshot only.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * v2.0.5: Airport Snapshot Card
 * Displays primary departure/arrival airports for trips with flights
 * Includes tier-aware info access and Google Maps links
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plane, MapPin, Info, Sparkles } from 'lucide-react';
import { Booking } from '@/types/database';
import { tripHasAirportSegments } from '@/lib/airportContext';
import { getAirportByCode, Airport } from '@/lib/airportData';
import { useIsPro } from '@/hooks/useSubscription';

interface AirportSnapshotCardProps {
  bookings: Booking[];
}

interface AirportDisplay {
  code: string;
  label: string; // "City" or "Airport Name" as fallback
  airport?: Airport; // Full airport data if available
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
    const code = firstFlight.departure_airport_code.toUpperCase();
    const airport = getAirportByCode(code);
    departure = {
      code,
      label: airport?.city || firstFlight.departure_airport_name || code,
      airport: airport || undefined,
    };
  }

  // Extract arrival from last flight
  if (lastFlight.arrival_airport_code) {
    const code = lastFlight.arrival_airport_code.toUpperCase();
    const airport = getAirportByCode(code);
    arrival = {
      code,
      label: airport?.city || lastFlight.arrival_airport_name || code,
      airport: airport || undefined,
    };
  }

  return { departure, arrival };
}

/**
 * Generates Google Maps search URL for an airport
 */
function getGoogleMapsUrl(code: string, name?: string): string {
  const query = name ? `${name} Airport ${code}` : `${code} Airport`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

interface AirportInfoPillProps {
  infoUrl?: string;
  isPro: boolean;
  airportCode: string;
}

function AirportInfoPill({ infoUrl, isPro, airportCode }: AirportInfoPillProps) {
  const [open, setOpen] = useState(false);
  
  // Pro/Business users get direct link to airport website
  if (isPro && infoUrl) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        asChild
      >
        <a
          href={infoUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="View airport info"
        >
          <Info className="h-3.5 w-3.5 text-primary" />
        </a>
      </Button>
    );
  }
  
  // Free users get inline upgrade message via popover (same visual as Pro)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          title="Airport info"
        >
          <Info className="h-3.5 w-3.5 text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="end" 
        className="w-64 p-3"
      >
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Airport Tools</p>
            <p className="text-xs text-muted-foreground">
              Airport details and tools are available on Pro and Business plans.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface AirportRowProps {
  type: 'From' | 'To';
  display: AirportDisplay;
  isPro: boolean;
}

function AirportRow({ type, display, isPro }: AirportRowProps) {
  const mapsUrl = getGoogleMapsUrl(display.code, display.airport?.name);
  const infoUrl = display.airport?.officialUrl;
  
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm min-w-0">
        <span className="text-muted-foreground shrink-0">{type}:</span>
        <span className="font-medium">{display.code}</span>
        <span className="text-muted-foreground">–</span>
        <span className="truncate text-muted-foreground">{display.label}</span>
      </div>
      
      <div className="flex items-center gap-1 shrink-0">
        {/* Google Maps - Available to all plans */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          asChild
        >
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="View airport on map"
          >
            <MapPin className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
          </a>
        </Button>
        
        {/* Airport Info - Tier-aware behavior */}
        <AirportInfoPill 
          infoUrl={infoUrl} 
          isPro={isPro} 
          airportCode={display.code} 
        />
      </div>
    </div>
  );
}

export function AirportSnapshotCard({ bookings }: AirportSnapshotCardProps) {
  const isPro = useIsPro();
  
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
                <AirportRow type="From" display={departure} isPro={isPro} />
              )}
              
              {arrival && (
                <AirportRow type="To" display={arrival} isPro={isPro} />
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
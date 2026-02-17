import { Booking, Companion } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Users, Clock, ExternalLink, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasExplicitTime, UNKNOWN_TIME_PLACEHOLDER } from '@/lib/datetimeIntegrity';
import { formatLocalTimeDirect, formatLocalDateDirect } from '@/lib/canonicalTimeNormalizer';
import { extractAirportCodes } from '@/lib/airportData';
import { validateIATA, buildFlightDisplayLine } from '@/lib/flightDisplayUtils';
import { AirportInfoPill } from './AirportInfoPill';
import { useAccess } from '@/hooks/useAccess';

interface BookingCompanion {
  id: string;
  booking_id: string;
  companion_id: string;
  created_at: string;
}

interface FlightSummaryCardProps {
  bookings: Booking[];
  companions: Companion[];
  bookingCompanions: BookingCompanion[];
}

export function FlightSummaryCard({ bookings, companions, bookingCompanions }: FlightSummaryCardProps) {
  const { isPro } = useAccess();
  const flights = bookings
    .filter((b) => b.booking_type === 'flight')
    .sort((a, b) => {
      const aStr = a.start_datetime || '';
      const bStr = b.start_datetime || '';
      if (aStr < bStr) return -1;
      if (aStr > bStr) return 1;
      return 0;
    });

  if (flights.length === 0) {
    return null;
  }

  const getCompanionsForFlight = (bookingId: string): Companion[] => {
    const linkedIds = bookingCompanions
      .filter(bc => bc.booking_id === bookingId)
      .map(bc => bc.companion_id);
    return companions.filter(c => linkedIds.includes(c.id));
  };

  const totalTravelers = companions.length + 1;

  const extractFlightInfo = (notes?: string): string | null => {
    if (!notes) return null;
    const match = notes.match(/(?:flight\s*#?\s*)?([A-Z]{2}\s*\d+)/i);
    return match ? match[1].replace(/\s+/g, '') : null;
  };

  const getFlightAirportCodes = (flight: Booking): { origin?: string; destination?: string; originName?: string; destinationName?: string } => {
    const dbOrigin = validateIATA(flight.departure_airport_code);
    const dbDest = validateIATA(flight.arrival_airport_code);
    const originName = flight.departure_airport_name || undefined;
    const destinationName = flight.arrival_airport_name || undefined;
    if (dbOrigin || dbDest) {
      return { origin: dbOrigin || undefined, destination: dbDest || undefined, originName, destinationName };
    }
    let codes = extractAirportCodes(flight.notes || '');
    if (codes.origin || codes.destination) return { ...codes, originName, destinationName };
    codes = extractAirportCodes(flight.vendor_name || '');
    if (codes.origin || codes.destination) return { ...codes, originName, destinationName };
    if (flight.pickup_location) {
      codes = extractAirportCodes(flight.pickup_location);
      if (codes.origin) return { ...codes, originName, destinationName };
    }
    return { originName, destinationName };
  };

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="pb-3 bg-gradient-to-r from-sky-50 to-primary/5 dark:from-sky-950/30 dark:to-primary/10">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary" />
            Flight Summary
          </span>
          <Badge variant="outline" className="flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
            <Users className="w-3 h-3" />
            {totalTravelers} traveler{totalTravelers !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="space-y-3">
          {flights.map((flight, index) => {
            const flightCompanions = getCompanionsForFlight(flight.id);
            const hasLinkedTravelers = flightCompanions.length > 0;
            const flightNumber = extractFlightInfo(flight.notes);
            const airportCodes = getFlightAirportCodes(flight);
            
            return (
              <div
                key={flight.id}
                className="relative p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-primary/10"
              >
                <div className="absolute -left-1 top-4 w-1 h-8 rounded-full bg-primary/60" />
                
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 pl-2">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-semibold text-base">
                        {flight.airline || flight.vendor_name}
                      </span>
                      {flightNumber && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {flightNumber}
                        </Badge>
                      )}
                      {flight.confirmation_number && (
                        <Badge variant="secondary" className="text-xs">
                          Conf: {flight.confirmation_number}
                        </Badge>
                      )}
                    </div>

                    {(() => {
                      // v3.10.0: Show IATA codes if available, else airport name, never blank
                      const depDisplay = airportCodes.origin || airportCodes.originName;
                      const arrDisplay = airportCodes.destination || airportCodes.destinationName;
                      if (!depDisplay && !arrDisplay) return null;
                      return (
                        <div className="mb-1.5 pl-0">
                          <p className="text-sm font-medium text-foreground">
                            {depDisplay || '—'} → {arrDisplay || '—'}
                          </p>
                          {/* Show airport names as secondary text when IATA codes are displayed */}
                          {(airportCodes.origin && airportCodes.originName) || (airportCodes.destination && airportCodes.destinationName) ? (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {airportCodes.origin && airportCodes.originName ? airportCodes.originName : ''}
                              {airportCodes.origin && airportCodes.originName && airportCodes.destination && airportCodes.destinationName ? ' → ' : ''}
                              {airportCodes.destination && airportCodes.destinationName ? airportCodes.destinationName : ''}
                            </p>
                          ) : null}
                        </div>
                      );
                    })()}
                    
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {(() => {
                          const dateDisplay = formatLocalDateDirect(flight.start_datetime);
                          const timeDisplay = hasExplicitTime(flight.start_datetime)
                            ? (formatLocalTimeDirect(flight.start_datetime) || UNKNOWN_TIME_PLACEHOLDER)
                            : UNKNOWN_TIME_PLACEHOLDER;
                          
                          return dateDisplay ? (
                            <>
                              <span className="font-medium text-foreground tabular-nums">
                                {dateDisplay}
                              </span>
                              {hasExplicitTime(flight.start_datetime) ? (
                                <span className="text-muted-foreground tabular-nums">
                                  {timeDisplay}
                                </span>
                              ) : (
                                <span className="text-destructive font-medium">
                                  {UNKNOWN_TIME_PLACEHOLDER}
                                </span>
                              )}
                            </>
                          ) : null;
                        })()}
                      </span>
                      {flight.end_datetime && (() => {
                        if (hasExplicitTime(flight.end_datetime)) {
                          const arrTime = formatLocalTimeDirect(flight.end_datetime!) || UNKNOWN_TIME_PLACEHOLDER;
                          return (
                            <span className="text-xs tabular-nums">
                              → {arrTime}
                            </span>
                          );
                        }
                        return (
                          <span className="text-xs text-destructive font-medium">
                            → {UNKNOWN_TIME_PLACEHOLDER}
                          </span>
                        );
                      })()}
                    </div>
                    
                    {flight.passenger_name && (
                      <div className="text-xs text-muted-foreground mb-1">
                        {flight.passenger_name}
                      </div>
                    )}
                    
                    {isPro && (airportCodes.origin || airportCodes.destination) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {airportCodes.origin && (
                          <AirportInfoPill 
                            airportCode={airportCodes.origin} 
                            label="Origin" 
                          />
                        )}
                        {airportCodes.destination && (
                          <AirportInfoPill 
                            airportCode={airportCodes.destination} 
                            label="Destination" 
                          />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {flight.link_url && (
                    <Button
                      size="sm"
                      variant="default"
                      className="shrink-0 h-8 text-xs press-scale"
                      onClick={() => {
                        const url = flight.link_url!.startsWith('http') 
                          ? flight.link_url! 
                          : `https://${flight.link_url}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Manage
                    </Button>
                  )}
                </div>
                
                {hasLinkedTravelers && (
                  <div className="mt-2 pt-2 border-t border-border/15 pl-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                      <Users className="w-3 h-3" />
                      Travelers on this flight
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {flightCompanions.map((companion) => (
                        <Badge 
                          key={companion.id} 
                          variant="secondary"
                          className="text-xs"
                        >
                          {companion.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {companions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/15">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              All trip travelers
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-xs">You (Owner)</Badge>
              {companions.map((companion) => (
                <Badge 
                  key={companion.id} 
                  variant="outline" 
                  className="text-xs"
                >
                  {companion.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

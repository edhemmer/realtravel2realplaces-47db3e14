import { Booking, Companion } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Users, Clock, ExternalLink, MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasExplicitTime, UNKNOWN_TIME_PLACEHOLDER } from '@/lib/datetimeIntegrity';
import { formatLocalTimeDirect, formatLocalDateDirect } from '@/lib/canonicalTimeNormalizer';
import { extractAirportCodes } from '@/lib/airportData';
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
  // v2.1.31: Airport info pills are Pro-only
  const { isPro } = useAccess();
  // v2.2.5: Sort flights using string comparison on start_datetime — no Date() shifting
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

  // Helper to get companions for a specific flight
  const getCompanionsForFlight = (bookingId: string): Companion[] => {
    const linkedIds = bookingCompanions
      .filter(bc => bc.booking_id === bookingId)
      .map(bc => bc.companion_id);
    return companions.filter(c => linkedIds.includes(c.id));
  };

  // Check if a flight has missing TSA info
  const hasMissingTsa = (flight: Booking): boolean => {
    if (!flight.tsa_precheck_number) return true;
    const flightCompanions = getCompanionsForFlight(flight.id);
    return flightCompanions.some(c => !c.tsa_precheck_number);
  };

  // Total travelers = companions + 1 (the trip owner)
  const totalTravelers = companions.length + 1;

  // Extract route from notes (flight numbers) if available
  const extractFlightInfo = (notes?: string): string | null => {
    if (!notes) return null;
    const match = notes.match(/(?:flight\s*#?\s*)?([A-Z]{2}\s*\d+)/i);
    return match ? match[1].replace(/\s+/g, '') : null;
  };

  // Extract airport codes from flight booking
  const getFlightAirportCodes = (flight: Booking): { origin?: string; destination?: string } => {
    let codes = extractAirportCodes(flight.notes || '');
    if (codes.origin || codes.destination) return codes;
    codes = extractAirportCodes(flight.vendor_name || '');
    if (codes.origin || codes.destination) return codes;
    if (flight.pickup_location) {
      codes = extractAirportCodes(flight.pickup_location);
      if (codes.origin) return codes;
    }
    return {};
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
            const missingTsa = hasMissingTsa(flight);
            const airportCodes = getFlightAirportCodes(flight);
            
            return (
              <div
                key={flight.id}
                className="relative p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-primary/10"
              >
                {/* Flight number indicator */}
                <div className="absolute -left-1 top-4 w-1 h-8 rounded-full bg-primary/60" />
                
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 pl-2">
                    {/* Airline & Flight Number Row */}
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
                      {missingTsa && (
                        <Badge variant="outline" className="text-xs border-amber-400 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          TSA missing
                        </Badge>
                      )}
                    </div>
                    
                    {/* Date/Time Row - v2.2.5: Uses direct digit extraction — no Date() timezone shifting */}
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
                    
                    {/* Passenger Name — label removed, context obvious from flight card */}
                    {flight.passenger_name && (
                      <div className="text-xs text-muted-foreground mb-1">
                        {flight.passenger_name}
                      </div>
                    )}
                    
                    {/* Airport Info Pills - Pro only */}
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
                  
                  {/* Action Button — Primary action for this card */}
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
                
                {/* Per-flight travelers */}
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
                          variant={companion.tsa_precheck_number ? "secondary" : "outline"}
                          className={`text-xs ${!companion.tsa_precheck_number ? 'border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-400' : ''}`}
                        >
                          {companion.name}
                          {!companion.tsa_precheck_number && (
                            <AlertTriangle className="w-3 h-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* All travelers footer */}
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
                  className={`text-xs ${!companion.tsa_precheck_number ? 'border-amber-200 dark:border-amber-700' : ''}`}
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

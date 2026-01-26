import { Booking, Companion } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Users, Clock, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';

interface FlightSummaryCardProps {
  bookings: Booking[];
  companions: Companion[];
}

export function FlightSummaryCard({ bookings, companions }: FlightSummaryCardProps) {
  const flights = bookings
    .filter((b) => b.booking_type === 'flight')
    .sort((a, b) => parseISO(a.start_datetime).getTime() - parseISO(b.start_datetime).getTime());

  if (flights.length === 0) {
    return null;
  }

  // Total travelers = companions + 1 (the trip owner)
  const totalTravelers = companions.length + 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary" />
            Flights
          </span>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {totalTravelers} traveler{totalTravelers !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {flights.map((flight) => (
            <div
              key={flight.id}
              className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {flight.airline || flight.vendor_name}
                  </span>
                  {flight.confirmation_number && (
                    <Badge variant="outline" className="text-xs">
                      {flight.confirmation_number}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(parseISO(flight.start_datetime), 'MMM d, h:mm a')}
                  </span>
                  {flight.passenger_name && (
                    <span className="truncate">• {flight.passenger_name}</span>
                  )}
                </div>
              </div>
              {flight.link_url && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={() => window.open(flight.link_url!, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {companions.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Travelers on this trip:</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">You</Badge>
              {companions.map((companion) => (
                <Badge key={companion.id} variant="outline" className="text-xs">
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

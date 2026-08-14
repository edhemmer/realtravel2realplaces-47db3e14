import { Companion } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface BookingCompanion {
  id: string;
  booking_id: string;
  companion_id: string;
  created_at: string;
}

interface Booking {
  id: string;
  booking_type: string;
  tsa_precheck_number?: string | null;
  passenger_name?: string | null;
}

interface TsaWarningCardProps {
  bookings: Booking[];
  companions: Companion[];
  bookingCompanions: BookingCompanion[];
  onCompanionClick?: (companion: Companion) => void;
}

export function TsaWarningCard({
  bookings,
  companions,
  bookingCompanions,
  onCompanionClick,
}: TsaWarningCardProps) {
  const flights = bookings.filter((booking) => booking.booking_type === 'flight');
  if (flights.length === 0) return null;

  const companionsWithoutSavedTsa = new Map<string, Companion>();

  flights.forEach((flight) => {
    const linkedIds = bookingCompanions
      .filter((bookingCompanion) => bookingCompanion.booking_id === flight.id)
      .map((bookingCompanion) => bookingCompanion.companion_id);

    companions
      .filter((companion) => linkedIds.includes(companion.id))
      .forEach((companion) => {
        if (!companion.tsa_precheck_number && !companion.tsa_reviewed) {
          companionsWithoutSavedTsa.set(companion.id, companion);
        }
      });
  });

  const travelers = Array.from(companionsWithoutSavedTsa.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  if (travelers.length === 0) return null;

  return (
    <Card className="border-border/50 bg-card/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          TSA PreCheck not saved
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          These travelers do not have a TSA PreCheck number saved in RT2RP:
        </p>

        <div className="flex flex-wrap gap-2">
          {travelers.map((companion) => (
            <Badge
              key={companion.id}
              variant="secondary"
              className={onCompanionClick ? 'cursor-pointer transition-colors' : ''}
              onClick={() => onCompanionClick?.(companion)}
            >
              {companion.name}
            </Badge>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          TSA PreCheck is optional. Select a traveler if you want to save their number or mark the item reviewed.
        </p>
      </CardContent>
    </Card>
  );
}

import { Companion } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

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
  onCompanionClick 
}: TsaWarningCardProps) {
  // Get all flight bookings
  const flights = bookings.filter((b) => b.booking_type === 'flight');

  if (flights.length === 0) {
    return null;
  }

  // Collect unique companions missing TSA numbers across all flights
  const missingTsaCompanions = new Map<string, Companion>();

  flights.forEach((flight) => {
    // Get linked companions for this flight
    const linkedIds = bookingCompanions
      .filter(bc => bc.booking_id === flight.id)
      .map(bc => bc.companion_id);
    
    const flightCompanions = companions.filter(c => linkedIds.includes(c.id));
    
    // Check each companion - only include if TSA is missing AND not yet reviewed
    flightCompanions.forEach((companion) => {
      if (!companion.tsa_precheck_number && !companion.tsa_reviewed && !missingTsaCompanions.has(companion.id)) {
        missingTsaCompanions.set(companion.id, companion);
      }
    });
  });

  // Convert to array and sort by name
  const uniqueMissingCompanions = Array.from(missingTsaCompanions.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  // If no missing TSA numbers, don't show the card
  if (uniqueMissingCompanions.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5" />
          TSA PreCheck Missing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
          These travelers don't have a TSA PreCheck number on file:
        </p>
        
        <div className="flex flex-wrap gap-2">
          {uniqueMissingCompanions.map((companion) => (
            <Badge 
              key={companion.id}
              variant="secondary" 
              className={`text-sm bg-amber-200/70 text-amber-800 dark:bg-amber-800/50 dark:text-amber-200 ${
                onCompanionClick ? 'cursor-pointer hover:bg-amber-300/70 dark:hover:bg-amber-700/50 transition-colors' : ''
              }`}
              onClick={() => onCompanionClick?.(companion)}
            >
              {companion.name}
            </Badge>
          ))}
        </div>
        
        <p className="text-xs text-amber-600/70 dark:text-amber-500/70">
          Tip: Click a traveler's name to open their details and add TSA information.
        </p>
      </CardContent>
    </Card>
  );
}

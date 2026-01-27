import { Booking, Companion } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface BookingCompanion {
  id: string;
  booking_id: string;
  companion_id: string;
  created_at: string;
}

interface TsaWarningCardProps {
  bookings: Booking[];
  companions: Companion[];
  bookingCompanions: BookingCompanion[];
}

interface TsaWarning {
  flightId: string;
  flightName: string;
  flightDate: string;
  missingTravelers: string[];
}

export function TsaWarningCard({ bookings, companions, bookingCompanions }: TsaWarningCardProps) {
  // Get all flight bookings
  const flights = bookings.filter((b) => b.booking_type === 'flight');

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

  // Build warnings for each flight
  const warnings: TsaWarning[] = [];

  flights.forEach((flight) => {
    const missingTravelers: string[] = [];
    
    // Check main traveler (on booking itself)
    if (!flight.tsa_precheck_number) {
      const travelerName = flight.passenger_name || 'Main traveler';
      missingTravelers.push(travelerName);
    }

    // Check linked companions who have TSA fields but are missing the number
    const flightCompanions = getCompanionsForFlight(flight.id);
    flightCompanions.forEach((companion) => {
      // If companion doesn't have TSA number, add to warnings
      if (!companion.tsa_precheck_number) {
        missingTravelers.push(companion.name);
      }
    });

    if (missingTravelers.length > 0) {
      const flightName = flight.airline || flight.vendor_name;
      const flightDate = new Date(flight.start_datetime).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      warnings.push({
        flightId: flight.id,
        flightName,
        flightDate,
        missingTravelers,
      });
    }
  });

  // If no warnings, show all-clear message (optional, can remove if not wanted)
  if (warnings.length === 0) {
    return null; // Or show a green "All travelers have TSA info" card
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
          One or more travelers do not have a TSA PreCheck number recorded. Add it before check-in for faster screening.
        </p>
        
        {warnings.map((warning) => (
          <div key={warning.flightId} className="p-2 rounded-md bg-amber-100/50 dark:bg-amber-900/30">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-400">
                {warning.flightName}
              </Badge>
              <span className="text-xs text-amber-600 dark:text-amber-500">{warning.flightDate}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {warning.missingTravelers.map((traveler, idx) => (
                <Badge 
                  key={idx} 
                  variant="secondary" 
                  className="text-xs bg-amber-200/70 text-amber-800 dark:bg-amber-800/50 dark:text-amber-200"
                >
                  {traveler}
                </Badge>
              ))}
            </div>
          </div>
        ))}
        
        <p className="text-xs text-amber-600/70 dark:text-amber-500/70">
          Tip: Add TSA numbers in the Companions tab or when editing a flight booking.
        </p>
      </CardContent>
    </Card>
  );
}

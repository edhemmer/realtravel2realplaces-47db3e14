import { Trip } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, MapPin, Fuel, Navigation, Calculator } from 'lucide-react';
import { ManualStepHint, MANUAL_STEP_HINTS } from '@/components/trips/ManualStepHint';

interface DriveSummaryCardProps {
  trip: Trip & { 
    origin_address?: string | null;
    destination_address?: string | null;
    estimated_miles?: number | null;
  };
  onAddGasExpense: () => void;
}

export function DriveSummaryCard({ trip, onAddGasExpense }: DriveSummaryCardProps) {
  const hasRouteInfo = trip.origin_address || trip.destination_address;
  
  // Open Google Maps with directions
  const openDirections = () => {
    const origin = encodeURIComponent(trip.origin_address || '');
    const destination = encodeURIComponent(
      trip.destination_address || 
      `${trip.destination_city}, ${trip.destination_state || ''} ${trip.destination_country || ''}`
    );
    window.open(`https://www.google.com/maps/dir/${origin}/${destination}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            Road Trip
          </span>
          {trip.estimated_miles && (
            <Badge variant="outline" className="flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
              <Calculator className="w-3 h-3" />
              ~{Math.round(trip.estimated_miles)} miles
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Route Details */}
        <div className="space-y-3">
          {trip.origin_address && (
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3 h-3 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Starting from</p>
                <p className="text-sm font-medium">{trip.origin_address}</p>
              </div>
            </div>
          )}
          
          {hasRouteInfo && (
            <div className="ml-3 border-l-2 border-dashed border-muted-foreground/30 h-4" />
          )}
          
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3 h-3 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Destination</p>
              <p className="text-sm font-medium">
                {trip.destination_address || `${trip.destination_city}${trip.destination_state ? `, ${trip.destination_state}` : ''}`}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1 h-8 text-xs"
            onClick={openDirections}
          >
            <Navigation className="w-3.5 h-3.5 mr-1" />
            Get Directions
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1 h-8 text-xs"
            onClick={onAddGasExpense}
          >
            <Fuel className="w-3.5 h-3.5 mr-1" />
            Add Gas
          </Button>
        </div>

        {/* Patch 2.6.7: Contextual education for manual mileage/gas tracking */}
        <ManualStepHint 
          message={MANUAL_STEP_HINTS.gasExpense} 
          className="pt-2"
        />
      </CardContent>
    </Card>
  );
}

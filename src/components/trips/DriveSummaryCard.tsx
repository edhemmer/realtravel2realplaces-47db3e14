import { Trip } from '@/types/database';
import type { DrivePlan } from '@/types/drive';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, MapPin, Navigation } from 'lucide-react';

interface DriveSummaryCardProps {
  trip: Trip & {
    origin_address?: string | null;
    destination_address?: string | null;
    estimated_miles?: number | null;
  };
  drivePlan: DrivePlan;
  onAddGasExpense: () => void;
}

/**
 * Shows only saved drive endpoints and a canonical navigation handoff.
 * Route timing, risk, weather, fuel recommendations, and stop intelligence are
 * withheld until their provider/freshness/recommendation contracts are proven.
 */
export function DriveSummaryCard({ trip, drivePlan }: DriveSummaryCardProps) {
  const primaryNav = drivePlan.navigationTargets.find((target) => target.isPrimary);
  const destinationLabel = trip.destination_address
    || [trip.destination_city, trip.destination_state, trip.destination_country].filter(Boolean).join(', ');

  if (!trip.origin_address && !destinationLabel && !primaryNav) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Car className="w-4 h-4 text-primary" />
          Drive details
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {trip.origin_address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Starting point</p>
              <p className="text-sm font-medium">{trip.origin_address}</p>
            </div>
          </div>
        )}

        {destinationLabel && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Destination</p>
              <p className="text-sm font-medium">{destinationLabel}</p>
            </div>
          </div>
        )}

        {primaryNav && (
          <Button
            type="button"
            className="w-full"
            onClick={() => window.open(primaryNav.url, '_blank', 'noopener,noreferrer')}
          >
            <Navigation className="w-4 h-4 mr-2" />
            Open navigation
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

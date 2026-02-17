/**
 * v3.8.16: Drive Summary Card — Premium, Minimal
 *
 * Consumes DrivePlan only. No per-component drive logic.
 * Shows: destination, date, route summary, risk chips, fuel hint, navigation.
 */

import { Trip } from '@/types/database';
import type { DrivePlan } from '@/types/drive';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, MapPin, Fuel, Navigation, AlertTriangle, Clock, CloudRain, Snowflake, DollarSign, Route } from 'lucide-react';

interface DriveSummaryCardProps {
  trip: Trip & {
    origin_address?: string | null;
    destination_address?: string | null;
    estimated_miles?: number | null;
  };
  drivePlan: DrivePlan;
  onAddGasExpense: () => void;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function RiskChipIcon({ type }: { type: string }) {
  switch (type) {
    case 'TOLL_POSSIBLE': return <DollarSign className="w-3 h-3" />;
    case 'WEATHER_RISK': return <CloudRain className="w-3 h-3" />;
    case 'LONG_DRIVE': return <Clock className="w-3 h-3" />;
    default: return <AlertTriangle className="w-3 h-3" />;
  }
}

export function DriveSummaryCard({ trip, drivePlan, onAddGasExpense }: DriveSummaryCardProps) {
  const { routeSummary, riskFlags, fuelPlan, weatherLine, navigationTargets, degradedReason } = drivePlan;
  const primaryNav = navigationTargets.find(t => t.isPrimary);

  const destinationLabel = trip.destination_address ||
    `${trip.destination_city}${trip.destination_state ? `, ${trip.destination_state}` : ''}`;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            Road Trip
          </span>
          {routeSummary && (
            <Badge variant="outline" className="flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
              <Route className="w-3 h-3" />
              ~{routeSummary.distanceMiles} mi · {formatDuration(routeSummary.durationMinutes)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Route */}
        <div className="space-y-2">
          {trip.origin_address && (
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-3 h-3 text-primary" />
              </div>
              <p className="text-sm font-medium">{trip.origin_address}</p>
            </div>
          )}

          {trip.origin_address && (
            <div className="ml-2.5 border-l-2 border-dashed border-muted-foreground/20 h-3" />
          )}

          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-3 h-3 text-destructive" />
            </div>
            <p className="text-sm font-medium">{destinationLabel}</p>
          </div>
        </div>

        {/* Route summary label */}
        {routeSummary?.routeLabel && (
          <p className="text-xs text-muted-foreground">{routeSummary.routeLabel}</p>
        )}

        {/* Degraded mode message */}
        {degradedReason && !routeSummary && (
          <p className="text-xs text-muted-foreground italic">{degradedReason}</p>
        )}

        {/* Risk Chips (max 3) */}
        {riskFlags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {riskFlags.map((flag) => (
              <Badge
                key={flag.type}
                variant={flag.severity === 'warning' ? 'destructive' : 'outline'}
                className="flex items-center gap-1 text-[10px] font-medium"
              >
                <RiskChipIcon type={flag.type} />
                {flag.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Weather line */}
        {weatherLine && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {weatherLine.includes('Snow') || weatherLine.includes('snow') ? (
              <Snowflake className="w-3 h-3" />
            ) : weatherLine.includes('Rain') || weatherLine.includes('rain') ? (
              <CloudRain className="w-3 h-3" />
            ) : null}
            <span>Drive weather: {weatherLine}</span>
          </div>
        )}

        {/* Fuel hint (only with vehicle profile) */}
        {fuelPlan && fuelPlan.estimatedStops > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Fuel className="w-3 h-3" />
            <span>
              ~{fuelPlan.estimatedStops} fuel stop{fuelPlan.estimatedStops > 1 ? 's' : ''} recommended
              {fuelPlan.spacingMiles > 0 ? ` (every ~${fuelPlan.spacingMiles} mi)` : ''}
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 mt-2">
          {primaryNav ? (
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-10 rounded-full text-sm font-medium press-scale"
              onClick={() => window.open(primaryNav.url, '_blank', 'noopener,noreferrer')}
            >
              <Navigation className="w-4 h-4" />
              Get Directions
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-10 rounded-full text-sm font-medium press-scale"
              disabled
            >
              <Navigation className="w-4 h-4" />
              No route available
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-10 rounded-full text-sm font-medium press-scale"
            onClick={onAddGasExpense}
          >
            <Fuel className="w-4 h-4" />
            Add Gas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

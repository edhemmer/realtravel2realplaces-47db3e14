/**
 * v3.11.4: Drive Summary Card — Premium, Minimal
 *
 * Consumes DrivePlan only for canonical data.
 * Async Places calls via canonical PlacesEngine (gas + food) when eligible.
 * Shows: destination, date, route summary, risk chips, fuel hint, navigation, suggestions.
 */

import { useState, useEffect } from 'react';
import { Trip } from '@/types/database';
import type { DrivePlan } from '@/types/drive';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, MapPin, Fuel, Navigation, AlertTriangle, Clock, CloudRain, Snowflake, DollarSign, Route, Star, Utensils, ExternalLink, Plus } from 'lucide-react';
import { queryPlaces, type PlaceResult } from '@/lib/places/placesEngine';
import { openNavTarget, buildMapsSearchUrl } from '@/lib/location/navigationTargets';

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

function PlaceItem({ place, onNavigate, onAddStop }: {
  place: PlaceResult;
  onNavigate: () => void;
  onAddStop: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 pl-[18px]">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{place.name}</p>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {place.rating != null && (
            <span className="flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              {place.rating.toFixed(1)}
            </span>
          )}
          <span className="truncate">{place.address}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onNavigate}
          className="text-primary hover:text-primary/80 p-1"
          title="Navigate"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onAddStop}
          className="text-primary hover:text-primary/80 p-1"
          title="Add as Stop"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function DriveSummaryCard({ trip, drivePlan, onAddGasExpense }: DriveSummaryCardProps) {
  const navigate = useNavigate();
  const { routeSummary, riskFlags, fuelPlan, fuelIntelligence, suggestions, weatherLine, navigationTargets, degradedReason } = drivePlan;
  const primaryNav = navigationTargets.find(t => t.isPrimary);

  // v3.11.4: Async Places data via canonical PlacesEngine
  const [gasPlaces, setGasPlaces] = useState<PlaceResult[]>([]);
  const [foodPlaces, setFoodPlaces] = useState<PlaceResult[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesUnavailable, setPlacesUnavailable] = useState(false);

  useEffect(() => {
    if (!suggestions.eligible || !suggestions.nextWindowCenter) return;
    
    let cancelled = false;
    setPlacesLoading(true);
    setPlacesUnavailable(false);

    const { lat, lng } = suggestions.nextWindowCenter;
    
    Promise.all([
      queryPlaces({
        origin: { lat, lng },
        category: 'gas',
        radiusMiles: 8,
        limit: 5,
        planContext: 'pro',
        sourceContext: 'drive_suggestions',
      }),
      queryPlaces({
        origin: { lat, lng },
        category: 'food',
        radiusMiles: 8,
        limit: 5,
        planContext: 'pro',
        sourceContext: 'drive_suggestions',
      }),
    ]).then(([gasResult, foodResult]) => {
      if (!cancelled) {
        setGasPlaces(gasResult.results);
        setFoodPlaces(foodResult.results);
        setPlacesLoading(false);
        if (gasResult.status === 'UNAVAILABLE' && foodResult.status === 'UNAVAILABLE') {
          setPlacesUnavailable(true);
        }
      }
    }).catch(() => {
      if (!cancelled) {
        setPlacesLoading(false);
        setPlacesUnavailable(true);
      }
    });

    return () => { cancelled = true; };
  }, [suggestions.eligible, suggestions.nextWindowCenter?.lat, suggestions.nextWindowCenter?.lng]);

  const destinationLabel = trip.destination_address ||
    `${trip.destination_city}${trip.destination_state ? `, ${trip.destination_state}` : ''}`;

  const handleNavigateToPlace = (place: PlaceResult) => {
    const target = { kind: 'COORDS' as const, value: `${place.lat},${place.lng}`, label: place.name };
    openNavTarget(target);
  };

  const handleAddStop = (place: PlaceResult) => {
    // Navigate to trip detail with prefilled stop data via URL params
    const params = new URLSearchParams({
      addStop: 'true',
      stopName: place.name,
      stopAddress: place.address,
      stopLat: String(place.lat),
      stopLng: String(place.lng),
    });
    navigate(`/trip/${trip.id}?${params.toString()}`);
  };

  return (
    <Card className="shadow-sm" id="drive-suggestions">
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

        {/* Fuel summary (only with vehicle profile + enabled) */}
        {fuelIntelligence.enabled && fuelPlan && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Fuel className="w-3 h-3" />
              <span className="font-medium">
                {fuelPlan.estimatedStops === 0
                  ? `No fuel stops needed — ${fuelPlan.tripMiles} mi is within your ${fuelPlan.vehicleRangeMiles} mi range.`
                  : `${fuelPlan.tripMiles} mi trip · ${fuelPlan.vehicleRangeMiles} mi tank · ${fuelPlan.estimatedStops} fuel stop${fuelPlan.estimatedStops > 1 ? 's' : ''} recommended`}
              </span>
            </div>

            {/* Fuel stop zones with area labels */}
            {fuelIntelligence.stopZones.length > 0 && (
              <div className="space-y-0.5">
                {fuelIntelligence.stopZones.map((zone) => (
                  <button
                    key={zone.id}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 pl-[18px]"
                    onClick={() => {
                      if (zone.targetLatLng) {
                        const searchLabel = zone.areaLabel
                          ? `Gas station ${zone.areaLabel}`
                          : `Gas station near mile ${zone.mileMarker}`;
                        const target = { kind: 'COORDS' as const, value: `${zone.targetLatLng.lat},${zone.targetLatLng.lng}`, label: searchLabel };
                        const url = buildMapsSearchUrl(target);
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    disabled={!zone.targetLatLng}
                  >
                    <MapPin className="w-3 h-3" />
                    {zone.areaLabel
                      ? `⛽ ${zone.areaLabel} (~mile ${zone.mileMarker})`
                      : `⛽ Fuel stop around mile ${zone.mileMarker}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* v3.11.3: Suggestions — Gas and Food near next fuel window */}
        {suggestions.eligible && !placesLoading && gasPlaces.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Fuel className="w-3 h-3" />
              Fuel options near your next fuel window
            </p>
            {gasPlaces.slice(0, 5).map((place) => (
              <PlaceItem
                key={place.placeId}
                place={place}
                onNavigate={() => handleNavigateToPlace(place)}
                onAddStop={() => handleAddStop(place)}
              />
            ))}
          </div>
        )}

        {suggestions.eligible && !placesLoading && foodPlaces.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Utensils className="w-3 h-3" />
              Food options nearby
            </p>
            {foodPlaces.slice(0, 5).map((place) => (
              <PlaceItem
                key={place.placeId}
                place={place}
                onNavigate={() => handleNavigateToPlace(place)}
                onAddStop={() => handleAddStop(place)}
              />
            ))}
          </div>
        )}

        {suggestions.eligible && placesUnavailable && gasPlaces.length === 0 && foodPlaces.length === 0 && (
          <div className="text-xs text-muted-foreground pl-[18px] italic">
            Suggestions will appear when available.
          </div>
        )}

        {/* v3.10.9: Fuel intelligence gating messages */}
        {!fuelIntelligence.enabled && fuelIntelligence.reason === 'PLAN_REQUIRED' && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Fuel className="w-3 h-3" />
            <span>
              Fuel stop suggestions are available on Pro and Business.{' '}
              <button
                onClick={() => navigate('/plans')}
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Upgrade
              </button>
            </span>
          </div>
        )}
        {!fuelIntelligence.enabled && fuelIntelligence.reason === 'MISSING_VEHICLE_RANGE' && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Fuel className="w-3 h-3" />
            <span>
              Add vehicle range in Account to enable fuel stop suggestions.{' '}
              <button
                onClick={() => navigate('/account')}
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Add vehicle range
              </button>
            </span>
          </div>
        )}

        {/* v3.11.3: Suggestions disabled messages */}
        {!suggestions.eligible && suggestions.reason === 'WINDOW_COORDS_MISSING' && fuelIntelligence.enabled && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>Suggestions will appear once route details are available.</span>
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

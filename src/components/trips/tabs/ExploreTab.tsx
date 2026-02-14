/**
 * v3.5.1: Explore tab with auto-origin resolution
 *
 * No user-facing selectors. Origin is resolved automatically:
 * - Near stay destination when traveling
 * - Current device location after arrival
 * - Premium hint line when showing destination-based results
 *
 * Refresh re-runs the resolver and re-queries.
 */

import { useState, useCallback, useMemo } from 'react';
import { Trip } from '@/types/database';
import { AttractionSuggestion } from '@/types/attraction';
import { useAttractions } from '@/hooks/useAttractions';
import { useAccess } from '@/hooks/useAccess';
import { useBookings } from '@/hooks/useBookings';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { getDeviceLocation } from '@/lib/deviceLocation';
import { useTripPermission } from '@/pages/TripDetail';
import { AttractionCard } from '@/components/trips/explore/AttractionCard';
import { AddToTripModal } from '@/components/trips/explore/AddToTripModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Compass, MapPin, Search, Sparkles, Loader2, AlertCircle,
  Building2, MapPinned, Navigation, RefreshCw
} from 'lucide-react';
import { resolveExploreOrigin } from '@/types/exploreOrigin';

interface ExploreTabProps {
  tripId: string;
  trip: Trip;
}

type RadiusOption = '5' | '10' | '25' | '50';

export function ExploreTab({ tripId, trip }: ExploreTabProps) {
  const { isPro } = useAccess();
  const { canEdit } = useTripPermission();
  const { data: bookings = [] } = useBookings(tripId);
  const deviceLocation = useDeviceLocation();

  const [radius, setRadius] = useState<RadiusOption>('25');
  const [selectedAttraction, setSelectedAttraction] = useState<AttractionSuggestion | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // v3.5.1: Canonical origin resolution — single source of truth
  const origin = useMemo(() => {
    return resolveExploreOrigin(
      bookings,
      deviceLocation.coords,
      deviceLocation.status === 'denied' || deviceLocation.status === 'unavailable',
      trip.destination_state
    );
    // refreshCounter forces re-computation after manual refresh
  }, [bookings, deviceLocation.coords, deviceLocation.status, trip.destination_state, refreshCounter]);

  // Can we fetch?
  const canFetch = isPro && origin.mode !== 'NO_ORIGIN' && (
    origin.lat !== undefined || origin.searchCity !== undefined
  );

  // Fetch attractions using resolved origin
  const { data: attractions = [], isLoading, error, refetch } = useAttractions({
    city: origin.searchCity,
    state: origin.searchState,
    lat: origin.lat,
    lng: origin.lng,
    radiusMiles: parseInt(radius),
    enabled: canFetch,
  });

  // Handlers
  const handleAddToTrip = (attraction: AttractionSuggestion) => {
    setSelectedAttraction(attraction);
    setAddModalOpen(true);
  };

  const handleRefresh = useCallback(async () => {
    // Re-read device location (won't re-prompt if already denied)
    await getDeviceLocation();
    setRefreshCounter((c) => c + 1);
    refetch();
  }, [refetch]);

  // Free user teaser
  if (!isPro) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Explore is a Pro feature</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Discover nearby attractions, get ticket reminders, and add activities to your trip with Pro.
          </p>
          <Badge variant="secondary" className="mt-4">Pro</Badge>
        </CardContent>
      </Card>
    );
  }

  // No origin — prompt to add stay
  if (origin.mode === 'NO_ORIGIN') {
    return (
      <Card className="border-dashed border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10">
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Building2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Add a stay to explore nearby</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {origin.noOriginMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* v3.5.1: Origin subtitle + refresh */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {origin.mode === 'DEVICE' ? (
            <Navigation className="w-3.5 h-3.5 text-primary shrink-0" />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
          )}
          <span className="text-sm text-muted-foreground truncate">
            Exploring near: {origin.label}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8"
          onClick={handleRefresh}
          aria-label="Refresh results"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>

      {/* v3.5.1: Premium hint — only when showing stay-based results pre-arrival */}
      {origin.mode === 'STAY' && !origin.isArrived && (
        <p className="text-xs text-muted-foreground/70 px-1 leading-relaxed">
          Showing ideas near your stay. This will auto-refresh when you arrive.
        </p>
      )}

      {/* Radius selector */}
      <div className="flex items-center gap-2 px-1">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">
          <Search className="w-3.5 h-3.5 inline mr-1" />
          Radius
        </Label>
        <Select value={radius} onValueChange={(v) => setRadius(v as RadiusOption)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 miles</SelectItem>
            <SelectItem value="10">10 miles</SelectItem>
            <SelectItem value="25">25 miles</SelectItem>
            <SelectItem value="50">50 miles</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {deviceLocation.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Getting your location…</span>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Finding attractions…</span>
          </div>
        ) : error ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-muted">
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-base font-medium mb-2">
                We couldn&apos;t load nearby attractions right now
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try again or check back later.
              </p>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : attractions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-muted">
                  <MapPinned className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-base font-medium mb-2">No places found in this area</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try a larger search radius.
              </p>
              {radius !== '50' && (
                <Button variant="outline" size="sm" onClick={() => setRadius('50')}>
                  Increase radius to 50 miles
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-muted-foreground">
                {attractions.length} attraction{attractions.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="grid gap-4">
              {attractions.map((attraction) => (
                <AttractionCard
                  key={attraction.id}
                  attraction={attraction}
                  onAddToTrip={canEdit ? handleAddToTrip : () => {}}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add to Trip Modal */}
      <AddToTripModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        attraction={selectedAttraction}
        trip={trip}
      />
    </div>
  );
}

/**
 * v3.6.0: Premium Explore screen with carousel + sectioned feed
 *
 * Consumes v3.5.2 engine via useAttractions, then applies
 * ExploreRankingAndSections for carousel + vertical sections.
 *
 * No user-facing selectors. Origin resolved automatically via
 * canonical resolveExploreOrigin helper.
 */

import { useState, useCallback, useMemo } from 'react';
import { Trip } from '@/types/database';
import { AttractionSuggestion } from '@/types/attraction';
import { useAttractions } from '@/hooks/useAttractions';
import { useBookings } from '@/hooks/useBookings';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { getDeviceLocation } from '@/lib/deviceLocation';
import { useTripPermission } from '@/pages/TripDetail';
import { resolveExploreOrigin } from '@/types/exploreOrigin';
import { buildExploreSections } from '@/lib/exploreRankingSections';
import { ExploreCarousel } from '@/components/trips/explore/ExploreCarousel';
import { ExploreSectionFeed } from '@/components/trips/explore/ExploreSectionFeed';
import { AddToTimelineModal } from '@/components/trips/explore/AddToTimelineModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Compass, Loader2, AlertCircle,
  Building2, Navigation, RefreshCw, Search, MapPinned,
} from 'lucide-react';

interface ExploreTabProps {
  tripId: string;
  trip: Trip;
}

type RadiusOption = '5' | '10' | '25' | '50';

export function ExploreTab({ tripId, trip }: ExploreTabProps) {
  // v3.10.12: No plan gating — Explore available to all tiers
  const { canEdit } = useTripPermission();
  const { data: bookings = [] } = useBookings(tripId);
  const deviceLocation = useDeviceLocation();

  const [radius, setRadius] = useState<RadiusOption>('25');
  const [selectedAttraction, setSelectedAttraction] = useState<AttractionSuggestion | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Canonical origin resolution
  const origin = useMemo(() => {
    return resolveExploreOrigin(
      bookings,
      deviceLocation.coords,
      deviceLocation.status === 'denied' || deviceLocation.status === 'unavailable',
      trip.destination_state
    );
  }, [bookings, deviceLocation.coords, deviceLocation.status, trip.destination_state, refreshCounter]);

  // v3.10.12: Explore available to all tiers — no plan gating on fetch
  const canFetch = origin.mode !== 'NO_ORIGIN' && (
    origin.lat !== undefined || origin.searchCity !== undefined
  );

  // v3.5.2 engine
  const { data: attractions = [], isLoading, error, refetch } = useAttractions({
    city: origin.searchCity,
    state: origin.searchState,
    lat: origin.lat,
    lng: origin.lng,
    radiusMiles: parseInt(radius),
    enabled: canFetch,
  });

  // v3.6.0: Ranking + sectioning
  const { rightNow, sections } = useMemo(() => {
    if (attractions.length === 0) return { rightNow: [], sections: [] };
    return buildExploreSections(attractions);
  }, [attractions]);

  // Handlers
  const handleAdd = (attraction: AttractionSuggestion) => {
    if (!canEdit) return;
    setSelectedAttraction(attraction);
    setAddModalOpen(true);
  };

  const handleNavigate = (attraction: AttractionSuggestion) => {
    const query = attraction.locationSummary || attraction.name;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleRefresh = useCallback(async () => {
    await getDeviceLocation();
    setRefreshCounter((c) => c + 1);
    refetch();
  }, [refetch]);

  // v3.10.12: Explore is available to all plan tiers — no Free user teaser

  // === NO ORIGIN ===
  if (origin.mode === 'NO_ORIGIN') {
    return (
      <Card className="border-dashed border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10">
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Building2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Add lodging to explore nearby</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {origin.noOriginMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  // === MAIN EXPLORE SCREEN ===
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1 px-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Explore</h2>
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

        {/* Subtitle */}
        <div className="flex items-center gap-1.5">
          {origin.mode === 'DEVICE' ? (
            <Navigation className="w-3.5 h-3.5 text-primary shrink-0" />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
          )}
          <span className="text-sm text-muted-foreground truncate">
            Exploring near: {origin.label}
          </span>
        </div>

        {/* Pre-arrival hint */}
        {origin.mode === 'STAY' && !origin.isArrived && (
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            Showing ideas near your lodging. This updates when you arrive.
          </p>
        )}
      </div>

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

      {/* Content */}
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
        <div className="space-y-8">
          {/* Right Now carousel */}
          <ExploreCarousel
            items={rightNow}
            onAdd={canEdit ? handleAdd : undefined}
          />

          {/* Sectioned feed */}
          <ExploreSectionFeed
            sections={sections}
            onNavigate={handleNavigate}
            onAdd={handleAdd}
          />
        </div>
      )}

      {/* Add to Timeline Modal */}
      <AddToTimelineModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        attraction={selectedAttraction}
        trip={trip}
      />
    </div>
  );
}

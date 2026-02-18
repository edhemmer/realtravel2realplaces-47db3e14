/**
 * v3.12.4: Explore tab wired to canonical context origin resolver.
 * Origin resolved via resolveExploreOriginForContext (trip-level, timeline item, or booking).
 * No Explore engine changes.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Trip } from '@/types/database';
import { AttractionSuggestion } from '@/types/attraction';
import { useAttractions } from '@/hooks/useAttractions';
import { useBookings } from '@/hooks/useBookings';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { getDeviceLocation } from '@/lib/deviceLocation';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';
import { useTripPermission } from '@/pages/TripDetail';
import { resolveExploreOriginForContext, getExploreOriginSubtitle, hasExploreDestination, ensureExploreOriginGeocode } from '@/lib/location/exploreContext';
import { getExploreContext, clearExploreContext } from '@/lib/explore/exploreContextStore';
import { buildExploreSections } from '@/lib/exploreRankingSections';
import { buildNavTarget, openNavTarget } from '@/lib/location/navigationTargets';
import { ExploreCarousel } from '@/components/trips/explore/ExploreCarousel';
import { ExploreSectionFeed } from '@/components/trips/explore/ExploreSectionFeed';
import { AddToTimelineModal } from '@/components/trips/explore/AddToTimelineModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Loader2, AlertCircle,
  Building2, Navigation, RefreshCw, Search, MapPinned, X, Plane,
} from 'lucide-react';

interface ExploreTabProps {
  tripId: string;
  trip: Trip;
}

type RadiusOption = '5' | '10' | '25' | '50';

export function ExploreTab({ tripId, trip }: ExploreTabProps) {
  const { canEdit } = useTripPermission();
  const { data: bookings = [] } = useBookings(tripId);
  const deviceLocation = useDeviceLocation();
  const { timelineEvents } = useCanonicalTripState(tripId, trip);

  const [radius, setRadius] = useState<RadiusOption>('25');
  const [selectedAttraction, setSelectedAttraction] = useState<AttractionSuggestion | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Search state with debounce
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setDebouncedQuery('');
  }, []);

  // v3.12.4: Determine if trip is active
  const isActive = useMemo(() => {
    const now = new Date();
    const start = new Date(trip.start_date + 'T00:00:00');
    const end = new Date(trip.end_date + 'T23:59:59');
    return now >= start && now <= end;
  }, [trip.start_date, trip.end_date]);

  // v3.9.16: Trigger async geocode for destination-only trips
  const [geocodeReady, setGeocodeReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    ensureExploreOriginGeocode(trip).then(() => {
      if (!cancelled) setGeocodeReady(true);
    });
    return () => { cancelled = true; };
  }, [trip.id, trip.destination_city, trip.destination_country]);

  // v3.9.16: Canonical context origin resolution
  const exploreContext = useMemo(() => getExploreContext(tripId), [tripId, refreshCounter]);

  // v3.9.16: Gate check — destination required (not lodging)
  const hasDestination = useMemo(() => hasExploreDestination(trip), [trip]);

  const origin = useMemo(() => {
    if (!hasDestination) return null;
    const deviceCoords = deviceLocation.coords
      ? { lat: deviceLocation.coords.lat, lng: deviceLocation.coords.lng }
      : null;

    return resolveExploreOriginForContext({
      tripId,
      trip,
      bookings,
      timelineEvents,
      isActive,
      context: exploreContext,
      deviceLocation: deviceCoords,
    });
  }, [tripId, trip, bookings, timelineEvents, isActive, exploreContext, deviceLocation.coords, refreshCounter, hasDestination, geocodeReady]);

  const canFetch = origin !== null;

  // v3.5.2 engine with optional query
  const { data: attractions = [], isLoading, error, refetch } = useAttractions({
    lat: origin?.lat,
    lng: origin?.lng,
    radiusMiles: parseInt(radius),
    query: debouncedQuery || undefined,
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
    const target = buildNavTarget({
      kind: 'PLACE',
      key: attraction.name,
      label: attraction.name,
      address: attraction.locationSummary || undefined,
    });
    if (target) {
      openNavTarget(target);
    }
  };

  const handleRefresh = useCallback(async () => {
    clearExploreContext(tripId);
    await getDeviceLocation();
    setRefreshCounter((c) => c + 1);
    refetch();
  }, [refetch, tripId]);

  // === NO DESTINATION (gate) ===
  if (!hasDestination) {
    return (
      <Card className="border-dashed border-muted-foreground/20 bg-muted/30">
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-muted">
              <MapPinned className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Add a destination to use Explore</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Set your trip destination to discover attractions and things to do nearby.
          </p>
        </CardContent>
      </Card>
    );
  }

  // === NO ORIGIN (destination exists but couldn't resolve coords yet) ===
  if (!origin) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Locating your destination…</span>
      </div>
    );
  }

  // === Subtitle icon ===
  const OriginIcon = origin.source === 'DEVICE' ? Navigation
    : origin.source === 'ARRIVAL_AIRPORT' ? Plane
    : Building2;

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
          <OriginIcon className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-sm text-muted-foreground truncate">
            {getExploreOriginSubtitle(origin.source)}
          </span>
        </div>

        {/* Context hint */}
        {exploreContext.kind !== 'TRIP' && (
          <button
            type="button"
            onClick={() => { clearExploreContext(tripId); setRefreshCounter(c => c + 1); }}
            className="text-xs text-primary hover:underline"
          >
            ← Back to trip-level explore
          </button>
        )}
      </div>

      {/* Search input */}
      <div className="relative px-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search attractions, trails, museums..."
          className="pl-9 pr-9 h-10"
        />
        {searchInput && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
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
          <span className="ml-2 text-muted-foreground">
            {debouncedQuery ? `Searching for "${debouncedQuery}"…` : 'Finding attractions…'}
          </span>
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
            <h3 className="text-base font-medium mb-2">
              {debouncedQuery ? `No results for "${debouncedQuery}"` : 'No places found in this area'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {debouncedQuery ? 'Try a different search or clear to see all attractions.' : 'Try a larger search radius.'}
            </p>
            {debouncedQuery ? (
              <Button variant="outline" size="sm" onClick={handleClearSearch}>
                Clear search
              </Button>
            ) : radius !== '50' ? (
              <Button variant="outline" size="sm" onClick={() => setRadius('50')}>
                Increase radius to 50 miles
              </Button>
            ) : null}
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

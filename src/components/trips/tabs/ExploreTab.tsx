/**
 * v4.10.0: Explore tab with Pre-Explore area picker.
 * v4.0.4: Offline essentials fallback when device is offline.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Trip } from '@/types/database';
import { AttractionSuggestion } from '@/types/attraction';
import { useRealPlacesExplore } from '@/hooks/useRealPlacesExplore';
import { useBookings } from '@/hooks/useBookings';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { getDeviceLocation, getCachedDeviceLocation } from '@/lib/deviceLocation';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';
import { useTripPermission } from '@/pages/TripDetail';
import { resolveExploreOriginForContext, getExploreOriginSubtitle, hasExploreDestination, ensureExploreBookingGeocodes } from '@/lib/location/exploreContext';
import { getExploreContext, setExploreContext, clearExploreContext } from '@/lib/explore/exploreContextStore';
import { buildExploreSections } from '@/lib/exploreRankingSections';
import { navigateTo } from '@/lib/canonicalNavigation';
import { ExploreCarousel } from '@/components/trips/explore/ExploreCarousel';
import { ExploreSectionFeed } from '@/components/trips/explore/ExploreSectionFeed';
import { ExploreAreaPicker } from '@/components/trips/explore/ExploreAreaPicker';
import { AddToTimelineModal } from '@/components/trips/explore/AddToTimelineModal';
import { useExplorePagination } from '@/hooks/useExplorePagination';
import { isOnline } from '@/lib/networkStatus';
import {
  extractEssentials,
  saveExploreEssentials,
  loadExploreEssentials,
  buildLocationKey,
  haversineDistanceMiles,
  DISTANCE_THRESHOLD_MILES,
  type EssentialPlace,
  type ExploreEssentialsRecord,
} from '@/lib/exploreEssentialsCache';
import type { ExplorableArea } from '@/lib/explore/extractTripAreas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Loader2, AlertCircle,
  Building2, Navigation, RefreshCw, Search, MapPinned, X, Plane, WifiOff,
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

  // v4.10.0: Pre-explore area selection
  const [selectedArea, setSelectedArea] = useState<ExplorableArea | null>(null);

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
    setGeocodeReady(false);
    ensureExploreBookingGeocodes(trip, bookings).then(() => {
      if (!cancelled) setGeocodeReady(true);
    });
    return () => { cancelled = true; };
  }, [trip.id, trip.destination_city, trip.destination_address, trip.destination_country, bookings]);

  // v3.9.16: Canonical context origin resolution
  const exploreContext = useMemo(() => getExploreContext(tripId), [tripId, refreshCounter]);

  // v3.9.16: Gate check — destination required (not lodging)
  const hasDestination = useMemo(() => hasExploreDestination(trip), [trip]);

  // v4.10.0: If a pre-explore area is selected with coords, use those directly
  const origin = useMemo(() => {
    if (!hasDestination) return null;

    // Pre-explore area override (only for areas with known coords like airports)
    if (selectedArea && selectedArea.lat !== 0 && selectedArea.lng !== 0) {
      return {
        lat: selectedArea.lat,
        lng: selectedArea.lng,
        label: selectedArea.label,
        source: 'DESTINATION' as const,
      };
    }

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
  }, [tripId, trip, bookings, timelineEvents, isActive, exploreContext, deviceLocation.coords, refreshCounter, hasDestination, geocodeReady, selectedArea]);

  const canFetch = origin !== null && isOnline();

  // v4.5.0: Real Places API via placesEngine
  const { data: attractions = [], isLoading, error, refetch } = useRealPlacesExplore({
    lat: origin?.lat,
    lng: origin?.lng,
    radiusMiles: parseInt(radius),
    query: debouncedQuery || undefined,
    enabled: canFetch,
    contextKey: selectedArea?.key,
  });

  // v4.0.4: Save essentials when online results load
  const originLat = origin?.lat;
  const originLng = origin?.lng;
  useEffect(() => {
    if (isOnline() && attractions.length > 0 && originLat != null && originLng != null) {
      const locKey = buildLocationKey(originLat, originLng);
      const essentials = extractEssentials(attractions);
      if (essentials.length > 0) {
        saveExploreEssentials(tripId, locKey, essentials);
      }
    }
  }, [attractions, tripId, originLat, originLng]);

  // v4.0.4: Load offline essentials when offline
  const [offlineEssentials, setOfflineEssentials] = useState<ExploreEssentialsRecord | null>(null);
  const [offlineDistanceWarning, setOfflineDistanceWarning] = useState(false);
  useEffect(() => {
    if (!isOnline() && originLat != null && originLng != null) {
      const locKey = buildLocationKey(originLat, originLng);
      loadExploreEssentials(tripId, locKey).then(record => {
        if (record) {
          setOfflineEssentials(record);
          // Check distance from cached location to current device position
          const deviceCoords = getCachedDeviceLocation();
          if (deviceCoords) {
            const [cachedLat, cachedLng] = locKey.split(',').map(Number);
            const dist = haversineDistanceMiles(deviceCoords.lat, deviceCoords.lng, cachedLat, cachedLng);
            setOfflineDistanceWarning(dist > DISTANCE_THRESHOLD_MILES);
          }
        } else {
          setOfflineEssentials(null);
        }
      });
    }
  }, [tripId, originLat, originLng]);

  // v4.10.0: Handle area selection
  const handleSelectArea = useCallback((area: ExplorableArea) => {
    if (selectedArea?.key === area.key) {
      // Deselect — go back to default
      setSelectedArea(null);
      clearExploreContext(tripId);
      setRefreshCounter(c => c + 1);
    } else {
      setSelectedArea(area);
      // If the area has coords, the origin useMemo handles it.
      // If not (lodging/activity), set booking-level context
      if (area.lat === 0 && area.lng === 0 && area.key.startsWith('stay:')) {
        const bookingId = area.key.replace('stay:', '');
        setExploreContext(tripId, { kind: 'BOOKING_ITEM', id: bookingId });
      }
      setRefreshCounter(c => c + 1);
    }
  }, [selectedArea, tripId]);

  // v3.6.0: Ranking + sectioning
  const { rightNow, sections: rawSections } = useMemo(() => {
    if (attractions.length === 0) return { rightNow: [], sections: [] };
    return buildExploreSections(attractions);
  }, [attractions]);

  // v4.4.x: Per-category pagination
  const { paginatedSections, loadMore } = useExplorePagination(rawSections, tripId);

  // Handlers
  const handleAdd = (attraction: AttractionSuggestion) => {
    if (!canEdit) return;
    setSelectedAttraction(attraction);
    setAddModalOpen(true);
  };

  const handleNavigate = (attraction: AttractionSuggestion) => {
    // v3.5.3: Build NavTarget for the attraction, using address-based resolution.
    // For individual attractions, address/name is acceptable since these are
    // specific place names (not generic labels). The origin query uses coords-only.
    navigateTo({
      address: attraction.locationSummary || undefined,
      locationLabel: attraction.name,
    });
  };

  const handleRefresh = useCallback(async () => {
    setSelectedArea(null);
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
            {selectedArea ? `Exploring near ${selectedArea.label}` : getExploreOriginSubtitle(origin.source)}
          </span>
        </div>

        {/* Context hint */}
        {(exploreContext.kind !== 'TRIP' || selectedArea) && (
          <button
            type="button"
            onClick={() => { setSelectedArea(null); clearExploreContext(tripId); setRefreshCounter(c => c + 1); }}
            className="text-xs text-primary hover:underline"
          >
            ← Back to trip-level explore
          </button>
        )}
      </div>

      {/* v4.10.0: Pre-explore area picker */}
      <ExploreAreaPicker
        bookings={bookings}
        onSelectArea={handleSelectArea}
        activeAreaKey={selectedArea?.key}
      />

      {/* Search input */}
      <div className="relative px-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search attractions, restaurants, trails..."
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
      {!isOnline() ? (
        /* v4.0.4: Offline essentials fallback */
        offlineEssentials && offlineEssentials.places.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-orange-500 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold">Offline Essentials</h3>
                <p className="text-xs text-muted-foreground">
                  Saved nearby places from last connection.
                </p>
              </div>
            </div>
            {offlineDistanceWarning && (
              <p className="text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 rounded-md px-3 py-2">
                Results may not match current location. Showing saved places from last connection.
              </p>
            )}
            <div className="grid gap-2">
              {offlineEssentials.places.map((place) => (
                <Card key={place.id} className="border-orange-200/30 dark:border-orange-800/20">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{place.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{place.category}</p>
                        {place.address && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{place.address}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                        {place.rating && <span>★ {place.rating}</span>}
                        {place.distanceMiles && <span>{place.distanceMiles} mi</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="border-dashed border-muted-foreground/20 bg-muted/30">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-muted">
                  <WifiOff className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-base font-medium mb-2">Explore unavailable offline</h3>
              <p className="text-sm text-muted-foreground">
                No cached places available. Connect to browse nearby attractions.
              </p>
            </CardContent>
          </Card>
        )
      ) : deviceLocation.isLoading ? (
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

          {/* Sectioned feed with pagination */}
          <ExploreSectionFeed
            sections={paginatedSections}
            onNavigate={handleNavigate}
            onAdd={handleAdd}
            onLoadMore={loadMore}
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

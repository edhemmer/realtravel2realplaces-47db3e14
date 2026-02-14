/**
 * v3.4.8: Explore tab with canonical dual-origin support
 *
 * Supports three origin modes:
 * - DEVICE: Uses device GPS location
 * - STAY: Uses a selected stay's address
 * - MANUAL: User-entered location text
 *
 * Origin is controlled via a selector at the top.
 * Refresh re-runs the query for the active origin.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Trip, Booking } from '@/types/database';
import { AttractionSuggestion } from '@/types/attraction';
import { useAttractions } from '@/hooks/useAttractions';
import { useAccess } from '@/hooks/useAccess';
import { useBookings } from '@/hooks/useBookings';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { getDeviceLocation } from '@/lib/deviceLocation';
import { useTripPermission } from '@/pages/TripDetail';
import { AttractionCard } from '@/components/trips/explore/AttractionCard';
import { AddToTripModal } from '@/components/trips/explore/AddToTripModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Compass, MapPin, Search, Sparkles, Loader2, AlertCircle,
  Building2, MapPinned, Navigation, RefreshCw, ChevronDown
} from 'lucide-react';
import type { ExploreOriginType } from '@/types/exploreOrigin';

interface ExploreTabProps {
  tripId: string;
  trip: Trip;
  /** v3.4.8: Initial origin hint from navigation context */
  initialOrigin?: ExploreOriginType;
}

type RadiusOption = '5' | '10' | '25' | '50';

export function ExploreTab({ tripId, trip, initialOrigin }: ExploreTabProps) {
  const { isPro } = useAccess();
  const { canEdit } = useTripPermission();
  const { data: bookings = [] } = useBookings(tripId);
  const deviceLocation = useDeviceLocation();

  // Derive available stays from bookings
  const stays = useMemo(() =>
    bookings.filter((b) => b.booking_type === 'stay'),
    [bookings]
  );
  const hasStays = stays.length > 0;

  // v3.4.8: Origin state
  const resolveDefaultOrigin = useCallback((): ExploreOriginType => {
    if (initialOrigin) return initialOrigin;
    // Default: DEVICE if entering from nav/quick access
    return 'DEVICE';
  }, [initialOrigin]);

  const [originType, setOriginType] = useState<ExploreOriginType>(resolveDefaultOrigin);
  const [selectedStayId, setSelectedStayId] = useState<string>(() =>
    stays.length > 0 ? stays[0].id : ''
  );
  const [manualLocation, setManualLocation] = useState('');
  const [radius, setRadius] = useState<RadiusOption>('25');
  const [selectedAttraction, setSelectedAttraction] = useState<AttractionSuggestion | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Sync selectedStayId when stays load
  useEffect(() => {
    if (stays.length > 0 && !selectedStayId) {
      setSelectedStayId(stays[0].id);
    }
  }, [stays, selectedStayId]);

  // Sync initialOrigin changes
  useEffect(() => {
    if (initialOrigin) {
      setOriginType(initialOrigin);
    }
  }, [initialOrigin]);

  // Selected stay object
  const selectedStay = useMemo(() =>
    stays.find((s) => s.id === selectedStayId) || null,
    [stays, selectedStayId]
  );

  // Build origin label
  const originLabel = useMemo(() => {
    switch (originType) {
      case 'DEVICE':
        if (deviceLocation.coords) return 'Your current location';
        if (deviceLocation.isLoading) return 'Locating…';
        return 'Current location unavailable';
      case 'STAY':
        return selectedStay
          ? (selectedStay.property_name || selectedStay.vendor_name || 'My stay')
          : 'No stay selected';
      case 'MANUAL':
        return manualLocation.trim() || 'Enter a location';
    }
  }, [originType, deviceLocation, selectedStay, manualLocation]);

  // Derive search params from origin
  const searchCity = useMemo(() => {
    if (originType === 'STAY' && selectedStay) {
      // Use stay address as city search (mock behavior)
      return selectedStay.address || selectedStay.property_name || trip.destination_city;
    }
    if (originType === 'MANUAL' && manualLocation.trim()) {
      return manualLocation.trim();
    }
    return undefined;
  }, [originType, selectedStay, manualLocation, trip.destination_city]);

  const searchState = originType === 'STAY' ? (trip.destination_state || undefined) : undefined;

  const searchLat = originType === 'DEVICE' && deviceLocation.coords
    ? deviceLocation.coords.lat : undefined;
  const searchLng = originType === 'DEVICE' && deviceLocation.coords
    ? deviceLocation.coords.lng : undefined;

  // Can we fetch?
  const canFetch = isPro && (
    (originType === 'DEVICE' && deviceLocation.coords !== null) ||
    (originType === 'STAY' && selectedStay !== null) ||
    (originType === 'MANUAL' && !!manualLocation.trim())
  );

  // Origin needs action banner
  const needsAction = (
    (originType === 'DEVICE' && !deviceLocation.isLoading && !deviceLocation.coords) ||
    (originType === 'STAY' && !hasStays) ||
    (originType === 'MANUAL' && !manualLocation.trim())
  );

  // Fetch attractions
  const { data: attractions = [], isLoading, error, refetch } = useAttractions({
    city: searchCity,
    state: searchState,
    lat: searchLat,
    lng: searchLng,
    radiusMiles: parseInt(radius),
    enabled: canFetch,
  });

  // Handlers
  const handleAddToTrip = (attraction: AttractionSuggestion) => {
    setSelectedAttraction(attraction);
    setAddModalOpen(true);
  };

  const handleRefresh = useCallback(async () => {
    if (originType === 'DEVICE') {
      // Re-request device location (won't re-prompt if already denied)
      await getDeviceLocation();
      setRefreshKey((k) => k + 1);
    }
    refetch();
  }, [originType, refetch]);

  const handleOriginChange = useCallback((newType: ExploreOriginType) => {
    setOriginType(newType);
    if (newType === 'MANUAL') {
      setManualLocation('');
    }
  }, []);

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

  return (
    <div className="space-y-4">
      {/* v3.4.8: Origin selector */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-3">
          {/* Search from selector */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <MapPin className="w-3.5 h-3.5" />
              Search from
            </Label>
            <div className="flex items-center gap-2">
              <Select value={originType} onValueChange={(v) => handleOriginChange(v as ExploreOriginType)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEVICE">
                    <span className="flex items-center gap-2">
                      <Navigation className="w-3.5 h-3.5" />
                      Current location
                    </span>
                  </SelectItem>
                  <SelectItem value="STAY" disabled={!hasStays}>
                    <span className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5" />
                      My stay
                    </span>
                  </SelectItem>
                  <SelectItem value="MANUAL">
                    <span className="flex items-center gap-2">
                      <MapPinned className="w-3.5 h-3.5" />
                      Enter location
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 h-10 w-10"
                onClick={handleRefresh}
                aria-label="Refresh results"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Stay picker (when STAY origin) */}
          {originType === 'STAY' && hasStays && stays.length > 1 && (
            <Select value={selectedStayId} onValueChange={setSelectedStayId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select stay" />
              </SelectTrigger>
              <SelectContent>
                {stays.map((stay) => (
                  <SelectItem key={stay.id} value={stay.id}>
                    {stay.property_name || stay.vendor_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Manual location input */}
          {originType === 'MANUAL' && (
            <Input
              placeholder="City, landmark, or address"
              value={manualLocation}
              onChange={(e) => setManualLocation(e.target.value)}
            />
          )}

          {/* Origin status label */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {originType === 'DEVICE' && deviceLocation.isLoading && (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Locating you…</span>
              </>
            )}
            {originType === 'DEVICE' && deviceLocation.coords && (
              <>
                <Navigation className="w-3 h-3 text-primary" />
                <span>Searching near: {originLabel}</span>
              </>
            )}
            {originType === 'STAY' && selectedStay && (
              <>
                <Building2 className="w-3 h-3 text-primary" />
                <span>Searching near: {originLabel}</span>
              </>
            )}
            {originType === 'MANUAL' && manualLocation.trim() && (
              <>
                <MapPinned className="w-3 h-3 text-primary" />
                <span>Searching near: {manualLocation.trim()}</span>
              </>
            )}
          </div>

          {/* Needs-action banner */}
          {needsAction && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                {originType === 'DEVICE' && (
                  <>
                    <p className="font-medium text-amber-800 dark:text-amber-300">Location unavailable</p>
                    <p className="text-amber-700 dark:text-amber-400/80">
                      Turn on location services or switch to &quot;My stay&quot; or &quot;Enter location&quot;.
                    </p>
                  </>
                )}
                {originType === 'STAY' && !hasStays && (
                  <>
                    <p className="font-medium text-amber-800 dark:text-amber-300">No stays booked</p>
                    <p className="text-amber-700 dark:text-amber-400/80">
                      Add a stay booking first, or switch to &quot;Current location&quot; or &quot;Enter location&quot;.
                    </p>
                  </>
                )}
                {originType === 'MANUAL' && !manualLocation.trim() && (
                  <>
                    <p className="font-medium text-amber-800 dark:text-amber-300">Enter a location</p>
                    <p className="text-amber-700 dark:text-amber-400/80">
                      Type a city, landmark, or address to search nearby.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Radius selector */}
          <div className="flex items-center gap-2">
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
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        {isLoading ? (
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
                We couldn't load nearby attractions right now
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try again or adjust your location.
              </p>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : !canFetch ? null : attractions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-muted">
                  <MapPinned className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-base font-medium mb-2">No places found in this area</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try a larger radius or switch search origin.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                {radius !== '50' && (
                  <Button variant="outline" size="sm" onClick={() => setRadius('50')}>
                    Increase radius to 50 miles
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
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

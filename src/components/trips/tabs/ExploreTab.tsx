/**
 * Patch 2.1.17 / 2.1.19: Explore tab content for Pro users
 * - 2.1.19: Added empty/error states, location validation, ticket clarity
 */

import { useState } from 'react';
import { Trip } from '@/types/database';
import { AttractionSuggestion } from '@/types/attraction';
import { useAttractions } from '@/hooks/useAttractions';
import { useIsPro } from '@/hooks/useSubscription';
import { useTripPermission } from '@/pages/TripDetail';
import { AttractionCard } from '@/components/trips/explore/AttractionCard';
import { AddToTripModal } from '@/components/trips/explore/AddToTripModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Compass, MapPin, Search, Sparkles, Loader2, AlertCircle, Building2, MapPinned } from 'lucide-react';

interface ExploreTabProps {
  tripId: string;
  trip: Trip;
}

type LocationMode = 'stay' | 'custom';
type RadiusOption = '5' | '10' | '25' | '50';

export function ExploreTab({ tripId, trip }: ExploreTabProps) {
  const isPro = useIsPro();
  const { canEdit } = useTripPermission();
  
  const [locationMode, setLocationMode] = useState<LocationMode>('stay');
  const [customLocation, setCustomLocation] = useState('');
  const [radius, setRadius] = useState<RadiusOption>('25');
  const [selectedAttraction, setSelectedAttraction] = useState<AttractionSuggestion | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Check if trip has a usable location
  const hasUsableLocation = !!(trip.destination_city && trip.destination_city.trim());

  // Determine search location
  const searchCity = locationMode === 'custom' && customLocation 
    ? customLocation 
    : trip.destination_city;
  const searchState = locationMode === 'custom' ? undefined : trip.destination_state || undefined;

  // Fetch attractions (only for Pro users with valid location)
  const { data: attractions = [], isLoading, error } = useAttractions({
    city: searchCity,
    state: searchState,
    radiusMiles: parseInt(radius),
    enabled: isPro && hasUsableLocation && (locationMode === 'stay' || !!customLocation.trim()),
  });

  // Handle adding attraction to trip
  const handleAddToTrip = (attraction: AttractionSuggestion) => {
    setSelectedAttraction(attraction);
    setAddModalOpen(true);
  };

  // Handle quick radius increase
  const handleIncreaseRadius = () => {
    setRadius('50');
  };

  // Handle switching to custom location
  const handleChangeLocation = () => {
    setLocationMode('custom');
  };

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
          <Badge variant="secondary" className="mt-4">
            Pro
          </Badge>
        </CardContent>
      </Card>
    );
  }

  // No usable location state (v2.1.19)
  if (!hasUsableLocation) {
    return (
      <Card className="border-dashed border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10">
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Building2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Add a stay or destination first</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Once we know where you're going, Explore can suggest nearby places to visit.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Compass className="w-5 h-5 text-primary" />
            Explore nearby attractions
          </CardTitle>
          <CardDescription>
            Discover things to do near your destination
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Search from
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={locationMode} onValueChange={(v) => setLocationMode(v as LocationMode)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stay">Stay location</SelectItem>
                  <SelectItem value="custom">Current location</SelectItem>
                </SelectContent>
              </Select>
              
              {locationMode === 'custom' && (
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Enter city or place name"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    className="flex-1"
                  />
                </div>
              )}
              
              {locationMode === 'stay' && (
                <div className="flex-1 flex items-center text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 mr-1" />
                  {trip.destination_city}, {trip.destination_state || trip.destination_country}
                </div>
              )}
            </div>
          </div>

          {/* Radius selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search radius
            </Label>
            <Select value={radius} onValueChange={(v) => setRadius(v as RadiusOption)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 miles</SelectItem>
                <SelectItem value="10">10 miles</SelectItem>
                <SelectItem value="25">25 miles (default)</SelectItem>
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
            <span className="ml-2 text-muted-foreground">Finding attractions...</span>
          </div>
        ) : error ? (
          /* v2.1.19: Friendly error state */
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-muted">
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-base font-medium mb-2">Explore is temporarily unavailable</h3>
              <p className="text-sm text-muted-foreground">
                Please try again in a few minutes.
              </p>
            </CardContent>
          </Card>
        ) : attractions.length === 0 ? (
          /* v2.1.19: Enhanced empty state with quick actions */
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-muted">
                  <MapPinned className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-base font-medium mb-2">No places found in this area</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try a larger radius or search from a nearby town.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                {radius !== '50' && (
                  <Button variant="outline" size="sm" onClick={handleIncreaseRadius}>
                    Increase radius to 50 miles
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleChangeLocation}>
                  Change search location
                </Button>
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

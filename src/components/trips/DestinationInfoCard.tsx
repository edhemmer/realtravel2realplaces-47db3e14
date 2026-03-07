/**
 * v3.8.6: Destination Info & Recommendations Card
 * v4.0.5: Shows OfflineLocationContextCard when device is offline.
 */

import { useMemo } from 'react';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { buildGoogleMapsSearchUrl, buildYelpSearchUrl, type LocationContext } from '@/lib/deviceLocation';
import { isOnline } from '@/lib/networkStatus';
import { OfflineLocationContextCard } from '@/components/trips/OfflineLocationContextCard';
import { Trip } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar, MapPin, ExternalLink, Loader2,
  Cloud, Info, Globe, Utensils, Camera, PartyPopper
} from 'lucide-react';

const openExternalUrl = (url: string | null | undefined) => {
  if (!url) return;
  const safeUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  window.open(safeUrl, '_blank', 'noopener,noreferrer');
};

const getDestinationLinks = (city: string, state: string | undefined, country: string, ctx: LocationContext) => {
  const searchQuery = encodeURIComponent(`${city}${state ? ` ${state}` : ''} ${country}`);
  return {
    generalInfo: [
      { label: 'Travel Guide', url: `https://www.tripadvisor.com/Search?q=${searchQuery}`, icon: Globe },
      { label: 'Weather', url: `https://www.weather.com/weather/today/l/${searchQuery}`, icon: Cloud },
      { label: 'Local Events', url: `https://www.eventbrite.com/d/${searchQuery.toLowerCase().replace(/\s+/g, '-')}/events/`, icon: Calendar },
    ],
    dining: [
      { label: 'Yelp Restaurants', url: buildYelpSearchUrl('Restaurants', ctx), icon: Utensils },
      { label: 'Google Maps Dining', url: buildGoogleMapsSearchUrl('restaurants', ctx), icon: MapPin },
    ],
    attractions: [
      { label: 'Top Attractions', url: `https://www.tripadvisor.com/Attractions-${searchQuery}`, icon: Camera },
      { label: 'Things to Do', url: buildGoogleMapsSearchUrl('things to do', ctx), icon: PartyPopper },
    ],
  };
};

interface DestinationInfoCardProps {
  trip: Trip;
}

export function DestinationInfoCard({ trip }: DestinationInfoCardProps) {
  const { coords: deviceCoords, isLoading: locationLoading } = useDeviceLocation();
  const online = isOnline();

  const locationCtx: LocationContext = useMemo(() => ({
    deviceCoords,
    city: trip.destination_city,
    state: trip.destination_state || undefined,
    country: trip.destination_country,
  }), [deviceCoords, trip.destination_city, trip.destination_state, trip.destination_country]);

  const destinationLinks = getDestinationLinks(
    trip.destination_city,
    trip.destination_state || undefined,
    trip.destination_country,
    locationCtx
  );

  // v4.0.5: Show offline location context when device is offline
  if (!online) {
    return <OfflineLocationContextCard tripId={trip.id} trip={trip} />;
  }

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          Destination Info & Recommendations
        </CardTitle>
        <CardDescription className="flex items-center justify-between text-xs">
          <span>Local links, dining (4+ stars, $-$$), and attractions</span>
          <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-2">
            {locationLoading ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Getting location…
              </span>
            ) : deviceCoords ? (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Using device location
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Using trip location
              </span>
            )}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <Globe className="w-4 h-4" /> General Info
            </h4>
            <div className="space-y-1">
              {destinationLinks.generalInfo.map((link) => (
                <Button key={link.label} variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" onClick={() => openExternalUrl(link.url)}>
                  <link.icon className="w-3 h-3 mr-2" />
                  {link.label}
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <Utensils className="w-4 h-4" /> Dining (4+ ⭐, $-$$)
            </h4>
            <div className="space-y-1">
              {destinationLinks.dining.map((link) => (
                <Button key={link.label} variant="ghost" size="sm" disabled={locationLoading} className="w-full justify-start h-8 text-xs" onClick={() => openExternalUrl(link.url)}>
                  <link.icon className="w-3 h-3 mr-2" />
                  {link.label}
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <Camera className="w-4 h-4" /> Attractions
            </h4>
            <div className="space-y-1">
              {destinationLinks.attractions.map((link) => (
                <Button key={link.label} variant="ghost" size="sm" disabled={locationLoading} className="w-full justify-start h-8 text-xs" onClick={() => openExternalUrl(link.url)}>
                  <link.icon className="w-3 h-3 mr-2" />
                  {link.label}
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

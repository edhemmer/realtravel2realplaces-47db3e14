/**
 * Offline Location Context Card
 *
 * Displays spatial orientation only from a proven saved trip snapshot.
 * It never treats the current trip prop as proof that offline data was cached.
 */

import { useEffect, useState, useMemo } from 'react';
import { Trip } from '@/types/database';
import {
  loadTripSnapshotRecord,
  type TripSnapshotReadResult,
} from '@/lib/offlineTripCache';
import { getCachedDeviceLocation } from '@/lib/deviceLocation';
import { haversineDistanceMiles, formatSnapshotTimestamp } from '@/lib/weatherSnapshotCache';
import type { CanonicalTripState } from '@/lib/canonicalTripState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, WifiOff, Navigation, Building2, Plane, AlertTriangle } from 'lucide-react';

interface OfflineLocationContextCardProps {
  tripId: string;
  trip: Trip;
}

interface ResolvedLocation {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  source: 'stay' | 'timeline' | 'destination';
}

function resolveOfflineLocation(state: CanonicalTripState, trip: Trip): ResolvedLocation | null {
  const now = new Date();

  // Prefer the closest saved stay/timeline record with an address. This is
  // location context, not a claim that the stay/event is currently active.
  const stays = state.timelineEvents
    .filter((event) => event.bookingType === 'stay' && event.address)
    .sort((a, b) => Math.abs(a.datetime.getTime() - now.getTime()) - Math.abs(b.datetime.getTime() - now.getTime()));
  if (stays[0]) {
    return { name: stays[0].title, address: stays[0].address, source: 'stay' };
  }

  const itemsWithAddress = state.timelineEvents
    .filter((event) => event.address)
    .sort((a, b) => Math.abs(a.datetime.getTime() - now.getTime()) - Math.abs(b.datetime.getTime() - now.getTime()));
  if (itemsWithAddress[0]) {
    return { name: itemsWithAddress[0].title, address: itemsWithAddress[0].address, source: 'timeline' };
  }

  if (trip.destination_city) {
    const address = [trip.destination_address, trip.destination_city, trip.destination_state, trip.destination_country]
      .filter(Boolean)
      .join(', ');
    return { name: trip.destination_city, address: address || undefined, source: 'destination' };
  }

  return null;
}

export function OfflineLocationContextCard({ tripId, trip }: OfflineLocationContextCardProps) {
  const [snapshot, setSnapshot] = useState<TripSnapshotReadResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    void loadTripSnapshotRecord(tripId).then((result) => {
      if (!cancelled) {
        setSnapshot(result);
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [tripId]);

  const resolved = useMemo(
    () => snapshot ? resolveOfflineLocation(snapshot.state, trip) : null,
    [snapshot, trip],
  );
  const deviceCoords = getCachedDeviceLocation();

  const distance = useMemo(() => {
    if (!resolved?.lat || !resolved?.lng || !deviceCoords) return null;
    return Math.round(haversineDistanceMiles(deviceCoords.lat, deviceCoords.lng, resolved.lat, resolved.lng) * 10) / 10;
  }, [resolved, deviceCoords]);

  if (!loaded) return null;

  if (!snapshot) {
    return (
      <Card className="border-dashed border-muted-foreground/20 bg-muted/30">
        <CardContent className="py-8 text-center">
          <div className="mb-3 flex justify-center">
            <div className="rounded-full bg-muted p-2.5"><WifiOff className="h-6 w-6 text-muted-foreground" /></div>
          </div>
          <p className="text-sm font-medium">No saved trip snapshot on this device</p>
          <p className="mt-1 text-xs text-muted-foreground">Reconnect to load the trip before relying on offline location context.</p>
        </CardContent>
      </Card>
    );
  }

  if (!resolved) {
    return (
      <Card className="border-dashed border-muted-foreground/20 bg-muted/30">
        <CardContent className="py-8 text-center">
          <p className="text-sm font-medium">Saved snapshot has no location context</p>
          <p className="mt-1 text-xs text-muted-foreground">Reconnect to refresh destination and reservation details.</p>
        </CardContent>
      </Card>
    );
  }

  const SourceIcon = resolved.source === 'stay' ? Building2 : resolved.source === 'timeline' ? Plane : MapPin;
  const isStale = snapshot.ageStatus === 'stale';

  return (
    <Card className="overflow-hidden border-orange-200/50 dark:border-orange-800/30">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="rounded-full bg-orange-500/10 p-1.5"><SourceIcon className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" /></div>
            Saved location context
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400"><WifiOff className="h-3 w-3" /><span>Offline</span></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0">
        <div>
          <p className="text-sm font-medium">{resolved.name}</p>
          {resolved.address && <p className="mt-0.5 text-xs text-muted-foreground">{resolved.address}</p>}
        </div>
        {distance !== null && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Navigation className="h-3 w-3" /><span>~{distance} miles from cached device location</span></div>
        )}
        {isStale && (
          <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>This saved trip snapshot is older. Provider-backed details may have changed.</span>
          </div>
        )}
        <div className="border-t border-border/50 pt-1.5">
          <p className="text-[10px] text-muted-foreground">
            Saved {formatSnapshotTimestamp(snapshot.savedAt)}. This is stored context, not live navigation or provider status.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

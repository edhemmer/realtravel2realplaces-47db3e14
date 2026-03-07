/**
 * v4.0.5: Offline Location Context Card
 *
 * Displays spatial orientation from cached trip snapshot when offline.
 * Resolves location using canonical trip logic:
 *   1. Active stay
 *   2. Active timeline item with location
 *   3. Trip destination fallback
 *
 * Does NOT load map tiles or provide navigation.
 * Uses existing offlineTripCache snapshot — no new IndexedDB stores.
 */

import { useEffect, useState, useMemo } from 'react';
import { Trip } from '@/types/database';
import { loadTripSnapshot } from '@/lib/offlineTripCache';
import { getCachedDeviceLocation } from '@/lib/deviceLocation';
import { haversineDistanceMiles } from '@/lib/weatherSnapshotCache';
import { formatSnapshotTimestamp } from '@/lib/weatherSnapshotCache';
import type { CanonicalTripState, CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, WifiOff, Navigation, Building2, Plane } from 'lucide-react';

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

/**
 * Resolve the best available location from a cached trip state.
 */
function resolveOfflineLocation(
  state: CanonicalTripState,
  trip: Trip
): ResolvedLocation | null {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // 1. Active stay (check-in ≤ now ≤ check-out)
  const activeStays = state.timelineEvents.filter(
    (e) =>
      e.bookingType === 'stay' &&
      e.eventType === 'hotel_checkin' &&
      e.address
  );
  for (const stay of activeStays) {
    return {
      name: stay.title,
      address: stay.address,
      source: 'stay',
    };
  }

  // 2. Active timeline item with address (closest to now)
  const itemsWithAddress = state.timelineEvents
    .filter((e) => e.address)
    .sort(
      (a, b) =>
        Math.abs(a.datetime.getTime() - now.getTime()) -
        Math.abs(b.datetime.getTime() - now.getTime())
    );
  if (itemsWithAddress.length > 0) {
    const closest = itemsWithAddress[0];
    return {
      name: closest.title,
      address: closest.address,
      source: 'timeline',
    };
  }

  // 3. Trip destination fallback
  if (trip.destination_city) {
    const address = [
      trip.destination_address,
      trip.destination_city,
      trip.destination_state,
      trip.destination_country,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      name: trip.destination_city,
      address: address || undefined,
      source: 'destination',
    };
  }

  return null;
}

export function OfflineLocationContextCard({
  tripId,
  trip,
}: OfflineLocationContextCardProps) {
  const [cachedState, setCachedState] = useState<CanonicalTripState | null>(null);
  const [snapshotTime, setSnapshotTime] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTripSnapshot(tripId).then((snapshot) => {
      if (!cancelled && snapshot) {
        setCachedState(snapshot);
        // Use trip updated_at as approximate cache time
        setSnapshotTime(new Date(snapshot.trip?.updated_at || Date.now()).getTime());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const resolved = useMemo(() => {
    if (!cachedState) return resolveOfflineLocation({ timelineEvents: [], trip } as any, trip);
    return resolveOfflineLocation(cachedState, trip);
  }, [cachedState, trip]);

  const deviceCoords = getCachedDeviceLocation();

  const distance = useMemo(() => {
    if (!resolved?.lat || !resolved?.lng || !deviceCoords) return null;
    return Math.round(
      haversineDistanceMiles(
        deviceCoords.lat,
        deviceCoords.lng,
        resolved.lat,
        resolved.lng
      ) * 10
    ) / 10;
  }, [resolved, deviceCoords]);

  if (!resolved) {
    return (
      <Card className="border-dashed border-muted-foreground/20 bg-muted/30">
        <CardContent className="py-8 text-center">
          <div className="flex justify-center mb-3">
            <div className="p-2.5 rounded-full bg-muted">
              <WifiOff className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm font-medium">Location unavailable offline</p>
          <p className="text-xs text-muted-foreground mt-1">
            No cached location data available. Connect to view destination info.
          </p>
        </CardContent>
      </Card>
    );
  }

  const SourceIcon =
    resolved.source === 'stay'
      ? Building2
      : resolved.source === 'timeline'
        ? Plane
        : MapPin;

  return (
    <Card className="border-orange-200/50 dark:border-orange-800/30 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-orange-500/10">
              <SourceIcon className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            Saved Location
          </CardTitle>
          <div className="flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400 shrink-0">
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2.5">
        <div>
          <p className="text-sm font-medium">{resolved.name}</p>
          {resolved.address && (
            <p className="text-xs text-muted-foreground mt-0.5">{resolved.address}</p>
          )}
        </div>

        {distance !== null && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Navigation className="w-3 h-3" />
            <span>~{distance} miles from current location</span>
          </div>
        )}

        <div className="pt-1.5 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground">
            {snapshotTime
              ? `Last updated ${formatSnapshotTimestamp(snapshotTime)}`
              : 'Not live.'}{' '}
            Showing saved location from last connection.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

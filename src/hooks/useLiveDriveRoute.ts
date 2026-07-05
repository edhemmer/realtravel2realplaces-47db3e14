import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLiveRoute, getRoute, type RouteResult } from '@/lib/drive/routeProvider';
import { useResolvedDriveHazardCoords } from '@/hooks/useOfficialDriveHazards';
import type { Trip } from '@/types/database';
import type { DeviceCoords } from '@/lib/deviceLocation';
import type { LocationRef } from '@/types/drive';

export type LiveDriveRouteStatus = 'live' | 'estimate' | 'needs_origin' | 'needs_destination' | 'unavailable';

interface UseLiveDriveRouteResult {
  status: LiveDriveRouteStatus;
  route: RouteResult | null;
  estimate: RouteResult | null;
  originCoords: DeviceCoords | null;
  destinationCoords: DeviceCoords | null;
  isLoading: boolean;
  detail: string;
}

function routeLocation(value: string | undefined, coords: DeviceCoords | null): LocationRef | undefined {
  if (!value && !coords) return undefined;
  return {
    type: value ? 'ADDRESS' : 'CURRENT_LOCATION',
    value: value || null,
    lat: coords?.lat,
    lng: coords?.lng,
  };
}

function destinationLocation(trip: Trip, coords: DeviceCoords | null): LocationRef {
  return {
    type: trip.destination_address ? 'ADDRESS' : 'CITY',
    value: trip.destination_address || [trip.destination_city, trip.destination_state, trip.destination_country].filter(Boolean).join(', '),
    city: trip.destination_city,
    state: trip.destination_state,
    country: trip.destination_country,
    lat: coords?.lat,
    lng: coords?.lng,
  };
}

function departureIso(trip: Trip): string {
  return `${trip.start_date}T08:00:00`;
}

export function useLiveDriveRoute(trip: Trip): UseLiveDriveRouteResult {
  const isDriveTrip = trip.transportation_mode === 'drive';
  const originLookup = useResolvedDriveHazardCoords({
    enabled: isDriveTrip && Boolean(trip.origin_address),
    routeAddress: trip.origin_address,
  });

  const destinationLookup = useResolvedDriveHazardCoords({
    enabled: isDriveTrip,
    routeAddress: trip.destination_address,
    city: trip.destination_city,
    state: trip.destination_state,
    country: trip.destination_country,
  });

  const originCoords = originLookup.data ?? null;
  const destinationCoords = destinationLookup.data ?? null;

  const estimate = useMemo(() => {
    if (!isDriveTrip || !destinationCoords) return null;
    return getRoute(
      routeLocation(trip.origin_address, originCoords),
      destinationLocation(trip, destinationCoords),
      trip.start_date,
    );
  }, [destinationCoords, isDriveTrip, originCoords, trip]);

  const liveRoute = useQuery({
    queryKey: [
      'live-drive-route',
      trip.id,
      originCoords?.lat?.toFixed(3),
      originCoords?.lng?.toFixed(3),
      destinationCoords?.lat?.toFixed(3),
      destinationCoords?.lng?.toFixed(3),
      trip.start_date,
    ],
    queryFn: () => fetchLiveRoute({
      origin: originCoords!,
      destination: destinationCoords!,
      departureTime: departureIso(trip),
    }),
    enabled: isDriveTrip && Boolean(originCoords && destinationCoords),
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  if (!isDriveTrip) {
    return {
      status: 'unavailable',
      route: null,
      estimate: null,
      originCoords,
      destinationCoords,
      isLoading: false,
      detail: 'Live drive routing is available for driving trips.',
    };
  }

  if (!trip.origin_address) {
    return {
      status: 'needs_origin',
      route: null,
      estimate,
      originCoords,
      destinationCoords,
      isLoading: destinationLookup.isLoading,
      detail: 'Add a starting address to unlock provider-backed route timing before departure.',
    };
  }

  if (!destinationCoords) {
    return {
      status: 'needs_destination',
      route: null,
      estimate,
      originCoords,
      destinationCoords,
      isLoading: destinationLookup.isLoading,
      detail: 'Add a destination address or city that can be resolved for route planning.',
    };
  }

  if (liveRoute.data?.summary) {
    return {
      status: 'live',
      route: liveRoute.data,
      estimate,
      originCoords,
      destinationCoords,
      isLoading: liveRoute.isLoading || originLookup.isLoading || destinationLookup.isLoading,
      detail: liveRoute.data.trafficDelayMinutes
        ? `Live route includes about ${liveRoute.data.trafficDelayMinutes} minutes of traffic delay.`
        : 'Live provider route is available and cached for cost control.',
    };
  }

  if (estimate?.summary) {
    return {
      status: 'estimate',
      route: estimate,
      estimate,
      originCoords,
      destinationCoords,
      isLoading: liveRoute.isLoading || originLookup.isLoading || destinationLookup.isLoading,
      detail: liveRoute.data?.degradedReason || liveRoute.error?.message || 'Using deterministic offline estimate until the live route provider responds.',
    };
  }

  return {
    status: 'unavailable',
    route: liveRoute.data ?? null,
    estimate,
    originCoords,
    destinationCoords,
    isLoading: liveRoute.isLoading || originLookup.isLoading || destinationLookup.isLoading,
    detail: liveRoute.data?.degradedReason || liveRoute.error?.message || 'Route timing is unavailable right now.',
  };
}

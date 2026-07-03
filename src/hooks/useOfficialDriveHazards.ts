import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DeviceCoords } from '@/lib/deviceLocation';
import {
  buildOfficialAlertPoints,
  buildRouteWeatherPoints,
  fetchOfficialDriveHazards,
  fetchRouteWeatherRisks,
  type OfficialDriveHazardAlert,
  type RouteWeatherRisk,
} from '@/lib/driveHazardAlerts';

interface GeocodeResult {
  latitude: number;
  longitude: number;
  name?: string;
}

async function geocodeRoutePoint(queries: string[]): Promise<DeviceCoords | null> {
  for (const rawQuery of queries) {
    const query = rawQuery.trim();
    if (!query) continue;
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = (await response.json()) as { results?: GeocodeResult[] };
      const first = data.results?.[0];
      if (first && Number.isFinite(first.latitude) && Number.isFinite(first.longitude)) {
        return { lat: first.latitude, lng: first.longitude };
      }
    } catch {
      continue;
    }
  }
  return null;
}

function roundedCoordKey(coords?: DeviceCoords | null): string {
  if (!coords) return 'none';
  return `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}`;
}

export function useOfficialDriveHazards(params: {
  enabled?: boolean;
  deviceCoords?: DeviceCoords | null;
  destinationCoords?: DeviceCoords | null;
}) {
  const points = useMemo(
    () => buildOfficialAlertPoints({
      deviceCoords: params.deviceCoords,
      destinationCoords: params.destinationCoords,
    }),
    [params.deviceCoords, params.destinationCoords],
  );

  return useQuery<OfficialDriveHazardAlert[]>({
    queryKey: [
      'official-drive-hazards',
      roundedCoordKey(params.deviceCoords),
      roundedCoordKey(params.destinationCoords),
    ],
    queryFn: () => fetchOfficialDriveHazards(points),
    enabled: params.enabled !== false && points.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function useResolvedDriveHazardCoords(params: {
  enabled?: boolean;
  explicitCoords?: DeviceCoords | null;
  routeAddress?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}) {
  const fallbackQueries = useMemo(
    () => [
      params.routeAddress,
      [params.city, params.state, params.country].filter(Boolean).join(', '),
      [params.city, params.state].filter(Boolean).join(', '),
    ].filter((value): value is string => Boolean(value?.trim())),
    [params.routeAddress, params.city, params.state, params.country],
  );

  return useQuery<DeviceCoords | null>({
    queryKey: ['drive-hazard-route-coords', params.explicitCoords, fallbackQueries],
    queryFn: () => {
      if (params.explicitCoords) return Promise.resolve(params.explicitCoords);
      return geocodeRoutePoint(fallbackQueries);
    },
    enabled: params.enabled !== false && (Boolean(params.explicitCoords) || fallbackQueries.length > 0),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}

export function useDriveRouteWeatherRisks(params: {
  enabled?: boolean;
  originCoords?: DeviceCoords | null;
  destinationCoords?: DeviceCoords | null;
  departureAt?: Date | null;
  durationMinutes?: number | null;
}) {
  const points = useMemo(
    () => buildRouteWeatherPoints({
      originCoords: params.originCoords,
      destinationCoords: params.destinationCoords,
      departureAt: params.departureAt,
      durationMinutes: params.durationMinutes,
    }),
    [params.originCoords, params.destinationCoords, params.departureAt, params.durationMinutes],
  );

  return useQuery<RouteWeatherRisk[]>({
    queryKey: [
      'drive-route-weather-risks',
      roundedCoordKey(params.originCoords),
      roundedCoordKey(params.destinationCoords),
      params.departureAt?.toISOString() ?? 'now',
      params.durationMinutes ?? 'unknown',
    ],
    queryFn: () => fetchRouteWeatherRisks(points),
    enabled: params.enabled !== false && points.length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

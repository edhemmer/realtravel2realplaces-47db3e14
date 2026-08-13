/**
 * Canonical Trip State Hook
 *
 * Offline truth contract:
 * - cloud is authoritative while connected;
 * - saved snapshots retain age metadata;
 * - snapshot age never certifies provider freshness;
 * - no saved snapshot means RT2RP must not imply offline readiness.
 */
import { useMemo, useEffect, useState } from 'react';
import { Trip, Booking, Expense, Parking } from '@/types/database';
import {
  getCanonicalTripState,
  CanonicalTripState,
  CanonicalDateRange,
  CanonicalTimelineEvent,
  CanonicalCostSummary,
  resolveTripDateRange,
  computeTripWindow,
} from '@/lib/canonicalTripState';
import {
  WeatherSnapshot,
  forecastToSnapshots,
  getWeatherForEvent,
  deriveWeatherPills,
  WeatherPill,
} from '@/lib/canonicalWeather';
import { useBookings } from './useBookings';
import { useExpenses } from './useExpenses';
import { useParking } from './useParking';
import { useTripWeather } from './useWeather';
import { useEngagementEvents } from './useTripEvents';
import { useProfileTemperatureUnit } from './useProfileTemperatureUnit';
import {
  saveTripSnapshot,
  loadTripSnapshotRecord,
  type TripSnapshotAgeStatus,
  type TripSnapshotReadResult,
} from '@/lib/offlineTripCache';
import { isOnline, subscribeToNetworkChanges } from '@/lib/networkStatus';

export type { CanonicalTripState, CanonicalDateRange, CanonicalTimelineEvent, CanonicalCostSummary, WeatherSnapshot, WeatherPill };
export { getWeatherForEvent, deriveWeatherPills, resolveTripDateRange, computeTripWindow };
export type CanonicalTripDataSource = 'cloud' | 'offline-cache' | 'session-memory' | 'none';

interface UseCanonicalTripStateResult {
  state: CanonicalTripState | null;
  isLoading: boolean;
  dateRange: CanonicalDateRange | null;
  timelineEvents: CanonicalTimelineEvent[];
  costs: CanonicalCostSummary | null;
  hasFlights: boolean;
  hasStays: boolean;
  hasRentals: boolean;
  hasActivities: boolean;
  hasParking: boolean;
  weatherByKey: Record<string, WeatherSnapshot>;
  isOnline: boolean;
  dataSource: CanonicalTripDataSource;
  isUsingOfflineCache: boolean;
  hasOfflineSnapshot: boolean;
  offlineSnapshotSavedAt: number | null;
  offlineSnapshotAgeMs: number | null;
  offlineSnapshotAgeStatus: TripSnapshotAgeStatus | null;
}

export function useCanonicalTripState(tripId: string, trip: Trip | null): UseCanonicalTripStateResult {
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(tripId);
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(tripId);
  const { data: parkingList = [], isLoading: parkingLoading } = useParking(tripId);
  const { data: engagementEvents = [], isLoading: engagementEventsLoading } = useEngagementEvents(tripId);
  const { unit: tempUnit } = useProfileTemperatureUnit();
  const { tripForecast } = useTripWeather(
    trip?.destination_city || '', trip?.destination_country || '', trip?.start_date || '', trip?.end_date || '', trip?.destination_state || undefined, tempUnit
  );

  const [online, setOnline] = useState(() => isOnline());
  const [cachedSnapshot, setCachedSnapshot] = useState<TripSnapshotReadResult | null>(null);

  useEffect(() => subscribeToNetworkChanges(setOnline), []);

  useEffect(() => {
    setCachedSnapshot(null);
    let cancelled = false;
    void loadTripSnapshotRecord(tripId).then((snapshot) => {
      if (!cancelled) setCachedSnapshot(snapshot);
    });
    return () => { cancelled = true; };
  }, [tripId]);

  const cloudDataLoading = bookingsLoading || expensesLoading || parkingLoading || engagementEventsLoading || !trip;

  const cloudState = useMemo(() => {
    if (!trip) return null;
    const base = getCanonicalTripState(trip, bookings, expenses, parkingList, engagementEvents);
    if (base.framePendingValidation) return base;
    if (tripForecast.length > 0) {
      base.weatherByKey = forecastToSnapshots(
        tripForecast, `dest::${trip.destination_city}`, 'drive', trip.destination_city,
        trip.destination_state || undefined, trip.destination_country,
      );
    }
    return base;
  }, [trip, bookings, expenses, parkingList, engagementEvents, tripForecast]);

  useEffect(() => {
    if (cloudState && !cloudDataLoading && online) void saveTripSnapshot(tripId, cloudState);
  }, [cloudState, cloudDataLoading, online, tripId]);

  let state: CanonicalTripState | null = null;
  let dataSource: CanonicalTripDataSource = 'none';
  if (online && cloudState) {
    state = cloudState;
    dataSource = 'cloud';
  } else if (cachedSnapshot) {
    state = cachedSnapshot.state;
    dataSource = 'offline-cache';
  } else if (!online && cloudState) {
    state = cloudState;
    dataSource = 'session-memory';
  }

  return {
    state,
    isLoading: cloudDataLoading && !state,
    dateRange: state?.dateRange ?? null,
    timelineEvents: state?.timelineEvents ?? [],
    costs: state?.costs ?? null,
    hasFlights: state?.hasFlights ?? false,
    hasStays: state?.hasStays ?? false,
    hasRentals: state?.hasRentals ?? false,
    hasActivities: state?.hasActivities ?? false,
    hasParking: state?.hasParking ?? false,
    weatherByKey: state?.weatherByKey ?? {},
    isOnline: online,
    dataSource,
    isUsingOfflineCache: dataSource === 'offline-cache',
    hasOfflineSnapshot: cachedSnapshot !== null,
    offlineSnapshotSavedAt: cachedSnapshot?.savedAt ?? null,
    offlineSnapshotAgeMs: cachedSnapshot?.ageMs ?? null,
    offlineSnapshotAgeStatus: cachedSnapshot?.ageStatus ?? null,
  };
}

export function useCanonicalTripStateFromData(trip: Trip | null, bookings: Booking[], expenses: Expense[], parkingList: Parking[]): CanonicalTripState | null {
  return useMemo(() => trip ? getCanonicalTripState(trip, bookings, expenses, parkingList) : null, [trip, bookings, expenses, parkingList]);
}

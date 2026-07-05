/**
 * v3.8.16: Canonical Drive Engine Hook
 *
 * Single hook for consuming drive intelligence.
 * Produces a DrivePlan that all Drive UI surfaces consume.
 * Also maintains backward-compatible `signals` for NowCommandCenter alert merging.
 * Recomputes on foreground resume to prevent stale signals.
 */

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { buildDrivePlan, tripToDriveCanonical } from '@/lib/drive/driveIntelligence';
import { computeDriveSignals, type DriveSignal, type DriveEngineInput, type DriveEngineWeatherContext } from '@/lib/driveEngine';
import { useWeatherEngine } from './useWeatherEngine';
import { useCanonicalTripState } from './useCanonicalTripState';
import { useBookings } from './useBookings';
import { useParking } from './useParking';
import { useForegroundResume } from './useForegroundResume';
import { useUserProfile } from './useUserProfile';
import { useIsPro } from './useSubscription';
import { getCachedDeviceLocation } from '@/lib/deviceLocation';
import { getTodayDateOnly } from '@/lib/canonicalTimePolicy';
import { getLocalNowString } from '@/lib/canonicalNextStop';
import { sendImmediateLocalNotification, uuidToNotificationId } from '@/lib/native/localNotifications';
import type { WeatherCondition } from '@/lib/canonicalWeather';
import type { Trip } from '@/types/database';
import type { DrivePlan } from '@/types/drive';

interface UseDriveEngineOptions {
  tripId: string;
  trip: Trip;
  /** Optional weather context for legacy signal system */
  weatherContext?: DriveEngineWeatherContext;
}

interface UseDriveEngineResult {
  /** Canonical DrivePlan — single output for all Drive UI */
  drivePlan: DrivePlan;
  /** Legacy signals for NowCommandCenter alert merging */
  signals: DriveSignal[];
  hasCritical: boolean;
  hasWarning: boolean;
  /** Whether data is still loading */
  isLoading: boolean;
}

const NOTIFIED_KEY_PREFIX = 'rt2rp-drive-signal-notified';

function weatherConditionFromDriveContext(day?: {
  precipTypeHint: 'rain' | 'snow' | 'mixed' | 'unknown';
  windHint: 'calm' | 'breezy' | 'windy' | 'unknown';
  precipPercent: number;
}): WeatherCondition | undefined {
  if (!day) return undefined;
  if (day.precipTypeHint === 'snow') return 'snow';
  if (day.precipTypeHint === 'mixed') return 'sleet';
  if (day.windHint === 'windy') return 'wind';
  if (day.precipTypeHint === 'rain' || day.precipPercent >= 50) return 'rain';
  return undefined;
}

export function useDriveEngine({ tripId, trip, weatherContext }: UseDriveEngineOptions): UseDriveEngineResult {
  const { timelineEvents, isLoading: stateLoading } = useCanonicalTripState(tripId, trip);
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(tripId);
  const { data: parkingList = [] } = useParking(tripId);
  const { weather, isLoading: weatherLoading } = useWeatherEngine(trip, bookings);
  const { data: userProfile } = useUserProfile();
  const isPro = useIsPro();

  const [resumeTick, setResumeTick] = useState(0);
  useForegroundResume(() => setResumeTick((t) => t + 1));

  const computedWeatherContext = useMemo<DriveEngineWeatherContext | undefined>(() => {
    const todayDate = getTodayDateOnly();
    const todayWeather = weather?.envelope.find((day) => day.dateISO === todayDate);
    const todayCondition = weatherConditionFromDriveContext(todayWeather);
    const routeLabel = trip.destination_city
      ? `the route to ${trip.destination_city}`
      : trip.destination_address
        ? 'your drive route'
        : 'your route';

    if (!todayCondition && todayWeather?.precipPercent == null) return weatherContext;

    return {
      todayCondition: weatherContext?.todayCondition ?? todayCondition,
      todayPrecipChance: weatherContext?.todayPrecipChance ?? todayWeather?.precipPercent,
      routeLabel: weatherContext?.routeLabel ?? routeLabel,
    };
  }, [trip.destination_address, trip.destination_city, weather, weatherContext]);

  // v3.8.16 + v3.10.9: DrivePlan output with fuel intelligence gating
  const drivePlan = useMemo(() => {
    const canonical = tripToDriveCanonical(trip);
    return buildDrivePlan({
      canonical,
      weather,
      isPro,
      avgMilesPerTank: userProfile?.avg_miles_per_tank,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, bookings, weather, resumeTick, isPro, userProfile?.avg_miles_per_tank]);

  // Legacy signals for NowCommandCenter alert merging
  const signals = useMemo(() => {
    if (stateLoading) return [];
    const input: DriveEngineInput = {
      trip,
      bookings,
      parkingList,
      canonicalTimelineEvents: timelineEvents,
      deviceLocationCoords: getCachedDeviceLocation(),
      weatherContext: computedWeatherContext,
      todayDateOnly: getTodayDateOnly(),
      nowLocal: getLocalNowString(),
    };
    return computeDriveSignals(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, bookings, parkingList, timelineEvents, computedWeatherContext, stateLoading, resumeTick]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const criticalSignal = signals.find(
      (signal) => signal.type === 'WEATHER_ROUTE_RISK' && signal.severity === 'critical',
    );
    if (!criticalSignal) return;

    const notifyKey = `${NOTIFIED_KEY_PREFIX}:${trip.id}:${criticalSignal.id}`;
    if (window.localStorage.getItem(notifyKey)) return;
    window.localStorage.setItem(notifyKey, new Date().toISOString());

    const title = 'Route weather alert';
    const body = `${criticalSignal.message} Check alternatives before you drive.`;

    void sendImmediateLocalNotification({
      id: uuidToNotificationId(criticalSignal.id),
      title,
      body,
      extra: {
        tripId: trip.id,
        type: criticalSignal.type,
      },
    });

    toast.error(title, {
      description: body,
      duration: 15000,
    });
  }, [signals, trip.id]);

  return {
    drivePlan,
    signals,
    hasCritical: signals.some(s => s.severity === 'critical'),
    hasWarning: signals.some(s => s.severity === 'warning'),
    isLoading: stateLoading || bookingsLoading || weatherLoading,
  };
}

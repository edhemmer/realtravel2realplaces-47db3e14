/**
 * v3.8.16: Canonical Drive Engine Hook
 *
 * Single hook for consuming drive intelligence.
 * Produces a DrivePlan that all Drive UI surfaces consume.
 * Also maintains backward-compatible `signals` for NowCommandCenter alert merging.
 * Recomputes on foreground resume to prevent stale signals.
 */

import { useMemo, useState } from 'react';
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

export function useDriveEngine({ tripId, trip, weatherContext }: UseDriveEngineOptions): UseDriveEngineResult {
  const { timelineEvents, isLoading: stateLoading } = useCanonicalTripState(tripId, trip);
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(tripId);
  const { data: parkingList = [] } = useParking(tripId);
  const { weather, isLoading: weatherLoading } = useWeatherEngine(trip, bookings);
  const { data: userProfile } = useUserProfile();
  const isPro = useIsPro();

  const [resumeTick, setResumeTick] = useState(0);
  useForegroundResume(() => setResumeTick((t) => t + 1));

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
      weatherContext,
      todayDateOnly: getTodayDateOnly(),
      nowLocal: getLocalNowString(),
    };
    return computeDriveSignals(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, bookings, parkingList, timelineEvents, weatherContext, stateLoading, resumeTick]);

  return {
    drivePlan,
    signals,
    hasCritical: signals.some(s => s.severity === 'critical'),
    hasWarning: signals.some(s => s.severity === 'warning'),
    isLoading: stateLoading || bookingsLoading || weatherLoading,
  };
}

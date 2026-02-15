/**
 * v3.12.0: Canonical Drive Engine Hook
 *
 * Single hook for consuming drive intelligence signals.
 * All drive-related UI surfaces must use this hook — no duplicated rules.
 *
 * Recomputes on foreground resume to prevent stale signals.
 */

import { useMemo, useState } from 'react';
import { computeDriveSignals, type DriveSignal, type DriveEngineInput, type DriveEngineWeatherContext } from '@/lib/driveEngine';
import { useCanonicalTripState } from './useCanonicalTripState';
import { useBookings } from './useBookings';
import { useParking } from './useParking';
import { useForegroundResume } from './useForegroundResume';
import { getCachedDeviceLocation } from '@/lib/deviceLocation';
import { getTodayDateOnly } from '@/lib/canonicalTimePolicy';
import { getLocalNowString } from '@/lib/canonicalNextStop';
import type { Trip } from '@/types/database';
import type { DriveRouteMeta } from '@/types/drive';

interface UseDriveEngineOptions {
  tripId: string;
  trip: Trip;
  /** Optional weather context — only pass if already fetched */
  weatherContext?: DriveEngineWeatherContext;
  /** Optional route metadata — only pass if already resolved */
  routeMeta?: DriveRouteMeta;
}

interface UseDriveEngineResult {
  signals: DriveSignal[];
  hasCritical: boolean;
  hasWarning: boolean;
  isLoading: boolean;
}

export function useDriveEngine({ tripId, trip, weatherContext }: UseDriveEngineOptions): UseDriveEngineResult {
  const { timelineEvents, isLoading } = useCanonicalTripState(tripId, trip);
  const { data: bookings = [] } = useBookings(tripId);
  const { data: parkingList = [] } = useParking(tripId);

  const [resumeTick, setResumeTick] = useState(0);
  useForegroundResume(() => setResumeTick((t) => t + 1));

  const signals = useMemo(() => {
    if (isLoading) return [];

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
  }, [trip, bookings, parkingList, timelineEvents, weatherContext, isLoading, resumeTick]);

  return {
    signals,
    hasCritical: signals.some(s => s.severity === 'critical'),
    hasWarning: signals.some(s => s.severity === 'warning'),
    isLoading,
  };
}

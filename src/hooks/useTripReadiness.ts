/**
 * v3.12.0: useTripReadiness — Hook for consuming Trip Readiness Brief
 *
 * Wires canonical hooks into the readiness engine.
 * No network I/O in the engine itself.
 */

import { useMemo } from 'react';
import { Trip } from '@/types/database';
import { useCanonicalTripState } from './useCanonicalTripState';
import { useWeatherEngine } from './useWeatherEngine';
import { useBookings } from './useBookings';
import { useCompanions } from './useCompanions';
import { useUserProfile } from './useUserProfile';
import { useAccess } from './useAccess';
import { useDriveEngine } from './useDriveEngine';
import { buildTripReadinessBrief, type TripReadinessBrief } from '@/lib/tripReadiness/tripReadinessEngine';
import { resolveEffectiveTier } from '@/utils/planTier';

interface UseTripReadinessResult {
  brief: TripReadinessBrief | null;
  isLoading: boolean;
}

export function useTripReadiness(tripId: string, trip: Trip | null): UseTripReadinessResult {
  const { timelineEvents, dateRange, hasFlights, isLoading: stateLoading } = useCanonicalTripState(tripId, trip);
  const { data: bookings = [] } = useBookings(tripId);
  const { weather, isLoading: weatherLoading } = useWeatherEngine(trip, bookings);
  const { data: companions = [] } = useCompanions(tripId);
  const { data: userProfile } = useUserProfile();
  const { isPro } = useAccess();

  const transportationMode = (trip as any)?.transportation_mode || 'unspecified';
  const isDrive = transportationMode === 'drive';

  // Only use drive engine for drive trips
  const { drivePlan } = useDriveEngine({
    tripId,
    trip: trip!,
  });

  const planTier = resolveEffectiveTier({
    subscriptionTier: userProfile?.subscription_tier as any,
  });

  const brief = useMemo(() => {
    if (!trip) return null;

    return buildTripReadinessBrief({
      tripId,
      tripStartDate: trip.start_date,
      tripEndDate: trip.end_date,
      timelineEvents,
      dateRange,
      weather,
      drivePlan: isDrive ? drivePlan : null,
      planTier,
      transportationMode,
      hasFlights,
      companionNames: companions.map(c => c.name),
      avgMilesPerTank: userProfile?.avg_miles_per_tank,
    });
  }, [
    trip, tripId, timelineEvents, dateRange, weather,
    drivePlan, isDrive, planTier, transportationMode,
    hasFlights, companions, userProfile?.avg_miles_per_tank,
  ]);

  return {
    brief,
    isLoading: stateLoading || weatherLoading,
  };
}

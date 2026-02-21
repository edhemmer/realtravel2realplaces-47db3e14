/**
 * DesktopTripShell — Canonical desktop trip context provider
 * 
 * v2.6.12: Desktop SaaS Hardening — single owner of shared trip state
 * 
 * This shell is the SINGLE source of truth for desktop trip views.
 * It fetches and computes shared state ONCE, then provides it via context
 * so tab containers don't recompute canonical state or alerts independently.
 * 
 * OWNS:
 * - Canonical trip state (dates, timeline, costs, weather) via useCanonicalTripState
 * - Travel alerts/intelligence via useTravelAlerts
 * - Access state (plan tier, feature flags)
 * - Shared raw data references (bookings, expenses, parking)
 * 
 * ARCHITECTURE:
 * TripDetail (desktop) → DesktopTripShell → Tabs → Containers → Views
 * 
 * GUARDRAILS:
 * - React Query deduplicates raw data fetches by queryKey
 * - Canonical state computed once via useMemo, not per-tab
 * - Alerts computed once, shared across Summary and Alerts tab
 * - Stable context value via useMemo to prevent rerender cascades
 */

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { Trip, Booking, Expense, Parking } from '@/types/database';
import { useBookings } from '@/hooks/useBookings';
import { useExpenses } from '@/hooks/useExpenses';
import { useParking } from '@/hooks/useParking';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAccess } from '@/hooks/useAccess';
import {
  useCanonicalTripState,
  type CanonicalTripState,
  type CanonicalCostSummary,
  type CanonicalTimelineEvent,
  type CanonicalDateRange,
  type WeatherSnapshot,
} from '@/hooks/useCanonicalTripState';
import { useTravelAlerts, type TravelAlert } from '@/hooks/useTravelAlerts';
import { useFlightAirportRepair } from '@/hooks/useFlightAirportRepair';
import { useBookingExpenseSync } from '@/hooks/useBookingExpenseSync';
/**
 * Shared state provided by DesktopTripShell to all child tabs.
 * Containers should consume this instead of fetching/computing independently.
 */
export interface DesktopTripShellState {
  /** The active trip record */
  trip: Trip;
  tripId: string;

  /** Raw data — React Query deduplicated */
  bookings: Booking[];
  expenses: Expense[];
  parkingList: Parking[];

  /** Canonical computed state (single computation) */
  canonicalState: CanonicalTripState | null;
  dateRange: CanonicalDateRange | null;
  timelineEvents: CanonicalTimelineEvent[];
  costs: CanonicalCostSummary | null;
  weatherByKey: Record<string, WeatherSnapshot>;
  hasFlights: boolean;
  hasStays: boolean;
  hasRentals: boolean;
  hasActivities: boolean;
  hasParking: boolean;

  /** Intelligence surface — alerts computed once */
  alerts: TravelAlert[];
  hasAlerts: boolean;
  criticalAlertCount: number;

  /** Access state */
  isPro: boolean;
  canAccessBusinessFeatures: boolean;

  /** Loading states */
  isLoading: boolean;
  isCanonicalLoading: boolean;
  isAlertsLoading: boolean;
}

const DesktopTripShellContext = createContext<DesktopTripShellState | null>(null);

/**
 * Hook to consume shell-provided state.
 * Returns null if not inside a DesktopTripShell (e.g. mobile path).
 * Containers should check for null and fall back to own hooks if needed.
 */
export function useDesktopTripShell(): DesktopTripShellState | null {
  return useContext(DesktopTripShellContext);
}

interface DesktopTripShellProps {
  tripId: string;
  trip: Trip;
  children: ReactNode;
}

/**
 * Desktop-only shell that provides canonical trip state to all child tabs.
 * Wraps the desktop Tabs section in TripDetail.
 */
export function DesktopTripShell({ tripId, trip, children }: DesktopTripShellProps) {
  // Access state — computed once
  const { isPro, canAccessBusinessFeatures } = useAccess();
  const { data: userProfile } = useUserProfile();

  // Raw data fetches — React Query deduplicates by queryKey
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(tripId);
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(tripId);
  const { data: parkingList = [], isLoading: parkingLoading } = useParking(tripId);

  // Temperature unit
  const temperatureUnit = (userProfile?.temperature_unit as 'fahrenheit' | 'celsius') || 'fahrenheit';

  // Canonical trip state — computed ONCE for all tabs
  const {
    state: canonicalState,
    isLoading: isCanonicalLoading,
    dateRange,
    timelineEvents,
    costs,
    hasFlights,
    hasStays,
    hasRentals,
    hasActivities,
    hasParking,
    weatherByKey,
  } = useCanonicalTripState(tripId, trip);

  // Intelligence surface — alerts computed ONCE for all tabs
  const {
    alerts,
    hasAlerts,
    criticalCount,
    weatherLoading: isAlertsLoading,
  } = useTravelAlerts(trip, bookings, parkingList, temperatureUnit);

  const isLoading = bookingsLoading || expensesLoading || parkingLoading;

  // v3.13.5: Safe repair of corrupted airport codes on active/upcoming trips
  useFlightAirportRepair(tripId, trip.end_date, bookings);

  // v4.9.5: Canonical retroactive booking→expense repair at shell level
  const homeCurrency = userProfile?.preferred_currency || 'USD';
  useBookingExpenseSync({
    tripId,
    bookings,
    expenses,
    bookingsLoading,
    expensesLoading: expensesLoading,
    homeCurrency,
  });

  // v2.6.12: Stable context value — only recomputes when underlying data changes
  const shellState = useMemo<DesktopTripShellState>(() => ({
    trip,
    tripId,
    bookings,
    expenses,
    parkingList,
    canonicalState,
    dateRange,
    timelineEvents,
    costs,
    weatherByKey,
    hasFlights,
    hasStays,
    hasRentals,
    hasActivities,
    hasParking,
    alerts,
    hasAlerts,
    criticalAlertCount: criticalCount,
    isPro,
    canAccessBusinessFeatures,
    isLoading,
    isCanonicalLoading,
    isAlertsLoading,
  }), [
    trip, tripId,
    bookings, expenses, parkingList,
    canonicalState, dateRange, timelineEvents, costs, weatherByKey,
    hasFlights, hasStays, hasRentals, hasActivities, hasParking,
    alerts, hasAlerts, criticalCount,
    isPro, canAccessBusinessFeatures,
    isLoading, isCanonicalLoading, isAlertsLoading,
  ]);

  return (
    <DesktopTripShellContext.Provider value={shellState}>
      {children}
    </DesktopTripShellContext.Provider>
  );
}

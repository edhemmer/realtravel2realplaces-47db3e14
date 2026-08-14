import type { Trip, Booking, Expense, Parking } from '@/types/database';
import type { CanonicalTripState } from '@/lib/canonicalTripState';
import type { TravelAlert } from '@/hooks/useTravelAlerts';

interface TripCommandLoopProps {
  tripId: string;
  trip: Trip;
  canonicalState: CanonicalTripState;
  bookings: Booking[];
  expenses: Expense[];
  parkingList: Parking[];
  alerts: TravelAlert[];
  onExplore?: () => void;
  onDrillThrough?: (target: { tab: 'bookings' | 'parking' | 'expenses'; recordId?: string } | null) => void;
}

/**
 * The former command-loop surface derived readiness scores, movement readiness,
 * automated-guidance language, and watch-state claims from incomplete evidence.
 * It remains hidden until those contracts are implemented and validated end-to-end.
 */
export function TripCommandLoop(_props: TripCommandLoopProps) {
  return null;
}

import type { Booking, Trip } from '@/types/database';
import type { TravelAlert } from '@/hooks/useTravelAlerts';

export function normalizeFlightNumber(value?: string | null): string | null {
  const normalized = value?.replace(/\s/g, '').toUpperCase();
  return normalized && /^[A-Z0-9]{2,3}\d{1,5}$/.test(normalized) ? normalized : null;
}

/**
 * Legacy parser retained only for regression/reference while booking-level
 * flight identity is not canonical. A value inferred from free-form notes is
 * not strong enough evidence to drive provider status requests.
 */
export function resolveBookingFlightNumber(booking: Booking): string | null {
  if (booking.booking_type !== 'flight' || !booking.notes) return null;
  const match = booking.notes.match(/(?:flight\s*#?\s*)?([A-Z]{2}\s*\d+)/i);
  return normalizeFlightNumber(match?.[1]);
}

/**
 * Provider-backed disruption monitoring is intentionally withheld.
 *
 * The bookings schema and get_bookings_safe RPC do not currently carry a
 * canonical booking-level flight number. Polling a live provider from a value
 * guessed out of notes can query the wrong flight, waste provider calls, and
 * create false operational confidence. Re-enable only after flight identity is
 * persisted, returned through the secure booking read contract, and validated
 * end-to-end.
 */
export function useFlightDisruptionAlerts(
  _trip: Trip | null,
  _bookings: Booking[]
): {
  alerts: TravelAlert[];
  isLoading: boolean;
} {
  return {
    alerts: [],
    isLoading: false,
  };
}

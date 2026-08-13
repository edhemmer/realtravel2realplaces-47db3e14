import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { differenceInHours, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Booking, Trip } from '@/types/database';
import type { FlightStatusResult } from '@/hooks/useFlightStatus';
import type { TravelAlert } from '@/hooks/useTravelAlerts';

const OBSERVE_START_HOURS = 6;
const OBSERVE_END_HOURS = -3;

export function normalizeFlightNumber(value?: string | null): string | null {
  const normalized = value?.replace(/\s/g, '').toUpperCase();
  return normalized && /^[A-Z0-9]{2,3}\d{1,5}$/.test(normalized) ? normalized : null;
}

/**
 * Flight Summary already distinguishes flight number from confirmation number.
 * Keep provider identity equally strict: only a flight-number-shaped value
 * explicitly present in flight notes is eligible for a status lookup.
 */
export function resolveBookingFlightNumber(booking: Booking): string | null {
  if (booking.booking_type !== 'flight' || !booking.notes) return null;
  const match = booking.notes.match(/(?:flight\s*#?\s*)?([A-Z]{2}\s*\d+)/i);
  return normalizeFlightNumber(match?.[1]);
}

function departureDate(value?: string | null): string | null {
  return value && value.length >= 10 ? value.substring(0, 10) : null;
}

function isObservationWindow(value?: string | null): boolean {
  if (!value) return false;
  const departure = parseISO(value);
  if (!Number.isFinite(departure.getTime())) return false;
  const hoursUntil = differenceInHours(departure, new Date());
  return hoursUntil <= OBSERVE_START_HOURS && hoursUntil >= OBSERVE_END_HOURS;
}

export function useFlightDisruptionAlerts(trip: Trip | null, bookings: Booking[]): {
  alerts: TravelAlert[];
  isLoading: boolean;
} {
  const flights = useMemo(() => {
    if (!trip) return [];
    return bookings
      .filter((booking) => booking.booking_type === 'flight')
      .map((booking) => ({
        booking,
        flightNumber: resolveBookingFlightNumber(booking),
        date: departureDate(booking.start_datetime),
      }))
      .filter((entry) => entry.flightNumber && entry.date && isObservationWindow(entry.booking.start_datetime))
      .slice(0, 4);
  }, [bookings, trip]);

  const queries = useQueries({
    queries: flights.map((entry) => ({
      queryKey: ['flight-disruption-observation', entry.booking.id, entry.flightNumber, entry.date],
      queryFn: async (): Promise<FlightStatusResult> => {
        const { data, error } = await supabase.functions.invoke('flight-status', {
          body: { flightNumber: entry.flightNumber, departureDate: entry.date },
        });
        if (error) throw new Error(error.message || 'Flight status request failed');
        return (data || { signal: null }) as FlightStatusResult;
      },
      staleTime: 2 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
    })),
  });

  const alerts = useMemo<TravelAlert[]>(() => {
    if (!trip) return [];
    return queries.flatMap((query, index) => {
      const signal = query.data?.signal;
      const booking = flights[index]?.booking;
      if (!signal || !booking) return [];

      const route = [booking.departure_airport_code, booking.arrival_airport_code]
        .filter(Boolean)
        .join(' to ');
      const prefix = route ? `${route}: ` : '';
      const message = signal.type === 'cancellation'
        ? `${prefix}RT2RP found a cancellation signal. Check official airline or airport information.`
        : signal.type === 'gate_change'
          ? `${prefix}RT2RP found a gate-change signal. Check the airport board and official flight status.`
          : `${prefix}RT2RP found a delay signal. Recheck official timing before moving.`;

      return [{
        id: `flight-disruption-${booking.id}-${signal.type}`,
        type: 'flight_disruption',
        severity: signal.type === 'cancellation' ? 'critical' : 'warning',
        title: signal.type === 'cancellation'
          ? `Flight ${signal.flightNumber} may be cancelled`
          : signal.type === 'gate_change'
            ? `Flight ${signal.flightNumber} gate may have changed`
            : `Flight ${signal.flightNumber} may be delayed`,
        message,
        actionLabel: 'Open Airport',
        actionUrl: `/trip/${trip.id}?tab=airport`,
        relatedId: booking.id,
        timestamp: new Date(),
      }];
    });
  }, [flights, queries, trip]);

  return {
    alerts,
    isLoading: queries.some((query) => query.isLoading || query.isFetching),
  };
}

import { useEffect, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { differenceInHours, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Booking, Trip } from '@/types/database';
import type { FlightStatusResult, FlightStatusSignal } from '@/hooks/useFlightStatus';
import type { TravelAlert } from '@/hooks/useTravelAlerts';
import { sendImmediateLocalNotification, uuidToNotificationId } from '@/lib/native/localNotifications';

const NOTIFIED_KEY_PREFIX = 'rt2rp-flight-disruption-notified';
const MONITOR_START_HOURS = 6;
const MONITOR_END_HOURS = -3;

function normalizeFlightNumber(value?: string | null): string | null {
  const flight = value?.replace(/\s/g, '').toUpperCase();
  return flight && /^[A-Z0-9]{2,3}\d{1,5}$/.test(flight) ? flight : null;
}

function flightNumber(booking: Booking): string | null {
  return normalizeFlightNumber((booking as any).flight_number || booking.confirmation_number || booking.vendor_name);
}

function departureDate(value?: string | null): string | null {
  return value && value.length >= 10 ? value.substring(0, 10) : null;
}

function isMonitorWindow(startDateTime?: string | null): boolean {
  if (!startDateTime) return false;
  const departure = parseISO(startDateTime);
  if (!Number.isFinite(departure.getTime())) return false;
  const hoursUntil = differenceInHours(departure, new Date());
  return hoursUntil <= MONITOR_START_HOURS && hoursUntil >= MONITOR_END_HOURS;
}

function signalTitle(signal: FlightStatusSignal): string {
  if (signal.type === 'cancellation') return `Flight ${signal.flightNumber} may be cancelled`;
  if (signal.type === 'gate_change') return `Flight ${signal.flightNumber} gate may have changed`;
  return `Flight ${signal.flightNumber} may be delayed`;
}

function signalMessage(signal: FlightStatusSignal, booking: Booking): string {
  const route = [booking.departure_airport_code, booking.arrival_airport_code].filter(Boolean).join(' to ');
  if (signal.type === 'cancellation') {
    return `${route ? `${route}: ` : ''}RT2RP found a cancellation signal. Stop and review official options now.`;
  }
  if (signal.type === 'gate_change') {
    return `${route ? `${route}: ` : ''}RT2RP found a gate-change signal. Check the airport board and official flight status.`;
  }
  return `${route ? `${route}: ` : ''}RT2RP found a delay signal. Recheck timing before moving.`;
}

function notifiedKey(tripId: string, bookingId: string, signal: FlightStatusSignal): string {
  return `${NOTIFIED_KEY_PREFIX}:${tripId}:${bookingId}:${signal.type}:${signal.flightNumber}`;
}

function hasAlreadyNotified(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function markNotified(key: string): void {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // Ignore storage failures; duplicate prevention is best-effort.
  }
}

export function useFlightDisruptionAlerts(trip: Trip | null, bookings: Booking[]): {
  alerts: TravelAlert[];
  isLoading: boolean;
} {
  const monitoredFlights = useMemo(() => {
    if (!trip) return [];
    return bookings
      .filter((booking) => booking.booking_type === 'flight')
      .map((booking) => ({
        booking,
        flightNumber: flightNumber(booking),
        departureDate: departureDate(booking.start_datetime),
        enabled: isMonitorWindow(booking.start_datetime),
      }))
      .filter((entry) => entry.flightNumber && entry.departureDate && entry.enabled)
      .slice(0, 4);
  }, [bookings, trip]);

  const statusQueries = useQueries({
    queries: monitoredFlights.map((entry) => ({
      queryKey: ['flight-disruption-watch', entry.booking.id, entry.flightNumber, entry.departureDate],
      queryFn: async (): Promise<FlightStatusResult> => {
        const { data, error } = await supabase.functions.invoke('flight-status', {
          body: { flightNumber: entry.flightNumber, departureDate: entry.departureDate },
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

  const alerts = useMemo((): TravelAlert[] => {
    if (!trip) return [];

    return statusQueries.flatMap((query, index) => {
      const signal = query.data?.signal;
      const booking = monitoredFlights[index]?.booking;
      if (!signal || !booking) return [];

      return [{
        id: `flight-disruption-${booking.id}-${signal.type}`,
        type: 'flight_disruption',
        severity: signal.type === 'cancellation' ? 'critical' : 'warning',
        title: signalTitle(signal),
        message: signalMessage(signal, booking),
        actionLabel: 'Open Airport',
        actionUrl: `/trip/${trip.id}?tab=airport`,
        relatedId: booking.id,
        timestamp: new Date(),
      }];
    });
  }, [monitoredFlights, statusQueries, trip]);

  useEffect(() => {
    if (!trip) return;

    statusQueries.forEach((query, index) => {
      const signal = query.data?.signal;
      const booking = monitoredFlights[index]?.booking;
      if (!signal || !booking || signal.type !== 'cancellation') return;

      const key = notifiedKey(trip.id, booking.id, signal);
      if (hasAlreadyNotified(key)) return;
      markNotified(key);

      const title = `Flight ${signal.flightNumber} may be cancelled`;
      const body = signalMessage(signal, booking);
      void sendImmediateLocalNotification({
        id: uuidToNotificationId(key),
        title,
        body,
        extra: {
          tripId: trip.id,
          bookingId: booking.id,
          tab: 'airport',
          signal: signal.type,
        },
      });
      toast.error(title, {
        description: body,
        duration: 15000,
      });
    });
  }, [monitoredFlights, statusQueries, trip]);

  return {
    alerts,
    isLoading: statusQueries.some((query) => query.isLoading || query.isFetching),
  };
}

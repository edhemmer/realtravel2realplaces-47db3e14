/**
 * useNativeDepartureSync
 *
 * Schedules on-device departure reminders for upcoming transport bookings
 * (flights, trains, buses, ferries) via Capacitor LocalNotifications.
 *
 * Per booking, schedules up to 3 reminders:
 *   1. Advance heads-up — `start_datetime − departure_hours_before`
 *      (default 24h). Skipped if heads-up window <= 1h.
 *   2. Day-of leave reminder — `start_datetime − 3h` (flights) or `−45m`
 *      (train/bus/ferry).
 *   3. Final call — `start_datetime − 45m` (flights only).
 *
 * Web = zero-op (isNativePlatform guard inside reconcileLocalReminders).
 * Honors `notification_preferences.departure_enabled` +
 * `departure_hours_before`. iOS cap of 64 pending notifications is respected
 * by capping to 21 upcoming bookings × 3.
 *
 * No-Math Time Policy: uses raw start_datetime ISO string from DB. The iOS
 * scheduler handles wall-clock display in the device's local TZ.
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isNativePlatform } from '@/lib/native/platform';
import { useNotificationPreferences } from './useNotificationPreferences';
import {
  reconcileLocalReminders,
  uuidToNotificationId,
  type ScheduledReminder,
} from '@/lib/native/localNotifications';

interface DepartureBookingRow {
  id: string;
  trip_id: string;
  booking_type: string;
  transport_mode: string | null;
  vendor_name: string | null;
  start_datetime: string;
  from_location: string | null;
  to_location: string | null;
  departure_airport_code: string | null;
  arrival_airport_code: string | null;
}

const MAX_BOOKINGS = 21; // 21 × 3 = 63 (< iOS 64 cap)

const TRANSPORT_MODES = new Set(['train', 'bus', 'ferry']);

function isTransportBooking(b: DepartureBookingRow): boolean {
  if (b.booking_type === 'flight') return true;
  if (b.booking_type === 'transport' && b.transport_mode) {
    return TRANSPORT_MODES.has(b.transport_mode);
  }
  return false;
}

function modeLabel(b: DepartureBookingRow): string {
  if (b.booking_type === 'flight') return 'flight';
  return b.transport_mode ?? 'departure';
}

function shortRoute(b: DepartureBookingRow): string | null {
  const from = b.departure_airport_code ?? b.from_location ?? null;
  const to = b.arrival_airport_code ?? b.to_location ?? null;
  if (from && to) return `${from} → ${to}`;
  if (to) return `to ${to}`;
  return null;
}

function vendorOrMode(b: DepartureBookingRow): string {
  return b.vendor_name?.trim() || modeLabel(b);
}

function useUpcomingTransportBookings(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['native-departure-sync', 'bookings', user?.id],
    enabled: enabled && !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      // Only bookings on trips the user owns (RLS handles guests fine, but
      // we deliberately scope to owned trips to avoid notifying guests
      // about every shared trip booking).
      const { data, error } = await supabase
        .from('bookings')
        .select(
          'id, trip_id, booking_type, transport_mode, vendor_name, start_datetime, from_location, to_location, departure_airport_code, arrival_airport_code, trip:trips!inner(user_id)',
        )
        .eq('trip.user_id', user!.id)
        .gte('start_datetime', nowIso)
        .order('start_datetime', { ascending: true })
        .limit(60); // overfetch; we filter then cap
      if (error) throw error;

      const rows = ((data ?? []) as unknown as DepartureBookingRow[])
        .filter(isTransportBooking)
        .slice(0, MAX_BOOKINGS);
      return rows;
    },
  });
}

interface BuildOpts {
  headsUpHours: number;
}

function buildRemindersForBooking(
  b: DepartureBookingRow,
  opts: BuildOpts,
): ScheduledReminder[] {
  const departure = new Date(b.start_datetime);
  if (Number.isNaN(departure.getTime())) return [];

  const out: ScheduledReminder[] = [];
  const route = shortRoute(b);
  const vendor = vendorOrMode(b);
  const isFlight = b.booking_type === 'flight';

  const extra = {
    tripId: b.trip_id,
    bookingId: b.id,
    tab: 'bookings',
  };

  // 1. Advance heads-up
  const headsUpMs = Math.max(1, opts.headsUpHours) * 60 * 60 * 1000;
  if (headsUpMs > 60 * 60 * 1000) {
    const at = new Date(departure.getTime() - headsUpMs);
    out.push({
      id: uuidToNotificationId(`${b.id}:heads-up`),
      title: `${vendor} ${isFlight ? 'flight' : 'departure'} coming up`,
      body: route ?? `Departs ${departure.toLocaleString()}`,
      at,
      extra,
    });
  }

  // 2. Day-of leave reminder
  const leadMs = isFlight ? 3 * 60 * 60 * 1000 : 45 * 60 * 1000;
  out.push({
    id: uuidToNotificationId(`${b.id}:leave`),
    title: isFlight
      ? `Time to head to the airport`
      : `Time to head to your ${modeLabel(b)}`,
    body: route ? `${vendor} · ${route}` : vendor,
    at: new Date(departure.getTime() - leadMs),
    extra,
  });

  // 3. Final call — flights only
  if (isFlight) {
    out.push({
      id: uuidToNotificationId(`${b.id}:final`),
      title: `Boarding soon — ${vendor}`,
      body: route ?? 'Departure in 45 minutes',
      at: new Date(departure.getTime() - 45 * 60 * 1000),
      extra,
    });
  }

  return out;
}

export function useNativeDepartureSync(): void {
  const native = isNativePlatform();
  const { data: prefs } = useNotificationPreferences();

  const enabled = native && (prefs?.departure_enabled ?? true);
  const headsUpHours = prefs?.departure_hours_before ?? 24;

  const { data: bookings } = useUpcomingTransportBookings(enabled);

  useEffect(() => {
    if (!native) return;
    if (!enabled) {
      void reconcileLocalReminders('departure', []);
      return;
    }
    if (!bookings) return;

    const desired = bookings.flatMap((b) =>
      buildRemindersForBooking(b, { headsUpHours }),
    );

    void reconcileLocalReminders('departure', desired);
  }, [native, enabled, bookings, headsUpHours]);
}

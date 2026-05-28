/**
 * useNativeReminderSync
 *
 * Bridges the existing reminder rows (stop_reminders + ticket_reminders) to
 * the iOS/Android OS scheduler via Capacitor LocalNotifications.
 *
 * Runs only on native platforms — web returns immediately.
 *
 * Reconciliation triggers:
 *  - On mount (after auth)
 *  - When reminder rows change (react-query cache invalidation)
 *  - On app foreground resume (visibilitychange — already dispatched by
 *    nativeBootstrap when the OS reports appStateChange.isActive)
 *
 * Respects user notification_preferences toggles:
 *  - stop_reminder_enabled — controls stop reminders
 *  - ticket_reminder_enabled — controls ticket reminders
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isNativePlatform } from '@/lib/native/platform';
import { useNotificationPreferences } from './useNotificationPreferences';
import {
  ensureLocalNotificationPermission,
  reconcileLocalReminders,
  uuidToNotificationId,
  type ScheduledReminder,
} from '@/lib/native/localNotifications';

interface StopReminderRow {
  id: string;
  engagement_id: string;
  trip_id: string;
  reminder_datetime: string;
  reminder_sent: boolean;
}

interface TicketReminderRow {
  id: string;
  booking_id: string;
  trip_id: string;
  reminder_date: string;
  reminder_sent: boolean;
}

interface EngagementLookup {
  id: string;
  title: string | null;
  location_name: string | null;
}

interface BookingLookup {
  id: string;
  vendor_name: string | null;
}

/**
 * Fetch unsent, future stop reminders for the current user (plus titles
 * from trip_engagements). Native only — disabled on web.
 */
function useStopReminderRows(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['native-reminder-sync', 'stops', user?.id],
    enabled: enabled && !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user?.id) return { reminders: [], engagements: new Map<string, EngagementLookup>() };

      const nowIso = new Date().toISOString();
      const { data: reminders, error } = await supabase
        .from('stop_reminders')
        .select('id, engagement_id, trip_id, reminder_datetime, reminder_sent')
        .eq('user_id', user.id)
        .eq('reminder_sent', false)
        .gte('reminder_datetime', nowIso)
        .limit(64);
      if (error) throw error;

      const rows = (reminders ?? []) as StopReminderRow[];
      const engagementIds = [...new Set(rows.map((r) => r.engagement_id))];
      const engagements = new Map<string, EngagementLookup>();

      if (engagementIds.length > 0) {
        const { data: engRows } = await supabase
          .from('trip_engagements')
          .select('id, title, location_name')
          .in('id', engagementIds);
        for (const e of (engRows ?? []) as EngagementLookup[]) {
          engagements.set(e.id, e);
        }
      }

      return { reminders: rows, engagements };
    },
  });
}

/**
 * Fetch unsent, future ticket reminders for the current user (plus vendor
 * names from bookings). Native only.
 */
function useTicketReminderRows(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['native-reminder-sync', 'tickets', user?.id],
    enabled: enabled && !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user?.id) return { reminders: [], bookings: new Map<string, BookingLookup>() };

      const today = new Date().toISOString().slice(0, 10);
      const { data: reminders, error } = await supabase
        .from('ticket_reminders')
        .select('id, booking_id, trip_id, reminder_date, reminder_sent')
        .eq('user_id', user.id)
        .eq('reminder_sent', false)
        .gte('reminder_date', today)
        .limit(64);
      if (error) throw error;

      const rows = (reminders ?? []) as TicketReminderRow[];
      const bookingIds = [...new Set(rows.map((r) => r.booking_id))];
      const bookings = new Map<string, BookingLookup>();

      if (bookingIds.length > 0) {
        const { data: bookingRows } = await supabase
          .from('bookings')
          .select('id, vendor_name')
          .in('id', bookingIds);
        for (const b of (bookingRows ?? []) as BookingLookup[]) {
          bookings.set(b.id, b);
        }
      }

      return { reminders: rows, bookings };
    },
  });
}

export function useNativeReminderSync(): void {
  const native = isNativePlatform();
  const { user } = useAuth();
  const { data: prefs } = useNotificationPreferences();

  const stopsEnabled = native && (prefs?.stop_reminder_enabled ?? true);
  const ticketsEnabled = native && (prefs?.ticket_reminder_enabled ?? true);

  const { data: stopData } = useStopReminderRows(stopsEnabled);
  const { data: ticketData } = useTicketReminderRows(ticketsEnabled);

  // Request permission once we know the user is signed in on a native shell.
  useEffect(() => {
    if (!native || !user) return;
    void ensureLocalNotificationPermission();
  }, [native, user]);

  // Reconcile stop reminders.
  useEffect(() => {
    if (!native) return;
    if (!stopsEnabled) {
      void reconcileLocalReminders('stop', []);
      return;
    }
    if (!stopData) return;

    const desired: ScheduledReminder[] = stopData.reminders
      .map((r): ScheduledReminder | null => {
        const eng = stopData.engagements.get(r.engagement_id);
        const at = new Date(r.reminder_datetime);
        if (Number.isNaN(at.getTime())) return null;
        const title = eng?.title?.trim() || 'Upcoming stop';
        const where = eng?.location_name?.trim();
        const body = where ? `Starts in 1 hour · ${where}` : 'Starts in 1 hour';
        return {
          id: uuidToNotificationId(r.id),
          title,
          body,
          at,
          extra: {
            tripId: r.trip_id,
            engagementId: r.engagement_id,
            tab: 'tour',
          },
        };
      })
      .filter((x): x is ScheduledReminder => x !== null);

    void reconcileLocalReminders('stop', desired);
  }, [native, stopsEnabled, stopData]);

  // Reconcile ticket reminders. reminder_date is a calendar day — fire at
  // 9am local on that date so it lands at a sensible time.
  useEffect(() => {
    if (!native) return;
    if (!ticketsEnabled) {
      void reconcileLocalReminders('ticket', []);
      return;
    }
    if (!ticketData) return;

    const desired: ScheduledReminder[] = ticketData.reminders
      .map((r): ScheduledReminder | null => {
        const booking = ticketData.bookings.get(r.booking_id);
        // reminder_date = YYYY-MM-DD → fire 9:00 local that day.
        const [y, m, d] = r.reminder_date.split('-').map((n) => parseInt(n, 10));
        if (!y || !m || !d) return null;
        const at = new Date(y, m - 1, d, 9, 0, 0, 0);
        const vendor = booking?.vendor_name?.trim() || 'Tickets';
        return {
          id: uuidToNotificationId(r.id),
          title: 'Buy tickets reminder',
          body: `${vendor} — your event is coming up`,
          at,
          extra: {
            tripId: r.trip_id,
            bookingId: r.booking_id,
            tab: 'bookings',
          },
        };
      })
      .filter((x): x is ScheduledReminder => x !== null);

    void reconcileLocalReminders('ticket', desired);
  }, [native, ticketsEnabled, ticketData]);
}

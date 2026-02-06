/**
 * Patch 2.1.17: Hook for managing ticket reminders
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TicketReminder {
  id: string;
  booking_id: string;
  trip_id: string;
  user_id: string;
  reminder_date: string;
  reminder_sent: boolean;
  created_at: string;
}

export function useTicketReminders(bookingId?: string) {
  return useQuery({
    queryKey: ['ticket-reminders', bookingId],
    queryFn: async () => {
      const query = supabase
        .from('ticket_reminders')
        .select('*')
        .order('reminder_date', { ascending: true });
      
      if (bookingId) {
        query.eq('booking_id', bookingId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TicketReminder[];
    },
    enabled: !!bookingId,
  });
}

export function useCreateTicketReminders() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reminders: { bookingId: string; tripId: string; dates: string[] }) => {
      if (!user) throw new Error('Not authenticated');
      
      const remindersToInsert = reminders.dates.map(date => ({
        booking_id: reminders.bookingId,
        trip_id: reminders.tripId,
        user_id: user.id,
        reminder_date: date,
      }));

      const { error } = await supabase
        .from('ticket_reminders')
        .insert(remindersToInsert as any);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-reminders', variables.bookingId] });
    },
    onError: (error) => {
      console.error('Failed to create ticket reminders:', error);
      toast.error('Failed to set ticket reminders');
    },
  });
}

export function useDeleteTicketRemindersForBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('ticket_reminders')
        .delete()
        .eq('booking_id', bookingId)
        .eq('reminder_sent', false);
      
      if (error) throw error;
    },
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-reminders', bookingId] });
    },
  });
}

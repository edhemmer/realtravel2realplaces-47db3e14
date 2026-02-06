/**
 * Patch 2.1.17: Hook for creating activity bookings from Explore
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ActivityBookingFromExplore } from '@/types/attraction';
import { useAuth } from '@/contexts/AuthContext';

export function useCreateActivityFromExplore() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (activity: ActivityBookingFromExplore) => {
      if (!user) throw new Error('Not authenticated');

      // Create the start datetime
      const startDatetime = activity.startTime 
        ? `${activity.date}T${activity.startTime}:00`
        : activity.date;

      // Insert the booking with activity-specific fields
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          trip_id: activity.tripId,
          booking_type: 'activity',
          vendor_name: activity.attractionName,
          start_datetime: startDatetime,
          notes: activity.notes || null,
          activity_source: 'explore',
          ticket_required: activity.ticketRequired,
          advance_recommended: activity.advanceRecommended,
          booking_pattern: activity.bookingPattern,
          booking_url: activity.bookingUrl || null,
          tickets_purchased: false,
          location_summary: activity.locationSummary,
        } as any)
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create ticket reminders if any were specified
      if (activity.reminders.length > 0 && booking) {
        const remindersToInsert = activity.reminders.map(date => ({
          booking_id: booking.id,
          trip_id: activity.tripId,
          user_id: user.id,
          reminder_date: date,
        }));

        const { error: reminderError } = await supabase
          .from('ticket_reminders')
          .insert(remindersToInsert as any);

        if (reminderError) {
          console.error('Failed to create reminders:', reminderError);
          // Don't fail the whole operation, just log the error
        }
      }

      return booking;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', variables.tripId] });
      toast.success('Activity added to trip!');
    },
    onError: (error) => {
      console.error('Failed to create activity:', error);
      toast.error('Failed to add activity to trip');
    },
  });
}

export function useMarkTicketsPurchased() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, tripId }: { bookingId: string; tripId: string }) => {
      // Update the booking to mark tickets as purchased
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ tickets_purchased: true } as any)
        .eq('id', bookingId);

      if (updateError) throw updateError;

      // Delete pending ticket reminders
      const { error: deleteError } = await supabase
        .from('ticket_reminders')
        .delete()
        .eq('booking_id', bookingId)
        .eq('reminder_sent', false);

      if (deleteError) {
        console.error('Failed to cancel reminders:', deleteError);
        // Don't fail the operation
      }

      return { bookingId, tripId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', result.tripId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-reminders', result.bookingId] });
      toast.success('Tickets marked as purchased!');
    },
    onError: (error) => {
      console.error('Failed to mark tickets purchased:', error);
      toast.error('Failed to update ticket status');
    },
  });
}

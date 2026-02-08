/**
 * useStopReminders - Stop Reminder data access layer
 * 
 * Patch 2.1.26: 1-hour pre-stop reminders for Tour stops
 * 
 * RULES:
 * - Reminders are only created for stops WITH a valid start_time
 * - Reminders are scheduled 1 hour before the stop start_time
 * - When a stop's date/time changes, the reminder is updated
 * - When a stop is deleted, the reminder is cascade-deleted (DB constraint)
 * - No reminder guessing: if no time, no reminder
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { parseISO, subHours, format } from 'date-fns';

export interface StopReminder {
  id: string;
  engagement_id: string;
  trip_id: string;
  user_id: string;
  reminder_datetime: string;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Calculate reminder datetime (1 hour before stop start)
 */
export function calculateReminderDatetime(date: string, startTime: string): Date {
  // Combine date and time into a full datetime
  const datetimeStr = `${date}T${startTime}`;
  const stopDatetime = parseISO(datetimeStr);
  // Subtract 1 hour for the reminder
  return subHours(stopDatetime, 1);
}

/**
 * Fetch reminders for a specific stop
 */
export function useStopReminder(engagementId?: string) {
  return useQuery({
    queryKey: ['stop-reminders', engagementId],
    queryFn: async () => {
      if (!engagementId) return null;
      
      const { data, error } = await supabase
        .from('stop_reminders')
        .select('*')
        .eq('engagement_id', engagementId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - no reminder exists
          return null;
        }
        throw error;
      }
      return data as StopReminder;
    },
    enabled: !!engagementId,
  });
}

/**
 * Fetch all reminders for a trip
 */
export function useStopReminders(tripId: string) {
  return useQuery({
    queryKey: ['stop-reminders', 'trip', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stop_reminders')
        .select('*')
        .eq('trip_id', tripId)
        .order('reminder_datetime', { ascending: true });
      
      if (error) throw error;
      return data as StopReminder[];
    },
    enabled: !!tripId,
  });
}

/**
 * Create or update a stop reminder
 * Only creates if the stop has a valid start_time
 */
export function useUpsertStopReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      engagementId,
      tripId,
      date,
      startTime,
    }: {
      engagementId: string;
      tripId: string;
      date: string;
      startTime: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Calculate reminder datetime (1 hour before)
      const reminderDatetime = calculateReminderDatetime(date, startTime);
      
      // Check if reminder already exists
      const { data: existing } = await supabase
        .from('stop_reminders')
        .select('id')
        .eq('engagement_id', engagementId)
        .single();
      
      if (existing) {
        // Update existing reminder
        const { error } = await supabase
          .from('stop_reminders')
          .update({
            reminder_datetime: reminderDatetime.toISOString(),
            reminder_sent: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Create new reminder
        const { error } = await supabase
          .from('stop_reminders')
          .insert({
            engagement_id: engagementId,
            trip_id: tripId,
            user_id: user.id,
            reminder_datetime: reminderDatetime.toISOString(),
          });
        
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stop-reminders', variables.engagementId] });
      queryClient.invalidateQueries({ queryKey: ['stop-reminders', 'trip', variables.tripId] });
    },
    onError: (error) => {
      console.error('Failed to set stop reminder:', error);
      toast.error('Failed to set reminder');
    },
  });
}

/**
 * Delete a stop reminder
 */
export function useDeleteStopReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      engagementId,
      tripId,
    }: {
      engagementId: string;
      tripId: string;
    }) => {
      const { error } = await supabase
        .from('stop_reminders')
        .delete()
        .eq('engagement_id', engagementId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stop-reminders', variables.engagementId] });
      queryClient.invalidateQueries({ queryKey: ['stop-reminders', 'trip', variables.tripId] });
    },
  });
}

/**
 * Fetch upcoming (unsent) reminders for the current user
 * Useful for displaying pending reminders in UI
 */
export function useUpcomingStopReminders() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['stop-reminders', 'upcoming', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('stop_reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('reminder_sent', false)
        .gte('reminder_datetime', new Date().toISOString())
        .order('reminder_datetime', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      return data as StopReminder[];
    },
    enabled: !!user,
  });
}

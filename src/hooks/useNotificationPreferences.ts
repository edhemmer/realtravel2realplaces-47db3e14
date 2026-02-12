/**
 * useNotificationPreferences - Hook for managing notification preferences
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  departure_enabled: boolean;
  departure_hours_before: number;
  expense_nudge_enabled: boolean;
  parking_expiry_enabled: boolean;
  parking_expiry_minutes_before: number;
  stop_reminder_enabled: boolean;
  stop_reminder_minutes_before: number;
  ticket_reminder_enabled: boolean;
  ticket_reminder_days_before: number;
  created_at: string;
  updated_at: string;
}

export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notification_preferences', user?.id],
    queryFn: async (): Promise<NotificationPreferences | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch notification preferences:', error);
        return null;
      }

      return data as NotificationPreferences | null;
    },
    enabled: !!user?.id,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Upsert: create if not exists, update if exists
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...updates,
        }, { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_preferences', user?.id] });
    },
  });
}

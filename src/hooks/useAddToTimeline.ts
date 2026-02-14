/**
 * v3.8.1: Hook for inserting Explore items into trip_engagements.
 * The DB trigger (sync_trip_engagement_events) handles trip_events creation.
 * Client never writes to trip_events directly.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AddToTimelinePayload {
  tripId: string;
  title: string;
  category?: string;
  startTime: string; // ISO timestamptz
  endTime?: string | null; // ISO timestamptz or null
  locationName?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  source?: string;
}

export function useAddToTimeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddToTimelinePayload) => {
      const { data, error } = await supabase
        .from('trip_engagements' as any)
        .insert({
          trip_id: payload.tripId,
          title: payload.title,
          category: payload.category || null,
          start_time: payload.startTime,
          end_time: payload.endTime || null,
          location_name: payload.locationName || null,
          address: payload.address || null,
          lat: payload.lat ?? null,
          lng: payload.lng ?? null,
          source: payload.source || 'explore',
        })
        .select()
        .single();

      if (error) {
        // Unique constraint violation → duplicate
        if (error.code === '23505') {
          throw new Error('DUPLICATE');
        }
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate trip events so timeline picks up the trigger-created event
      queryClient.invalidateQueries({ queryKey: ['trip-events', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip-events-engagements', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['bookings', variables.tripId] });
      toast.success('Added to Timeline');
    },
    onError: (error: Error) => {
      if (error.message === 'DUPLICATE') {
        toast.error('Already added.');
      } else {
        console.error('Failed to add to timeline:', error);
        toast.error('Failed to add to timeline');
      }
    },
  });
}

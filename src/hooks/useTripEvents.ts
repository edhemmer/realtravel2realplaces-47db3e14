import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TripEvent } from '@/types/tripEvent';

/**
 * v2.2.5: Hook to fetch trip events for all trip members
 * 
 * Plan tier does NOT gate read access to canonical trip events.
 * RLS enforces access via user_has_trip_access (membership-based).
 * 
 * This ensures mixed-plan members (Business owner + Pro guest)
 * share the same canonical timeline truth.
 */
export function useTripEvents(tripId: string | undefined) {
  return useQuery({
    queryKey: ['trip-events', tripId],
    queryFn: async (): Promise<TripEvent[]> => {
      if (!tripId) return [];

      const { data, error } = await supabase
        .from('trip_events')
        .select('*')
        .eq('trip_id', tripId)
        .order('event_datetime', { ascending: true });

      if (error) {
        console.error('Error fetching trip events:', error);
        throw error;
      }

      return (data || []) as TripEvent[];
    },
    enabled: !!tripId,
    staleTime: 10000,
  });
}

/**
 * v2.2.5: Fetch only engagement-sourced events from the canonical stream.
 * Used by buildCanonicalTimeline to include engagement events
 * without depending on the engagements (Business-only) table.
 */
export function useEngagementEvents(tripId: string | undefined) {
  return useQuery({
    queryKey: ['trip-events-engagements', tripId],
    queryFn: async (): Promise<TripEvent[]> => {
      if (!tripId) return [];

      const { data, error } = await supabase
        .from('trip_events')
        .select('*')
        .eq('trip_id', tripId)
        .eq('source_type', 'engagement')
        .order('event_datetime', { ascending: true });

      if (error) {
        console.error('Error fetching engagement events:', error);
        throw error;
      }

      return (data || []) as TripEvent[];
    },
    enabled: !!tripId,
    staleTime: 10000,
  });
}

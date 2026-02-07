import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccess } from '@/hooks/useAccess';
import { TripEvent } from '@/types/tripEvent';

/**
 * v2.0.2: Hook to fetch trip events for Pro users
 * 
 * Returns empty array for Free users (events are only created for Pro).
 * Events are auto-synced via database triggers when bookings/parking change.
 */
export function useTripEvents(tripId: string | undefined) {
  const { isPro } = useAccess();

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
    enabled: !!tripId && isPro,
    staleTime: 10000, // Cache for 10 seconds
  });
}

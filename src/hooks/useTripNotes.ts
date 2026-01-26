import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TripNotes } from '@/types/database';
import { toast } from 'sonner';

export function useTripNotes(tripId: string) {
  return useQuery({
    queryKey: ['trip_notes', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_notes')
        .select('*')
        .eq('trip_id', tripId)
        .maybeSingle();
      
      if (error) throw error;
      return data as TripNotes | null;
    },
    enabled: !!tripId,
  });
}

interface UpsertTripNotesData {
  trip_id: string;
  general_notes?: string;
  emergency_numbers?: string;
  important_links?: string;
}

export function useUpsertTripNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpsertTripNotesData) => {
      // Check if notes exist
      const { data: existing } = await supabase
        .from('trip_notes')
        .select('id')
        .eq('trip_id', data.trip_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('trip_notes')
          .update(data)
          .eq('trip_id', data.trip_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('trip_notes')
          .insert(data);
        if (error) throw error;
      }
      
      return { trip_id: data.trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['trip_notes', result.trip_id] });
      toast.success('Notes saved successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

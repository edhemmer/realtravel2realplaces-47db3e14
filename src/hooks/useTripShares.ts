import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TripShare } from '@/types/tripShare';
import { toast } from 'sonner';

export function useTripShares(tripId: string) {
  return useQuery({
    queryKey: ['trip-shares', tripId],
    queryFn: async () => {
      // Use secure function that masks share_token and email for non-owners
      const { data, error } = await supabase
        .rpc('get_trip_shares_safe', { p_trip_id: tripId });
      
      if (error) throw error;
      return (data || []) as TripShare[];
    },
    enabled: !!tripId,
  });
}

export function useCreateTripShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trip_id, shared_with_email, permission = 'view' }: { 
      trip_id: string; 
      shared_with_email: string;
      permission?: 'view' | 'edit';
    }) => {
      const { data, error } = await supabase
        .from('trip_shares')
        .insert({
          trip_id,
          shared_with_email,
          permission,
        } as never)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trip-shares', variables.trip_id] });
      toast.success('Invitation sent successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteTripShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trip_id }: { id: string; trip_id: string }) => {
      const { error } = await supabase
        .from('trip_shares')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['trip-shares', result.trip_id] });
      toast.success('Share removed!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useGetShareByToken(token: string | null) {
  return useQuery({
    queryKey: ['trip-share-token', token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase
        .from('trip_shares')
        .select('*')
        .eq('share_token', token)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });
}

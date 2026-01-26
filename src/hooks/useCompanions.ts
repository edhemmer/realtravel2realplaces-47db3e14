import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Companion } from '@/types/database';
import { toast } from 'sonner';

export function useCompanions(tripId: string) {
  return useQuery({
    queryKey: ['companions', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companions')
        .select('*')
        .eq('trip_id', tripId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as Companion[];
    },
    enabled: !!tripId,
  });
}

interface CreateCompanionData {
  trip_id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export function useCreateCompanion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCompanionData) => {
      const { data: companion, error } = await supabase
        .from('companions')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return companion;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companions', variables.trip_id] });
      toast.success('Companion added successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateCompanion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trip_id, ...data }: Partial<Companion> & { id: string; trip_id: string }) => {
      const { error } = await supabase
        .from('companions')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['companions', result.trip_id] });
      toast.success('Companion updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteCompanion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trip_id }: { id: string; trip_id: string }) => {
      const { error } = await supabase
        .from('companions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['companions', result.trip_id] });
      toast.success('Companion removed successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

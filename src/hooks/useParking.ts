import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Parking, ParkingType, ParkingBilling } from '@/types/database';
import { toast } from 'sonner';

export function useParking(tripId: string) {
  return useQuery({
    queryKey: ['parking', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parking')
        .select('*')
        .eq('trip_id', tripId)
        .order('start_datetime', { ascending: true });
      
      if (error) throw error;
      return data as Parking[];
    },
    enabled: !!tripId,
  });
}

interface CreateParkingData {
  trip_id: string;
  parking_type: ParkingType;
  label: string;
  start_datetime: string;
  end_datetime?: string;
  billing_type: ParkingBilling;
  address?: string;
  level_section_space?: string;
  total_cost?: number;
  my_share?: number;
  // v3.9.7: Local wall-time columns
  end_local_datetime?: string;
  end_timezone?: string;
  start_local_datetime?: string;
}

export function useCreateParking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateParkingData) => {
      const { data: parking, error } = await supabase
        .from('parking')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return parking;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['parking', variables.trip_id] });
      toast.success('Parking added successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateParking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trip_id, ...data }: Partial<Parking> & { id: string; trip_id: string }) => {
      const { error } = await supabase
        .from('parking')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['parking', result.trip_id] });
      toast.success('Parking updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteParking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trip_id }: { id: string; trip_id: string }) => {
      const { error } = await supabase
        .from('parking')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['parking', result.trip_id] });
      toast.success('Parking deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

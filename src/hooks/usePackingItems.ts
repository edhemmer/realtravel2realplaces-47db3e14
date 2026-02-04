import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PackingItem } from '@/types/database';
import { toast } from 'sonner';

export function usePackingItems(tripId: string) {
  return useQuery({
    queryKey: ['packing_items', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packing_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('category', { ascending: true });
      
      if (error) throw error;
      return data as PackingItem[];
    },
    enabled: !!tripId,
  });
}

interface CreatePackingItemData {
  trip_id: string;
  category: string;
  item_name: string;
  quantity?: number;
  is_custom?: boolean; // v1.3.3: Mark user-added items
}

export function useCreatePackingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePackingItemData) => {
      const { data: item, error } = await supabase
        .from('packing_items')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return item;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['packing_items', variables.trip_id] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePackingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trip_id, ...data }: Partial<PackingItem> & { id: string; trip_id: string }) => {
      const { error } = await supabase
        .from('packing_items')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['packing_items', result.trip_id] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeletePackingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trip_id }: { id: string; trip_id: string }) => {
      const { error } = await supabase
        .from('packing_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['packing_items', result.trip_id] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useBulkCreatePackingItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trip_id, items, is_custom = false }: { trip_id: string; items: Omit<CreatePackingItemData, 'trip_id'>[]; is_custom?: boolean }) => {
      const itemsWithTripId = items.map(item => ({ ...item, trip_id, is_custom }));
      const { error } = await supabase
        .from('packing_items')
        .insert(itemsWithTripId);
      
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['packing_items', result.trip_id] });
      toast.success('Packing list generated!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// v1.3.3: Delete all auto-generated (non-custom) packing items for a trip
export function useDeleteAutoPackingItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trip_id }: { trip_id: string }) => {
      const { error } = await supabase
        .from('packing_items')
        .delete()
        .eq('trip_id', trip_id)
        .eq('is_custom', false);
      
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['packing_items', result.trip_id] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

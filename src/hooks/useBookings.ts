import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Booking, BookingType, StayType } from '@/types/database';
import { toast } from 'sonner';

export function useBookings(tripId: string) {
  return useQuery({
    queryKey: ['bookings', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('trip_id', tripId)
        .order('start_datetime', { ascending: true });
      
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!tripId,
  });
}

interface CreateBookingData {
  trip_id: string;
  booking_type: BookingType;
  vendor_name: string;
  start_datetime: string;
  end_datetime?: string;
  address?: string;
  confirmation_number?: string;
  total_cost?: number;
  my_share?: number;
  link_url?: string;
  notes?: string;
  passenger_name?: string;
  airline?: string;
  tsa_precheck_number?: string;
  frequent_flyer_number?: string;
  stay_type?: StayType;
  property_name?: string;
  rental_company?: string;
  pickup_location?: string;
  return_location?: string;
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBookingData) => {
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return booking;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', variables.trip_id] });
      toast.success('Booking added successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trip_id, ...data }: Partial<Booking> & { id: string; trip_id: string }) => {
      const { error } = await supabase
        .from('bookings')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', result.trip_id] });
      toast.success('Booking updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trip_id }: { id: string; trip_id: string }) => {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', result.trip_id] });
      toast.success('Booking deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

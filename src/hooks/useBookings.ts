import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Booking, BookingType, StayType } from '@/types/database';
import { toast } from 'sonner';
import { 
  syncExpenseFromBooking, 
  deleteLinkedExpense 
} from '@/lib/bookingExpenseSync';

export function useBookings(tripId: string) {
  return useQuery({
    queryKey: ['bookings', tripId],
    queryFn: async () => {
      // Use secure function that masks sensitive fields for non-owners
      const { data, error } = await supabase
        .rpc('get_bookings_safe', { p_trip_id: tripId });
      
      if (error) throw error;
      return (data || []) as Booking[];
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
      
      // v1.2.5: Sync expense from booking
      if (booking && Number(booking.total_cost || 0) > 0) {
        await syncExpenseFromBooking(booking as Booking);
      }
      
      return booking;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', variables.trip_id] });
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.trip_id] });
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
      
      // v1.2.5: Re-sync expense when booking is updated
      // Fetch the updated booking to sync expense
      const { data: updatedBooking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();
      
      if (updatedBooking) {
        if (Number(updatedBooking.total_cost || 0) > 0) {
          await syncExpenseFromBooking(updatedBooking as Booking);
        } else {
          // If cost is now 0, remove linked expense
          await deleteLinkedExpense(trip_id, id);
        }
      }
      
      return { trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', result.trip_id] });
      queryClient.invalidateQueries({ queryKey: ['expenses', result.trip_id] });
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
      // v1.2.5: Delete linked expense first
      await deleteLinkedExpense(trip_id, id);
      
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', result.trip_id] });
      queryClient.invalidateQueries({ queryKey: ['expenses', result.trip_id] });
      toast.success('Booking deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

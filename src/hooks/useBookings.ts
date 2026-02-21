import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Booking, BookingType, StayType, TransportModeType } from '@/types/database';
import { toast } from 'sonner';
import { 
  syncExpenseFromBooking, 
  deleteLinkedExpense 
} from '@/lib/bookingExpenseSync';
import { safeMonetaryForDb } from '@/lib/monetaryNormalization';

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
  end_datetime?: string | null;
  address?: string | null;
  confirmation_number?: string | null;
  total_cost?: number | string;
  my_share?: number | string;
  link_url?: string | null;
  notes?: string | null;
  passenger_name?: string | null;
  airline?: string | null;
  tsa_precheck_number?: string | null;
  frequent_flyer_number?: string | null;
  stay_type?: StayType | null;
  property_name?: string | null;
  rental_company?: string | null;
  pickup_location?: string | null;
  return_location?: string | null;
  // Transport-specific (Patch 2.1.37)
  transport_mode?: TransportModeType | null;
  from_location?: string | null;
  to_location?: string | null;
  operator?: string | null;
  // v3.9.49: Airport fields for flight bookings
  departure_airport_code?: string | null;
  arrival_airport_code?: string | null;
  departure_airport_name?: string | null;
  arrival_airport_name?: string | null;
  // v4.4.0: Currency for expense sync
  _extracted_currency?: string;
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBookingData) => {
      // v4.4.0: Extract currency before sanitizing (not a DB column on bookings)
      const expenseCurrency = data._extracted_currency || 'USD';
      // v3.9.36: Normalize monetary fields before DB write to prevent numeric overflow
      const safeTotalCost = safeMonetaryForDb(data.total_cost);
      const safeMyShare = safeMonetaryForDb(data.my_share);
      // v3.9.43: Treat my_share=0 as "unset" when total_cost > 0.
      const effectiveMyShare = (safeMyShare != null && safeMyShare > 0)
        ? safeMyShare
        : safeTotalCost;
      // Remove _extracted_currency before DB insert (not a bookings column)
      const { _extracted_currency, ...dbFields } = data;
      const sanitizedData = {
        ...dbFields,
        total_cost: safeTotalCost,
        my_share: effectiveMyShare,
      };

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert(sanitizedData)
        .select()
        .single();
      
      if (error) throw error;
      
      // v4.9.4: Always sync — syncExpenseFromBooking handles $0 placeholders
      if (booking) {
        try {
          await syncExpenseFromBooking(booking as Booking, expenseCurrency);
        } catch (err) {
          console.error('[useCreateBooking] Expense sync failed (non-blocking):', err);
        }
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
      
      // v4.9.4: Always sync — handles both real costs and $0 placeholders
      if (updatedBooking) {
        await syncExpenseFromBooking(updatedBooking as Booking);
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

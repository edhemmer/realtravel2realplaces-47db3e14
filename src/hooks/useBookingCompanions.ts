import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BookingCompanion {
  id: string;
  booking_id: string;
  companion_id: string;
  created_at: string;
}

export function useBookingCompanions(bookingId: string) {
  return useQuery({
    queryKey: ['booking_companions', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_companions')
        .select('*')
        .eq('booking_id', bookingId);
      
      if (error) throw error;
      return data as BookingCompanion[];
    },
    enabled: !!bookingId,
  });
}

export function useBookingCompanionsByTrip(tripId: string) {
  return useQuery({
    queryKey: ['booking_companions_by_trip', tripId],
    queryFn: async () => {
      // Get all bookings for this trip first
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('trip_id', tripId);
      
      if (bookingsError) throw bookingsError;
      
      if (!bookings || bookings.length === 0) {
        return [];
      }
      
      const bookingIds = bookings.map(b => b.id);
      
      const { data, error } = await supabase
        .from('booking_companions')
        .select('*')
        .in('booking_id', bookingIds);
      
      if (error) throw error;
      return data as BookingCompanion[];
    },
    enabled: !!tripId,
  });
}

export function useSetBookingCompanions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      companionIds,
      tripId 
    }: { 
      bookingId: string; 
      companionIds: string[];
      tripId: string;
    }) => {
      // First, delete all existing companions for this booking
      const { error: deleteError } = await supabase
        .from('booking_companions')
        .delete()
        .eq('booking_id', bookingId);
      
      if (deleteError) throw deleteError;

      // Then insert the new ones
      if (companionIds.length > 0) {
        const { error: insertError } = await supabase
          .from('booking_companions')
          .insert(
            companionIds.map(companionId => ({
              booking_id: bookingId,
              companion_id: companionId,
            }))
          );
        
        if (insertError) throw insertError;
      }

      return { bookingId, tripId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['booking_companions', result.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking_companions_by_trip', result.tripId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

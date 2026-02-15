/**
 * Hook to fetch and manage user's pending email imports.
 * Returns pending imports with statuses: ready_for_review, needs_review
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PendingImport {
  id: string;
  parsed_type: string;
  status: string;
  confidence: number;
  parsed_data: Record<string, unknown>;
  subject: string | null;
  sender: string | null;
  created_at: string;
  provider_message_id: string | null;
}

export function usePendingImports() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-imports', user?.id],
    queryFn: async (): Promise<PendingImport[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('pending_imports')
        .select('id, parsed_type, status, confidence, parsed_data, subject, sender, created_at, provider_message_id')
        .eq('user_id', user.id)
        .in('status', ['ready_for_review', 'needs_review'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending imports:', error);
        throw error;
      }
      return (data || []) as PendingImport[];
    },
    enabled: !!user,
    staleTime: 30000,
    refetchInterval: 60000, // Poll every minute for new imports
  });
}

export function useDiscardImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importId: string) => {
      const { error } = await supabase
        .from('pending_imports')
        .delete()
        .eq('id', importId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-imports'] });
      toast.success('Import discarded.');
    },
    onError: () => {
      toast.error('Failed to discard import.');
    },
  });
}

export function useFileImportToTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      importId,
      tripId,
      parsedData,
    }: {
      importId: string;
      tripId: string;
      parsedData: Record<string, unknown>;
    }) => {
      const bookingType = parsedData.booking_type as string || 'activity';
      const validTypes = ['flight', 'stay', 'car_rental', 'activity', 'transport'];
      const finalType = validTypes.includes(bookingType) ? bookingType : 'activity';

      // Build booking record from parsed data
      const booking: Record<string, unknown> = {
        trip_id: tripId,
        booking_type: finalType,
        vendor_name: parsedData.vendor_name || 'Imported Booking',
        start_datetime: parsedData.start_datetime || new Date().toISOString(),
        end_datetime: parsedData.end_datetime || null,
        confirmation_number: parsedData.confirmation_number || null,
        total_cost: parsedData.total_cost || null,
        address: parsedData.address || null,
        airline: parsedData.airline || null,
        passenger_name: parsedData.passenger_name || null,
        property_name: parsedData.property_name || null,
        stay_type: parsedData.stay_type || null,
        rental_company: parsedData.rental_company || null,
        pickup_location: parsedData.pickup_location || null,
        return_location: parsedData.return_location || null,
        departure_airport_code: parsedData.departure_airport_code || null,
        arrival_airport_code: parsedData.arrival_airport_code || null,
        location_summary: parsedData.location_summary || null,
        notes: parsedData.notes || null,
      };

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert(booking as any);

      if (bookingError) throw bookingError;

      // Mark import as filed
      const { error: updateError } = await supabase
        .from('pending_imports')
        .update({ status: 'filed' })
        .eq('id', importId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-imports'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking added to trip!');
    },
    onError: (err: Error) => {
      console.error('File import error:', err);
      toast.error('Failed to add booking. Please try again.');
    },
  });
}

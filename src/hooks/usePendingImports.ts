/**
 * Hook to fetch and manage user's pending email imports.
 * v4.3.1: Expense creation added to standard booking path — every filed booking with a cost now creates a linked expense
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isReceiptClassification, getEntityLabel } from '@/lib/parseContract';

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
      const isReceipt = isReceiptClassification(parsedData);
      
      if (isReceipt) {
        // v4.2.0: Receipt items → create expense, not a booking (all entity types)
        const entityType = (parsedData.booking_type as string) || 'other';
        const categoryMap: Record<string, string> = {
          flight: 'transport', car_rental: 'transport', transport: 'transport',
          parking: 'parking', activity: 'activity',
        };
        const category = categoryMap[entityType] || 'other';
        const expenseDate = (parsedData.receipt_date as string) || (parsedData.start_datetime as string)?.substring(0, 10) || new Date().toISOString().split('T')[0];
        const entityLabel = getEntityLabel(entityType);
        
        const { error: expenseError } = await supabase
          .from('expenses')
          .insert([{
            trip_id: tripId,
            date: expenseDate,
            category: category as 'meals' | 'transport' | 'activity' | 'shopping' | 'parking' | 'other',
            description: `${parsedData.vendor_name || entityLabel} (receipt)`,
            amount: (parsedData.total_cost as number) || 0,
            notes: `Created from ${entityLabel.toLowerCase()} receipt import. Not an itinerary — no timeline entry.`,
          }]);
        
        if (expenseError) throw expenseError;
      } else {
        // Standard booking creation with multi-leg flight support
        const bookingType = parsedData.booking_type as string || 'activity';
        const validTypes = ['flight', 'stay', 'car_rental', 'activity', 'transport'];
        const finalType = validTypes.includes(bookingType) ? bookingType : 'activity';
        const isPaymentDeclined = parsedData._payment_declined === true;
        const currencyCode = (parsedData.currency_code as string) || 'USD';
        const flightLegs = Array.isArray(parsedData.flight_legs)
          ? (parsedData.flight_legs as Record<string, unknown>[])
          : [];
        const isMultiLeg = finalType === 'flight' && flightLegs.length > 1;

        if (isMultiLeg) {
          for (let i = 0; i < flightLegs.length; i++) {
            const leg = flightLegs[i];
            const isOutbound = i === 0;
            const legCost = isOutbound && !isPaymentDeclined
              ? ((parsedData.total_cost as number) || null)
              : null;

            const legBooking = {
              trip_id: tripId,
              booking_type: 'flight' as const,
              vendor_name: (parsedData.vendor_name as string) || 'Imported Flight',
              start_datetime: (leg.departure_datetime as string) || new Date().toISOString(),
              end_datetime: (leg.arrival_datetime as string) || null,
              confirmation_number: (parsedData.confirmation_number as string) || null,
              total_cost: legCost,
              airline: (parsedData.airline as string) || (parsedData.vendor_name as string) || null,
              passenger_name: (parsedData.passenger_name as string) || null,
              notes: [
                leg.flight_number ? `Flight: ${leg.flight_number}` : null,
                leg.departure_airport_code && leg.arrival_airport_code
                  ? `${leg.departure_airport_code} → ${leg.arrival_airport_code}`
                  : null,
                !isOutbound ? 'Return leg — cost tracked on outbound' : null,
                isPaymentDeclined ? 'PAYMENT DECLINED — verify before travel' : null,
              ].filter(Boolean).join(' | ') || null,
            };

            const { error: legError } = await supabase.from('bookings').insert(legBooking as any);
            if (legError) throw legError;

            // Expense only on outbound leg with confirmed payment
            if (isOutbound && !isPaymentDeclined && legCost) {
              const lastLeg = flightLegs[flightLegs.length - 1];
              const expenseDate =
                typeof leg.departure_datetime === 'string' && leg.departure_datetime.length >= 10
                  ? leg.departure_datetime.substring(0, 10)
                  : new Date().toISOString().split('T')[0];

              const { error: expErr } = await supabase.from('expenses').insert({
                trip_id: tripId,
                date: expenseDate,
                category: 'transport' as const,
                description: `${String(parsedData.vendor_name || 'Flight')} — ${String(leg.departure_airport_code || '')} → ${String(lastLeg?.arrival_airport_code || '')} (${String(parsedData.confirmation_number || 'ref unknown')})`,
                amount: legCost,
                notes: `Currency: ${currencyCode}. Covers all legs on this confirmation.`,
              });
              if (expErr) {
                console.error('Expense insert error:', expErr);
                throw expErr;
              }
            }
          }
        } else {
          // Single booking — handles both simple domestic and single-leg international
          const singleCost = !isPaymentDeclined
            ? ((parsedData.total_cost as number) || null)
            : null;

          const booking = {
            trip_id: tripId,
            booking_type: finalType as any,
            vendor_name: (parsedData.vendor_name as string) || 'Imported Booking',
            start_datetime: (parsedData.start_datetime as string) || new Date().toISOString(),
            end_datetime: (parsedData.end_datetime as string) || null,
            confirmation_number: (parsedData.confirmation_number as string) || null,
            total_cost: singleCost,
            address: (parsedData.address as string) || null,
            airline: (parsedData.airline as string) || null,
            passenger_name: (parsedData.passenger_name as string) || null,
            property_name: (parsedData.property_name as string) || null,
            stay_type: (parsedData.stay_type as string) || null,
            rental_company: (parsedData.rental_company as string) || null,
            pickup_location: (parsedData.pickup_location as string) || null,
            return_location: (parsedData.return_location as string) || null,
            notes: isPaymentDeclined
              ? 'PAYMENT DECLINED — verify booking before travel'
              : ((parsedData.notes as string) || null),
          };

        const { error: bookingError } = await supabase
          .from('bookings')
          .insert(booking as any);
        if (bookingError) throw bookingError;

        // Create linked expense if this booking has a cost
        const totalCost = parsedData.total_cost as number | null;
        const paymentDeclined = !!(parsedData.is_payment_declined);

        if (typeof totalCost === 'number' && totalCost > 0 && !paymentDeclined) {
          const categoryMap: Record<string, string> = {
            flight: 'transport',
            car_rental: 'transport',
            transport: 'transport',
            parking: 'parking',
            stay: 'other',
            activity: 'activity',
          };
          const expenseCategory = categoryMap[finalType] || 'other';

          const rawStart = parsedData.start_datetime as string | null;
          const expenseDate = rawStart && rawStart.length >= 10
            ? rawStart.substring(0, 10)
            : new Date().toISOString().split('T')[0];

          const currencyCode = (parsedData.currency_code as string) || 'USD';
          const vendorName = String(parsedData.vendor_name || 'Imported Booking');
          const confNum = parsedData.confirmation_number
            ? ` (${String(parsedData.confirmation_number)})`
            : '';

          const { error: expenseError } = await supabase
            .from('expenses')
            .insert({
              trip_id: tripId,
              date: expenseDate,
              category: expenseCategory as 'meals' | 'transport' | 'activity' | 'shopping' | 'parking' | 'other',
              description: `${vendorName}${confNum}`,
              amount: totalCost,
              notes: `Currency: ${currencyCode}. Filed from import.`,
            });

          if (expenseError) {
            console.error('Expense insert error (non-blocking):', expenseError);
            // Non-blocking: booking was created successfully, expense failure is logged but not thrown
          }
        }
      }

      // Mark import as filed
      const { error: updateError } = await supabase
        .from('pending_imports')
        .update({ status: 'filed' })
        .eq('id', importId);

      if (updateError) throw updateError;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-imports'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      
      // v3.10.1: Show batch outcome summary if available
      const parsed = variables.parsedData;
      const batchSummary = parsed._batch_summary as { by_type?: Record<string, number>; receipts?: number; needs_attention?: number } | undefined;
      if (batchSummary?.by_type && Object.keys(batchSummary.by_type).length > 0) {
        const typeLabels: Record<string, string> = {
          flight: 'Flight', stay: 'Lodging', car_rental: 'Car Rental',
          transport: 'Transport', parking: 'Parking', activity: 'Activity',
        };
        const parts: string[] = [];
        for (const [t, count] of Object.entries(batchSummary.by_type)) {
          const label = typeLabels[t] || t;
          parts.push(`${count} ${label}${(count as number) > 1 ? 's' : ''}`);
        }
        if (batchSummary.needs_attention && batchSummary.needs_attention > 0) {
          parts.push(`${batchSummary.needs_attention} Needs Attention`);
        }
        toast.success(`Import added: ${parts.join(', ')}`);
      } else {
        toast.success('Import added to trip!');
      }
    },
    onError: (err: Error) => {
      console.error('File import error:', err);
      toast.error('Failed to add import. Please try again.');
    },
  });
}

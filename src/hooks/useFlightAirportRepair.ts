/**
 * v3.13.5: useFlightAirportRepair — safe repair for corrupted airport codes.
 *
 * Repair mutates canonical booking data, so shared-trip guests must never
 * trigger it simply by viewing Reservations. Callers must explicitly enable
 * the hook only when the current user has owner-level repair authority.
 */

import { useEffect, useRef } from 'react';
import { Booking } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { recoverAirportCodes, validateIATA } from '@/lib/flightDisplayUtils';

function getTodayDateOnly(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function useFlightAirportRepair(
  tripId: string,
  tripEndDate: string | undefined,
  bookings: Booking[],
  enabled: boolean = true,
) {
  const repairedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !tripEndDate) return;

    const today = getTodayDateOnly();
    if (tripEndDate < today) return;

    const flightBookings = bookings.filter(b => b.booking_type === 'flight');
    if (flightBookings.length === 0) return;

    const repairCorruptedBookings = async () => {
      for (const booking of flightBookings) {
        if (repairedRef.current.has(booking.id)) continue;

        const depValid = validateIATA(booking.departure_airport_code);
        const arrValid = validateIATA(booking.arrival_airport_code);
        if (depValid && arrValid) {
          repairedRef.current.add(booking.id);
          continue;
        }

        const recovered = recoverAirportCodes(booking);
        if (!recovered) {
          repairedRef.current.add(booking.id);
          continue;
        }

        try {
          const { error } = await supabase
            .from('bookings')
            .update({
              departure_airport_code: recovered.origin,
              arrival_airport_code: recovered.destination,
            })
            .eq('id', booking.id);

          if (!error) {
            console.log(`[v3.13.5] Repaired airport codes for booking ${booking.id}: ${recovered.origin} → ${recovered.destination}`);
          }
        } catch (err) {
          console.warn(`[v3.13.5] Failed to repair booking ${booking.id}:`, err);
        }

        repairedRef.current.add(booking.id);
      }
    };

    repairCorruptedBookings();
  }, [tripId, tripEndDate, bookings, enabled]);
}
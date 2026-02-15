/**
 * v3.13.2: useFlightAirportRepair — Safe repair for corrupted airport codes
 *
 * Scans flight bookings for active trips where airport code fields contain
 * non-IATA tokens (e.g., confirmation numbers). Repairs only when high-confidence
 * recovery is possible. Idempotent — runs once per trip load.
 *
 * NO Date objects. NO timezone math.
 */

import { useEffect, useRef } from 'react';
import { Booking } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import {
  detectCorruptedAirportCodes,
  recoverAirportCodes,
  validateIATA,
} from '@/lib/flightDisplayUtils';

/**
 * Runs safe, idempotent repair of corrupted airport codes on active trip flights.
 * Only repairs when two valid IATA codes can be confidently recovered from text fields.
 */
export function useFlightAirportRepair(
  tripId: string,
  tripState: string,
  bookings: Booking[],
) {
  const repairedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only run for active trips
    if (tripState !== 'active') return;

    const flightBookings = bookings.filter(b => b.booking_type === 'flight');
    if (flightBookings.length === 0) return;

    const repairCorruptedBookings = async () => {
      for (const booking of flightBookings) {
        // Skip if already repaired this session
        if (repairedRef.current.has(booking.id)) continue;

        // Skip if airport codes are already valid
        const depValid = validateIATA(booking.departure_airport_code);
        const arrValid = validateIATA(booking.arrival_airport_code);
        if (depValid && arrValid) continue;

        // Check if corruption is detected
        if (!detectCorruptedAirportCodes(booking)) continue;

        // Attempt high-confidence recovery
        const recovered = recoverAirportCodes(booking);
        if (!recovered) {
          // Mark as attempted so we don't re-check
          repairedRef.current.add(booking.id);
          continue;
        }

        // Perform the repair
        try {
          const { error } = await supabase
            .from('bookings')
            .update({
              departure_airport_code: recovered.origin,
              arrival_airport_code: recovered.destination,
            })
            .eq('id', booking.id);

          if (!error) {
            console.log(`[v3.13.2] Repaired airport codes for booking ${booking.id}: ${recovered.origin} → ${recovered.destination}`);
          }
        } catch (err) {
          console.warn(`[v3.13.2] Failed to repair booking ${booking.id}:`, err);
        }

        repairedRef.current.add(booking.id);
      }
    };

    repairCorruptedBookings();
  }, [tripId, tripState, bookings]);
}

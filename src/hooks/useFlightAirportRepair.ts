/**
 * v3.13.5: useFlightAirportRepair — Safe repair for corrupted airport codes
 *
 * Scans flight bookings for ACTIVE or UPCOMING trips (end_date >= today)
 * where airport code fields contain non-IATA tokens. Repairs only when
 * high-confidence recovery is possible. Idempotent — runs once per trip load.
 *
 * NO Date objects for domain logic. NO timezone math.
 */

import { useEffect, useRef } from 'react';
import { Booking } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import {
  recoverAirportCodes,
  validateIATA,
} from '@/lib/flightDisplayUtils';

/**
 * Get today's date as YYYY-MM-DD string (local wall time).
 * Used only for trip eligibility — not domain date math.
 */
function getTodayDateOnly(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Runs safe, idempotent repair of corrupted airport codes on active/upcoming trip flights.
 * Only repairs when two valid IATA codes can be confidently recovered from text fields.
 *
 * @param tripEndDate - Trip end_date in YYYY-MM-DD format. Past trips are skipped.
 */
export function useFlightAirportRepair(
  tripId: string,
  tripEndDate: string | undefined,
  bookings: Booking[],
) {
  const repairedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // v3.13.5: Only run for active/upcoming trips (end_date >= today)
    if (!tripEndDate) return;
    const today = getTodayDateOnly();
    if (tripEndDate < today) return;

    const flightBookings = bookings.filter(b => b.booking_type === 'flight');
    if (flightBookings.length === 0) return;

    const repairCorruptedBookings = async () => {
      for (const booking of flightBookings) {
        // Skip if already repaired this session
        if (repairedRef.current.has(booking.id)) continue;

        // Skip if airport codes are already valid
        const depValid = validateIATA(booking.departure_airport_code);
        const arrValid = validateIATA(booking.arrival_airport_code);
        if (depValid && arrValid) {
          repairedRef.current.add(booking.id);
          continue;
        }

        // Attempt high-confidence recovery from text fields
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
            console.log(`[v3.13.5] Repaired airport codes for booking ${booking.id}: ${recovered.origin} → ${recovered.destination}`);
          }
        } catch (err) {
          console.warn(`[v3.13.5] Failed to repair booking ${booking.id}:`, err);
        }

        repairedRef.current.add(booking.id);
      }
    };

    repairCorruptedBookings();
  }, [tripId, tripEndDate, bookings]);
}

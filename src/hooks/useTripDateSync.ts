import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Booking, Trip } from '@/types/database';
import { parseISO, format, min, max } from 'date-fns';
import { toast } from 'sonner';

/**
 * Hook to manage trip date synchronization based on flight bookings.
 * 
 * RULE: When flights exist, trip dates default to flight range:
 * - Trip Start Date = earliest flight departure
 * - Trip End Date = latest flight arrival (or departure if no arrival)
 * 
 * This only runs when new bookings are created, not on manual edits.
 * User manual edits to trip dates are preserved.
 */

interface FlightDateRange {
  earliestDeparture: Date | null;
  latestArrival: Date | null;
}

/**
 * Calculate the date range from flight bookings only.
 */
export function calculateFlightDateRange(bookings: Booking[]): FlightDateRange {
  const flights = bookings.filter(b => b.booking_type === 'flight');
  
  if (flights.length === 0) {
    return { earliestDeparture: null, latestArrival: null };
  }
  
  const departureDates: Date[] = [];
  const arrivalDates: Date[] = [];
  
  flights.forEach(flight => {
    // Departure (start_datetime)
    if (flight.start_datetime) {
      departureDates.push(parseISO(flight.start_datetime));
    }
    
    // Arrival (end_datetime) - prefer this for end date
    if (flight.end_datetime) {
      arrivalDates.push(parseISO(flight.end_datetime));
    } else if (flight.start_datetime) {
      // Fallback to departure if no arrival
      arrivalDates.push(parseISO(flight.start_datetime));
    }
  });
  
  return {
    earliestDeparture: departureDates.length > 0 ? min(departureDates) : null,
    latestArrival: arrivalDates.length > 0 ? max(arrivalDates) : null,
  };
}

/**
 * Calculate suggested trip dates from all bookings (fallback when no flights).
 */
export function calculateNonFlightDateRange(bookings: Booking[]): { start: Date | null; end: Date | null } {
  const nonFlightBookings = bookings.filter(b => b.booking_type !== 'flight');
  
  if (nonFlightBookings.length === 0) {
    return { start: null, end: null };
  }
  
  const startDates: Date[] = [];
  const endDates: Date[] = [];
  
  nonFlightBookings.forEach(booking => {
    if (booking.start_datetime) {
      startDates.push(parseISO(booking.start_datetime));
    }
    if (booking.end_datetime) {
      endDates.push(parseISO(booking.end_datetime));
    } else if (booking.start_datetime) {
      endDates.push(parseISO(booking.start_datetime));
    }
  });
  
  return {
    start: startDates.length > 0 ? min(startDates) : null,
    end: endDates.length > 0 ? max(endDates) : null,
  };
}

/**
 * Hook that syncs trip dates based on bookings.
 * Called after bookings are created/updated to potentially update trip dates.
 * 
 * @param tripId - The trip ID to sync
 * @param bookings - Current bookings for the trip
 * @param trip - Current trip data
 * @param enabled - Whether the hook should be active
 */
export function useTripDateSync(
  tripId: string,
  bookings: Booking[],
  trip: Trip | null | undefined,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const lastBookingCountRef = useRef<number>(0);
  
  const syncTripDates = useCallback(async () => {
    if (!trip || !enabled) return;
    
    // v2.2.2: Collect ALL booking dates (flights, stays, rentals, activities, etc.)
    // Trip dates should never shrink — only extend outward to cover all bookings.
    if (bookings.length === 0) return;
    
    const allStartDates: Date[] = [];
    const allEndDates: Date[] = [];
    
    bookings.forEach(booking => {
      if (booking.start_datetime) {
        allStartDates.push(parseISO(booking.start_datetime));
      }
      if (booking.end_datetime) {
        allEndDates.push(parseISO(booking.end_datetime));
      } else if (booking.start_datetime) {
        allEndDates.push(parseISO(booking.start_datetime));
      }
    });
    
    if (allStartDates.length === 0) return;
    
    const minBookingStart = format(min(allStartDates), 'yyyy-MM-dd');
    const maxBookingEnd = format(max(allEndDates.length > 0 ? allEndDates : allStartDates), 'yyyy-MM-dd');
    
    const tripStartDate = trip.start_date;
    const tripEndDate = trip.end_date;
    
    // v2.2.2: Only EXTEND outward, never shrink
    const newStartDate = minBookingStart < tripStartDate ? minBookingStart : tripStartDate;
    const newEndDate = maxBookingEnd > tripEndDate ? maxBookingEnd : tripEndDate;
    
    const datesChanged = newStartDate !== tripStartDate || newEndDate !== tripEndDate;
    
    if (datesChanged) {
      try {
        const { error } = await supabase
          .from('trips')
          .update({
            start_date: newStartDate,
            end_date: newEndDate,
          })
          .eq('id', tripId);
        
        if (!error) {
          queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
          queryClient.invalidateQueries({ queryKey: ['trips'] });
          
          // v2.2.2: Updated notification text
          toast.info(`Trip dates updated to cover all bookings: ${newStartDate} to ${newEndDate}`);
        }
      } catch (err) {
        console.error('Failed to sync trip dates:', err);
      }
    }
  }, [tripId, bookings, trip, enabled, queryClient]);
  
  // Trigger sync when booking count increases (new booking added)
  useEffect(() => {
    const currentCount = bookings.length;
    const previousCount = lastBookingCountRef.current;
    
    // Only sync when bookings are added (count increases)
    if (currentCount > previousCount && previousCount > 0) {
      syncTripDates();
    }
    
    lastBookingCountRef.current = currentCount;
  }, [bookings.length, syncTripDates]);
  
  return { syncTripDates };
}

/**
 * Utility function to get suggested trip dates from bookings.
 * Used during trip creation to set initial dates from parsed bookings.
 */
export function getSuggestedTripDates(bookings: Array<{ 
  booking_type: string; 
  start_datetime: string; 
  end_datetime?: string;
}>): { start_date: string | null; end_date: string | null } {
  // First, check for flights
  const flights = bookings.filter(b => b.booking_type === 'flight');
  
  if (flights.length > 0) {
    const departureDates: Date[] = [];
    const arrivalDates: Date[] = [];
    
    flights.forEach(flight => {
      if (flight.start_datetime) {
        departureDates.push(new Date(flight.start_datetime));
      }
      if (flight.end_datetime) {
        arrivalDates.push(new Date(flight.end_datetime));
      } else if (flight.start_datetime) {
        arrivalDates.push(new Date(flight.start_datetime));
      }
    });
    
    if (departureDates.length > 0 && arrivalDates.length > 0) {
      return {
        start_date: format(min(departureDates), 'yyyy-MM-dd'),
        end_date: format(max(arrivalDates), 'yyyy-MM-dd'),
      };
    }
  }
  
  // Fallback to non-flight bookings
  const allBookings = bookings.filter(b => b.start_datetime);
  if (allBookings.length > 0) {
    const startDates = allBookings.map(b => new Date(b.start_datetime));
    const endDates = allBookings
      .filter(b => b.end_datetime)
      .map(b => new Date(b.end_datetime!));
    
    return {
      start_date: format(min(startDates), 'yyyy-MM-dd'),
      end_date: endDates.length > 0 
        ? format(max(endDates), 'yyyy-MM-dd')
        : format(max(startDates), 'yyyy-MM-dd'),
    };
  }
  
  return { start_date: null, end_date: null };
}

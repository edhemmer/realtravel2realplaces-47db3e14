import { Booking, Trip } from '@/types/database';
import { parseISO, startOfDay, endOfDay, isBefore, isAfter, min, max } from 'date-fns';

/**
 * Trip Date Range Calculation Utilities (v2.2.2)
 * 
 * RULE: Trip dates NEVER shrink. They only extend outward to cover all bookings.
 * - Start with manual trip dates as baseline
 * - Extend start earlier if any booking starts before trip start
 * - Extend end later if any booking ends after trip end
 * - All booking types contribute (flights, stays, rentals, activities, transport)
 */

interface TripDateRange {
  startDate: Date;
  endDate: Date;
  isFlightAnchored: boolean;
}

/**
 * Calculate the effective trip date range based on bookings.
 * Flights take priority - if flights exist, they define the trip dates.
 * 
 * @param trip - The trip object with manual start/end dates
 * @param bookings - All bookings for this trip
 * @returns TripDateRange with effective dates and whether flights were used
 */
export function calculateTripDateRange(trip: Trip, bookings: Booking[]): TripDateRange {
  const manualStart = parseISO(trip.start_date);
  const manualEnd = parseISO(trip.end_date);
  
  // v2.2.2: Start with manual dates as baseline, extend outward only
  let effectiveStart = startOfDay(manualStart);
  let effectiveEnd = endOfDay(manualEnd);
  const hasFlights = bookings.some(b => b.booking_type === 'flight');
  
  if (bookings.length > 0) {
    const allDates: Date[] = [];
    
    bookings.forEach(booking => {
      allDates.push(parseISO(booking.start_datetime));
      if (booking.end_datetime) {
        allDates.push(parseISO(booking.end_datetime));
      }
    });
    
    if (allDates.length > 0) {
      const minBooking = startOfDay(min(allDates));
      const maxBooking = endOfDay(max(allDates));
      
      // Only extend outward, never shrink
      if (isBefore(minBooking, effectiveStart)) effectiveStart = minBooking;
      if (isAfter(maxBooking, effectiveEnd)) effectiveEnd = maxBooking;
    }
  }
  
  return {
    startDate: effectiveStart,
    endDate: effectiveEnd,
    isFlightAnchored: hasFlights,
  };
}

/**
 * Check if a booking's dates fall outside the flight-anchored trip range.
 * Used to warn users if stays/rentals are outside the flight dates.
 * 
 * @param bookingStart - Start datetime of the booking
 * @param bookingEnd - End datetime of the booking (optional)
 * @param tripRange - The calculated trip date range
 * @returns true if booking dates are outside the trip range
 */
export function isBookingOutsideFlightRange(
  bookingStart: Date,
  bookingEnd: Date | null,
  tripRange: TripDateRange
): boolean {
  // Only relevant if trip is flight-anchored
  if (!tripRange.isFlightAnchored) {
    return false;
  }
  
  const bookingStartDay = startOfDay(bookingStart);
  const bookingEndDay = bookingEnd ? startOfDay(bookingEnd) : bookingStartDay;
  const tripStartDay = startOfDay(tripRange.startDate);
  const tripEndDay = startOfDay(tripRange.endDate);
  
  return isBefore(bookingStartDay, tripStartDay) || 
         isAfter(bookingEndDay, tripEndDay);
}

/**
 * Get the "key time" to display for a booking based on its type.
 * - Flights: DEPARTURE time
 * - Stays: CHECK-IN time
 * - Rentals: PICKUP time
 * - Activities: START time
 * 
 * @param booking - The booking object
 * @returns The primary datetime to display
 */
export function getBookingKeyTime(booking: Booking): Date {
  // All booking types use start_datetime as the key time:
  // - Flight: departure
  // - Stay: check-in
  // - Car rental: pickup
  // - Activity: start
  return parseISO(booking.start_datetime);
}

/**
 * Get a human-readable label for the booking's key event.
 * 
 * @param bookingType - The type of booking
 * @param isEnd - Whether this is for the end event (check-out, drop-off)
 * @returns Label string
 */
export function getBookingEventLabel(
  bookingType: Booking['booking_type'], 
  isEnd: boolean = false
): string {
  switch (bookingType) {
    case 'flight':
      return isEnd ? 'Arrives' : 'Departs';
    case 'stay':
      return isEnd ? 'Check Out' : 'Check In';
    case 'car_rental':
      return isEnd ? 'Drop-off' : 'Pickup';
    case 'activity':
      return isEnd ? 'Ends' : 'Starts';
    default:
      return isEnd ? 'End' : 'Start';
  }
}

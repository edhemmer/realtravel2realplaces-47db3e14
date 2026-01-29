import { Booking, Trip } from '@/types/database';
import { parseISO, startOfDay, endOfDay, isBefore, isAfter, min, max } from 'date-fns';

/**
 * Trip Date Range Calculation Utilities
 * 
 * RULE: When flights exist, trip dates should be anchored to flight dates.
 * - Trip Start Date = earliest flight departure date
 * - Trip End Date = latest flight date (prefer arrival if available, else departure)
 * 
 * Stays and rentals should NOT extend the trip dates beyond this range.
 * For driving-only trips (no flights), trip dates remain as manually set.
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
  const flights = bookings.filter(b => b.booking_type === 'flight');
  
  // Default to trip's manual dates
  const manualStart = parseISO(trip.start_date);
  const manualEnd = parseISO(trip.end_date);
  
  // If no flights, use manual trip dates (no auto-calculation for driving trips)
  if (flights.length === 0) {
    return {
      startDate: startOfDay(manualStart),
      endDate: endOfDay(manualEnd),
      isFlightAnchored: false,
    };
  }
  
  // Calculate date range from flights
  const flightDates: Date[] = [];
  
  flights.forEach(flight => {
    // Add departure date
    flightDates.push(parseISO(flight.start_datetime));
    
    // Add arrival date if available (prefer arrival for end date)
    if (flight.end_datetime) {
      flightDates.push(parseISO(flight.end_datetime));
    }
  });
  
  // Find earliest and latest flight dates
  const earliestFlight = min(flightDates);
  const latestFlight = max(flightDates);
  
  return {
    startDate: startOfDay(earliestFlight),
    endDate: endOfDay(latestFlight),
    isFlightAnchored: true,
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

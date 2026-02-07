/**
 * v2.0.3: Airport Context Utilities
 * Internal helpers for airport data - no UI exposure
 */

import { Booking } from '@/types/database';
import { AirportContext, FlightAirportData, createAirportContext, isValidIATACode } from '@/types/airport';

/**
 * Extracts airport context from a flight booking
 * Only uses data explicitly present in the booking - no assumptions
 * @param booking - Flight booking record
 * @returns FlightAirportData with departure and arrival contexts
 */
export function extractFlightAirportData(booking: Booking): FlightAirportData {
  // Only process flight bookings
  if (booking.booking_type !== 'flight') {
    return { departure: null, arrival: null };
  }

  // Access the new airport columns (cast to any for now until types regenerate)
  const bookingWithAirports = booking as Booking & {
    departure_airport_code?: string | null;
    departure_airport_name?: string | null;
    arrival_airport_code?: string | null;
    arrival_airport_name?: string | null;
  };

  let departure: AirportContext | null = null;
  let arrival: AirportContext | null = null;

  // Extract departure airport if code exists and is valid
  if (isValidIATACode(bookingWithAirports.departure_airport_code)) {
    departure = createAirportContext(
      bookingWithAirports.departure_airport_code!,
      bookingWithAirports.departure_airport_name
    );
  }

  // Extract arrival airport if code exists and is valid
  if (isValidIATACode(bookingWithAirports.arrival_airport_code)) {
    arrival = createAirportContext(
      bookingWithAirports.arrival_airport_code!,
      bookingWithAirports.arrival_airport_name
    );
  }

  return { departure, arrival };
}

/**
 * Determines if a trip has any airport segments
 * Derived from bookings - not stored in database
 * @param bookings - Array of trip bookings
 * @returns true if any flight booking exists
 */
export function tripHasAirportSegments(bookings: Booking[]): boolean {
  return bookings.some(b => b.booking_type === 'flight');
}

/**
 * Collects all unique airport contexts from a trip's bookings
 * @param bookings - Array of trip bookings
 * @returns Array of unique AirportContext objects
 */
export function collectTripAirports(bookings: Booking[]): AirportContext[] {
  const airportMap = new Map<string, AirportContext>();

  bookings.forEach(booking => {
    if (booking.booking_type !== 'flight') return;

    const { departure, arrival } = extractFlightAirportData(booking);

    if (departure && !airportMap.has(departure.airport_code)) {
      airportMap.set(departure.airport_code, departure);
    }

    if (arrival && !airportMap.has(arrival.airport_code)) {
      airportMap.set(arrival.airport_code, arrival);
    }
  });

  return Array.from(airportMap.values());
}

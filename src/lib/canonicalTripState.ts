/**
 * v2.0.7: Canonical Trip State Service
 * 
 * SINGLE SOURCE OF TRUTH for trip dates, times, and costs.
 * All tabs and components MUST read from this service rather than
 * performing their own calculations.
 * 
 * DATA INTEGRITY GUARANTEES:
 * - Trip date range is flight-anchored when flights exist
 * - Timeline events are structured for consistent display
 * - Cost totals use normalized flight costs to prevent duplication
 * - All values are defensive (safe defaults, no NaN/Infinity)
 */

import { Trip, Booking, Expense, Parking } from '@/types/database';
import { parseISO, min, max, startOfDay, endOfDay } from 'date-fns';
import { 
  calculateTripCostSummary, 
  TripCostSummary,
  normalizeFlightBookingCosts,
  NormalizedAirfareResult,
} from './expenseCalculations';
import { hasExplicitTime, parseDatetimeForDisplay } from './datetimeIntegrity';
import { getAirportTimeZone } from './airportTimezones';
import { WeatherSnapshot } from './canonicalWeather';
import { resolveBookingTimezone, resolveDestinationTimezone } from './canonicalTimeNormalizer';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Canonical trip date range
 */
export interface CanonicalDateRange {
  /** Trip start date (midnight) */
  startDate: Date;
  /** Trip end date (end of day) */
  endDate: Date;
  /** Whether dates are derived from flights (true) or manual/other bookings (false) */
  isFlightAnchored: boolean;
  /** Original trip start_date string for display */
  startDateStr: string;
  /** Original trip end_date string for display */
  endDateStr: string;
}

/**
 * Timeline event types for structured timeline display
 */
export type TimelineEventType = 
  | 'flight'  // v2.1.22: Combined flight (departure + arrival on one row)
  | 'flight_departure'  // Deprecated: kept for backwards compat
  | 'flight_arrival'    // Deprecated: kept for backwards compat
  | 'hotel_checkin'
  | 'hotel_checkout'
  | 'rental_pickup'
  | 'rental_dropoff'
  | 'activity_start'
  | 'activity_end'
  | 'parking_start'
  | 'parking_end'
  | 'transport_departure'
  | 'transport_arrival';

/**
 * Canonical timeline event
 * Unified structure for all booking/parking events
 */
export interface CanonicalTimelineEvent {
  /** Unique event ID */
  id: string;
  /** Source record ID (booking.id or parking.id) */
  sourceId: string;
  /** Source type */
  sourceType: 'booking' | 'parking';
  /** Booking type (flight, stay, etc.) or 'parking' */
  bookingType: string;
  /** Event type (departure, checkin, etc.) */
  eventType: TimelineEventType;
  /** Display title */
  title: string;
  /** Display subtitle */
  subtitle: string;
  /** Event datetime */
  datetime: Date;
  /** Whether the original datetime had an explicit time */
  hasExplicitTime: boolean;
  /** Address for maps link */
  address?: string;
  /** External link URL */
  linkUrl?: string;
  /** Transport mode for transport bookings */
  transportMode?: string;
  /** Activity-specific: ticket required */
  ticketRequired?: boolean;
  /** Activity-specific: tickets purchased */
  ticketsPurchased?: boolean;
  /** Activity-specific: source (explore/confirmation) */
  activitySource?: string;
  
  // v2.1.22: Flight-specific fields for combined display
  /** Departure airport code (e.g., DEN) */
  departureAirportCode?: string;
  /** Arrival airport code (e.g., COS) */
  arrivalAirportCode?: string;
  /** Departure time as Date (for combined flight display) */
  departureTime?: Date;
  /** Arrival time as Date (for combined flight display) */
  arrivalTime?: Date;
  /** Whether departure time is explicit */
  hasDepartureTime?: boolean;
  /** Whether arrival time is explicit */
  hasArrivalTime?: boolean;
  /** Confirmation number (for combined flight subtitle) */
  confirmationNumber?: string;

  // v2.2.4: Timezone-aware local time fields for flights
  /** ISO string representing departure in airport-local time (display directly, no further shifting) */
  departureLocalTime?: string;
  /** IANA timezone of departure airport (e.g., "America/New_York") */
  departureTimeZone?: string;
  /** ISO string representing arrival in airport-local time (display directly, no further shifting) */
  arrivalLocalTime?: string;
  /** IANA timezone of arrival airport (e.g., "America/Denver") */
  arrivalTimeZone?: string;

  // v2.2.10: Canonical local time fields for ALL event types
  /** Raw stored datetime string — display digits directly, no Date() shifting */
  eventLocalDateTime?: string;
  /** IANA timezone of event location, null = "local-unknown" (render as-is) */
  eventTimeZone?: string | null;
}

/**
 * Canonical cost summary with currency awareness
 */
export interface CanonicalCostSummary extends TripCostSummary {
  /** Normalized per-booking costs for expense display */
  perBookingCost: Record<string, number>;
  /** Normalized per-booking my_share for expense display */
  perBookingMyShare: Record<string, number>;
  /** Primary currency (USD assumed, no FX conversion) */
  primaryCurrency: string;
}

/**
 * Complete canonical trip state
 */
export interface CanonicalTripState {
  /** Trip record */
  trip: Trip;
  /** Canonical date range */
  dateRange: CanonicalDateRange;
  /** All timeline events sorted chronologically */
  timelineEvents: CanonicalTimelineEvent[];
  /** Canonical cost summary */
  costs: CanonicalCostSummary;
  /** v2.2.6: Canonical weather data keyed by "${dateISO}::${locationId}" */
  weatherByKey: Record<string, WeatherSnapshot>;
  /** v2.2.13: True if trip frame has unresolved time validation issues */
  framePendingValidation?: boolean;
  /** Quick accessors */
  hasFlights: boolean;
  hasStays: boolean;
  hasRentals: boolean;
  hasActivities: boolean;
  hasParking: boolean;
}

// ============================================================================
// DATE RANGE CALCULATION
// ============================================================================

/**
 * Calculate canonical date range for a trip
 * 
 * v2.2.2 RULES (extend-only, never shrink):
 * 1. Start with the trip's manual dates as the baseline
 * 2. Collect ALL booking dates (flights, stays, rentals, activities, transport)
 * 3. Extend the range outward if any booking falls outside the manual dates
 * 4. Never shrink below the manual trip dates
 */
export function calculateCanonicalDateRange(
  trip: Trip,
  bookings: Booking[]
): CanonicalDateRange {
  const manualStart = parseISO(trip.start_date);
  const manualEnd = parseISO(trip.end_date);
  
  // Start with manual dates as baseline
  let effectiveStart = startOfDay(manualStart);
  let effectiveEnd = endOfDay(manualEnd);
  const hasFlights = bookings.some(b => b.booking_type === 'flight');
  
  // Collect ALL booking dates (every type contributes to the outer bounds)
  if (bookings.length > 0) {
    const allDates: Date[] = [];
    
    bookings.forEach(booking => {
      const start = parseDatetimeForDisplay(booking.start_datetime);
      if (start) allDates.push(start);
      
      if (booking.end_datetime) {
        const end = parseDatetimeForDisplay(booking.end_datetime);
        if (end) allDates.push(end);
      }
    });
    
    if (allDates.length > 0) {
      const minBooking = startOfDay(min(allDates));
      const maxBooking = endOfDay(max(allDates));
      
      // Only extend outward, never shrink
      if (minBooking < effectiveStart) effectiveStart = minBooking;
      if (maxBooking > effectiveEnd) effectiveEnd = maxBooking;
    }
  }
  
  return {
    startDate: effectiveStart,
    endDate: effectiveEnd,
    isFlightAnchored: hasFlights,
    startDateStr: trip.start_date,
    endDateStr: trip.end_date,
  };
}

// ============================================================================
// TIMELINE EVENTS
// ============================================================================

/**
 * Build canonical timeline events from bookings and parking
 * 
 * KEY TIMES PER TYPE:
 * - Flight: departure time (start), optionally arrival (end)
 * - Stay: check-in (start), check-out (end)
 * - Car Rental: pickup (start), drop-off (end)
 * - Activity: start time, optionally end time
 * - Parking: start time, end time
 * - Transport: departure (start), arrival (end)
 */
export function buildCanonicalTimeline(
  bookings: Booking[],
  parkingList: Parking[],
  tripDestinationTimeZone?: string | null
): CanonicalTimelineEvent[] {
  const events: CanonicalTimelineEvent[] = [];
  const destTz = tripDestinationTimeZone || null;
  // Process bookings
  bookings.forEach(booking => {
    const startDate = parseDatetimeForDisplay(booking.start_datetime);
    const endDate = booking.end_datetime ? parseDatetimeForDisplay(booking.end_datetime) : null;
    
    if (!startDate) return;
    
    switch (booking.booking_type) {
      case 'flight': {
        // v2.2.4: Resolve airport timezones for correct local time display
        const depTz = getAirportTimeZone(booking.departure_airport_code);
        const arrTz = getAirportTimeZone(booking.arrival_airport_code);

        // v2.1.22: Combined flight entry (departure + arrival on one row)
        events.push({
          id: `${booking.id}-flight`,
          sourceId: booking.id,
          sourceType: 'booking',
          bookingType: 'flight',
          eventType: 'flight',
          title: booking.airline || booking.vendor_name,
          subtitle: booking.confirmation_number || '',
          datetime: startDate,
          hasExplicitTime: hasExplicitTime(booking.start_datetime),
          address: booking.address,
          linkUrl: booking.link_url,
          departureAirportCode: booking.departure_airport_code || undefined,
          arrivalAirportCode: booking.arrival_airport_code || undefined,
          departureTime: startDate,
          arrivalTime: endDate || undefined,
          hasDepartureTime: hasExplicitTime(booking.start_datetime),
          hasArrivalTime: booking.end_datetime ? hasExplicitTime(booking.end_datetime) : false,
          confirmationNumber: booking.confirmation_number || undefined,
          // v2.2.4: Timezone-aware local time fields
          departureLocalTime: booking.start_datetime,
          departureTimeZone: depTz,
          arrivalLocalTime: booking.end_datetime || undefined,
          arrivalTimeZone: arrTz,
          // v2.2.10: Canonical local time (departure for sort/display)
          eventLocalDateTime: booking.start_datetime,
          eventTimeZone: depTz || null,
        });
        break;
      }
        
      case 'stay':
        // Check-in
        events.push({
          id: `${booking.id}-checkin`,
          sourceId: booking.id,
          sourceType: 'booking',
          bookingType: 'stay',
          eventType: 'hotel_checkin',
          title: booking.property_name || booking.vendor_name,
          subtitle: `Check In · ${booking.stay_type || 'Stay'}${booking.confirmation_number ? ` · ${booking.confirmation_number}` : ''}`,
          datetime: startDate,
          hasExplicitTime: hasExplicitTime(booking.start_datetime),
          address: booking.address,
          linkUrl: booking.link_url,
          // v2.2.10: Canonical local time
          eventLocalDateTime: booking.start_datetime,
          eventTimeZone: destTz,
        });
        // Check-out
        if (endDate) {
          events.push({
            id: `${booking.id}-checkout`,
            sourceId: booking.id,
            sourceType: 'booking',
            bookingType: 'stay',
            eventType: 'hotel_checkout',
            title: booking.property_name || booking.vendor_name,
            subtitle: `Check Out · ${booking.stay_type || 'Stay'}`,
            datetime: endDate,
            hasExplicitTime: hasExplicitTime(booking.end_datetime),
            address: booking.address,
            linkUrl: booking.link_url,
            // v2.2.10: Canonical local time
            eventLocalDateTime: booking.end_datetime || undefined,
            eventTimeZone: destTz,
          });
        }
        break;
        
      case 'car_rental':
        // Pickup
        events.push({
          id: `${booking.id}-pickup`,
          sourceId: booking.id,
          sourceType: 'booking',
          bookingType: 'car_rental',
          eventType: 'rental_pickup',
          title: booking.rental_company || booking.vendor_name,
          subtitle: `Pickup${booking.confirmation_number ? ` · ${booking.confirmation_number}` : ''}`,
          datetime: startDate,
          hasExplicitTime: hasExplicitTime(booking.start_datetime),
          address: booking.pickup_location || booking.address,
          linkUrl: booking.link_url,
          // v2.2.10: Canonical local time
          eventLocalDateTime: booking.start_datetime,
          eventTimeZone: destTz,
        });
        // Drop-off
        if (endDate) {
          events.push({
            id: `${booking.id}-dropoff`,
            sourceId: booking.id,
            sourceType: 'booking',
            bookingType: 'car_rental',
            eventType: 'rental_dropoff',
            title: booking.rental_company || booking.vendor_name,
            subtitle: 'Drop-off',
            datetime: endDate,
            hasExplicitTime: hasExplicitTime(booking.end_datetime),
            address: booking.return_location || booking.pickup_location || booking.address,
            linkUrl: booking.link_url,
            // v2.2.10: Canonical local time
            eventLocalDateTime: booking.end_datetime || undefined,
            eventTimeZone: destTz,
          });
        }
        break;
        
      case 'transport':
        // Transport departure
        events.push({
          id: `${booking.id}-departure`,
          sourceId: booking.id,
          sourceType: 'booking',
          bookingType: 'transport',
          eventType: 'transport_departure',
          title: booking.operator || booking.vendor_name,
          subtitle: `${booking.from_location || ''} → ${booking.to_location || ''}`.trim() || 'Departure',
          datetime: startDate,
          hasExplicitTime: hasExplicitTime(booking.start_datetime),
          address: booking.address,
          linkUrl: booking.link_url,
          transportMode: booking.transport_mode,
          // v2.2.10: Canonical local time
          eventLocalDateTime: booking.start_datetime,
          eventTimeZone: destTz,
        });
        // Transport arrival
        if (endDate) {
          events.push({
            id: `${booking.id}-arrival`,
            sourceId: booking.id,
            sourceType: 'booking',
            bookingType: 'transport',
            eventType: 'transport_arrival',
            title: booking.operator || booking.vendor_name,
            subtitle: `Arrival at ${booking.to_location || 'destination'}`,
            datetime: endDate,
            hasExplicitTime: hasExplicitTime(booking.end_datetime),
            address: booking.address,
            linkUrl: booking.link_url,
            transportMode: booking.transport_mode,
            // v2.2.10: Canonical local time
            eventLocalDateTime: booking.end_datetime || undefined,
            eventTimeZone: destTz,
          });
        }
        break;
        
      case 'activity':
        // Activity start
        events.push({
          id: `${booking.id}-start`,
          sourceId: booking.id,
          sourceType: 'booking',
          bookingType: 'activity',
          eventType: 'activity_start',
          title: booking.vendor_name,
          subtitle: booking.location_summary || 'Activity',
          datetime: startDate,
          hasExplicitTime: hasExplicitTime(booking.start_datetime),
          address: booking.address,
          linkUrl: booking.link_url || booking.booking_url,
          ticketRequired: booking.ticket_required || booking.advance_recommended || false,
          ticketsPurchased: booking.tickets_purchased || false,
          activitySource: booking.activity_source || undefined,
          // v2.2.10: Canonical local time
          eventLocalDateTime: booking.start_datetime,
          eventTimeZone: destTz,
        });
        // Activity end (if specified)
        if (endDate) {
          events.push({
            id: `${booking.id}-end`,
            sourceId: booking.id,
            sourceType: 'booking',
            bookingType: 'activity',
            eventType: 'activity_end',
            title: booking.vendor_name,
            subtitle: 'Ends',
            datetime: endDate,
            hasExplicitTime: hasExplicitTime(booking.end_datetime),
            address: booking.address,
            linkUrl: booking.link_url || booking.booking_url,
            // v2.2.10: Canonical local time
            eventLocalDateTime: booking.end_datetime || undefined,
            eventTimeZone: destTz,
          });
        }
        break;
    }
  });
  
  // Process parking
  parkingList.forEach(parking => {
    const startDate = parseDatetimeForDisplay(parking.start_datetime);
    const endDate = parking.end_datetime ? parseDatetimeForDisplay(parking.end_datetime) : null;
    
    if (!startDate) return;
    
    // Parking start
    events.push({
      id: `${parking.id}-start`,
      sourceId: parking.id,
      sourceType: 'parking',
      bookingType: 'parking',
      eventType: 'parking_start',
      title: parking.label,
      subtitle: `Start · ${parking.parking_type}`,
      datetime: startDate,
      hasExplicitTime: hasExplicitTime(parking.start_datetime),
      address: parking.address,
      // v2.2.10: Canonical local time
      eventLocalDateTime: parking.start_datetime,
      eventTimeZone: destTz,
    });
    
    // Parking end
    if (endDate) {
      events.push({
        id: `${parking.id}-end`,
        sourceId: parking.id,
        sourceType: 'parking',
        bookingType: 'parking',
        eventType: 'parking_end',
        title: parking.label,
        subtitle: `End · ${parking.parking_type}`,
        datetime: endDate,
        hasExplicitTime: hasExplicitTime(parking.end_datetime),
        address: parking.address,
        // v2.2.10: Canonical local time
        eventLocalDateTime: parking.end_datetime || undefined,
        eventTimeZone: destTz,
      });
    }
  });
  
  // Sort chronologically, with unknown times (hasExplicitTime=false) after known times on same date
  return events.sort((a, b) => {
    const timeDiff = a.datetime.getTime() - b.datetime.getTime();
    if (timeDiff !== 0) return timeDiff;
    
    // Same datetime: explicit times come first
    if (a.hasExplicitTime && !b.hasExplicitTime) return -1;
    if (!a.hasExplicitTime && b.hasExplicitTime) return 1;
    return 0;
  });
}

// ============================================================================
// COST CALCULATION
// ============================================================================

/**
 * Calculate canonical cost summary
 * Wraps existing expenseCalculations with additional per-booking data
 */
export function calculateCanonicalCosts(
  expenses: Expense[],
  bookings: Booking[],
  parkingList: Parking[]
): CanonicalCostSummary {
  // Get base cost summary
  const baseSummary = calculateTripCostSummary(expenses, bookings, parkingList);
  
  // Get normalized per-booking costs for expense display
  const { perBookingCost, perBookingMyShare } = normalizeFlightBookingCosts(bookings);
  
  return {
    ...baseSummary,
    perBookingCost,
    perBookingMyShare,
    primaryCurrency: 'USD', // No FX conversion in this patch
  };
}

// ============================================================================
// MAIN SERVICE FUNCTION
// ============================================================================

/**
 * Get complete canonical trip state
 * 
 * This is THE SINGLE SOURCE OF TRUTH for trip dates, times, and costs.
 * All UI components should call this function rather than calculating their own values.
 * 
 * @param trip - The trip record
 * @param bookings - All bookings for this trip
 * @param expenses - All expenses for this trip
 * @param parkingList - All parking entries for this trip
 * @returns Complete canonical trip state
 */
export function getCanonicalTripState(
  trip: Trip,
  bookings: Booking[],
  expenses: Expense[],
  parkingList: Parking[]
): CanonicalTripState {
  // v2.2.10: Resolve destination timezone for non-flight booking events
  const destTz = resolveDestinationTimezone(trip.destination_state, trip.destination_country);
  
  // Calculate date range
  const dateRange = calculateCanonicalDateRange(trip, bookings);
  
  // Build timeline events (pass destination timezone for non-flight events)
  const timelineEvents = buildCanonicalTimeline(bookings, parkingList, destTz);
  
  // Calculate costs
  const costs = calculateCanonicalCosts(expenses, bookings, parkingList);
  
  // Quick accessors
  const hasFlights = bookings.some(b => b.booking_type === 'flight');
  const hasStays = bookings.some(b => b.booking_type === 'stay');
  const hasRentals = bookings.some(b => b.booking_type === 'car_rental');
  const hasActivities = bookings.some(b => b.booking_type === 'activity');
  const hasParking = parkingList.length > 0;
  
  return {
    trip,
    dateRange,
    timelineEvents,
    costs,
    weatherByKey: {}, // v2.2.6: Populated by consumer hooks via forecastToSnapshots
    hasFlights,
    hasStays,
    hasRentals,
    hasActivities,
    hasParking,
  };
}

// ============================================================================
// TOUR DRAFT GENERATION - DEPRECATED (v2.1.25)
// ============================================================================

/**
 * Tour draft stop structure
 * 
 * @deprecated v2.1.25: Tours are now MANUAL ONLY - no auto-generation from bookings
 * This interface and related function are kept for backward compatibility only.
 * Do NOT use in new code.
 * 
 * PATCH 2.1.25 RULE: Tours (Engagements) are never auto-generated from bookings.
 * All stops must be manually added by the user.
 */
export interface TourDraftStop {
  name: string;
  date: string;
  start_time: string;
  end_time: string | null;
  location: string;
  notes: string;
  source: 'flight' | 'stay' | 'rental';
}

/**
 * Generate Tour draft stops from canonical timeline events
 * 
 * @deprecated v2.1.25: Tours are now MANUAL ONLY - no auto-generation from bookings
 * This function is kept for backward compatibility only. Do NOT use in new code.
 * 
 * PATCH 2.1.25 FINAL RULE:
 * - Tours (Engagements) are MANUAL, non-monetary stops only
 * - They are NEVER auto-generated from bookings
 * - The Tour tab UI has removed all "Generate from bookings" functionality
 * - All stops appear only when the user explicitly adds them
 * 
 * @param _timelineEvents - Unused, function always returns empty array
 * @returns Empty array (no auto-generation)
 */
export function generateTourDraftFromCanonicalEvents(
  _timelineEvents: CanonicalTimelineEvent[]
): TourDraftStop[] {
  // v2.1.25: Tours are manual only - return empty array
  // This function is deprecated and should not be used
  return [];
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

// Re-export existing functions for backward compatibility during migration
export { calculateTripDateRange } from './tripDateCalculations';
export { calculateTripCostSummary } from './expenseCalculations';

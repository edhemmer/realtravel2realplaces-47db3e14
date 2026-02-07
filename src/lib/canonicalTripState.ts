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
  | 'flight_departure'
  | 'flight_arrival'
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
 * RULES:
 * 1. If flights exist, use earliest departure and latest arrival/departure
 * 2. If no flights but other bookings exist, use earliest/latest booking dates
 * 3. Fallback to trip's manual dates
 */
export function calculateCanonicalDateRange(
  trip: Trip,
  bookings: Booking[]
): CanonicalDateRange {
  const manualStart = parseISO(trip.start_date);
  const manualEnd = parseISO(trip.end_date);
  
  const flights = bookings.filter(b => b.booking_type === 'flight');
  
  // RULE 1: Flight-anchored dates
  if (flights.length > 0) {
    const flightDates: Date[] = [];
    
    flights.forEach(flight => {
      const start = parseDatetimeForDisplay(flight.start_datetime);
      if (start) flightDates.push(start);
      
      if (flight.end_datetime) {
        const end = parseDatetimeForDisplay(flight.end_datetime);
        if (end) flightDates.push(end);
      }
    });
    
    if (flightDates.length > 0) {
      return {
        startDate: startOfDay(min(flightDates)),
        endDate: endOfDay(max(flightDates)),
        isFlightAnchored: true,
        startDateStr: trip.start_date,
        endDateStr: trip.end_date,
      };
    }
  }
  
  // RULE 2: Non-flight bookings (stays, rentals, activities)
  const nonFlightBookings = bookings.filter(b => b.booking_type !== 'flight');
  if (nonFlightBookings.length > 0) {
    const bookingDates: Date[] = [];
    
    nonFlightBookings.forEach(booking => {
      const start = parseDatetimeForDisplay(booking.start_datetime);
      if (start) bookingDates.push(start);
      
      if (booking.end_datetime) {
        const end = parseDatetimeForDisplay(booking.end_datetime);
        if (end) bookingDates.push(end);
      }
    });
    
    if (bookingDates.length > 0) {
      return {
        startDate: startOfDay(min(bookingDates)),
        endDate: endOfDay(max(bookingDates)),
        isFlightAnchored: false,
        startDateStr: trip.start_date,
        endDateStr: trip.end_date,
      };
    }
  }
  
  // RULE 3: Fallback to manual trip dates
  return {
    startDate: startOfDay(manualStart),
    endDate: endOfDay(manualEnd),
    isFlightAnchored: false,
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
  parkingList: Parking[]
): CanonicalTimelineEvent[] {
  const events: CanonicalTimelineEvent[] = [];
  
  // Process bookings
  bookings.forEach(booking => {
    const startDate = parseDatetimeForDisplay(booking.start_datetime);
    const endDate = booking.end_datetime ? parseDatetimeForDisplay(booking.end_datetime) : null;
    
    if (!startDate) return;
    
    switch (booking.booking_type) {
      case 'flight':
        // Flight departure
        events.push({
          id: `${booking.id}-departure`,
          sourceId: booking.id,
          sourceType: 'booking',
          bookingType: 'flight',
          eventType: 'flight_departure',
          title: booking.airline || booking.vendor_name,
          subtitle: `Departure${booking.confirmation_number ? ` · ${booking.confirmation_number}` : ''}`,
          datetime: startDate,
          hasExplicitTime: hasExplicitTime(booking.start_datetime),
          address: booking.address,
          linkUrl: booking.link_url,
        });
        // Flight arrival (if end time exists)
        if (endDate) {
          events.push({
            id: `${booking.id}-arrival`,
            sourceId: booking.id,
            sourceType: 'booking',
            bookingType: 'flight',
            eventType: 'flight_arrival',
            title: booking.airline || booking.vendor_name,
            subtitle: 'Arrival',
            datetime: endDate,
            hasExplicitTime: hasExplicitTime(booking.end_datetime),
            address: booking.address,
            linkUrl: booking.link_url,
          });
        }
        break;
        
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
  // Calculate date range
  const dateRange = calculateCanonicalDateRange(trip, bookings);
  
  // Build timeline events
  const timelineEvents = buildCanonicalTimeline(bookings, parkingList);
  
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
    hasFlights,
    hasStays,
    hasRentals,
    hasActivities,
    hasParking,
  };
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

// Re-export existing functions for backward compatibility during migration
export { calculateTripDateRange } from './tripDateCalculations';
export { calculateTripCostSummary } from './expenseCalculations';

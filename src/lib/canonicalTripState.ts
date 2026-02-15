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
import {
  getTodayDateOnly as policyGetTodayDateOnly,
  getNowLocalDateTime as policyGetNowLocalDateTime,
  extractTimeHHMM as policyExtractTimeHHMM,
} from '@/lib/canonicalTimePolicy';
import { TripEvent } from '@/types/tripEvent';
import { startOfDay, endOfDay } from 'date-fns';
import {
  calculateTripCostSummary, 
  TripCostSummary,
  normalizeFlightBookingCosts,
  NormalizedAirfareResult,
} from './expenseCalculations';
import { hasExplicitTime } from './datetimeIntegrity';
import { getAirportTimeZone } from './airportTimezones';
import { WeatherSnapshot } from './canonicalWeather';
import { resolveBookingTimezone, resolveDestinationTimezone, convertUtcToLocalString } from './canonicalTimeNormalizer';
import { preserveTimeString } from './canonicalTimePreservation';

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
  | 'transport_arrival'
  | 'engagement_start';  // v2.2.5: Business stop visible in canonical stream

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
  sourceType: 'booking' | 'parking' | 'engagement';
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
  // v2.2.5: Use string-based date extraction to avoid browser timezone shifts.
  // Parse trip dates at noon to avoid DST edge cases for Date objects.
  const manualStart = parseDateAtNoon(trip.start_date);
  const manualEnd = parseDateAtNoon(trip.end_date);
  
  // Start with manual dates as baseline
  let effectiveStart = startOfDay(manualStart);
  let effectiveEnd = endOfDay(manualEnd);
  const hasFlights = bookings.some(b => b.booking_type === 'flight');
  
  // Collect ALL booking date strings (every type contributes to the outer bounds)
  // v2.2.5: Extract date portion directly from stored strings — no Date() timezone shifting.
  if (bookings.length > 0) {
    const allDateStrings: string[] = [];
    
    bookings.forEach(booking => {
      const startDateStr = extractDateFromDatetime(booking.start_datetime);
      if (startDateStr) allDateStrings.push(startDateStr);
      
      if (booking.end_datetime) {
        const endDateStr = extractDateFromDatetime(booking.end_datetime);
        if (endDateStr) allDateStrings.push(endDateStr);
      }
    });
    
    if (allDateStrings.length > 0) {
      allDateStrings.sort(); // YYYY-MM-DD sorts lexicographically
      const minStr = allDateStrings[0];
      const maxStr = allDateStrings[allDateStrings.length - 1];
      
      const minBooking = startOfDay(parseDateAtNoon(minStr));
      const maxBooking = endOfDay(parseDateAtNoon(maxStr));
      
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

/**
 * v2.2.5: Extract YYYY-MM-DD date portion directly from a datetime string.
 * No Date() or parseISO() — pure string extraction.
 */
function extractDateFromDatetime(datetimeStr: string | null | undefined): string | null {
  if (!datetimeStr) return null;
  const datePart = datetimeStr.substring(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  return null;
}

/**
 * v2.2.5: Parse a YYYY-MM-DD string into a Date at noon local time.
 * Using noon avoids DST boundary issues for day-of-week calculation.
 */
function parseDateAtNoon(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
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
  tripDestinationTimeZone?: string | null,
  engagementEvents?: TripEvent[]
): CanonicalTimelineEvent[] {
  const events: CanonicalTimelineEvent[] = [];
  const destTz = tripDestinationTimeZone || null;
  // Process bookings
  bookings.forEach(booking => {
    // v2.2.5: Create Date objects at noon from the date portion only.
    // These are used ONLY for the legacy `datetime` field, NOT for display.
    // All display rendering MUST use `eventLocalDateTime` string digits.
    const startDateStr = extractDateFromDatetime(booking.start_datetime);
    const startDate = startDateStr ? parseDateAtNoon(startDateStr) : null;
    const endDateStr = booking.end_datetime ? extractDateFromDatetime(booking.end_datetime) : null;
    const endDate = endDateStr ? parseDateAtNoon(endDateStr) : null;
    
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
          departureLocalTime: preserveTimeString(booking.start_datetime) || undefined,
          departureTimeZone: depTz,
          arrivalLocalTime: preserveTimeString(booking.end_datetime) || undefined,
          arrivalTimeZone: arrTz,
          // v3.11.3: Preserve time string as-is — no conversion
          eventLocalDateTime: preserveTimeString(booking.start_datetime) || undefined,
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
          // v3.11.3: Preserve time string — no Date conversion
          eventLocalDateTime: preserveTimeString(convertUtcToLocalString(booking.start_datetime, destTz)) || undefined,
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
            // v3.11.3: Preserve time string — no Date conversion
            eventLocalDateTime: preserveTimeString(convertUtcToLocalString(booking.end_datetime, destTz)) || undefined,
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
          // v3.11.3: Preserve time string — no Date conversion
          eventLocalDateTime: preserveTimeString(convertUtcToLocalString(booking.start_datetime, destTz)) || undefined,
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
            // v3.11.3: Preserve time string — no Date conversion
            eventLocalDateTime: preserveTimeString(convertUtcToLocalString(booking.end_datetime, destTz)) || undefined,
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
          // v3.11.3: Preserve time string — no Date conversion
          eventLocalDateTime: preserveTimeString(convertUtcToLocalString(booking.start_datetime, destTz)) || undefined,
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
            // v3.11.3: Preserve time string — no Date conversion
            eventLocalDateTime: preserveTimeString(convertUtcToLocalString(booking.end_datetime, destTz)) || undefined,
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
          // v3.11.3: Preserve time string — no Date conversion
          eventLocalDateTime: preserveTimeString(convertUtcToLocalString(booking.start_datetime, destTz)) || undefined,
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
            // v3.11.3: Preserve time string — no Date conversion
            eventLocalDateTime: preserveTimeString(convertUtcToLocalString(booking.end_datetime, destTz)) || undefined,
            eventTimeZone: destTz,
          });
        }
        break;
    }
  });
  
  // Process parking
  parkingList.forEach(parking => {
    // v3.9.7: Use local wall-time columns as source of truth for display
    const startLocalStr = parking.start_local_datetime || parking.start_datetime;
    const endLocalStr = parking.end_local_datetime || parking.end_datetime;
    
    const pStartDateStr = extractDateFromDatetime(startLocalStr);
    const startDate = pStartDateStr ? parseDateAtNoon(pStartDateStr) : null;
    const pEndDateStr = endLocalStr ? extractDateFromDatetime(endLocalStr) : null;
    const endDate = pEndDateStr ? parseDateAtNoon(pEndDateStr) : null;
    
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
      hasExplicitTime: hasExplicitTime(startLocalStr),
      address: parking.address,
      // v3.11.3: Preserve time string as-is
      eventLocalDateTime: preserveTimeString(startLocalStr) || undefined,
      eventTimeZone: parking.end_timezone || destTz,
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
        hasExplicitTime: hasExplicitTime(endLocalStr),
        address: parking.address,
        // v3.11.3: Preserve time string as-is
        eventLocalDateTime: preserveTimeString(endLocalStr) || undefined,
        eventTimeZone: parking.end_timezone || destTz,
      });
    }
  });

  // v2.2.5: Process engagement events from canonical trip_events stream
  // These are plan-neutral: visible to all trip members regardless of tier
  // Timeline does NOT depend on the engagements (Business-only) table
  if (engagementEvents && engagementEvents.length > 0) {
    engagementEvents.forEach(evt => {
      if (evt.event_type !== 'engagement_start') return;
      const evtDateStr = extractDateFromDatetime(evt.event_datetime);
      const evtDate = evtDateStr ? parseDateAtNoon(evtDateStr) : null;
      if (!evtDate) return;

      events.push({
        id: `${evt.source_id}-engagement`,
        sourceId: evt.source_id,
        sourceType: 'engagement',
        bookingType: 'engagement',
        eventType: 'engagement_start',
        title: evt.title || 'Stop',
        subtitle: evt.location_summary || '',
        datetime: evtDate,
        hasExplicitTime: hasExplicitTime(evt.event_datetime),
        address: evt.location_summary || undefined,
        // v3.11.3: Preserve time string — no Date conversion
        eventLocalDateTime: preserveTimeString(convertUtcToLocalString(evt.event_datetime, destTz)) || undefined,
        eventTimeZone: destTz,
      });
    });
  }

  // v3.8.3: Execution-based in-day sorting
  return sortTimelineExecutionOrder(events);
}

/**
 * v3.8.3: Extract HH:MM:SS time portion from an eventLocalDateTime string.
 */
function extractTimePortion(eventLocalDateTime: string | undefined): string {
  if (!eventLocalDateTime) return '';
  const tIdx = eventLocalDateTime.indexOf('T');
  return tIdx !== -1 ? eventLocalDateTime.substring(tIdx + 1, tIdx + 9) : '';
}

/**
 * v3.8.3: Get the end-time string for an event (used for active detection).
 * Returns HH:MM:SS or empty string if no end info available on this event.
 */
function getEventEndTime(event: CanonicalTimelineEvent): string {
  if (event.eventType === 'flight' && event.arrivalLocalTime) {
    return extractTimePortion(event.arrivalLocalTime);
  }
  // Most start events don't carry their own end time; treat as point-in-time
  return '';
}

/**
 * v3.8.3: Execution-based sort for canonical timeline events.
 *
 * Cross-day: chronological (ascending by date).
 * Within today:
 *   1. Active (started, not ended) — ascending by start
 *   2. Future (not started) — ascending by start
 *   3. Past (started and ended) — descending by start (most recent first)
 * Within non-today days: simple ascending by time.
 */
function sortTimelineExecutionOrder(events: CanonicalTimelineEvent[]): CanonicalTimelineEvent[] {
  // v3.11.2: Use canonical policy helpers — no new Date()
  const todayStr = policyGetTodayDateOnly();
  const nowDt = policyGetNowLocalDateTime();
  const nowTime = policyExtractTimeHHMM(nowDt) || '00:00';
  return events.sort((a, b) => {
    const aStr = a.eventLocalDateTime || '';
    const bStr = b.eventLocalDateTime || '';
    const aDate = aStr.substring(0, 10);
    const bDate = bStr.substring(0, 10);

    // Different days: chronological
    if (aDate < bDate) return -1;
    if (aDate > bDate) return 1;

    // Same day: explicit times before unknown times
    if (a.hasExplicitTime && !b.hasExplicitTime) return -1;
    if (!a.hasExplicitTime && b.hasExplicitTime) return 1;

    // Both have explicit times
    if (a.hasExplicitTime && b.hasExplicitTime) {
      const aTime = extractTimePortion(aStr);
      const bTime = extractTimePortion(bStr);

      // Execution-based ordering only for today
      if (aDate === todayStr) {
        // Classify: 0=active, 1=future, 2=past
        const classifyStatus = (startT: string, evt: CanonicalTimelineEvent): number => {
          if (startT > nowTime) return 1; // future
          // v3.9.2: hotel_checkin is ACTIVE all day (until checkout event passes)
          if (evt.eventType === 'hotel_checkin') return 0; // always active on check-in day
          // Started — check if ended
          const endT = getEventEndTime(evt);
          if (endT && endT <= nowTime) return 2; // past
          return 0; // active (started, not ended or no end info)
        };

        const aStatus = classifyStatus(aTime, a);
        const bStatus = classifyStatus(bTime, b);

        if (aStatus !== bStatus) return aStatus - bStatus;

        // Same bucket: past → descending, else ascending
        if (aStatus === 2) {
          return aTime > bTime ? -1 : aTime < bTime ? 1 : 0;
        }
        return aTime < bTime ? -1 : aTime > bTime ? 1 : 0;
      }

      // Non-today: ascending
      if (aTime < bTime) return -1;
      if (aTime > bTime) return 1;
    }

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
  parkingList: Parking[],
  engagementEvents?: TripEvent[]
): CanonicalTripState {
  // v2.2.10: Resolve destination timezone for non-flight booking events
  const destTz = resolveDestinationTimezone(trip.destination_state, trip.destination_country);
  
  // Calculate date range
  const dateRange = calculateCanonicalDateRange(trip, bookings);
  
  // Build timeline events (pass destination timezone for non-flight events)
  // v2.2.5: Include engagement events from canonical trip_events stream
  const timelineEvents = buildCanonicalTimeline(bookings, parkingList, destTz, engagementEvents);
  
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
// EVENT VISIBILITY CONTRACT (v2.2.5)
// ============================================================================

/**
 * v2.2.5: Canonical Event Visibility Contract
 * 
 * Guarantees that the canonical event stream is complete and consistent
 * for ALL trip members regardless of their plan tier.
 * 
 * CONTRACT RULES:
 * 1. Every booking (flight, stay, rental, activity, transport) produces timeline events
 * 2. Every parking entry produces timeline events
 * 3. Every engagement writes through to trip_events, which feeds the canonical stream
 * 4. No event source is excluded based on plan tier
 * 5. If an event cannot be safely represented, it is excluded for ALL members
 * 
 * This function validates a built canonical state and returns diagnostics.
 * It does NOT modify the state — it only checks for completeness.
 */
export interface EventVisibilityDiagnostics {
  /** Whether all known sources are represented in the timeline */
  isComplete: boolean;
  /** Count of bookings with timeline representation */
  bookingsRepresented: number;
  /** Count of parking entries with timeline representation */
  parkingRepresented: number;
  /** Count of engagement events in the canonical stream */
  engagementsRepresented: number;
  /** Total timeline events */
  totalEvents: number;
}

export function validateEventVisibilityContract(
  state: CanonicalTripState,
  bookingCount: number,
  parkingCount: number,
  engagementEventCount: number
): EventVisibilityDiagnostics {
  const bookingSourceIds = new Set<string>();
  const parkingSourceIds = new Set<string>();
  let engagementsRepresented = 0;

  state.timelineEvents.forEach(evt => {
    if (evt.sourceType === 'booking') bookingSourceIds.add(evt.sourceId);
    if (evt.sourceType === 'parking') parkingSourceIds.add(evt.sourceId);
    if (evt.sourceType === 'engagement') engagementsRepresented++;
  });

  const bookingsRepresented = bookingSourceIds.size;
  const parkingRepresented = parkingSourceIds.size;

  // Complete if all source records produced at least one timeline event
  const isComplete =
    bookingsRepresented >= bookingCount &&
    parkingRepresented >= parkingCount &&
    engagementsRepresented >= engagementEventCount;

  return {
    isComplete,
    bookingsRepresented,
    parkingRepresented,
    engagementsRepresented,
    totalEvents: state.timelineEvents.length,
  };
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

// Re-export existing functions for backward compatibility during migration
export { calculateTripDateRange } from './tripDateCalculations';
export { calculateTripCostSummary } from './expenseCalculations';

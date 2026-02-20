/**
 * v3.9.70: Timeline Creation from Full Confirmation Batch
 *
 * Creates timeline items (bookings) from ALL parsed confirmations.
 * Uses raw datetime strings for storage — never reformats for display.
 *
 * v3.9.70: Uses buildCanonicalItinerary for structured aggregation.
 * Ensures flights, lodgings, and car rentals all produce timeline items.
 *
 * RULES:
 * - Every FLIGHT leg creates a separate booking record
 * - Every LODGING creates a stay booking record
 * - Every CAR_RENTAL creates a car_rental booking record
 * - Never drop a leg because an IATA code is missing — use airport name instead
 * - ACTIVITY / TRANSPORT / OTHER → one booking per confirmation
 * - Raw strings preserved for display; ordering dates used only for sequencing
 * - No timezone math
 * - NEVER DROP LEGS DUE TO PARTIAL DATE PARSING
 *   Legs with null orderingDate still produce timeline items
 *   Such legs are marked with needsReview notes rather than being silently discarded
 */

import type { ParsedConfirmation, FlightLeg } from './types';
import { buildCanonicalItinerary } from './itineraryEngine';
import { toOrderingDate } from '@/lib/dates/dateRecognition';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
type BookingType = Database['public']['Enums']['booking_type'];

// ============================================================================
// CORE
// ============================================================================

/**
 * Create timeline (booking) records from a set of parsed confirmations.
 * Inserts directly into the bookings table.
 *
 * v3.9.70: Uses buildCanonicalItinerary so flights, lodgings, and car
 * rentals are all processed through canonical paths.
 *
 * @param tripId - The trip to attach bookings to
 * @param confirmations - All parsed confirmations from the batch
 * @returns Array of created booking IDs
 */
export async function createTimelineFromConfirmations(
  tripId: string,
  confirmations: ParsedConfirmation[],
): Promise<string[]> {
  const inserts: BookingInsert[] = [];
  const itinerary = buildCanonicalItinerary(confirmations);

  // --- Flights: one booking per leg ---
  // Group canonical flight legs by confirmationId to handle cost attribution
  const confMap = new Map<string, ParsedConfirmation>();
  for (const conf of confirmations) {
    confMap.set(conf.confirmationId, conf);
  }

  // Track which confirmation's first leg we've seen (for cost attribution)
  const seenFirstLeg = new Set<string>();

  for (const cf of itinerary.flights) {
    const conf = confMap.get(cf.confirmationId);
    if (!conf) continue;

    const isFirstLeg = !seenFirstLeg.has(cf.confirmationId);
    if (isFirstLeg) seenFirstLeg.add(cf.confirmationId);

    inserts.push(buildFlightBooking(tripId, conf, cf.leg, isFirstLeg));
  }

  // Handle FLIGHT confirmations with no legs (edge case)
  for (const conf of confirmations) {
    if (conf.type === 'FLIGHT' && conf.legs.length === 0) {
      inserts.push(buildFlightBooking(tripId, conf, null, true));
    }
  }

  // --- Lodging stays ---
  for (const stay of itinerary.lodgings) {
    const conf = confMap.get(stay.confirmationId);
    inserts.push(buildLodgingBooking(tripId, stay, conf));
  }

  // --- Car rentals ---
  for (const car of itinerary.cars) {
    const conf = confMap.get(car.confirmationId);
    inserts.push(buildCarRentalBooking(tripId, car, conf));
  }

  // --- Other types (ACTIVITY, TRANSPORT, OTHER) ---
  for (const conf of confirmations) {
    if (conf.type === 'FLIGHT' || conf.type === 'LODGING' || conf.type === 'CAR_RENTAL') continue;
    inserts.push(buildNonFlightBooking(tripId, conf));
  }

  if (inserts.length === 0) return [];

  const createdIds: string[] = [];

  // Insert in chunks to avoid payload limits
  const CHUNK_SIZE = 20;
  for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
    const chunk = inserts.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from('bookings')
      .insert(chunk)
      .select('id');

    if (error) {
      console.error('[createTimeline] Insert error:', error.message);
      continue;
    }

    if (data) {
      createdIds.push(...data.map(d => d.id));
    }
  }

  return createdIds;
}

// ============================================================================
// BUILDERS
// ============================================================================

function buildFlightBooking(
  tripId: string,
  conf: ParsedConfirmation,
  leg: FlightLeg | null,
  isFirstLeg: boolean,
): BookingInsert {
  const depCode = leg?.originCode || null;
  const depName = leg?.originName || null;
  const arrCode = leg?.destinationCode || null;
  const arrName = leg?.destinationName || null;

  // Use raw strings for datetimes — NEVER reformatted
  const startDt = leg?.rawDepartureString || conf.rawStartString || '';
  const endDt = leg?.rawArrivalString || conf.rawEndString || null;

  // v3.9.60: Check if ordering date is resolvable for this leg
  const hasResolvableDate = !!(startDt && toOrderingDate(startDt));
  const legHasDateIssue = leg && !hasResolvableDate && !!startDt;

  // For multi-leg flights, cost goes on first leg only (v3.9.70)
  const legCost = leg?.legCostAmount ?? null;
  const totalCost = isFirstLeg && !legCost ? conf.totalCost : legCost;

  return {
    trip_id: tripId,
    booking_type: 'flight' as BookingType,
    vendor_name: conf.vendorName || leg?.airline || 'Unknown Airline',
    airline: leg?.airline || conf.vendorName || null,
    confirmation_number: conf.confirmationNumber || null,
    departure_airport_code: depCode || undefined,
    departure_airport_name: depName || undefined,
    arrival_airport_code: arrCode || undefined,
    arrival_airport_name: arrName || undefined,
    start_datetime: startDt,
    end_datetime: endDt || undefined,
    total_cost: totalCost,
    notes: buildNotes(conf, leg, legHasDateIssue),
  };
}

import type { CanonicalLodgingStay, CanonicalCarRental } from './itineraryEngine';

function buildLodgingBooking(
  tripId: string,
  stay: CanonicalLodgingStay,
  conf: ParsedConfirmation | undefined,
): BookingInsert {
  const startDt = stay.rawCheckInString || '';
  const endDt = stay.rawCheckOutString || null;

  const hasResolvableDate = !!(startDt && toOrderingDate(startDt));
  const hasDateIssue = !hasResolvableDate && !!startDt;

  return {
    trip_id: tripId,
    booking_type: 'stay' as BookingType,
    vendor_name: stay.vendorName || stay.propertyName || 'Unknown',
    property_name: stay.propertyName || undefined,
    confirmation_number: stay.confirmationNumber || null,
    address: stay.address || undefined,
    start_datetime: startDt,
    end_datetime: endDt || undefined,
    total_cost: stay.totalCost,
    notes: buildLodgingCarNotes(stay.needsReview, hasDateIssue, stay.costCurrency),
  };
}

function buildCarRentalBooking(
  tripId: string,
  car: CanonicalCarRental,
  conf: ParsedConfirmation | undefined,
): BookingInsert {
  const startDt = car.rawPickupString || '';
  const endDt = car.rawDropoffString || null;

  const hasResolvableDate = !!(startDt && toOrderingDate(startDt));
  const hasDateIssue = !hasResolvableDate && !!startDt;

  return {
    trip_id: tripId,
    booking_type: 'car_rental' as BookingType,
    vendor_name: car.vendorName || 'Unknown',
    confirmation_number: car.confirmationNumber || null,
    pickup_location: car.pickupLocation || undefined,
    return_location: car.dropoffLocation || undefined,
    start_datetime: startDt,
    end_datetime: endDt || undefined,
    total_cost: car.totalCost,
    notes: buildLodgingCarNotes(car.needsReview, hasDateIssue, car.costCurrency),
  };
}

function buildNonFlightBooking(
  tripId: string,
  conf: ParsedConfirmation,
): BookingInsert {
  const bookingType = mapConfTypeToBookingType(conf.type);
  const startDt = conf.rawStartString || '';
  const endDt = conf.rawEndString || null;

  const hasResolvableDate = !!(startDt && toOrderingDate(startDt));
  const hasDateIssue = !hasResolvableDate && !!startDt;

  return {
    trip_id: tripId,
    booking_type: bookingType,
    vendor_name: conf.vendorName || conf.propertyName || 'Unknown',
    property_name: conf.propertyName || undefined,
    confirmation_number: conf.confirmationNumber || null,
    address: conf.address || undefined,
    start_datetime: startDt,
    end_datetime: endDt || undefined,
    total_cost: conf.totalCost,
    notes: buildNonFlightNotes(conf, hasDateIssue),
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function mapConfTypeToBookingType(type: string): BookingType {
  switch (type) {
    case 'FLIGHT': return 'flight';
    case 'LODGING': return 'stay';
    case 'CAR_RENTAL': return 'car_rental';
    case 'ACTIVITY': return 'activity';
    case 'TRANSPORT': return 'transport';
    default: return 'activity';
  }
}

function buildNotes(
  conf: ParsedConfirmation,
  leg: FlightLeg | null,
  legHasDateIssue?: boolean,
): string | null {
  const parts: string[] = [];

  if (conf.needsReview) {
    parts.push(`⚠️ Needs review: ${conf.reviewReason || 'Incomplete data'}`);
  }

  if (legHasDateIssue) {
    parts.push('⚠️ Date format not recognized — needs review');
  }

  if (leg && !leg.originCode && leg.originName) {
    parts.push(`Origin airport code unresolved (name: ${leg.originName})`);
  }
  if (leg && !leg.destinationCode && leg.destinationName) {
    parts.push(`Destination airport code unresolved (name: ${leg.destinationName})`);
  }

  if (conf.costCurrency && conf.costCurrency !== 'USD') {
    parts.push(`Original currency: ${conf.costCurrency}`);
  }

  return parts.length > 0 ? parts.join(' | ') : null;
}

function buildLodgingCarNotes(
  needsReview: boolean,
  hasDateIssue: boolean,
  costCurrency: string | null,
): string | null {
  const parts: string[] = [];
  if (needsReview) parts.push('⚠️ Needs review');
  if (hasDateIssue) parts.push('⚠️ Date format not recognized — needs review');
  if (costCurrency && costCurrency !== 'USD') parts.push(`Original currency: ${costCurrency}`);
  return parts.length > 0 ? parts.join(' | ') : null;
}

function buildNonFlightNotes(
  conf: ParsedConfirmation,
  hasDateIssue: boolean,
): string | null {
  const parts: string[] = [];

  if (conf.needsReview) {
    parts.push(`⚠️ Needs review: ${conf.reviewReason || 'Incomplete data'}`);
  }

  if (hasDateIssue) {
    parts.push('⚠️ Date format not recognized — needs review');
  }

  return parts.length > 0 ? parts.join(' | ') : null;
}

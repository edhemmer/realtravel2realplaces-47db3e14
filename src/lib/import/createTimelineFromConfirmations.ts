/**
 * v3.9.60: Timeline Creation from Full Confirmation Batch
 *
 * Creates timeline items (bookings) from ALL parsed confirmations.
 * Uses raw datetime strings for storage — never reformats for display.
 *
 * RULES:
 * - Every FLIGHT leg creates a separate booking record
 * - Never drop a leg because an IATA code is missing — use airport name instead
 * - Missing IATA → attempt resolution via airport directory, else keep as-is
 * - LODGING / CAR_RENTAL / other → one booking per confirmation
 * - Raw strings preserved for display; ordering dates used only for sequencing
 * - No timezone math
 *
 * v3.9.60: NEVER DROP LEGS DUE TO PARTIAL DATE PARSING
 * - Legs with null orderingDate still produce timeline items
 * - Such legs are marked with needsReview notes rather than being silently discarded
 */

import type { ParsedConfirmation, FlightLeg } from './types';
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
 * v3.9.60: NEVER drops legs. Legs with unresolvable dates are marked
 * with needsReview instead of being silently discarded.
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

  for (const conf of confirmations) {
    if (conf.type === 'FLIGHT') {
      // Create one booking per leg
      if (conf.legs.length === 0) {
        // No legs parsed — create a single booking from confirmation-level data
        inserts.push(buildFlightBooking(tripId, conf, null));
      } else {
        for (const leg of conf.legs) {
          // v3.9.60: ALWAYS create timeline item for every leg, regardless
          // of whether orderingDate can be derived. Never silently drop.
          inserts.push(buildFlightBooking(tripId, conf, leg));
        }
      }
    } else {
      // Non-flight: one booking per confirmation
      inserts.push(buildNonFlightBooking(tripId, conf));
    }
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

  // For multi-leg flights, cost goes on first leg only
  const isFirstLeg = !leg || conf.legs.indexOf(leg) === 0;
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

function buildNonFlightBooking(
  tripId: string,
  conf: ParsedConfirmation,
): BookingInsert {
  const bookingType = mapConfTypeToBookingType(conf.type);
  const startDt = conf.rawStartString || '';
  const endDt = conf.rawEndString || null;

  // v3.9.60: Check if ordering date is resolvable
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

  // v3.9.60: Flag legs with unresolvable dates
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

function buildNonFlightNotes(
  conf: ParsedConfirmation,
  hasDateIssue: boolean,
): string | null {
  const parts: string[] = [];

  if (conf.needsReview) {
    parts.push(`⚠️ Needs review: ${conf.reviewReason || 'Incomplete data'}`);
  }

  // v3.9.60: Flag bookings with unresolvable dates
  if (hasDateIssue) {
    parts.push('⚠️ Date format not recognized — needs review');
  }

  return parts.length > 0 ? parts.join(' | ') : null;
}

/**
 * v4.1.0: Confirmation Adapter
 *
 * Converts raw parsed edge function output (Record<string, unknown>)
 * into typed ParsedConfirmation objects for the batch import engine.
 *
 * This bridges the existing parse pipeline with the new batch system.
 *
 * RULES:
 * - Never drop data — unknown fields preserved in originalParsed
 * - Never reformat date strings — raw values preserved
 * - Ordering dates derived via toOrderingDate for internal use only
 * - Missing IATA codes → keep airport names, mark needsReview
 */

import type { ParsedConfirmation, FlightLeg } from './types';
import { generateConfirmationId, generateLegId, toConfirmationType } from './types';
import { toOrderingDate } from '@/lib/dates/dateRecognition';

// ============================================================================
// CORE
// ============================================================================

/**
 * Convert a raw parsed booking record into a ParsedConfirmation.
 *
 * @param parsed - Raw parsed data from edge function
 * @returns Typed ParsedConfirmation with ordering dates derived
 */
export function adaptParsedToConfirmation(
  parsed: Record<string, unknown>,
): ParsedConfirmation {
  const bookingType = (parsed.booking_type as string) || 'other';
  const type = toConfirmationType(bookingType);

  const rawStart = (parsed.start_datetime as string) || null;
  const rawEnd = (parsed.end_datetime as string) || null;

  const confNumber = (parsed.confirmation_number as string) || null;
  const vendorName = (parsed.vendor_name as string) || null;
  const totalCost = parsed.total_cost as number | null;
  const currency = (parsed._extracted_currency as string) || null;

  // Derive ordering dates
  const startDate = toOrderingDate(rawStart);
  const endDate = toOrderingDate(rawEnd);

  // Build flight legs if applicable
  const legs: FlightLeg[] = [];
  let needsReview = false;
  let reviewReason: string | null = null;

  if (type === 'FLIGHT') {
    // Check for flight_legs array from AI parser
    const flightLegs = parsed.flight_legs as Array<Record<string, unknown>> | undefined;

    if (flightLegs && Array.isArray(flightLegs) && flightLegs.length > 0) {
      for (const rawLeg of flightLegs) {
        const leg = adaptFlightLeg(rawLeg);
        legs.push(leg);
        if (!leg.originCode && !leg.originName) needsReview = true;
        if (!leg.destinationCode && !leg.destinationName) needsReview = true;
      }
    } else {
      // Single-leg flight — build from top-level fields
      const leg = adaptSingleFlightLeg(parsed);
      legs.push(leg);
      if (!leg.originCode && !leg.originName) needsReview = true;
      if (!leg.destinationCode && !leg.destinationName) needsReview = true;
    }

    if (needsReview && !reviewReason) {
      reviewReason = 'Missing airport code or name for one or more legs';
    }
  }

  return {
    confirmationId: generateConfirmationId(),
    type,
    confirmationNumber: confNumber,
    vendorName,
    rawStartString: rawStart,
    rawEndString: rawEnd,
    startDate,
    endDate,
    legs,
    totalCost: typeof totalCost === 'number' && Number.isFinite(totalCost) ? totalCost : null,
    costCurrency: currency,
    isTotalForBooking: true, // Default: total covers full booking
    propertyName: (parsed.property_name as string) || null,
    address: (parsed.address as string) || null,
    needsReview,
    reviewReason,
    originalParsed: parsed,
  };
}

/**
 * Adapt multiple parsed records into ParsedConfirmation array.
 */
export function adaptParsedBatchToConfirmations(
  parsedItems: Array<Record<string, unknown>>,
): ParsedConfirmation[] {
  return parsedItems.map(adaptParsedToConfirmation);
}

// ============================================================================
// FLIGHT LEG ADAPTERS
// ============================================================================

function adaptFlightLeg(rawLeg: Record<string, unknown>): FlightLeg {
  const rawDep = (rawLeg.departure_datetime as string) || (rawLeg.start_datetime as string) || null;
  const rawArr = (rawLeg.arrival_datetime as string) || (rawLeg.end_datetime as string) || null;

  return {
    originCode: (rawLeg.departure_airport_code as string) || (rawLeg.origin_code as string) || null,
    originName: (rawLeg.departure_airport_name as string) || (rawLeg.origin_name as string) || null,
    destinationCode: (rawLeg.arrival_airport_code as string) || (rawLeg.destination_code as string) || null,
    destinationName: (rawLeg.arrival_airport_name as string) || (rawLeg.destination_name as string) || null,
    rawDepartureString: rawDep,
    rawArrivalString: rawArr,
    departureDate: toOrderingDate(rawDep),
    arrivalDate: toOrderingDate(rawArr),
    airline: (rawLeg.airline as string) || null,
    flightNumber: (rawLeg.flight_number as string) || null,
    legCostAmount: typeof rawLeg.leg_cost === 'number' ? rawLeg.leg_cost : null,
    legCostCurrency: (rawLeg.leg_currency as string) || null,
    legId: generateLegId(),
  };
}

function adaptSingleFlightLeg(parsed: Record<string, unknown>): FlightLeg {
  const rawDep = (parsed.start_datetime as string) || null;
  const rawArr = (parsed.end_datetime as string) || null;

  return {
    originCode: (parsed.departure_airport_code as string) || null,
    originName: (parsed.departure_airport_name as string) || null,
    destinationCode: (parsed.arrival_airport_code as string) || null,
    destinationName: (parsed.arrival_airport_name as string) || null,
    rawDepartureString: rawDep,
    rawArrivalString: rawArr,
    departureDate: toOrderingDate(rawDep),
    arrivalDate: toOrderingDate(rawArr),
    airline: (parsed.airline as string) || null,
    flightNumber: null,
    legCostAmount: null,
    legCostCurrency: null,
    legId: generateLegId(),
  };
}

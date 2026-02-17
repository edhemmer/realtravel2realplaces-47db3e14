/**
 * v3.8.12: Canonical Item Normalizer
 * 
 * Routes raw parsed data → concept-specific normalizer.
 * Each normalizer enforces field isolation, date coercion, and guardrails.
 * 
 * This is the ONLY place where raw parsed data is shaped into CanonicalItems.
 */

import type { Booking, Parking } from '@/types/database';
import type {
  CanonicalItem,
  CanonicalFlight,
  CanonicalLodging,
  CanonicalCarRental,
  CanonicalActivity,
  CanonicalTransport,
  CanonicalParking,
  RawEvidence,
  CanonicalWarning,
} from './canonicalTypes';
import { guardAirportCode, guardLocationField } from './guardrails';
import { resolveIata } from '@/lib/airports/resolveIata';
import { asLocalDateTime } from '@/lib/canonicalTimeTypes';

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Normalize a Booking record into a CanonicalItem.
 */
export function normalizeBooking(booking: Booking): CanonicalItem {
  switch (booking.booking_type) {
    case 'flight': return normalizeFlight(booking);
    case 'stay': return normalizeLodging(booking);
    case 'car_rental': return normalizeCarRental(booking);
    case 'activity': return normalizeActivity(booking);
    case 'transport': return normalizeTransport(booking);
    default: return normalizeActivity(booking); // fallback
  }
}

/**
 * Normalize a Parking record into a CanonicalParking.
 */
export function normalizeParkingRecord(parking: Parking): CanonicalParking {
  const evidence: RawEvidence[] = [];
  const warnings: CanonicalWarning[] = [];

  const address = guardLocationField('address', parking.address, evidence, warnings);

  return {
    type: 'parking',
    sourceId: parking.id,
    vendorName: parking.label,
    confirmationNumber: null,
    totalCost: parking.total_cost ?? 0,
    myShare: parking.my_share ?? 0,
    notes: null,
    linkUrl: null,
    rawEvidence: evidence,
    warnings,
    parkingType: parking.parking_type || 'other',
    label: parking.label,
    billingType: parking.billing_type || 'other',
    address,
    levelSectionSpace: parking.level_section_space || null,
    startDatetime: asLocalDateTime(parking.start_datetime),
    endDatetime: asLocalDateTime(parking.end_datetime),
    startLocalDatetime: parking.start_local_datetime || null,
    endLocalDatetime: parking.end_local_datetime || null,
    endTimezone: parking.end_timezone || null,
  };
}

// ============================================================================
// CONCEPT NORMALIZERS
// ============================================================================

function baseFields(booking: Booking, evidence: RawEvidence[], warnings: CanonicalWarning[]) {
  return {
    sourceId: booking.id,
    vendorName: booking.vendor_name,
    confirmationNumber: booking.confirmation_number || null,
    totalCost: booking.total_cost ?? 0,
    myShare: booking.my_share ?? 0,
    notes: booking.notes || null,
    linkUrl: booking.link_url || null,
    rawEvidence: evidence,
    warnings,
  };
}

function normalizeFlight(booking: Booking): CanonicalFlight {
  const evidence: RawEvidence[] = [];
  const warnings: CanonicalWarning[] = [];

  // Guard airport code fields
  let depCode = guardAirportCode('departureAirportCode', booking.departure_airport_code, evidence, warnings);
  let arrCode = guardAirportCode('arrivalAirportCode', booking.arrival_airport_code, evidence, warnings);

  // IATA resolution step: attempt to resolve from name if code is missing
  let depName = booking.departure_airport_name || null;
  let arrName = booking.arrival_airport_name || null;
  let iataConfidence: 'high' | 'low' | 'unresolved' = 'high';

  if (!depCode && depName) {
    const resolved = resolveIata(depName);
    depCode = resolved.code;
    depName = resolved.name || depName;
    if (resolved.confidence !== 'high') iataConfidence = resolved.confidence === 'low' ? 'low' : 'unresolved';
  }

  if (!arrCode && arrName) {
    const resolved = resolveIata(arrName);
    arrCode = resolved.code;
    arrName = resolved.name || arrName;
    if (resolved.confidence !== 'high' && iataConfidence === 'high') {
      iataConfidence = resolved.confidence === 'low' ? 'low' : 'unresolved';
    }
  }

  // If both codes are present and valid, confidence is high
  if (depCode && arrCode && iataConfidence === 'high') {
    iataConfidence = 'high';
  } else if (!depCode || !arrCode) {
    iataConfidence = depCode || arrCode ? 'low' : 'unresolved';
  }

  return {
    type: 'flight',
    ...baseFields(booking, evidence, warnings),
    airline: booking.airline || null,
    passengerName: booking.passenger_name || null,
    departureAirportCode: depCode,
    departureAirportName: depName,
    arrivalAirportCode: arrCode,
    arrivalAirportName: arrName,
    startDatetime: asLocalDateTime(booking.start_datetime),
    endDatetime: asLocalDateTime(booking.end_datetime),
    iataConfidence,
  };
}

function normalizeLodging(booking: Booking): CanonicalLodging {
  const evidence: RawEvidence[] = [];
  const warnings: CanonicalWarning[] = [];

  const address = guardLocationField('address', booking.address, evidence, warnings);

  return {
    type: 'stay',
    ...baseFields(booking, evidence, warnings),
    propertyName: booking.property_name || null,
    stayType: (booking.stay_type as CanonicalLodging['stayType']) || null,
    address,
    startDatetime: asLocalDateTime(booking.start_datetime),
    endDatetime: asLocalDateTime(booking.end_datetime),
  };
}

function normalizeCarRental(booking: Booking): CanonicalCarRental {
  const evidence: RawEvidence[] = [];
  const warnings: CanonicalWarning[] = [];

  const pickupLocation = guardLocationField('pickupLocation', booking.pickup_location, evidence, warnings);
  const returnLocation = guardLocationField('returnLocation', booking.return_location, evidence, warnings);
  const address = guardLocationField('address', booking.address, evidence, warnings);

  return {
    type: 'car_rental',
    ...baseFields(booking, evidence, warnings),
    rentalCompany: booking.rental_company || null,
    pickupLocation,
    returnLocation,
    address,
    startDatetime: asLocalDateTime(booking.start_datetime),
    endDatetime: asLocalDateTime(booking.end_datetime),
  };
}

function normalizeActivity(booking: Booking): CanonicalActivity {
  const evidence: RawEvidence[] = [];
  const warnings: CanonicalWarning[] = [];

  const address = guardLocationField('address', booking.address, evidence, warnings);

  return {
    type: 'activity',
    ...baseFields(booking, evidence, warnings),
    activitySource: (booking.activity_source as CanonicalActivity['activitySource']) || null,
    ticketRequired: booking.ticket_required || false,
    advanceRecommended: booking.advance_recommended || false,
    ticketsPurchased: booking.tickets_purchased || false,
    bookingPattern: (booking.booking_pattern as CanonicalActivity['bookingPattern']) || null,
    bookingUrl: booking.booking_url || null,
    address,
    locationSummary: booking.location_summary || null,
    startDatetime: asLocalDateTime(booking.start_datetime),
    endDatetime: asLocalDateTime(booking.end_datetime),
  };
}

function normalizeTransport(booking: Booking): CanonicalTransport {
  const evidence: RawEvidence[] = [];
  const warnings: CanonicalWarning[] = [];

  const fromLocation = guardLocationField('fromLocation', booking.from_location, evidence, warnings);
  const toLocation = guardLocationField('toLocation', booking.to_location, evidence, warnings);
  const address = guardLocationField('address', booking.address, evidence, warnings);

  return {
    type: 'transport',
    ...baseFields(booking, evidence, warnings),
    operator: booking.operator || null,
    transportMode: (booking.transport_mode as CanonicalTransport['transportMode']) || null,
    fromLocation,
    toLocation,
    address,
    startDatetime: asLocalDateTime(booking.start_datetime),
    endDatetime: asLocalDateTime(booking.end_datetime),
  };
}

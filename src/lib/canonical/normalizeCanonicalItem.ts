/**
 * v3.8.12: Canonical Item Normalizer
 * 
 * Routes raw parsed data → concept-specific normalizer.
 * Each normalizer enforces field isolation, date coercion, and guardrails.
 * 
 * This is the ONLY place where raw parsed data is shaped into CanonicalItems.
 * 
 * RULES:
 * - No date/time/timezone math — raw "as-issued" values preserved
 * - No timezone conversion, no UTC shifting, no DST adjustments
 * - Passengers extracted from confirmation, deduplicated by normalized name
 * - IATA codes resolved via bundled dataset only
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
  Passenger,
  AirportRef,
  RawTimeFields,
} from './canonicalTypes';
import { guardAirportCode, guardLocationField } from './guardrails';
import { resolveIata } from '@/lib/airports/resolveIata';
import { asLocalDateTime } from '@/lib/canonicalTimeTypes';

// ============================================================================
// RAW TIME EXTRACTION (no math, no conversion)
// ============================================================================

/**
 * Extract raw "as-issued" time fields from a datetime string.
 * NO math, NO timezone conversion, NO Date objects.
 * Just string extraction and trimming.
 */
function extractRawTimeFields(datetimeStr: string | null | undefined): RawTimeFields {
  if (!datetimeStr || !datetimeStr.trim()) {
    return { dateText: null, timeText: null, datetimeText: null, timezoneText: null };
  }
  const raw = datetimeStr.trim();
  
  // Extract date portion (YYYY-MM-DD)
  const dateMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  const dateText = dateMatch ? dateMatch[1] : null;
  
  // Extract time portion (HH:mm or HH:mm:ss) — no conversion
  const timeMatch = raw.match(/[T ]((\d{2}):(\d{2})(:\d{2})?)/);
  const timeText = timeMatch ? timeMatch[1] : null;
  
  // Extract timezone if present — never infer
  let timezoneText: string | null = null;
  const tzMatch = raw.match(/([+-]\d{2}:\d{2}|[+-]\d{4}|Z)$/);
  if (tzMatch) timezoneText = tzMatch[1];
  
  return {
    dateText,
    timeText,
    datetimeText: raw,
    timezoneText,
  };
}

// ============================================================================
// PASSENGER EXTRACTION
// ============================================================================

/**
 * Normalize a passenger name for deduplication.
 */
function normalizePassengerName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Extract passengers from a passenger_name field.
 * Handles formats: "LAST/FIRST", "FIRST LAST", "LAST/FIRST MIDDLE",
 * comma-separated multiples, slash-separated multiples.
 */
function extractPassengers(passengerNameRaw: string | null | undefined): Passenger[] {
  if (!passengerNameRaw || !passengerNameRaw.trim()) return [];
  
  const raw = passengerNameRaw.trim();
  const passengers: Passenger[] = [];
  const seen = new Set<string>();
  
  // Split by comma or semicolon for multiple passengers
  const segments = raw.split(/[;,]/).map(s => s.trim()).filter(Boolean);
  
  for (const segment of segments) {
    // Try LAST/FIRST MIDDLE format
    const slashMatch = segment.match(/^([A-Za-z'-]+)\s*\/\s*(.+)$/);
    if (slashMatch) {
      const lastName = slashMatch[1].trim();
      const rest = slashMatch[2].trim().split(/\s+/);
      const firstName = rest[0] || '';
      const middleName = rest.slice(1).join(' ') || undefined;
      const fullNorm = normalizePassengerName(`${firstName} ${lastName}`);
      if (!seen.has(fullNorm) && firstName) {
        seen.add(fullNorm);
        passengers.push({ firstName, lastName, middleName, fullNameNormalized: fullNorm });
      }
      continue;
    }
    
    // Try FIRST LAST format
    const parts = segment.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      // Check for title prefix
      const titles = ['MR', 'MRS', 'MS', 'DR', 'MISS', 'MR.', 'MRS.', 'MS.', 'DR.'];
      let startIdx = 0;
      let title: string | undefined;
      if (titles.includes(parts[0].toUpperCase())) {
        title = parts[0];
        startIdx = 1;
      }
      const firstName = parts[startIdx] || '';
      const lastName = parts[parts.length - 1] || '';
      const middleName = parts.length > startIdx + 2
        ? parts.slice(startIdx + 1, parts.length - 1).join(' ')
        : undefined;
      const fullNorm = normalizePassengerName(`${firstName} ${lastName}`);
      if (!seen.has(fullNorm) && firstName) {
        seen.add(fullNorm);
        passengers.push({ firstName, lastName, middleName, title, fullNameNormalized: fullNorm });
      }
    } else if (parts.length === 1) {
      // Single name — store as firstName with empty lastName
      const fullNorm = normalizePassengerName(parts[0]);
      if (!seen.has(fullNorm)) {
        seen.add(fullNorm);
        passengers.push({ firstName: parts[0], lastName: '', fullNameNormalized: fullNorm });
      }
    }
  }
  
  return passengers;
}

// ============================================================================
// CANONICAL ID GENERATION
// ============================================================================

/**
 * Generate a deterministic canonical ID for deduplication.
 * Rules per spec:
 * - Flight: type + provider + confirmation + departureDateTimeText + depIata + arrIata + flightNumber
 * - If confirmation missing: carrier + flightNumber + departureDateTimeText + depIata + arrIata
 * - Other types: type + sourceId
 */
function generateCanonicalId(type: string, parts: (string | null | undefined)[]): string {
  const key = [type, ...parts.map(p => (p || '').trim().toUpperCase())].join('::');
  // Simple hash for stability
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const chr = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `${type}_${Math.abs(hash).toString(36)}`;
}

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
    canonicalId: generateCanonicalId('parking', [parking.id]),
    vendorName: parking.label,
    confirmationNumber: null,
    confirmationNumbers: [],
    totalCost: parking.total_cost ?? 0,
    myShare: parking.my_share ?? 0,
    notes: null,
    linkUrl: null,
    rawEvidence: evidence,
    warnings,
    rawStartTime: extractRawTimeFields(parking.start_local_datetime || parking.start_datetime),
    rawEndTime: extractRawTimeFields(parking.end_local_datetime || parking.end_datetime),
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
  const confNum = booking.confirmation_number || null;
  return {
    sourceId: booking.id,
    vendorName: booking.vendor_name,
    confirmationNumber: confNum,
    confirmationNumbers: confNum ? [confNum] : [],
    totalCost: booking.total_cost ?? 0,
    myShare: booking.my_share ?? 0,
    notes: booking.notes || null,
    linkUrl: booking.link_url || null,
    rawEvidence: evidence,
    warnings,
    rawStartTime: extractRawTimeFields(booking.start_datetime),
    rawEndTime: extractRawTimeFields(booking.end_datetime),
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
  let depCity: string | undefined;
  let arrCity: string | undefined;
  let iataConfidence: 'high' | 'medium' | 'low' = 'high';

  if (!depCode && depName) {
    const resolved = resolveIata(depName);
    depCode = resolved.code;
    depName = resolved.name || depName;
    depCity = resolved.name ? undefined : undefined; // City populated from resolver
    if (resolved.method === 'city_match') depCity = depName || undefined;
    if (resolved.confidence !== 'high') {
      iataConfidence = resolved.confidence === 'low' ? 'low' : 'low';
    }
  }

  if (!arrCode && arrName) {
    const resolved = resolveIata(arrName);
    arrCode = resolved.code;
    arrName = resolved.name || arrName;
    if (resolved.method === 'city_match') arrCity = arrName || undefined;
    if (resolved.confidence !== 'high') {
      // Downgrade overall confidence to the lowest
      if (iataConfidence === 'high') iataConfidence = resolved.confidence === 'low' ? 'low' : 'low';
    }
  }

  // If both codes are present and valid from DB, confidence is high
  if (depCode && arrCode && iataConfidence === 'high') {
    iataConfidence = 'high';
  } else if (!depCode || !arrCode) {
    iataConfidence = (depCode || arrCode) ? 'low' : 'low';
  }

  // Build structured airport refs
  const dep: AirportRef = {
    iata: depCode || undefined,
    name: depName || undefined,
    city: depCity,
  };
  const arr: AirportRef = {
    iata: arrCode || undefined,
    name: arrName || undefined,
    city: arrCity,
  };

  // Extract passengers
  const passengers = extractPassengers(booking.passenger_name);

  // Extract flight number from vendor_name or notes if not explicit
  // (e.g., "BA 2490" → "BA2490")
  const flightNumber: string | null = null; // Flight number not in DB schema; leave null

  // Generate deterministic canonical ID
  const startRaw = extractRawTimeFields(booking.start_datetime);
  const canonicalId = booking.confirmation_number
    ? generateCanonicalId('flight', [
        booking.vendor_name, booking.confirmation_number,
        startRaw.datetimeText, depCode, arrCode, flightNumber,
      ])
    : generateCanonicalId('flight', [
        booking.airline, flightNumber,
        startRaw.datetimeText, depCode, arrCode,
      ]);

  return {
    type: 'flight',
    ...baseFields(booking, evidence, warnings),
    canonicalId,
    airline: booking.airline || null,
    passengers,
    passengerName: booking.passenger_name || null,
    dep,
    arr,
    departureAirportCode: depCode,
    departureAirportName: depName,
    arrivalAirportCode: arrCode,
    arrivalAirportName: arrName,
    startDatetime: asLocalDateTime(booking.start_datetime),
    endDatetime: asLocalDateTime(booking.end_datetime),
    iataConfidence,
    flightNumber,
  };
}

function normalizeLodging(booking: Booking): CanonicalLodging {
  const evidence: RawEvidence[] = [];
  const warnings: CanonicalWarning[] = [];

  const address = guardLocationField('address', booking.address, evidence, warnings);

  return {
    type: 'stay',
    ...baseFields(booking, evidence, warnings),
    canonicalId: generateCanonicalId('stay', [booking.id]),
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
    canonicalId: generateCanonicalId('car_rental', [booking.id]),
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
    canonicalId: generateCanonicalId('activity', [booking.id]),
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
    canonicalId: generateCanonicalId('transport', [booking.id]),
    operator: booking.operator || null,
    transportMode: (booking.transport_mode as CanonicalTransport['transportMode']) || null,
    fromLocation,
    toLocation,
    address,
    startDatetime: asLocalDateTime(booking.start_datetime),
    endDatetime: asLocalDateTime(booking.end_datetime),
  };
}

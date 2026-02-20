/**
 * v4.4.0C: Canonical Booking Mapper
 *
 * Maps a CanonicalImportBatch (from email pipeline or parse-booking response)
 * into BookingInput[] suitable for DB insertion via useCreateBooking.
 *
 * Rules:
 * - If canonical_import exists with bookings[], each CanonicalBooking becomes one booking row.
 * - If canonical_import is missing, returns null to signal legacy fallback.
 * - No expense logic here — useCreateBooking handles expense sync via bookingExpenseSync.
 * - No date-shifting or timezone math.
 */

import type { CanonicalBooking, CanonicalImportBatch } from './canonicalBookingMapper.types';

// Re-export the types from the edge function contract for frontend use
export type { CanonicalBooking, CanonicalImportBatch };

export interface BookingInput {
  trip_id: string;
  booking_type: string;
  vendor_name: string;
  start_datetime: string;
  end_datetime?: string | null;
  confirmation_number?: string | null;
  total_cost?: number | null;
  airline?: string | null;
  passenger_name?: string | null;
  departure_airport_code?: string | null;
  arrival_airport_code?: string | null;
  property_name?: string | null;
  stay_type?: string | null;
  rental_company?: string | null;
  pickup_location?: string | null;
  return_location?: string | null;
  address?: string | null;
  from_location?: string | null;
  to_location?: string | null;
  notes?: string | null;
  _extracted_currency?: string;
}

export interface TripBounds {
  start_date: string | null;
  end_date: string | null;
}

/**
 * Extract YYYY-MM-DD from an ISO datetime string.
 */
function extractDatePart(dt: string | null | undefined): string | null {
  if (!dt || dt.length < 10) return null;
  return dt.substring(0, 10);
}

/**
 * Derive trip start/end from an array of CanonicalBookings.
 */
function deriveTripDates(bookings: CanonicalBooking[]): TripBounds {
  const parts: string[] = [];
  for (const b of bookings) {
    const s = extractDatePart(b.start_datetime);
    const e = extractDatePart(b.end_datetime);
    if (s) parts.push(s);
    if (e) parts.push(e);
  }
  if (parts.length === 0) return { start_date: null, end_date: null };
  parts.sort();
  return { start_date: parts[0], end_date: parts[parts.length - 1] };
}

/**
 * Map a single CanonicalBooking to a BookingInput for a given trip.
 */
function mapCanonicalToBookingInput(
  cb: CanonicalBooking,
  tripId: string,
  currencyCode: string,
): BookingInput {
  const validTypes = ['flight', 'stay', 'car_rental', 'activity', 'transport'];
  const bookingType = validTypes.includes(cb.booking_type) ? cb.booking_type : 'activity';

  return {
    trip_id: tripId,
    booking_type: bookingType,
    vendor_name: cb.vendor_name || 'Imported Booking',
    start_datetime: cb.start_datetime || new Date().toISOString(),
    end_datetime: cb.end_datetime || null,
    confirmation_number: cb.confirmation_number || null,
    total_cost: cb.total_cost ?? null,
    airline: cb.airline || null,
    passenger_name: cb.passenger_name || null,
    departure_airport_code: cb.departure_airport_code || null,
    arrival_airport_code: cb.arrival_airport_code || null,
    property_name: cb.property_name || null,
    stay_type: cb.stay_type || null,
    rental_company: cb.rental_company || null,
    pickup_location: cb.pickup_location || null,
    return_location: cb.return_location || null,
    address: cb.address || null,
    from_location: cb.from_location || null,
    to_location: cb.to_location || null,
    notes: null,
    _extracted_currency: currencyCode,
  };
}

/**
 * Attempt to extract a CanonicalImportBatch from parsed import data.
 *
 * Returns the batch if present, or null for legacy fallback.
 * Handles both shapes:
 * - Email imports: parsedData IS the CanonicalImportBatch (has .bookings[])
 * - parse-booking response: parsedData has .canonical_import field
 */
export function extractCanonicalBatch(
  parsedData: Record<string, unknown>,
): CanonicalImportBatch | null {
  // Shape 1: parsedData IS a CanonicalImportBatch (email imports via process-pending-import)
  if (Array.isArray(parsedData.bookings) && parsedData.bookings.length > 0) {
    return parsedData as unknown as CanonicalImportBatch;
  }

  // Shape 2: parsedData has .canonical_import (parse-booking response stored somewhere)
  if (
    parsedData.canonical_import &&
    typeof parsedData.canonical_import === 'object' &&
    Array.isArray((parsedData.canonical_import as Record<string, unknown>).bookings)
  ) {
    return parsedData.canonical_import as unknown as CanonicalImportBatch;
  }

  return null;
}

/**
 * Build BookingInput[] from a parsed import record.
 *
 * If canonical_import is present, maps each CanonicalBooking to a BookingInput.
 * Returns null if no canonical data found — caller should use legacy fallback.
 */
export function buildBookingsFromCanonicalImport(
  parsedData: Record<string, unknown>,
  tripId: string,
  currencyCode: string = 'USD',
): { bookings: BookingInput[]; tripBounds: TripBounds } | null {
  const batch = extractCanonicalBatch(parsedData);
  if (!batch || batch.bookings.length === 0) return null;

  const bookings = batch.bookings.map((cb) =>
    mapCanonicalToBookingInput(cb, tripId, currencyCode),
  );

  const tripBounds = batch.trip?.start_date && batch.trip?.end_date
    ? { start_date: batch.trip.start_date, end_date: batch.trip.end_date }
    : deriveTripDates(batch.bookings);

  return { bookings, tripBounds };
}

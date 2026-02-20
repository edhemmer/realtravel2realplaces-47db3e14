/**
 * v4.4.0A: Canonical Import Contract
 *
 * Strongly-typed canonical container for email-import pipeline output.
 * One CanonicalBooking = one bookable unit (one flight leg, one stay, one rental, etc.).
 *
 * Rules:
 * - Dates are preserved exactly as extracted from the source — no timezone shifting.
 * - Each flight leg is its own CanonicalBooking (not nested inside flight_legs[]).
 * - Trip start/end derived from service dates only (not ticket issue / payment dates).
 */

// ============================================================================
// CANONICAL BOOKING
// ============================================================================

export type CanonicalBooking = {
  booking_type: "flight" | "stay" | "car_rental" | "activity" | "parking" | "transport" | "other";
  vendor_name: string;

  /** ISO datetime or date-only from source; no date-shifting */
  start_datetime: string | null;
  end_datetime: string | null;

  confirmation_number: string | null;

  // Flight-specific
  departure_airport_code?: string | null;
  arrival_airport_code?: string | null;
  airline?: string | null;
  passenger_name?: string | null;
  flight_number?: string | null;

  // Stay-specific
  property_name?: string | null;
  stay_type?: "hotel" | "airbnb" | "vrbo" | "other" | null;

  // Car rental-specific
  rental_company?: string | null;
  pickup_location?: string | null;
  return_location?: string | null;

  // Parking-specific
  parking_type?: "airport" | "hotel" | "city_garage" | "beach" | "other" | null;

  // General location
  address?: string | null;
  from_location?: string | null;
  to_location?: string | null;

  // Cost (preserved from extraction, no FX conversion)
  total_cost?: number | null;
  currency_code?: string | null;

  // Metadata
  _source?: "email" | "clipboard" | "file" | "image";
  _import_id?: string | null;
  _doc_classification?: string | null;
  _parse_issues?: unknown[] | undefined;
};

// ============================================================================
// CANONICAL IMPORT BATCH
// ============================================================================

export type CanonicalImportBatch = {
  trip?: {
    trip_name?: string | null;
    destination_city?: string | null;
    destination_state?: string | null;
    destination_country?: string | null;
    start_date?: string | null; // YYYY-MM-DD
    end_date?: string | null;   // YYYY-MM-DD
    trip_type?: "business" | "personal" | "mixed" | null;
  };
  bookings: CanonicalBooking[];
  _batch_summary?: Record<string, unknown>;
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract the YYYY-MM-DD date portion from an ISO datetime string.
 * Returns null if input is null/undefined/too short.
 */
export function extractDatePart(datetime: string | null | undefined): string | null {
  if (!datetime || datetime.length < 10) return null;
  return datetime.substring(0, 10);
}

/**
 * Derive trip start_date / end_date from an array of CanonicalBookings.
 * Uses only service dates (start_datetime, end_datetime), never payment dates.
 * Returns { start_date, end_date } as YYYY-MM-DD strings or null.
 */
export function deriveTripDatesFromBookings(
  bookings: CanonicalBooking[],
): { start_date: string | null; end_date: string | null } {
  const dateParts: string[] = [];

  for (const b of bookings) {
    const s = extractDatePart(b.start_datetime);
    const e = extractDatePart(b.end_datetime);
    if (s) dateParts.push(s);
    if (e) dateParts.push(e);
  }

  if (dateParts.length === 0) return { start_date: null, end_date: null };

  dateParts.sort();
  return {
    start_date: dateParts[0],
    end_date: dateParts[dateParts.length - 1],
  };
}

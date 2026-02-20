/**
 * v4.4.0C: Frontend mirror of CanonicalBooking / CanonicalImportBatch
 * from supabase/functions/_shared/import-contract.ts
 *
 * Kept as a separate .types.ts file so the frontend can import without
 * pulling in Deno-specific edge function code.
 */

export type CanonicalBooking = {
  booking_type: "flight" | "stay" | "car_rental" | "activity" | "parking" | "transport" | "other";
  vendor_name: string;
  start_datetime: string | null;
  end_datetime: string | null;
  confirmation_number: string | null;

  departure_airport_code?: string | null;
  arrival_airport_code?: string | null;
  airline?: string | null;
  passenger_name?: string | null;
  flight_number?: string | null;

  property_name?: string | null;
  stay_type?: "hotel" | "airbnb" | "vrbo" | "other" | null;
  rental_company?: string | null;
  pickup_location?: string | null;
  return_location?: string | null;
  parking_type?: "airport" | "hotel" | "city_garage" | "beach" | "other" | null;
  address?: string | null;
  from_location?: string | null;
  to_location?: string | null;

  total_cost?: number | null;
  currency_code?: string | null;

  _source?: "email" | "clipboard" | "file" | "image";
  _doc_classification?: string | null;
  _parse_issues?: unknown[] | undefined;
};

export type CanonicalImportBatch = {
  trip?: {
    trip_name?: string | null;
    destination_city?: string | null;
    destination_state?: string | null;
    destination_country?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    trip_type?: "business" | "personal" | "mixed" | null;
  };
  bookings: CanonicalBooking[];
  _batch_summary?: Record<string, unknown>;
};

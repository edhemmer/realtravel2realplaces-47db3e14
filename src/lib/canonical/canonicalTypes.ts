/**
 * v3.8.12: Canonical Types
 * 
 * Union type CanonicalItem and per-concept types for the canonical ingestion pipeline.
 * All ingested data (email, photo, spreadsheet, manual) MUST be normalized into
 * one of these types before entering the system.
 * 
 * RULES:
 * - Confirmation numbers ONLY in `confirmationNumber` / `confirmationNumbers`
 * - Airport codes ONLY in IATA-validated fields
 * - Addresses/locations ONLY in location fields
 * - No "best guess" cross-field assignments
 * - No date/time/timezone math — raw "as-issued" values preserved
 */

import type { DateOnly, LocalDateTime } from '@/lib/canonicalTimeTypes';

// ============================================================================
// SHARED FIELDS
// ============================================================================

/** Evidence that failed guardrail checks — preserved for debugging / manual review */
export interface RawEvidence {
  field: string;
  originalValue: string;
  reason: string;
}

/** Structured warning emitted by normalizers and validators */
export interface CanonicalWarning {
  code: string;
  field: string;
  message: string;
  /** The offending value that was moved/stripped */
  rawValue?: string;
}

/** Passenger extracted from a confirmation */
export interface Passenger {
  firstName: string;
  lastName: string;
  middleName?: string;
  title?: string;
  /** Normalized full name for deduplication (uppercased, trimmed) */
  fullNameNormalized: string;
}

/** Structured airport reference */
export interface AirportRef {
  /** Validated 3-letter IATA code or undefined */
  iata?: string;
  /** Human-readable airport name */
  name?: string;
  /** City name */
  city?: string;
}

/** Raw "as-issued" time fields — never modified by math */
export interface RawTimeFields {
  /** Raw date text exactly as it appeared in the confirmation */
  dateText: string | null;
  /** Raw time text exactly as it appeared in the confirmation */
  timeText: string | null;
  /** Raw combined datetime text */
  datetimeText: string | null;
  /** Raw timezone text if present, else null — never inferred */
  timezoneText: string | null;
}

/** Base fields shared by all canonical items */
export interface CanonicalItemBase {
  /** Source record ID (booking.id, parking.id, etc.) */
  sourceId: string;
  /** Deterministic canonical ID for dedupe/merge */
  canonicalId: string;
  /** Vendor / provider name */
  vendorName: string;
  /** Confirmation / PNR / reference number — ONLY field allowed for this data */
  confirmationNumber: string | null;
  /** All confirmation numbers seen across merges */
  confirmationNumbers: string[];
  /** Total cost */
  totalCost: number;
  /** User's share of the cost */
  myShare: number;
  /** Free-form notes */
  notes: string | null;
  /** External link URL */
  linkUrl: string | null;
  /** Raw evidence moved here by guardrails (contaminated field values) */
  rawEvidence: RawEvidence[];
  /** Warnings emitted during normalization */
  warnings: CanonicalWarning[];
  /** Raw "as-issued" start time fields — no math applied */
  rawStartTime: RawTimeFields;
  /** Raw "as-issued" end time fields — no math applied */
  rawEndTime: RawTimeFields;

  // v3.9.21: Canonical cost attribution
  /** How costs are attributed across legs/segments */
  costAttributionMode: 'BOOKING_TOTAL' | 'PER_LEG' | 'NONE' | 'MIXED_NEEDS_REVIEW';
  /** Booking-level total cost (set when costAttributionMode = BOOKING_TOTAL) */
  bookingCostTotal: { amount: number; currency: string; source: string; confidence: string } | null;
  /** Breakdown of extracted cost items for review */
  bookingCostBreakdown: Array<{ label: string; amount: number; currency: string }>;
}

// ============================================================================
// FLIGHT
// ============================================================================

/**
 * v3.9.36: STRING-ONLY DATE/TIME CONTRACT
 *
 * All date and time fields on CanonicalFlight are raw strings extracted
 * from the airline's itinerary segment row. They MUST:
 * - Originate from the segment row (same row as route/airports)
 * - NEVER originate from ticket/issue metadata ("Ticketed on", "Issued on", etc.)
 * - NEVER be derived, parsed, reformatted, or converted via Date objects
 * - Be stored and displayed exactly as found in the confirmation
 *
 * Timeline components display dep_time / arr_time strings verbatim.
 * "--:--" is only shown when the source truly has no time for that segment.
 */
export interface CanonicalFlight extends CanonicalItemBase {
  type: 'flight';
  airline: string | null;
  /** All passengers listed on the confirmation */
  passengers: Passenger[];
  /** Legacy single passenger name (first passenger or raw) */
  passengerName: string | null;
  /** Structured departure airport */
  dep: AirportRef;
  /** Structured arrival airport */
  arr: AirportRef;
  /** Validated 3-letter IATA code or null (convenience accessor from dep.iata) */
  departureAirportCode: string | null;
  /** Human-readable airport name (for display when IATA unresolved) */
  departureAirportName: string | null;
  /** Validated 3-letter IATA code or null (convenience accessor from arr.iata) */
  arrivalAirportCode: string | null;
  /** Human-readable airport name */
  arrivalAirportName: string | null;
  startDatetime: LocalDateTime | null;
  endDatetime: LocalDateTime | null;
  /** Resolution confidence for IATA codes */
  iataConfidence: 'high' | 'medium' | 'low';
  /** Flight number if available */
  flightNumber: string | null;

  // v3.10.5: Local wall-clock flight datetime model
  /** Departure date YYYY-MM-DD (local wall-clock) */
  departLocalDate: DateOnly | null;
  /** Departure time HH:mm (local wall-clock) */
  departLocalTime: string | null;
  /** Arrival date YYYY-MM-DD (local wall-clock, with rollover applied) */
  arriveLocalDate: DateOnly | null;
  /** Arrival time HH:mm (local wall-clock) */
  arriveLocalTime: string | null;
  /** Combined departure key for sorting: YYYY-MM-DDTHH:mm */
  departLocalKey: string | null;
  /** Combined arrival key for sorting: YYYY-MM-DDTHH:mm */
  arriveLocalKey: string | null;
  /** True if arrival date was derived via rollover (not explicit in confirmation) */
  arrivalDateDerived: boolean;

  // v3.9.37: Canonical date tokens for trip frame derivation
  /** Departure date token YYYY-MM-DD (always populated if any date extractable) */
  departureDateToken: string | null;
  /** Arrival date token YYYY-MM-DD (falls back to departureDateToken if missing) */
  arrivalDateToken: string | null;

  // v3.9.21: Per-leg cost (only set when costAttributionMode = PER_LEG)
  /** Per-leg cost when explicitly provided by confirmation */
  legCost: { amount: number; currency: string; source: string; confidence: string } | null;
  /** Reference to source of the leg cost */
  legCostSourceRef: { confirmationId: string; extractedFrom: string } | null;
}

// ============================================================================
// LODGING
// ============================================================================

export interface CanonicalLodging extends CanonicalItemBase {
  type: 'stay';
  propertyName: string | null;
  stayType: 'hotel' | 'airbnb' | 'vrbo' | 'other' | null;
  /** Full street address for maps/navigation */
  address: string | null;
  startDatetime: LocalDateTime | null;
  endDatetime: LocalDateTime | null;
}

// ============================================================================
// CAR RENTAL
// ============================================================================

export interface CanonicalCarRental extends CanonicalItemBase {
  type: 'car_rental';
  rentalCompany: string | null;
  /** Pickup location — full address or named location */
  pickupLocation: string | null;
  /** Return/drop-off location */
  returnLocation: string | null;
  address: string | null;
  startDatetime: LocalDateTime | null;
  endDatetime: LocalDateTime | null;
}

// ============================================================================
// ACTIVITY
// ============================================================================

export interface CanonicalActivity extends CanonicalItemBase {
  type: 'activity';
  activitySource: 'explore' | 'confirmation' | null;
  ticketRequired: boolean;
  advanceRecommended: boolean;
  ticketsPurchased: boolean;
  bookingPattern: 'first-come' | 'time-slot' | 'lottery' | 'unknown' | null;
  bookingUrl: string | null;
  address: string | null;
  locationSummary: string | null;
  startDatetime: LocalDateTime | null;
  endDatetime: LocalDateTime | null;
}

// ============================================================================
// TRANSPORT (ground)
// ============================================================================

export interface CanonicalTransport extends CanonicalItemBase {
  type: 'transport';
  operator: string | null;
  transportMode: 'train' | 'bus' | 'metro' | 'ferry' | 'other' | null;
  fromLocation: string | null;
  toLocation: string | null;
  address: string | null;
  startDatetime: LocalDateTime | null;
  endDatetime: LocalDateTime | null;
}

// ============================================================================
// TOUR STOP
// ============================================================================

export interface CanonicalTourStop extends CanonicalItemBase {
  type: 'tour_stop';
  /** Stop/engagement title */
  title: string;
  /** Date of the stop (YYYY-MM-DD) */
  date: DateOnly | null;
  /** Start time (HH:mm) */
  startTime: string | null;
  /** End time (HH:mm) */
  endTime: string | null;
  /** Venue or location name */
  venue: string | null;
  address: string | null;
  storeNumber: string | null;
}

// ============================================================================
// PARKING
// ============================================================================

export interface CanonicalParking extends CanonicalItemBase {
  type: 'parking';
  parkingType: 'airport' | 'beach' | 'city_garage' | 'hotel' | 'other';
  label: string;
  billingType: 'hourly' | 'daily' | 'per_trip' | 'other';
  address: string | null;
  levelSectionSpace: string | null;
  startDatetime: LocalDateTime | null;
  endDatetime: LocalDateTime | null;
  /** Local wall-time columns (source of truth for display) */
  startLocalDatetime: string | null;
  endLocalDatetime: string | null;
  endTimezone: string | null;
}

// ============================================================================
// UNION TYPE
// ============================================================================

export type CanonicalItem =
  | CanonicalFlight
  | CanonicalLodging
  | CanonicalCarRental
  | CanonicalActivity
  | CanonicalTransport
  | CanonicalTourStop
  | CanonicalParking;

export type CanonicalItemType = CanonicalItem['type'];

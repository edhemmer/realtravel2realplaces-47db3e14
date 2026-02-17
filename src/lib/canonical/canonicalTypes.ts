/**
 * v3.8.12: Canonical Types
 * 
 * Union type CanonicalItem and per-concept types for the canonical ingestion pipeline.
 * All ingested data (email, photo, spreadsheet, manual) MUST be normalized into
 * one of these types before entering the system.
 * 
 * RULES:
 * - Confirmation numbers ONLY in `confirmationNumber`
 * - Airport codes ONLY in IATA-validated fields
 * - Addresses/locations ONLY in location fields
 * - No "best guess" cross-field assignments
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

/** Base fields shared by all canonical items */
export interface CanonicalItemBase {
  /** Source record ID (booking.id, parking.id, etc.) */
  sourceId: string;
  /** Vendor / provider name */
  vendorName: string;
  /** Confirmation / PNR / reference number — ONLY field allowed for this data */
  confirmationNumber: string | null;
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
}

// ============================================================================
// FLIGHT
// ============================================================================

export interface CanonicalFlight extends CanonicalItemBase {
  type: 'flight';
  airline: string | null;
  passengerName: string | null;
  /** Validated 3-letter IATA code or null */
  departureAirportCode: string | null;
  /** Human-readable airport name (for display when IATA unresolved) */
  departureAirportName: string | null;
  /** Validated 3-letter IATA code or null */
  arrivalAirportCode: string | null;
  /** Human-readable airport name */
  arrivalAirportName: string | null;
  startDatetime: LocalDateTime | null;
  endDatetime: LocalDateTime | null;
  /** Whether IATA codes were confidently resolved */
  iataConfidence: 'high' | 'low' | 'unresolved';
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

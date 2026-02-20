/**
 * v4.1.0: Canonical Import Batch Types
 *
 * Single source of truth for multi-confirmation import batches.
 * An ImportBatch groups ALL confirmations from a single import action
 * so the trip frame, timeline, and expenses are built from the FULL set.
 *
 * RULES:
 * - No timezone math. Raw strings preserved as-is for display.
 * - Ordering uses ParsedDate (UTC-constructed Date) for internal comparison only.
 * - Never drop a confirmation silently — mark needsReview instead.
 */

// ============================================================================
// PARSED CONFIRMATION
// ============================================================================

export interface FlightLeg {
  /** Origin IATA code (e.g., "LHR") — may be null if unresolvable */
  originCode: string | null;
  /** Origin airport name (e.g., "London Heathrow") */
  originName: string | null;
  /** Destination IATA code */
  destinationCode: string | null;
  /** Destination airport name */
  destinationName: string | null;
  /** Raw departure datetime string exactly as in confirmation */
  rawDepartureString: string | null;
  /** Raw arrival datetime string exactly as in confirmation */
  rawArrivalString: string | null;
  /** Ordering-only Date derived via toOrderingDate (never for display) */
  departureDate: Date | null;
  /** Ordering-only Date derived via toOrderingDate (never for display) */
  arrivalDate: Date | null;
  /** Airline / operator */
  airline: string | null;
  /** Flight number */
  flightNumber: string | null;
  /** Per-leg cost amount (explicit only, not derived) */
  legCostAmount: number | null;
  /** Per-leg cost currency */
  legCostCurrency: string | null;
  /** Unique leg identifier for tracing */
  legId: string;
}

export type ConfirmationType = 'FLIGHT' | 'LODGING' | 'CAR_RENTAL' | 'ACTIVITY' | 'TRANSPORT' | 'OTHER';

export interface ParsedConfirmation {
  /** Unique ID for this confirmation within the batch */
  confirmationId: string;
  /** Booking type */
  type: ConfirmationType;
  /** Confirmation/booking reference number */
  confirmationNumber: string | null;
  /** Vendor name */
  vendorName: string | null;
  /** Raw start datetime string from confirmation (display-safe) */
  rawStartString: string | null;
  /** Raw end datetime string from confirmation (display-safe) */
  rawEndString: string | null;
  /** Ordering-only Date for start (never for display) */
  startDate: Date | null;
  /** Ordering-only Date for end (never for display) */
  endDate: Date | null;
  /** Flight legs (only for FLIGHT type) */
  legs: FlightLeg[];
  /** Total booking cost */
  totalCost: number | null;
  /** Cost currency (original, never converted) */
  costCurrency: string | null;
  /** Whether the cost covers the entire booking (not per-leg) */
  isTotalForBooking: boolean;
  /** Property name (for LODGING) */
  propertyName: string | null;
  /** Address / location summary */
  address: string | null;
  /** Whether this item needs manual review */
  needsReview: boolean;
  /** Review reason (if needsReview is true) */
  reviewReason: string | null;
  /** The original parsed record from the edge function (preserved as-is) */
  originalParsed: Record<string, unknown>;
}

// ============================================================================
// IMPORT BATCH
// ============================================================================

export interface ImportBatch {
  /** Unique batch identifier for this import action */
  batchId: string;
  /** When this batch was created */
  createdAt: Date;
  /** All parsed confirmations in this batch */
  items: ParsedConfirmation[];
}

// ============================================================================
// EXPENSE RECORD (output of expense builder)
// ============================================================================

export interface ExpenseRecord {
  /** Trip this expense belongs to */
  tripId: string;
  /** Expense date (YYYY-MM-DD) */
  date: string;
  /** Expense category */
  category: string;
  /** Human-readable description */
  description: string;
  /** Amount in original currency */
  amount: number;
  /** Original currency code */
  currency: string;
  /** Whether this needs manual review */
  needsReview: boolean;
  /** Notes / metadata */
  notes: string;
  /** Source confirmation ID for tracing */
  confirmationId: string;
  /** Leg ID if this is a per-leg expense */
  legId: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

let _batchCounter = 0;

/** Generate a unique batch ID */
export function generateBatchId(): string {
  _batchCounter++;
  return `batch_${Date.now()}_${_batchCounter}`;
}

let _confCounter = 0;

/** Generate a unique confirmation ID */
export function generateConfirmationId(): string {
  _confCounter++;
  return `conf_${Date.now()}_${_confCounter}`;
}

let _legCounter = 0;

/** Generate a unique leg ID */
export function generateLegId(): string {
  _legCounter++;
  return `leg_${Date.now()}_${_legCounter}`;
}

/** Map booking_type string to ConfirmationType */
export function toConfirmationType(bookingType: string | null | undefined): ConfirmationType {
  switch (bookingType?.toLowerCase()) {
    case 'flight': return 'FLIGHT';
    case 'stay': return 'LODGING';
    case 'car_rental': return 'CAR_RENTAL';
    case 'activity': return 'ACTIVITY';
    case 'transport': return 'TRANSPORT';
    default: return 'OTHER';
  }
}

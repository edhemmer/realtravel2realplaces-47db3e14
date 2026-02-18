/**
 * v4.2.0: Canonical Parse Contract
 * 
 * Single source of truth for document classification, required fields,
 * and parse issue types across ALL parse sources (email, photo, spreadsheet).
 * 
 * Rules:
 * - No silent partials: missing required fields → ParseIssue, not a broken booking
 * - Confirmation vs Receipt is explicit before entity creation
 * - Receipts never create timeline-driving bookings
 * - Anchor date is fallback only
 */

// ============================================================================
// DOCUMENT CLASSIFICATION
// ============================================================================

export type DocClassification =
  | 'CONFIRMATION'
  | 'RECEIPT'
  | 'CHANGE_OR_CANCEL'
  | 'UNKNOWN';

// ============================================================================
// REQUIRED FIELDS PER ENTITY TYPE
// ============================================================================

/**
 * Canonical required fields map. Only entities meeting ALL required fields
 * become timeline-driving bookings. Missing fields → ParseIssue.
 */
// v3.9.29: Airport codes NOT required — names suffice for NEEDS_REVIEW flow
export const REQUIRED_FIELDS_BY_ENTITY: Record<string, string[]> = {
  flight: [
    'start_datetime',
  ],
  stay: [
    'start_datetime',
    'end_datetime',
    'property_name',
  ],
  car_rental: [
    'start_datetime',
    'return_location',
    'pickup_location',
  ],
  transport: [
    'start_datetime',
  ],
  parking: [
    'start_datetime',
  ],
  activity: [
    'start_datetime',
  ],
  other: [],
};

// ============================================================================
// PARSE ISSUE
// ============================================================================

export interface ParseIssue {
  issueType: 'MISSING_REQUIRED_FIELDS' | 'LOW_CONFIDENCE' | 'VALIDATION_FAILED' | 'TIME_DERIVATION_FAILED';
  entityType: string;
  missingFields: string[];
  actionHint: string;
  rawValue?: string;
  fieldPath?: string;
}

// ============================================================================
// CLASSIFICATION LOGIC
// ============================================================================

/** Receipt signal keywords (case-insensitive) */
const RECEIPT_SIGNALS = [
  'receipt', 'invoice', 'payment received', 'amount paid',
  'card ending', 'transaction', 'payment confirmation',
  'order summary', 'billing statement',
];

/** Confirmation signal keywords (case-insensitive) */
const CONFIRMATION_SIGNALS = [
  'itinerary', 'booking confirmed', 'reservation confirmed',
  'check-in', 'check-out', 'departure', 'arrival',
  'flight number', 'boarding', 'gate', 'terminal',
  'pickup', 'drop-off', 'pnr', 'booking reference',
  'e-ticket', 'passenger', 'confirmation code',
];

/** Change/cancel signal keywords */
const CHANGE_CANCEL_SIGNALS = [
  'cancellation', 'cancelled', 'canceled', 'refund',
  'schedule change', 'flight change', 'itinerary change',
  'modification', 'rebooked',
];

/**
 * Classify a document based on AI-extracted fields + raw text signals.
 * Uses is_receipt_only from AI as primary signal, with text analysis as backup.
 */
export function classifyDocument(
  parsed: Record<string, unknown>,
  hasServiceDates: boolean,
): DocClassification {
  // AI explicitly flagged as receipt
  if (parsed.is_receipt_only === true) return 'RECEIPT';

  // Has service dates → likely confirmation
  if (hasServiceDates) return 'CONFIRMATION';

  // No service dates but has cost → receipt
  if (parsed.total_cost && !hasServiceDates) return 'RECEIPT';

  return 'UNKNOWN';
}

/**
 * Classify using raw text content when AI classification is ambiguous.
 */
export function classifyFromText(text: string): DocClassification {
  const lower = text.toLowerCase();

  // Check for change/cancel first (most specific)
  const changeCancelScore = CHANGE_CANCEL_SIGNALS.filter(s => lower.includes(s)).length;
  if (changeCancelScore >= 2) return 'CHANGE_OR_CANCEL';

  const confirmScore = CONFIRMATION_SIGNALS.filter(s => lower.includes(s)).length;
  const receiptScore = RECEIPT_SIGNALS.filter(s => lower.includes(s)).length;

  // Strong confirmation signals
  if (confirmScore >= 3 && confirmScore > receiptScore) return 'CONFIRMATION';
  // Strong receipt signals
  if (receiptScore >= 2 && receiptScore > confirmScore) return 'RECEIPT';
  // Weak signals
  if (confirmScore > 0) return 'CONFIRMATION';
  if (receiptScore > 0) return 'RECEIPT';

  return 'UNKNOWN';
}

// ============================================================================
// REQUIRED FIELD ENFORCEMENT
// ============================================================================

/**
 * Check required fields for a given entity type.
 * Returns a ParseIssue if any required fields are missing, or null if all present.
 */
export function enforceRequiredFields(
  parsed: Record<string, unknown>,
  entityType: string,
): ParseIssue | null {
  const required = REQUIRED_FIELDS_BY_ENTITY[entityType] || [];
  if (required.length === 0) return null;

  const missing = required.filter(field => {
    const value = parsed[field];
    return !value || (typeof value === 'string' && value.trim() === '');
  });

  if (missing.length === 0) return null;

  const fieldLabels: Record<string, string> = {
    departure_airport_code: 'departure airport',
    arrival_airport_code: 'arrival airport',
    start_datetime: 'start date/time',
    end_datetime: 'end date/time',
    property_name: 'property name',
    rental_company: 'rental company',
    pickup_location: 'pickup location',
    return_location: 'return location',
  };

  const readableMissing = missing.map(f => fieldLabels[f] || f.replace(/_/g, ' '));

  return {
    issueType: 'MISSING_REQUIRED_FIELDS',
    entityType,
    missingFields: missing,
    actionHint: `Missing: ${readableMissing.join(', ')}. Please complete these fields or re-upload the original confirmation.`,
  };
}

// ============================================================================
// HUMAN-READABLE LABELS
// ============================================================================

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  flight: 'Flight',
  stay: 'Lodging',
  car_rental: 'Car Rental',
  transport: 'Ground Transport',
  parking: 'Parking',
  activity: 'Activity',
  other: 'Booking',
};

export const DOC_CLASSIFICATION_LABELS: Record<DocClassification, string> = {
  CONFIRMATION: 'Confirmation',
  RECEIPT: 'Receipt',
  CHANGE_OR_CANCEL: 'Change/Cancellation',
  UNKNOWN: 'Unknown',
};

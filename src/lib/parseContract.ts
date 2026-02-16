/**
 * v4.2.0: Canonical Parse Contract (Client Mirror)
 * 
 * Client-side mirror of supabase/functions/_shared/parse-contract.ts
 * for UI rendering of classification, issues, and required field labels.
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
// PARSE ISSUE
// ============================================================================

export interface ParseIssue {
  issueType: 'MISSING_REQUIRED_FIELDS' | 'LOW_CONFIDENCE' | 'VALIDATION_FAILED';
  entityType: string;
  missingFields: string[];
  actionHint: string;
}

// ============================================================================
// REQUIRED FIELDS MAP (mirrors edge function)
// ============================================================================

export const REQUIRED_FIELDS_BY_ENTITY: Record<string, string[]> = {
  flight: ['departure_airport_code', 'arrival_airport_code', 'start_datetime', 'end_datetime'],
  stay: ['start_datetime', 'end_datetime'],
  car_rental: ['start_datetime'],
  transport: ['start_datetime'],
  parking: ['start_datetime'],
  activity: ['start_datetime'],
  other: [],
};

// ============================================================================
// LABELS
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

export const DOC_CLASSIFICATION_LABELS: Record<string, string> = {
  CONFIRMATION: 'Confirmation',
  RECEIPT: 'Receipt',
  CHANGE_OR_CANCEL: 'Change/Cancellation',
  UNKNOWN: 'Unknown',
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if parsed data represents a receipt (not a timeline-driving booking).
 */
export function isReceiptClassification(parsed: Record<string, unknown>): boolean {
  return parsed._doc_classification === 'RECEIPT'
    || parsed._is_receipt_only === true
    || parsed._email_classification === 'FLIGHT_RECEIPT'; // Legacy compat
}

/**
 * Check if parsed data has missing required field issues.
 */
export function hasParseIssues(parsed: Record<string, unknown>): boolean {
  const issues = parsed._parse_issues as ParseIssue[] | undefined;
  return !!issues && issues.length > 0;
}

/**
 * Get parse issues from parsed data.
 */
export function getParseIssues(parsed: Record<string, unknown>): ParseIssue[] {
  return (parsed._parse_issues as ParseIssue[]) || [];
}

/**
 * Get the entity type label for display.
 */
export function getEntityLabel(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] || 'Booking';
}

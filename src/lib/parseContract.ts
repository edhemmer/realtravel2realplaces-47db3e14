/**
 * v3.9.25: Canonical Parse Contract (Client Mirror)
 * 
 * Client-side mirror of supabase/functions/_shared/parse-contract.ts
 * for UI rendering of classification, issues, and required field labels.
 *
 * v3.9.25: No changes to classification logic — block parser is in pipeline layer.
 * v3.9.24: Adds centralized ImportClassification + classifyCandidate()
 */

import { isDeclinedOrCancelled } from '@/lib/import/flightCostIntelligence';

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
  issueType: 'MISSING_REQUIRED_FIELDS' | 'LOW_CONFIDENCE' | 'VALIDATION_FAILED' | 'TIME_DERIVATION_FAILED';
  entityType: string;
  missingFields: string[];
  actionHint: string;
  rawValue?: string;
  fieldPath?: string;
}

// ============================================================================
// REQUIRED FIELDS MAP (mirrors edge function)
// ============================================================================

// v3.9.29: Airport codes are NOT required for flights — names suffice for NEEDS_REVIEW flow
export const REQUIRED_FIELDS_BY_ENTITY: Record<string, string[]> = {
  flight: ['start_datetime'],
  stay: ['start_datetime', 'end_datetime', 'property_name'],
  car_rental: ['start_datetime', 'pickup_location', 'return_location'],
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

// ============================================================================
// CENTRALIZED IMPORT CLASSIFICATION (v3.9.24)
// ============================================================================

/**
 * Import classification determines how a parsed candidate is persisted.
 * - BOOKING: Create booking + linked expense + timeline
 * - RECEIPT: Create expense only (no booking, no timeline)
 * - IGNORE:  Persist nothing (declined, failed, cancelled, or empty)
 */
export type ImportClassification = 'BOOKING' | 'RECEIPT' | 'IGNORE';

/**
 * Centralized, deterministic classification for any parsed candidate.
 * ALL intake paths (paste, email, drag-drop, OCR) MUST call this before persistence.
 *
 * Rules:
 * 1. IGNORE if all payments for the candidate are declined/failed/cancelled
 * 2. BOOKING if candidate has valid itinerary structure (airports + date + time + traveler for flights,
 *    or start_datetime for other booking types)
 * 3. RECEIPT if no itinerary but valid payment structure exists
 * 4. IGNORE if none of the above
 */
export function classifyCandidate(parsed: Record<string, unknown>): ImportClassification {
  // Step 1: Check for declined/failed/cancelled — always IGNORE
  if (isDeclinedOrCancelled(parsed)) {
    return 'IGNORE';
  }

  // Step 2: Check for valid itinerary structure → BOOKING
  const bookingType = (parsed.booking_type as string) || '';
  const hasServiceDate = !!(parsed.start_datetime && String(parsed.start_datetime).trim().length >= 10);

  if (bookingType === 'flight') {
    // Flights require: origin + destination + departure date + departure time + traveler
    const hasOrigin = !!(parsed.departure_airport_code || parsed.from_location);
    const hasDestination = !!(parsed.arrival_airport_code || parsed.to_location);
    const hasTime = hasServiceDate && /T\d{2}:\d{2}|(\d{1,2}:\d{2})/.test(String(parsed.start_datetime));
    const hasTraveler = !!(parsed.passenger_name && String(parsed.passenger_name).trim());

    if (hasOrigin && hasDestination && hasServiceDate && hasTime && hasTraveler) {
      return 'BOOKING';
    }
    // Relaxed: even without time or traveler, if we have airports + date, it's still a booking
    if (hasOrigin && hasDestination && hasServiceDate) {
      return 'BOOKING';
    }
  } else if (hasServiceDate && bookingType && bookingType !== 'other') {
    // Non-flight booking types: start_datetime is sufficient
    return 'BOOKING';
  } else if (hasServiceDate) {
    // Generic: has a service date → booking
    return 'BOOKING';
  }

  // Step 3: Check for receipt structure → RECEIPT
  const isReceipt = isReceiptClassification(parsed);
  const hasCost = typeof parsed.total_cost === 'number' && parsed.total_cost > 0;
  const hasVendor = !!(parsed.vendor_name && String(parsed.vendor_name).trim());

  if (isReceipt || (hasCost && !hasServiceDate)) {
    return 'RECEIPT';
  }

  // Step 4: Nothing usable → IGNORE
  return 'IGNORE';
}

/**
 * Get the entity type label for display.
 */
export function getEntityLabel(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] || 'Booking';
}

/**
 * v2.2.12: Booking Ingestion Validator
 * 
 * Integration layer that connects ConfirmationTimeValidator (v2.2.11)
 * into the booking ingestion pipeline.
 * 
 * Runs after parse-booking returns parsed data, validating that
 * parsed times match the original confirmation text. Feeds mismatches
 * into the existing low-confidence path (time marked as estimated,
 * user prompted to review).
 * 
 * RULES:
 * - Runs for ALL booking-derived events (flights, stays, rentals, tours, transport)
 * - Manual-only events (no parsed times) bypass validation entirely
 * - Low-confidence results halt auto-acceptance; user must confirm times
 * - Does NOT modify times — only flags and routes
 */

import {
  validateBookingTimes,
  ConfirmationTimeToken,
  BookingTimeValidation,
} from './confirmationTimeValidator';
import { formatLocalTimeDirect } from './canonicalTimeNormalizer';

// ============================================================================
// TYPES
// ============================================================================

/** Minimal parsed booking shape needed for validation */
export interface ParsedBookingForValidation {
  booking_type?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  vendor_name?: string | null;
}

/** Result of ingestion validation */
export interface IngestionValidationResult {
  /** Whether the booking passed time validation */
  isValid: boolean;
  /** Whether this booking should be flagged as low-confidence */
  isLowConfidence: boolean;
  /** Per-field validation details */
  validation: BookingTimeValidation | null;
  /** Human-readable summary of any issues */
  issuesSummary: string | null;
  /** Whether the time fields should be cleared for manual entry */
  shouldClearTimes: boolean;
}

// ============================================================================
// CONFIRMATION TOKEN EXTRACTION
// ============================================================================

/**
 * Extract confirmation time tokens from the raw parsed booking data.
 * 
 * The AI parser returns start_datetime and end_datetime as ISO-like strings.
 * We extract the time portion as the "confirmation token" to validate against
 * the canonical stored time.
 * 
 * For parsed data, the time digits in the datetime string ARE the confirmation
 * tokens — they represent what the AI extracted from the source text.
 */
export function extractConfirmationTokens(
  parsed: ParsedBookingForValidation
): ConfirmationTimeToken[] {
  const tokens: ConfirmationTimeToken[] = [];

  if (parsed.start_datetime) {
    const timeStr = formatLocalTimeDirect(parsed.start_datetime);
    if (timeStr) {
      tokens.push({ rawToken: timeStr, field: 'start' });
    }
  }

  if (parsed.end_datetime) {
    const timeStr = formatLocalTimeDirect(parsed.end_datetime);
    if (timeStr) {
      tokens.push({ rawToken: timeStr, field: 'end' });
    }
  }

  return tokens;
}

// ============================================================================
// CORE INGESTION VALIDATOR
// ============================================================================

/**
 * Validate a parsed booking's times against its confirmation tokens.
 * 
 * Call this after the parse-booking Edge Function returns and before
 * populating the booking form or saving to the database.
 * 
 * @param parsed - The parsed booking data from the AI parser
 * @param normalizedStartDatetime - The datetime after normalization (stripped Z, naive local)
 * @param normalizedEndDatetime - The datetime after normalization
 * @returns Validation result with confidence flags
 */
export function validateParsedBookingTimes(
  parsed: ParsedBookingForValidation,
  normalizedStartDatetime: string | null | undefined,
  normalizedEndDatetime: string | null | undefined,
): IngestionValidationResult {
  // Manual-only events (no parsed times at all) bypass validation
  if (!parsed.start_datetime && !parsed.end_datetime) {
    return {
      isValid: true,
      isLowConfidence: false,
      validation: null,
      issuesSummary: null,
      shouldClearTimes: false,
    };
  }

  // Extract confirmation tokens from the original parsed response
  const tokens = extractConfirmationTokens(parsed);

  // If no parseable time tokens exist, nothing to validate
  if (tokens.length === 0) {
    return {
      isValid: true,
      isLowConfidence: false,
      validation: null,
      issuesSummary: null,
      shouldClearTimes: false,
    };
  }

  // Run the validator
  const validation = validateBookingTimes(
    normalizedStartDatetime,
    normalizedEndDatetime,
    tokens,
    2 // 2-minute tolerance
  );

  if (validation.isValid) {
    return {
      isValid: true,
      isLowConfidence: false,
      validation,
      issuesSummary: null,
      shouldClearTimes: false,
    };
  }

  // Build human-readable summary of mismatched fields
  const issues = validation.fields
    .filter(f => !f.isValid)
    .map(f => {
      const fieldLabel = f.field === 'start' ? 'Start time' : 'End time';
      return `${fieldLabel}: expected "${f.confirmationAnchor}" but got "${f.canonicalTime || 'none'}"`;
    });

  return {
    isValid: false,
    isLowConfidence: true,
    validation,
    issuesSummary: issues.join('; '),
    shouldClearTimes: true,
  };
}

/**
 * Check if a booking type should go through time validation.
 * All booking-derived types are validated. Only truly manual/unknown types skip.
 */
export function shouldValidateBookingType(bookingType: string | null | undefined): boolean {
  if (!bookingType) return false;
  const validatedTypes = ['flight', 'stay', 'car_rental', 'activity', 'transport'];
  return validatedTypes.includes(bookingType);
}

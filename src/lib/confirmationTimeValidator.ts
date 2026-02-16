/**
 * v2.2.11: Confirmation Time Validator
 * 
 * Validates that canonical local times (produced by v2.2.10 CanonicalTimeNormalizer)
 * still match the original confirmation time tokens extracted by the parser.
 * 
 * RULES:
 * - Runs after canonicalTimeNormalizer for all booking-derived events
 * - Compares canonical HH:MM against the parser's original time string
 * - Flags mismatches as low-confidence (feeds into existing ingestion confidence)
 * - Does NOT modify times — only validates and flags
 * - Does NOT apply to manual-only events (no confirmation tokens)
 */

import { formatLocalTimeDirect } from './canonicalTimeNormalizer';

// ============================================================================
// TYPES
// ============================================================================

export interface ConfirmationTimeToken {
  /** Original time string from confirmation, e.g. "6:00 AM", "After 4:00 PM" */
  rawToken: string;
  /** Which field this token refers to */
  field: 'start' | 'end';
}

export interface TimeValidationResult {
  field: 'start' | 'end';
  /** The canonical local time formatted as h:mm AM/PM */
  canonicalTime: string | null;
  /** The anchor time extracted from the confirmation token */
  confirmationAnchor: string | null;
  /** Whether canonical matches confirmation within tolerance */
  isValid: boolean;
  /** If invalid, reason for mismatch */
  mismatchReason?: string;
}

export interface BookingTimeValidation {
  /** Overall validity — true only if ALL fields are valid */
  isValid: boolean;
  /** Per-field results */
  fields: TimeValidationResult[];
  /** If any field is invalid, this is true → feed into low-confidence path */
  isLowConfidence: boolean;
}

// ============================================================================
// ANCHOR EXTRACTION
// ============================================================================

/**
 * Extract the anchor time (HH:MM + AM/PM) from a confirmation token string.
 * Handles formats like:
 *   "6:00 AM", "7:39 AM", "After 4:00 PM", "By 10:00 AM",
 *   "Check-in: 3:00 PM", "16:00", "06:00"
 * 
 * Returns normalized { hours24, minutes } or null if no time found.
 */
export function extractAnchorTime(
  token: string | null | undefined
): { hours: number; minutes: number } | null {
  if (!token) return null;

  // Try 12-hour format first: "4:00 PM", "6:00 AM"
  const match12 = token.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { hours, minutes };
    }
    return null;
  }

  // Try 24-hour colon: "16:00", "06:00"
  const match24 = token.match(/(\d{1,2}):(\d{2})/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { hours, minutes };
    }
  }

  // v4.4.0: Try 24-hour dot: "23.10"
  const matchDot = token.match(/(\d{1,2})\.(\d{2})/);
  if (matchDot) {
    const hours = parseInt(matchDot[1], 10);
    const minutes = parseInt(matchDot[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { hours, minutes };
    }
  }

  // v4.4.0: Try 24-hour h-separator: "23h10"
  const matchH = token.match(/(\d{1,2})[hH](\d{2})/);
  if (matchH) {
    const hours = parseInt(matchH[1], 10);
    const minutes = parseInt(matchH[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { hours, minutes };
    }
  }

  return null;
}

// ============================================================================
// CORE VALIDATOR
// ============================================================================

/**
 * Compare a canonical local datetime string against a confirmation time token.
 * 
 * @param canonicalDatetime - Stored datetime (e.g. "2026-02-11T06:00:00")
 * @param confirmationToken - Original parser-extracted time string (e.g. "6:00 AM")
 * @param field - Which booking field ('start' or 'end')
 * @param toleranceMinutes - Allowed tolerance (default 2 minutes)
 */
export function validateTimeField(
  canonicalDatetime: string | null | undefined,
  confirmationToken: string | null | undefined,
  field: 'start' | 'end',
  toleranceMinutes: number = 2
): TimeValidationResult {
  // If no confirmation token, nothing to validate — assume valid
  if (!confirmationToken) {
    return {
      field,
      canonicalTime: formatLocalTimeDirect(canonicalDatetime),
      confirmationAnchor: null,
      isValid: true,
    };
  }

  const canonicalFormatted = formatLocalTimeDirect(canonicalDatetime);
  const anchor = extractAnchorTime(confirmationToken);

  // If canonical has no explicit time (date-only or midnight), 
  // but confirmation has a time → mismatch
  if (!canonicalFormatted && anchor) {
    return {
      field,
      canonicalTime: null,
      confirmationAnchor: confirmationToken,
      isValid: false,
      mismatchReason: 'Canonical has no explicit time but confirmation specifies one',
    };
  }

  // If canonical has time but we can't parse the confirmation token → 
  // can't validate, treat as valid (don't block on unparseable tokens)
  if (!anchor) {
    return {
      field,
      canonicalTime: canonicalFormatted,
      confirmationAnchor: confirmationToken,
      isValid: true,
    };
  }

  // If canonical has no time and confirmation has no parseable time → valid
  if (!canonicalFormatted) {
    return {
      field,
      canonicalTime: null,
      confirmationAnchor: confirmationToken,
      isValid: true,
    };
  }

  // Extract canonical hours/minutes from the stored datetime string
  const canonicalAnchor = extractCanonicalHoursMinutes(canonicalDatetime);
  if (!canonicalAnchor) {
    return {
      field,
      canonicalTime: canonicalFormatted,
      confirmationAnchor: confirmationToken,
      isValid: false,
      mismatchReason: 'Could not extract hours/minutes from canonical datetime',
    };
  }

  // Compare with tolerance
  const diffMinutes = Math.abs(
    (canonicalAnchor.hours * 60 + canonicalAnchor.minutes) -
    (anchor.hours * 60 + anchor.minutes)
  );

  if (diffMinutes <= toleranceMinutes) {
    return {
      field,
      canonicalTime: canonicalFormatted,
      confirmationAnchor: confirmationToken,
      isValid: true,
    };
  }

  return {
    field,
    canonicalTime: canonicalFormatted,
    confirmationAnchor: confirmationToken,
    isValid: false,
    mismatchReason: `Time differs by ${diffMinutes} minutes (canonical=${canonicalFormatted}, confirmation="${confirmationToken}")`,
  };
}

/**
 * Extract hours and minutes directly from a canonical datetime string,
 * bypassing Date() to avoid timezone drift (same approach as formatLocalTimeDirect).
 */
function extractCanonicalHoursMinutes(
  datetimeStr: string | null | undefined
): { hours: number; minutes: number } | null {
  if (!datetimeStr) return null;

  const tIndex = datetimeStr.indexOf('T');
  if (tIndex === -1) return null;

  const timePart = datetimeStr.substring(tIndex + 1);
  const match = timePart.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  // Midnight = likely defaulted, not explicit
  if (hours === 0 && minutes === 0) return null;

  return { hours, minutes };
}

// ============================================================================
// BOOKING-LEVEL VALIDATOR
// ============================================================================

/**
 * Validate all time fields for a single booking against confirmation tokens.
 * 
 * @param startDatetime - Canonical start datetime
 * @param endDatetime - Canonical end datetime  
 * @param confirmationTokens - Array of tokens from the parser
 * @param toleranceMinutes - Allowed tolerance (default 2)
 */
export function validateBookingTimes(
  startDatetime: string | null | undefined,
  endDatetime: string | null | undefined,
  confirmationTokens: ConfirmationTimeToken[],
  toleranceMinutes: number = 2
): BookingTimeValidation {
  const startToken = confirmationTokens.find(t => t.field === 'start');
  const endToken = confirmationTokens.find(t => t.field === 'end');

  const fields: TimeValidationResult[] = [];

  if (startToken || startDatetime) {
    fields.push(
      validateTimeField(startDatetime, startToken?.rawToken, 'start', toleranceMinutes)
    );
  }

  if (endToken || endDatetime) {
    fields.push(
      validateTimeField(endDatetime, endToken?.rawToken, 'end', toleranceMinutes)
    );
  }

  const isValid = fields.every(f => f.isValid);

  return {
    isValid,
    fields,
    isLowConfidence: !isValid,
  };
}

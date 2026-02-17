/**
 * v3.8.12: Field Contamination Guardrails
 * 
 * Hard rules that prevent cross-field data leakage:
 * - Airport code fields MUST match /^[A-Z]{3}$/ (IATA only)
 * - Confirmation/PNR patterns MUST NOT populate airport/location/address fields
 * - Failed guardrail values are moved to rawEvidence and a warning is emitted
 */

import type { RawEvidence, CanonicalWarning } from './canonicalTypes';

// ============================================================================
// PATTERNS
// ============================================================================

const IATA_RE = /^[A-Z]{3}$/;

/**
 * PNR / Confirmation patterns that should NEVER appear in location/airport fields.
 * Covers airline PNRs (e.g., ABCDEF), booking refs with digits, and long alphanumeric IDs.
 */
const CONFIRMATION_PATTERNS = [
  /^[A-Z0-9]{5,8}$/,              // Generic PNR / booking reference
  /^[A-Z]{6}$/,                    // 6-letter PNR (e.g., XHGFDE)
  /^\d{8,}$/,                      // Long numeric IDs
  /^[A-Z]{2}\d{4,}$/,             // Airline code + numbers (e.g., BA12345)
  /^[A-Z0-9]{2}-[A-Z0-9]+$/,     // Hyphenated refs (e.g., AA-123456)
];

// ============================================================================
// GUARD FUNCTIONS
// ============================================================================

/**
 * Returns true if the value looks like a confirmation/PNR string
 * and should NOT be used as a location or airport code.
 */
export function looksLikeConfirmation(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim().toUpperCase();
  // A valid IATA code by itself is NOT a confirmation
  if (IATA_RE.test(trimmed)) return false;
  return CONFIRMATION_PATTERNS.some(p => p.test(trimmed));
}

/**
 * Validate that a string is a valid 3-letter IATA airport code.
 * Returns the uppercased code if valid, null otherwise.
 */
export function enforceIata(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  return IATA_RE.test(trimmed) ? trimmed : null;
}

/**
 * Guard an airport code field: strip non-IATA values,
 * move contaminated values to evidence, emit warning.
 */
export function guardAirportCode(
  fieldName: string,
  value: string | null | undefined,
  evidence: RawEvidence[],
  warnings: CanonicalWarning[],
): string | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();

  // Valid IATA → pass through
  if (IATA_RE.test(trimmed)) return trimmed;

  // Contaminated → move to evidence
  evidence.push({
    field: fieldName,
    originalValue: trimmed,
    reason: `Value "${trimmed}" is not a valid 3-letter IATA code`,
  });
  warnings.push({
    code: 'GUARDRAIL_IATA_REJECTED',
    field: fieldName,
    message: `"${trimmed}" rejected from ${fieldName}: not a valid IATA code. Moved to rawEvidence.`,
    rawValue: trimmed,
  });

  return null;
}

/**
 * Guard a location/address field: strip confirmation-like values,
 * move them to evidence, emit warning.
 */
export function guardLocationField(
  fieldName: string,
  value: string | null | undefined,
  evidence: RawEvidence[],
  warnings: CanonicalWarning[],
): string | null {
  if (!value) return null;
  const trimmed = value.trim();

  if (looksLikeConfirmation(trimmed)) {
    evidence.push({
      field: fieldName,
      originalValue: trimmed,
      reason: `Value "${trimmed}" looks like a confirmation/PNR, not a location`,
    });
    warnings.push({
      code: 'GUARDRAIL_LOCATION_REJECTED',
      field: fieldName,
      message: `"${trimmed}" rejected from ${fieldName}: looks like a confirmation number. Moved to rawEvidence.`,
      rawValue: trimmed,
    });
    return null;
  }

  return trimmed || null;
}

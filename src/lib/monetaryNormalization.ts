/**
 * v3.9.36: Central Monetary Normalization Helper
 *
 * Single shared utility for sanitizing monetary values before any DB write.
 * Prevents numeric field overflow errors in PostgreSQL by validating range
 * and format before persistence.
 *
 * RULES:
 * - No clamping. No rounding. No silent fixing.
 * - Invalid values are rejected, not coerced.
 * - The raw string is always preserved separately for audit.
 */

// ============================================================================
// TYPES
// ============================================================================

export type NormalizedMonetaryResult =
  | { kind: 'ok'; numeric: number }
  | { kind: 'invalid'; reason: string }
  | { kind: 'empty' };

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * PostgreSQL numeric(12,2) max value.
 * bookings.total_cost and expenses.amount are numeric with no explicit precision,
 * but Supabase/PG will reject values that overflow the storage.
 * We use a conservative limit well within safe range.
 */
const MAX_MONETARY_VALUE = 9_999_999_999.99;

// ============================================================================
// MAIN HELPER
// ============================================================================

/**
 * Normalize a raw monetary value (string or number) for safe DB persistence.
 *
 * Behavior:
 * - Strips currency symbols, commas, whitespace.
 * - Validates numeric pattern.
 * - Rejects: non-numeric, Infinity, NaN, negative, out-of-range.
 * - Returns { kind: 'ok', numeric } for valid values.
 * - Returns { kind: 'invalid', reason } for rejected values.
 * - Returns { kind: 'empty' } for null/undefined/empty-string.
 *
 * No clamping. No rounding. No silent fixing.
 */
export function normalizeMonetaryAmount(
  raw: string | number | null | undefined,
): NormalizedMonetaryResult {
  // Handle null/undefined
  if (raw === null || raw === undefined) {
    return { kind: 'empty' };
  }

  // Handle number input directly
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) {
      return { kind: 'invalid', reason: `Non-finite number: ${raw}` };
    }
    if (raw < 0) {
      return { kind: 'invalid', reason: `Negative value: ${raw}` };
    }
    if (raw === 0) {
      return { kind: 'ok', numeric: 0 };
    }
    if (raw > MAX_MONETARY_VALUE) {
      return { kind: 'invalid', reason: `Exceeds max (${MAX_MONETARY_VALUE}): ${raw}` };
    }
    return { kind: 'ok', numeric: raw };
  }

  // Handle string input
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') {
      return { kind: 'empty' };
    }

    // Strip currency symbols and separators
    const cleaned = trimmed
      .replace(/[£€¥₹$\s]/g, '')    // currency symbols + whitespace
      .replace(/,/g, '');             // thousands separators

    // Validate numeric pattern (digits with optional decimal)
    if (!/^\d+(\.\d+)?$/.test(cleaned)) {
      return { kind: 'invalid', reason: `Non-numeric pattern: "${trimmed}"` };
    }

    const numeric = parseFloat(cleaned);

    if (!Number.isFinite(numeric)) {
      return { kind: 'invalid', reason: `Parse resulted in non-finite: "${trimmed}"` };
    }
    if (numeric < 0) {
      return { kind: 'invalid', reason: `Negative value: ${numeric}` };
    }
    if (numeric > MAX_MONETARY_VALUE) {
      return { kind: 'invalid', reason: `Exceeds max (${MAX_MONETARY_VALUE}): ${numeric}` };
    }

    return { kind: 'ok', numeric };
  }

  return { kind: 'invalid', reason: `Unsupported type: ${typeof raw}` };
}

/**
 * Convenience: normalize a number for DB write, returning null for invalid/empty.
 * Use this at booking/expense insert points to prevent numeric overflow.
 */
export function safeMonetaryForDb(raw: string | number | null | undefined): number | null {
  const result = normalizeMonetaryAmount(raw);
  if (result.kind === 'ok') return result.numeric;
  return null;
}

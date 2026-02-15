/**
 * v3.11.3: Canonical Time Preservation
 *
 * SINGLE SOURCE OF TRUTH for preserving and displaying time strings
 * exactly as provided by confirmations, receipts, or manual entry.
 *
 * RULES:
 * - No Date() objects
 * - No format conversion (no AM/PM changes, no leading-zero changes)
 * - No timezone conversion
 * - No locale formatting
 * - Input string is trimmed and returned as-is
 * - Missing/empty → null (preserveTimeString) or "Time not provided" (displayPreservedTime)
 */

// ============================================================================
// PRESERVATION
// ============================================================================

/**
 * Preserve a raw time string exactly as provided.
 * Returns trimmed string if non-empty, null otherwise.
 *
 * Use at ingestion boundaries:
 * - Confirmation parsing results
 * - Receipt parsing results
 * - Manual entry form values
 *
 * No parsing. No format changes. No Date objects.
 */
export function preserveTimeString(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// ============================================================================
// DISPLAY
// ============================================================================

/** Neutral label shown when no time was provided — never guesses */
export const TIME_NOT_PROVIDED = 'Time not provided';

/**
 * Display a preserved time string.
 * If present → return as-is (no format changes).
 * If missing → return "Time not provided" (neutral, no guessing).
 *
 * Use in execution-critical display paths:
 * - Timeline row time labels
 * - NOW / Next Up time display
 * - Any shared time display utility
 */
export function displayPreservedTime(t: string | null | undefined): string {
  if (t == null) return TIME_NOT_PROVIDED;
  const trimmed = t.trim();
  return trimmed.length > 0 ? trimmed : TIME_NOT_PROVIDED;
}

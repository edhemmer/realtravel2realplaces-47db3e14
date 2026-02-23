/**
 * v3.9.25: Raw Content Normalization for Parsing
 *
 * Collapses multi-line, heavily-spaced airline email content into
 * logical lines suitable for block-based flight leg detection.
 *
 * RULES:
 * - Parse-time only — NEVER modify or overwrite stored raw confirmation text
 * - Collapse multiple blank lines into single logical separators
 * - Trim whitespace from each line
 * - Strip invisible Unicode characters (U+200C, U+00AD, etc.)
 * - Preserve meaningful content order
 */

// ============================================================================
// INVISIBLE CHAR STRIPPING
// ============================================================================

/**
 * Regex to match invisible/zero-width Unicode characters that pollute airline emails.
 * Includes: ZWNJ, ZWJ, soft hyphen, zero-width space, BOM, invisible separator, etc.
 */
const INVISIBLE_CHARS_RE = /[\u200B\u200C\u200D\u00AD\uFEFF\u2060\u180E\u034F\u2028\u2029]/g;

/**
 * Strip invisible Unicode characters from a string.
 */
function stripInvisible(s: string): string {
  return s.replace(INVISIBLE_CHARS_RE, '');
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Normalize raw confirmation text for parsing purposes.
 *
 * Returns an array of logical lines with:
 * - Invisible Unicode chars stripped
 * - Each line trimmed
 * - Empty/whitespace-only lines collapsed (only one blank separator retained)
 * - Trailing/leading blank lines removed
 *
 * ⚠️ This output is for PARSING ONLY — never stored or persisted.
 */
export function normalizeToLogicalLines(rawText: string): string[] {
  if (!rawText || typeof rawText !== 'string') return [];

  // Strip invisible chars globally
  const cleaned = stripInvisible(rawText);

  // Split on newlines
  const rawLines = cleaned.split(/\r?\n/);

  // Trim each line + collapse runs of blank lines into a single empty-string separator
  const result: string[] = [];
  let lastWasBlank = true; // Start true to skip leading blanks

  for (const raw of rawLines) {
    const trimmed = raw.trim();

    if (trimmed.length === 0) {
      // Blank line: emit at most one separator
      if (!lastWasBlank) {
        result.push('');
        lastWasBlank = true;
      }
      continue;
    }

    result.push(trimmed);
    lastWasBlank = false;
  }

  // Remove trailing blank separator
  while (result.length > 0 && result[result.length - 1] === '') {
    result.pop();
  }

  return result;
}

/**
 * Rejoin logical lines into a single normalized string.
 * Useful for sending cleaned text to the AI parser.
 */
export function normalizeRawContent(rawText: string): string {
  return normalizeToLogicalLines(rawText).join('\n');
}

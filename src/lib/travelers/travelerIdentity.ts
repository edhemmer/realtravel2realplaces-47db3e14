/**
 * v3.12.3: Canonical Traveler Identity
 * 
 * Prevents duplicate travelers during import by normalizing names
 * and building stable dedup keys. Pure, deterministic, no network.
 * 
 * RULES:
 * - Strip title prefixes (MR/MS/MRS/MISS/DR)
 * - Normalize: trim, collapse spaces, uppercase
 * - Key: LAST|FIRST (normalized)
 * - Conservative last-name parsing for free-text names
 * - Does NOT retroactively merge old duplicates
 */

// ============================================================================
// TITLE PREFIXES
// ============================================================================

const TITLE_PREFIXES = /^(MR\.?|MS\.?|MRS\.?|MISS\.?|DR\.?|PROF\.?)\s+/i;

/**
 * Remove common title prefixes from a name string.
 */
export function stripTitlePrefix(name: string): string {
  return name.replace(TITLE_PREFIXES, '').trim();
}

// ============================================================================
// NAME NORMALIZATION
// ============================================================================

/**
 * Normalize a name: trim, collapse whitespace, uppercase.
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/**
 * Build a stable traveler dedup key from first and last name.
 * Format: LAST|FIRST (both normalized).
 */
export function buildTravelerKey(first: string, last: string): string {
  const nFirst = normalizeName(stripTitlePrefix(first));
  const nLast = normalizeName(stripTitlePrefix(last));
  return `${nLast}|${nFirst}`;
}

// ============================================================================
// FREE-TEXT NAME PARSING
// ============================================================================

export interface ParsedTravelerName {
  first: string;
  last: string;
}

/**
 * Parse a free-text passenger name into first/last.
 * 
 * Rules:
 * - Strip title prefix first
 * - If comma present: "LAST, FIRST" format
 * - If slash present: "LAST/FIRST" format
 * - Otherwise: first token = first name, rest = last name
 *   (preserves multi-part last names like "Van Der Berg")
 */
export function parseTravelerName(fullName: string): ParsedTravelerName {
  const cleaned = stripTitlePrefix(fullName.trim());
  
  if (!cleaned) {
    return { first: '', last: '' };
  }

  // "LAST, FIRST" format
  if (cleaned.includes(',')) {
    const [lastPart, ...firstParts] = cleaned.split(',');
    return {
      first: normalizeName(firstParts.join(',').trim() || ''),
      last: normalizeName(lastPart.trim()),
    };
  }

  // "LAST/FIRST" format (common in airline records)
  if (cleaned.includes('/')) {
    const [lastPart, ...firstParts] = cleaned.split('/');
    return {
      first: normalizeName(firstParts.join('/').trim() || ''),
      last: normalizeName(lastPart.trim()),
    };
  }

  // Space-separated: first token = first, remainder = last
  const tokens = cleaned.split(/\s+/);
  if (tokens.length === 1) {
    return { first: normalizeName(tokens[0]), last: '' };
  }

  return {
    first: normalizeName(tokens[0]),
    last: normalizeName(tokens.slice(1).join(' ')),
  };
}

/**
 * Build a traveler key from a free-text full name.
 */
export function buildTravelerKeyFromFullName(fullName: string): string {
  const { first, last } = parseTravelerName(fullName);
  return `${last}|${first}`;
}

// ============================================================================
// DEDUP CHECK
// ============================================================================

/**
 * Check if a traveler name already exists in a list of existing names.
 * Returns the index of the matching existing name, or -1 if no match.
 */
export function findExistingTraveler(
  candidateName: string,
  existingNames: string[],
): number {
  const candidateKey = buildTravelerKeyFromFullName(candidateName);
  
  for (let i = 0; i < existingNames.length; i++) {
    const existingKey = buildTravelerKeyFromFullName(existingNames[i]);
    if (existingKey === candidateKey) return i;
  }
  
  return -1;
}

/**
 * Enhanced duplicate detection for companion names.
 * Checks both exact normalized match AND traveler key match.
 */
export function detectDuplicateCompanions(names: string[]): boolean {
  if (names.length <= 1) return false;

  const keys = new Set<string>();
  for (const name of names) {
    const key = buildTravelerKeyFromFullName(name);
    if (keys.has(key)) return true;
    keys.add(key);
  }

  return false;
}

/**
 * v3.10.0: IATA Resolution Module
 * 
 * Resolves airport names/text to 3-letter IATA codes using the bundled
 * airport dataset. NO runtime network calls.
 * 
 * Resolution order:
 * 1. Extract IATA if already present in text (LHR, Heathrow (LHR), [LHR], etc.)
 * 2. Reject confirmation/PNR patterns as airport candidates
 * 3. Exact name/alias match (case-insensitive)
 * 4. Partial name/alias match (input contains or is contained in dataset name)
 * 5. Token-prefix matching for abbreviated names ("Hartsfield-Jackson Int" → ATL)
 * 6. City match
 * 7. Standalone IATA code extraction from longer text
 * 8. If unresolved, return null with confidence 'unresolved'
 * 
 * GUARDRAIL: If multiple airports match with equal confidence (e.g., "Milan"),
 * return confidence:'unknown' and keep iata empty.
 */

import { airports, type Airport } from '@/lib/airportData';
import { looksLikeConfirmation } from '@/lib/canonical/guardrails';

// ============================================================================
// TYPES
// ============================================================================

export interface IataResolution {
  /** Resolved IATA code or null */
  code: string | null;
  /** Human-readable name (always populated if input was non-empty) */
  name: string | null;
  /** Resolution confidence */
  confidence: 'high' | 'low' | 'unresolved';
  /** How the code was resolved */
  method: 'extracted' | 'name_match' | 'alias_match' | 'token_match' | 'city_match' | 'unresolved';
}

// ============================================================================
// LOOKUP INDEXES (built once, cached)
// ============================================================================

let _byCode: Map<string, Airport> | null = null;
let _byNameLower: Map<string, Airport> | null = null;
let _byCityLower: Map<string, Airport[]> | null = null;
let _aliasIndex: Map<string, Airport> | null = null;

function ensureIndexes() {
  if (_byCode) return;
  _byCode = new Map();
  _byNameLower = new Map();
  _byCityLower = new Map();
  _aliasIndex = new Map();
  for (const ap of airports) {
    _byCode.set(ap.code.toUpperCase(), ap);
    _byNameLower.set(ap.name.toLowerCase(), ap);
    // City index: collect all airports per city for ambiguity detection
    const cityKey = ap.city.toLowerCase();
    const cityList = _byCityLower.get(cityKey) || [];
    cityList.push(ap);
    _byCityLower.set(cityKey, cityList);
    // Alias index
    if (ap.aliases) {
      for (const alias of ap.aliases) {
        _aliasIndex.set(alias.toLowerCase(), ap);
      }
    }
  }
}

// ============================================================================
// EXTRACTION PATTERNS
// ============================================================================

/** Extract a 3-letter IATA code from text like "Heathrow (LHR)", "[LHR]", "LHR" */
const IATA_IN_PARENS = /\(([A-Z]{3})\)/i;
const IATA_IN_BRACKETS = /\[([A-Z]{3})\]/i;
const STANDALONE_IATA = /\b([A-Z]{3})\b/;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Normalize text for comparison: lowercase, remove punctuation, normalize whitespace.
 */
function normalizeText(text: string): string {
  return text.toLowerCase()
    .replace(/[–—\-_]/g, ' ')
    .replace(/[()[\].,'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if input tokens are a prefix of the airport name tokens.
 * E.g., "hartsfield jackson int" is a prefix match for
 * "hartsfield jackson atlanta international" since "int" is a prefix of "international".
 */
function isTokenPrefixMatch(inputTokens: string[], nameTokens: string[]): boolean {
  if (inputTokens.length === 0 || inputTokens.length > nameTokens.length) return false;

  // All but last token must match exactly
  for (let i = 0; i < inputTokens.length - 1; i++) {
    if (inputTokens[i] !== nameTokens[i]) return false;
  }

  // Last input token can be a prefix of the corresponding name token
  const lastInput = inputTokens[inputTokens.length - 1];
  // It could match any remaining token (handles skipped words like "Atlanta")
  for (let j = inputTokens.length - 1; j < nameTokens.length; j++) {
    if (nameTokens[j].startsWith(lastInput) && lastInput.length >= 3) {
      return true;
    }
  }
  return false;
}

/**
 * Check if all input tokens appear (as prefixes) in the name tokens in order.
 * More flexible: allows gaps (skipping words in the official name).
 */
function isFlexibleTokenMatch(inputTokens: string[], nameTokens: string[]): boolean {
  if (inputTokens.length === 0) return false;
  let nameIdx = 0;
  for (const inputTok of inputTokens) {
    let found = false;
    while (nameIdx < nameTokens.length) {
      if (nameTokens[nameIdx] === inputTok || 
          (nameTokens[nameIdx].startsWith(inputTok) && inputTok.length >= 3)) {
        nameIdx++;
        found = true;
        break;
      }
      nameIdx++;
    }
    if (!found) return false;
  }
  return true;
}

// ============================================================================
// CORE RESOLVER
// ============================================================================

/**
 * Resolve a text string to an IATA airport code.
 * 
 * @param text - Airport code, name, or city (e.g., "LHR", "Heathrow", "London")
 * @returns Resolution result with code, name, confidence, and method
 */
export function resolveIata(text: string | null | undefined): IataResolution {
  if (!text || !text.trim()) {
    return { code: null, name: null, confidence: 'unresolved', method: 'unresolved' };
  }

  const trimmed = text.trim();
  ensureIndexes();

  // Step 1: Check for exact name/alias match BEFORE confirmation guard
  // (prevents airport names like "Heathrow" from being rejected as PNRs)
  const lowerTrimmed = trimmed.toLowerCase();
  const byNameEarly = _byNameLower!.get(lowerTrimmed);
  if (byNameEarly) {
    return { code: byNameEarly.code, name: byNameEarly.name, confidence: 'high', method: 'name_match' };
  }
  const byAliasEarly = _aliasIndex!.get(lowerTrimmed);
  if (byAliasEarly) {
    return { code: byAliasEarly.code, name: byAliasEarly.name, confidence: 'high', method: 'alias_match' };
  }

  // Step 2: Reject confirmation/PNR patterns
  if (looksLikeConfirmation(trimmed)) {
    return { code: null, name: trimmed, confidence: 'unresolved', method: 'unresolved' };
  }
  const parenMatch = trimmed.match(IATA_IN_PARENS);
  if (parenMatch) {
    const code = parenMatch[1].toUpperCase();
    const ap = _byCode!.get(code);
    return {
      code,
      name: ap?.name || trimmed,
      confidence: ap ? 'high' : 'low',
      method: 'extracted',
    };
  }

  const bracketMatch = trimmed.match(IATA_IN_BRACKETS);
  if (bracketMatch) {
    const code = bracketMatch[1].toUpperCase();
    const ap = _byCode!.get(code);
    return {
      code,
      name: ap?.name || trimmed,
      confidence: ap ? 'high' : 'low',
      method: 'extracted',
    };
  }

  // Step 3: Exact 3-letter code lookup
  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) {
    const ap = _byCode!.get(upper);
    if (ap) {
      return { code: upper, name: ap.name, confidence: 'high', method: 'extracted' };
    }
    // 3-letter code but not in dataset — still treat as IATA
    return { code: upper, name: trimmed, confidence: 'low', method: 'extracted' };
  }

  // Step 5: Exact name match (already checked for exact, now skip)
  // (exact match was done pre-confirmation-guard, so only partial matching remains)

  // Step 6: Exact alias match (already checked pre-guard)

  // Step 7: Normalized alias match (strip parentheses, normalize dashes)
  const normalizedInput = normalizeText(trimmed);
  for (const [alias, ap] of _aliasIndex!) {
    if (normalizeText(alias) === normalizedInput) {
      return { code: ap.code, name: ap.name, confidence: 'high', method: 'alias_match' };
    }
  }

  // Step 7: Partial name match — input is substring of name or vice versa
  for (const [name, ap] of _byNameLower!) {
    if (lowerTrimmed.includes(name) || name.includes(lowerTrimmed)) {
      return { code: ap.code, name: ap.name, confidence: 'high', method: 'name_match' };
    }
  }

  // Step 7b: Partial alias match
  for (const [alias, ap] of _aliasIndex!) {
    if (lowerTrimmed.includes(alias) || alias.includes(lowerTrimmed)) {
      return { code: ap.code, name: ap.name, confidence: 'high', method: 'alias_match' };
    }
  }

  // Step 8: Token-prefix matching for abbreviated names
  // "Hartsfield-Jackson Int" → tokens ["hartsfield", "jackson", "int"]
  // Matches "Hartsfield-Jackson Atlanta International" via flexible token match
  const inputTokens = normalizedInput.split(/\s+/).filter(t => t.length >= 2);
  if (inputTokens.length >= 2) {
    const matches: Airport[] = [];
    for (const ap of airports) {
      const nameTokens = normalizeText(ap.name).split(/\s+/).filter(t => t.length >= 2);
      if (isTokenPrefixMatch(inputTokens, nameTokens) || isFlexibleTokenMatch(inputTokens, nameTokens)) {
        matches.push(ap);
      }
      // Also check aliases
      if (ap.aliases) {
        for (const alias of ap.aliases) {
          const aliasTokens = normalizeText(alias).split(/\s+/).filter(t => t.length >= 2);
          if (isTokenPrefixMatch(inputTokens, aliasTokens) || isFlexibleTokenMatch(inputTokens, aliasTokens)) {
            if (!matches.includes(ap)) matches.push(ap);
          }
        }
      }
    }
    if (matches.length === 1) {
      return { code: matches[0].code, name: matches[0].name, confidence: 'high', method: 'token_match' };
    }
    // Ambiguous — multiple matches; don't guess
    if (matches.length > 1) {
      return { code: null, name: trimmed, confidence: 'unresolved', method: 'unresolved' };
    }
  }

  // Step 9: City match (with ambiguity guard)
  const cityMatches = _byCityLower!.get(lowerTrimmed);
  if (cityMatches) {
    if (cityMatches.length === 1) {
      return { code: cityMatches[0].code, name: cityMatches[0].name, confidence: 'high', method: 'city_match' };
    }
    // Multiple airports in the same city — ambiguous, don't guess
    return { code: null, name: trimmed, confidence: 'unresolved', method: 'unresolved' };
  }

  // Partial city match
  for (const [city, apList] of _byCityLower!) {
    if (lowerTrimmed.includes(city) || city.includes(lowerTrimmed)) {
      if (apList.length === 1) {
        return { code: apList[0].code, name: apList[0].name, confidence: 'low', method: 'city_match' };
      }
      // Ambiguous
      return { code: null, name: trimmed, confidence: 'unresolved', method: 'unresolved' };
    }
  }

  // Step 10: Last resort — scan for any standalone 3-letter code in the text
  const standaloneMatch = trimmed.match(STANDALONE_IATA);
  if (standaloneMatch) {
    const code = standaloneMatch[1].toUpperCase();
    const ap = _byCode!.get(code);
    if (ap) {
      return { code, name: ap.name, confidence: 'low', method: 'extracted' };
    }
  }

  // Unresolved
  return { code: null, name: trimmed, confidence: 'unresolved', method: 'unresolved' };
}

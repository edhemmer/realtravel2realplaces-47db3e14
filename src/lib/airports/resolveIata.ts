/**
 * v3.8.12: IATA Resolution Module
 * 
 * Resolves airport names/text to 3-letter IATA codes using the bundled
 * airport dataset. NO runtime network calls.
 * 
 * Resolution order:
 * 1. Extract IATA if already present in text (LHR, Heathrow (LHR), [LHR], etc.)
 * 2. Reject confirmation/PNR patterns as airport candidates
 * 3. Resolve airport/city name → IATA using bundled dataset
 * 4. If unresolved, return null with low confidence
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
  method: 'extracted' | 'name_match' | 'city_match' | 'unresolved';
}

// ============================================================================
// LOOKUP INDEXES (built once, cached)
// ============================================================================

let _byCode: Map<string, Airport> | null = null;
let _byNameLower: Map<string, Airport> | null = null;
let _byCityLower: Map<string, Airport> | null = null;

function ensureIndexes() {
  if (_byCode) return;
  _byCode = new Map();
  _byNameLower = new Map();
  _byCityLower = new Map();
  for (const ap of airports) {
    _byCode.set(ap.code.toUpperCase(), ap);
    _byNameLower.set(ap.name.toLowerCase(), ap);
    // City index: first match wins (e.g., "London" → LHR, not LGW)
    const cityKey = ap.city.toLowerCase();
    if (!_byCityLower.has(cityKey)) {
      _byCityLower.set(cityKey, ap);
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

  // Step 1: Reject confirmation/PNR patterns
  if (looksLikeConfirmation(trimmed)) {
    return { code: null, name: trimmed, confidence: 'unresolved', method: 'unresolved' };
  }

  // Step 2: Extract IATA from parentheses/brackets
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
    // 3-letter code but not in dataset — still treat as IATA (could be valid but not in our list)
    return { code: upper, name: trimmed, confidence: 'low', method: 'extracted' };
  }

  // Step 4: Name match (case-insensitive)
  const lowerTrimmed = trimmed.toLowerCase();
  const byName = _byNameLower!.get(lowerTrimmed);
  if (byName) {
    return { code: byName.code, name: byName.name, confidence: 'high', method: 'name_match' };
  }

  // Partial name match: check if the input contains an airport name
  for (const [name, ap] of _byNameLower!) {
    if (lowerTrimmed.includes(name) || name.includes(lowerTrimmed)) {
      return { code: ap.code, name: ap.name, confidence: 'high', method: 'name_match' };
    }
  }

  // Step 5: City match
  const byCity = _byCityLower!.get(lowerTrimmed);
  if (byCity) {
    return { code: byCity.code, name: byCity.name, confidence: 'high', method: 'city_match' };
  }

  // Partial city match
  for (const [city, ap] of _byCityLower!) {
    if (lowerTrimmed.includes(city) || city.includes(lowerTrimmed)) {
      return { code: ap.code, name: ap.name, confidence: 'low', method: 'city_match' };
    }
  }

  // Step 6: Last resort — scan for any standalone 3-letter code in the text
  const standaloneMatch = trimmed.match(STANDALONE_IATA);
  if (standaloneMatch) {
    const code = standaloneMatch[1].toUpperCase();
    // Only accept if it's a known airport (avoid random 3-letter words)
    const ap = _byCode!.get(code);
    if (ap) {
      return { code, name: ap.name, confidence: 'low', method: 'extracted' };
    }
  }

  // Unresolved
  return { code: null, name: trimmed, confidence: 'unresolved', method: 'unresolved' };
}

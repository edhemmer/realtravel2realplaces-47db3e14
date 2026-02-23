/**
 * v3.9.25: Block-Based Flight Leg Detection
 *
 * Detects flight legs from multi-line block formats (e.g. Vueling emails)
 * using a sliding window over logical lines.
 *
 * A valid flight leg block contains ALL FOUR within a 5–7 line window:
 * 1. A date line (e.g. "17 March 2026", "03/17/2026")
 * 2. Two IATA-like tokens ([A-Z]{3}) for origin and destination
 * 3. A time range line (e.g. "10:15h 12:00h", "10:15 12:00")
 * 4. A plausible flight number (e.g. VY6104, BA0569)
 *
 * RULES:
 * - Flight parsing ONLY — no hotel, car, or generic city inference
 * - Raw strings preserved exactly as found (no date/time conversion)
 * - Deduplicate by bookingCode + flightNumber + departureDate + originIATA + destIATA
 * - Partial blocks (valid leg but no passengers) proceed to classification
 */

import { normalizeToLogicalLines } from './normalizeRawContent';

// ============================================================================
// TYPES
// ============================================================================

export interface BlockDetectedLeg {
  /** Origin airport name parsed from context (e.g. "Barcelona (Spain)") */
  originAirportName: string | null;
  /** Origin IATA code (e.g. "BCN") */
  originAirportCode: string | null;
  /** Destination airport name (e.g. "Rome (Fiumicino) (Italy)") */
  destinationAirportName: string | null;
  /** Destination IATA code (e.g. "FCO") */
  destinationAirportCode: string | null;
  /** Departure date string exactly as shown */
  departureDate: string;
  /** Departure time string exactly as shown (may include "h") */
  departureTime: string;
  /** Arrival time string exactly as shown */
  arrivalTime: string;
  /** Flight number (e.g. "VY6104") */
  flightNumber: string;
}

// ============================================================================
// PATTERN MATCHERS
// ============================================================================

/**
 * Date patterns — matches lines that contain a recognizable date.
 * Returns the raw matched string.
 */
const DATE_PATTERNS = [
  // "17 March 2026", "17 Mar 2026", "Tuesday, 17 March 2026"
  /(?:(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+)?(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{4})/i,
  // "March 17, 2026"
  /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2}),?\s+(\d{4})/i,
  // "17/03/2026" or "03/17/2026"
  /(\d{1,2})[/\\-](\d{1,2})[/\\-](\d{4})/,
  // "2026-03-17"
  /(\d{4})-(\d{2})-(\d{2})/,
];

function extractDateFromLine(line: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = line.match(pattern);
    if (match) return match[0];
  }
  return null;
}

/**
 * IATA-like token: exactly 3 uppercase letters, standalone.
 * Returns all matches from a line.
 */
const IATA_RE = /\b([A-Z]{3})\b/g;

// Common 3-letter words that are NOT airport codes
const IATA_EXCLUDE = new Set([
  'THE', 'AND', 'FOR', 'NOT', 'YOU', 'ARE', 'BUT', 'HAS', 'HIS', 'HER',
  'WAS', 'ONE', 'OUR', 'OUT', 'ALL', 'CAN', 'HAD', 'ITS', 'SAY', 'SHE',
  'DID', 'GET', 'LET', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'WHO',
  'BOY', 'DAY', 'EYE', 'HOW', 'MAN', 'TWO', 'USE', 'ADD', 'AGE', 'AGO',
  'AID', 'AIM', 'AIR', 'ASK', 'BIG', 'BIT', 'CAR', 'CUT', 'DOG', 'EAR',
  'END', 'FAR', 'FEW', 'GOD', 'GOT', 'GUN', 'HIT', 'HOT', 'JOB', 'KEY',
  'LAY', 'LED', 'LOT', 'LOW', 'MAP', 'MET', 'MRS', 'OWN', 'PAY', 'PUT',
  'RAN', 'RED', 'RUN', 'SAT', 'SET', 'SIT', 'SIX', 'TEN', 'TOP', 'TRY',
  'WON', 'YET', 'YES', 'MAX', 'MIN', 'PER', 'TAX', 'FEE', 'PAX',
  'EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR',
  'PDF', 'WWW', 'COM', 'NET', 'ORG', 'APP', 'API',
]);

function extractIataCodes(line: string): string[] {
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(IATA_RE.source, 'g');
  while ((m = re.exec(line)) !== null) {
    if (!IATA_EXCLUDE.has(m[1])) {
      matches.push(m[1]);
    }
  }
  return matches;
}

/**
 * Time range pattern: two time tokens on the same line.
 * Supports: "10:15h 12:00h", "10:15 12:00", "10:15h - 12:00h"
 */
const TIME_RANGE_RE = /(\d{1,2}:\d{2}h?)\s*[-–—]?\s*(\d{1,2}:\d{2}h?)/;

function extractTimeRange(line: string): { departure: string; arrival: string } | null {
  const match = line.match(TIME_RANGE_RE);
  if (!match) return null;
  return { departure: match[1], arrival: match[2] };
}

/**
 * Flight number pattern: 2-letter carrier + 1-4 digit number.
 * E.g. VY6104, BA0569, FR1234, W62345
 */
const FLIGHT_NUMBER_RE = /\b([A-Z]{1,2}\d{1,5})\b/;

function extractFlightNumber(line: string): string | null {
  const match = line.match(FLIGHT_NUMBER_RE);
  if (!match) return null;
  const candidate = match[1];
  // Must have at least 1 letter and at least 1 digit
  if (/[A-Z]/.test(candidate) && /\d/.test(candidate)) {
    return candidate;
  }
  return null;
}

// ============================================================================
// AIRPORT NAME EXTRACTION
// ============================================================================

/**
 * Try to extract airport/city names from lines near IATA codes.
 * Looks for patterns like "Barcelona (Spain)" or "Rome (Fiumicino) (Italy)"
 */
function extractAirportNames(
  lines: string[],
  windowStart: number,
  windowEnd: number,
  originCode: string,
  destCode: string,
): { originName: string | null; destName: string | null } {
  let originName: string | null = null;
  let destName: string | null = null;

  for (let i = windowStart; i <= windowEnd && i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Look for lines containing city/country patterns (text with parentheses)
    // e.g. "Barcelona (Spain) Rome (Fiumicino) (Italy)"
    const cityPattern = /([A-Z][a-zA-ZÀ-ÿ\s]+(?:\([^)]+\))?)\s+([A-Z][a-zA-ZÀ-ÿ\s]+(?:\([^)]+\)(?:\s*\([^)]+\))?)?)/;
    const cityMatch = line.match(cityPattern);
    if (cityMatch) {
      originName = cityMatch[1].trim();
      destName = cityMatch[2].trim();
      break;
    }

    // Simpler: if line contains the IATA code, the rest might be the name
    if (line.includes(originCode) && !originName) {
      const cleaned = line.replace(originCode, '').trim();
      if (cleaned.length > 2) originName = cleaned;
    }
    if (line.includes(destCode) && !destName) {
      const cleaned = line.replace(destCode, '').trim();
      if (cleaned.length > 2) destName = cleaned;
    }
  }

  return { originName, destName };
}

// ============================================================================
// SLIDING WINDOW DETECTOR
// ============================================================================

const WINDOW_SIZE = 7; // Max lines to scan per block

/**
 * Detect flight legs from normalized logical lines using a sliding window.
 *
 * Scans windows of up to WINDOW_SIZE lines looking for blocks that contain
 * all four required elements (date, IATA codes, time range, flight number).
 *
 * @param rawText - Raw confirmation text (will be normalized internally)
 * @returns Array of detected flight legs (may be empty)
 */
export function detectFlightLegsFromBlocks(rawText: string): BlockDetectedLeg[] {
  const lines = normalizeToLogicalLines(rawText);
  if (lines.length < 4) return [];

  const detected: BlockDetectedLeg[] = [];
  const usedLineIndices = new Set<number>();

  for (let windowStart = 0; windowStart <= lines.length - 4; windowStart++) {
    // Skip if this starting line was already consumed by a previous block
    if (usedLineIndices.has(windowStart)) continue;

    const windowEnd = Math.min(windowStart + WINDOW_SIZE - 1, lines.length - 1);

    // Scan window for all four elements
    let dateLine: string | null = null;
    let dateLineIdx = -1;
    let iataCodes: string[] = [];
    let iataLineIdx = -1;
    let timeRange: { departure: string; arrival: string } | null = null;
    let timeLineIdx = -1;
    let flightNumber: string | null = null;
    let flightLineIdx = -1;

    for (let i = windowStart; i <= windowEnd; i++) {
      const line = lines[i];
      if (!line) continue;

      // Date
      if (!dateLine) {
        const d = extractDateFromLine(line);
        if (d) { dateLine = d; dateLineIdx = i; }
      }

      // IATA codes — accumulate across lines in window
      const codes = extractIataCodes(line);
      if (codes.length > 0) {
        if (iataCodes.length === 0) iataLineIdx = i;
        iataCodes = [...iataCodes, ...codes];
      }

      // Time range
      if (!timeRange) {
        const tr = extractTimeRange(line);
        if (tr) { timeRange = tr; timeLineIdx = i; }
      }

      // Flight number
      if (!flightNumber) {
        const fn = extractFlightNumber(line);
        if (fn) { flightNumber = fn; flightLineIdx = i; }
      }
    }

    // Deduplicate IATA codes (keep unique, in order)
    const uniqueIata = [...new Set(iataCodes)];

    // Validate: all four elements must be present + at least 2 IATA codes
    if (dateLine && uniqueIata.length >= 2 && timeRange && flightNumber) {
      const originCode = uniqueIata[0];
      const destCode = uniqueIata[1];

      // Extract airport names from context
      const { originName, destName } = extractAirportNames(
        lines, windowStart, windowEnd, originCode, destCode,
      );

      detected.push({
        originAirportName: originName,
        originAirportCode: originCode,
        destinationAirportName: destName,
        destinationAirportCode: destCode,
        departureDate: dateLine,
        departureTime: timeRange.departure,
        arrivalTime: timeRange.arrival,
        flightNumber,
      });

      // Mark consumed lines
      for (const idx of [dateLineIdx, iataLineIdx, timeLineIdx, flightLineIdx]) {
        if (idx >= 0) usedLineIndices.add(idx);
      }

      // Skip window past the consumed block
      windowStart = Math.max(dateLineIdx, iataLineIdx, timeLineIdx, flightLineIdx);
    }
  }

  return detected;
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

/**
 * Build a dedup key for a detected leg.
 * Format: "bookingCode|flightNumber|departureDate|originIATA|destIATA"
 */
function buildLegDedupKey(
  leg: BlockDetectedLeg,
  bookingCode: string | null,
): string {
  return [
    (bookingCode || '').toUpperCase(),
    leg.flightNumber.toUpperCase(),
    leg.departureDate,
    leg.originAirportCode || '',
    leg.destinationAirportCode || '',
  ].join('|');
}

/**
 * Deduplicate detected legs by composite key.
 */
export function deduplicateDetectedLegs(
  legs: BlockDetectedLeg[],
  bookingCode: string | null,
): BlockDetectedLeg[] {
  const seen = new Set<string>();
  const unique: BlockDetectedLeg[] = [];

  for (const leg of legs) {
    const key = buildLegDedupKey(leg, bookingCode);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(leg);
    }
  }

  return unique;
}

// ============================================================================
// BOOKING CODE EXTRACTION
// ============================================================================

/** Extract booking/PNR code from text. Looks for common patterns. */
const BOOKING_CODE_PATTERNS = [
  /(?:booking\s+(?:code|reference|ref|number)|confirmation\s+(?:code|number)|pnr|record\s+locator)[:\s]+([A-Z0-9]{5,8})/i,
  /\b([A-Z0-9]{6})\b(?=\s*[-–]\s*[A-Z]{3})/,  // "RPYZ7H - BCN"
];

export function extractBookingCode(text: string): string | null {
  for (const pattern of BOOKING_CODE_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

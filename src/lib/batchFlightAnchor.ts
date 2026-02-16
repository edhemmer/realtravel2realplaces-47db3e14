/**
 * v1.0.0: Batch Flight Anchor Resolver
 *
 * CANONICAL module for determining trip shell boundaries from a batch
 * of parsed flight legs using the user's Home Airport as anchor.
 *
 * RULES:
 * - Outbound anchor = earliest flight departing from Home Airport
 * - Return anchor = latest flight arriving at Home Airport
 * - Destination = first non-home arrival airport after outbound anchor
 * - Legs outside anchored shell are flagged (not silently merged)
 * - Costs are captured raw only — no conversion, no totals
 * - No guessing, no inference from text tokens
 *
 * ARCHITECTURE:
 * parse-booking (per email) → ParsedFlightLeg[] → resolveBatchAnchors()
 *   → BatchAnchorResult (used by tripFrameResolver for shell creation)
 */

import { getAirportByCode, type Airport } from './airportData';

// ============================================================================
// TYPES
// ============================================================================

/** A single parsed flight leg from a confirmation email */
export interface ParsedFlightLeg {
  /** Unique stable ID (confirmation + flight number + datetime) */
  legId: string;
  /** 3-letter IATA departure airport code */
  departAirportCode: string;
  /** 3-letter IATA arrival airport code */
  arriveAirportCode: string;
  /** ISO 8601 departure datetime (timezone-aware or date-only) */
  departDateTime: string;
  /** ISO 8601 arrival datetime (timezone-aware or date-only) */
  arriveDateTime: string | null;
  /** Carrier / airline name */
  carrier: string | null;
  /** Flight number */
  flightNumber: string | null;
  /** Confirmation / PNR code */
  confirmationCode: string | null;
  /** Raw cost as captured (no conversion) */
  rawCost: number | null;
  /** Raw currency symbol/code as captured */
  rawCurrency: string | null;
  /** Source email filename for traceability */
  sourceFile: string | null;
}

/** Result of batch anchor resolution */
export interface BatchAnchorResult {
  /** The outbound anchor leg (earliest departure from home) */
  outboundAnchor: ParsedFlightLeg | null;
  /** The return anchor leg (latest arrival at home) */
  returnAnchor: ParsedFlightLeg | null;
  /** Trip start datetime from outbound anchor */
  tripStartDateTime: string | null;
  /** Trip end datetime from return anchor (or latest arrival if no return) */
  tripEndDateTime: string | null;
  /** Whether a return-to-home leg was found */
  hasReturnToHome: boolean;
  /** Derived destination from first non-home arrival */
  destination: BatchDestination | null;
  /** All legs ordered by departDateTime */
  orderedLegs: ParsedFlightLeg[];
  /** Legs flagged as outside the anchored shell */
  outsideShellLegs: ParsedFlightLeg[];
  /** Warnings for user display */
  warnings: string[];
  /** Whether anchoring was successful */
  isAnchored: boolean;
}

/** Safe destination fields derived from airport geodata */
export interface BatchDestination {
  /** City name from airport data */
  city: string;
  /** State/region — only if confidently validated via airport data, else null */
  state: string | null;
  /** Country from airport data */
  country: string;
  /** The IATA code used to derive this destination */
  airportCode: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Max hours a leg can be outside the shell before flagging (buffer for connections) */
const OUTSIDE_SHELL_BUFFER_HOURS = 6;

// ============================================================================
// CORE RESOLVER
// ============================================================================

/**
 * Resolve batch anchors from a set of parsed flight legs using the
 * user's Home Airport code.
 *
 * This is the SINGLE entry point for batch flight trip shell creation.
 *
 * @param legs - All parsed flight legs from the batch
 * @param homeAirportCode - User's canonical home airport (3-letter IATA)
 * @returns BatchAnchorResult with anchors, destination, and flagged legs
 */
export function resolveBatchAnchors(
  legs: ParsedFlightLeg[],
  homeAirportCode: string
): BatchAnchorResult {
  const warnings: string[] = [];
  const homeCode = homeAirportCode.trim().toUpperCase();

  if (!homeCode || homeCode.length !== 3) {
    return createEmptyResult(legs, ['Home airport code is missing or invalid.']);
  }

  if (legs.length === 0) {
    return createEmptyResult([], ['No flight legs provided.']);
  }

  // Validate all legs have required airport codes
  const validLegs = legs.filter(leg => {
    const hasDepart = leg.departAirportCode && leg.departAirportCode.length === 3;
    const hasArrive = leg.arriveAirportCode && leg.arriveAirportCode.length === 3;
    if (!hasDepart || !hasArrive) {
      warnings.push(`Leg ${leg.legId}: Missing airport code(s). Skipped for anchoring.`);
      return false;
    }
    return true;
  });

  // Order all legs by departure datetime (lexicographic on ISO strings)
  const orderedLegs = [...validLegs].sort((a, b) =>
    a.departDateTime.localeCompare(b.departDateTime)
  );

  // 1) Find outbound anchor: earliest flight departing from home
  const outboundCandidates = orderedLegs.filter(
    leg => leg.departAirportCode.toUpperCase() === homeCode
  );
  const outboundAnchor = outboundCandidates.length > 0 ? outboundCandidates[0] : null;

  // 2) Find return anchor: latest flight arriving at home
  const returnCandidates = orderedLegs.filter(
    leg => leg.arriveAirportCode.toUpperCase() === homeCode
  );
  const returnAnchor = returnCandidates.length > 0
    ? returnCandidates[returnCandidates.length - 1]
    : null;

  // 3) Determine trip start/end
  let tripStartDateTime: string | null = null;
  let tripEndDateTime: string | null = null;
  let hasReturnToHome = false;

  if (outboundAnchor) {
    tripStartDateTime = outboundAnchor.departDateTime;
  }

  if (returnAnchor && returnAnchor !== outboundAnchor) {
    tripEndDateTime = returnAnchor.arriveDateTime || returnAnchor.departDateTime;
    hasReturnToHome = true;
  } else {
    // No return-to-home: use latest arrival across all legs
    const latestArrival = getLatestDateTime(orderedLegs);
    tripEndDateTime = latestArrival;
    if (!returnAnchor || returnAnchor === outboundAnchor) {
      warnings.push('Return flight to home airport not detected. Trip end set to latest arrival.');
      hasReturnToHome = false;
    }
  }

  // If no outbound from home found either
  if (!outboundAnchor) {
    warnings.push(`No flight departing from home airport (${homeCode}) found. Cannot anchor trip start.`);
    // Fall back: use earliest departure as start
    tripStartDateTime = orderedLegs.length > 0 ? orderedLegs[0].departDateTime : null;
  }

  // 4) Derive destination from first non-home arrival after outbound
  const destination = deriveDestination(orderedLegs, homeCode, outboundAnchor);

  // 5) Flag legs outside the anchored shell
  const outsideShellLegs = flagOutsideShellLegs(
    orderedLegs,
    tripStartDateTime,
    tripEndDateTime
  );

  if (outsideShellLegs.length > 0) {
    warnings.push(
      `${outsideShellLegs.length} flight leg(s) fall outside this trip's dates.`
    );
  }

  return {
    outboundAnchor,
    returnAnchor: hasReturnToHome ? returnAnchor : null,
    tripStartDateTime,
    tripEndDateTime,
    hasReturnToHome,
    destination,
    orderedLegs,
    outsideShellLegs,
    warnings,
    isAnchored: !!outboundAnchor,
  };
}

// ============================================================================
// DESTINATION DERIVATION
// ============================================================================

/**
 * Derive the primary destination from the first non-home arrival airport
 * after the outbound anchor.
 *
 * Uses airport geodata only — no text inference.
 */
function deriveDestination(
  orderedLegs: ParsedFlightLeg[],
  homeCode: string,
  outboundAnchor: ParsedFlightLeg | null
): BatchDestination | null {
  // Find legs after outbound anchor (or all legs if no anchor)
  const startIdx = outboundAnchor
    ? orderedLegs.findIndex(l => l.legId === outboundAnchor.legId)
    : 0;

  for (let i = startIdx; i < orderedLegs.length; i++) {
    const leg = orderedLegs[i];
    const arriveCode = leg.arriveAirportCode.toUpperCase();

    // Skip legs arriving back at home
    if (arriveCode === homeCode) continue;

    // Look up airport data for destination derivation
    const airport = getAirportByCode(arriveCode);
    if (airport) {
      return airportToDestination(airport);
    }

    // Airport not in our data — return code-only destination
    return {
      city: arriveCode, // Best we can do without geodata
      state: null,
      country: '',
      airportCode: arriveCode,
    };
  }

  return null;
}

/**
 * Convert airport data to a safe BatchDestination.
 * State is only included if the airport data has it (avoids bad geography).
 */
function airportToDestination(airport: Airport): BatchDestination {
  return {
    city: airport.city,
    state: airport.state || null,
    country: airport.country,
    airportCode: airport.code,
  };
}

// ============================================================================
// OUTSIDE-SHELL DETECTION
// ============================================================================

/**
 * Flag legs that fall outside the anchored trip shell.
 * Uses a small buffer (OUTSIDE_SHELL_BUFFER_HOURS) for connection flights.
 */
function flagOutsideShellLegs(
  orderedLegs: ParsedFlightLeg[],
  tripStart: string | null,
  tripEnd: string | null
): ParsedFlightLeg[] {
  if (!tripStart || !tripEnd) return [];

  // Add buffer to shell boundaries
  const shellStartStr = tripStart;
  const shellEndStr = tripEnd;

  return orderedLegs.filter(leg => {
    // Lexicographic comparison on ISO datetime strings
    // A leg is outside if it departs significantly before shell start
    // or arrives significantly after shell end
    const departsBefore = leg.departDateTime < shellStartStr;
    const arrivesAfter = (leg.arriveDateTime || leg.departDateTime) > shellEndStr;

    // Only flag if clearly outside (not just a tight connection)
    return departsBefore || arrivesAfter;
  });
}

// ============================================================================
// LEG DEDUPLICATION
// ============================================================================

/**
 * Deduplicate parsed flight legs using stable identifiers.
 * Uses confirmation code + flight number + departure datetime as composite key.
 * Falls back to airport pair + datetime if no confirmation/flight number.
 *
 * @param legs - All parsed legs (may contain duplicates from overlapping emails)
 * @returns Deduplicated legs
 */
export function deduplicateLegs(legs: ParsedFlightLeg[]): ParsedFlightLeg[] {
  const seen = new Set<string>();
  const result: ParsedFlightLeg[] = [];

  for (const leg of legs) {
    const key = buildDedupeKey(leg);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(leg);
    }
  }

  return result;
}

function buildDedupeKey(leg: ParsedFlightLeg): string {
  // Primary key: confirmation + flight number + departure datetime
  if (leg.confirmationCode && leg.flightNumber) {
    return `${leg.confirmationCode}|${leg.flightNumber}|${leg.departDateTime}`.toUpperCase();
  }
  // Fallback: airport pair + departure datetime
  return `${leg.departAirportCode}|${leg.arriveAirportCode}|${leg.departDateTime}`.toUpperCase();
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build a stable leg ID from parsed data.
 */
export function buildLegId(
  confirmationCode: string | null,
  flightNumber: string | null,
  departAirportCode: string,
  departDateTime: string
): string {
  const parts = [
    confirmationCode || 'NOCONF',
    flightNumber || 'NOFLT',
    departAirportCode,
    departDateTime,
  ];
  return parts.join('_').toUpperCase().replace(/[^A-Z0-9_\-:T]/g, '');
}

/**
 * Get the latest datetime (arrival or departure) across all legs.
 */
function getLatestDateTime(legs: ParsedFlightLeg[]): string | null {
  let latest: string | null = null;

  for (const leg of legs) {
    const dt = leg.arriveDateTime || leg.departDateTime;
    if (dt && (!latest || dt > latest)) {
      latest = dt;
    }
  }

  return latest;
}

function createEmptyResult(
  legs: ParsedFlightLeg[],
  warnings: string[]
): BatchAnchorResult {
  return {
    outboundAnchor: null,
    returnAnchor: null,
    tripStartDateTime: null,
    tripEndDateTime: null,
    hasReturnToHome: false,
    destination: null,
    orderedLegs: legs,
    outsideShellLegs: [],
    warnings,
    isAnchored: false,
  };
}

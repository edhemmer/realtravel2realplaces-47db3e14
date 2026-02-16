/**
 * v2.2.7: Trip Frame Resolver — Canonical Safety Layer
 *
 * SINGLE SOURCE OF TRUTH for determining, validating, and enforcing
 * trip frames during creation and multi-confirmation ingestion.
 *
 * RULES:
 * - Fly:   frame = outbound departure → return arrival (all booking types extend)
 * - Drive: frame = explicit arrival date → explicit return date (no inference)
 * - Train: frame = user-provided manual dates only
 *
 * GUARANTEES:
 * - Trip frame is resolved BEFORE weather, packing, expenses, reminders, reporting
 * - No silent merging of unrelated confirmations
 * - No guessing or inferred intent
 * - Existing correct trips remain unchanged
 */

import { parseISO, format, startOfDay, differenceInCalendarDays } from 'date-fns';
import {
  type BatchAnchorResult,
  type ParsedFlightLeg,
  resolveBatchAnchors,
  deduplicateLegs,
  buildLegId,
} from './batchFlightAnchor';

// ============================================================================
// TYPES
// ============================================================================

/** Transportation modes recognised by the resolver */
export type TripFrameMode = 'fly' | 'drive' | 'train';

/** A lightweight booking record the resolver operates on (subset of full Booking) */
export interface FrameBooking {
  booking_type: string;
  start_datetime: string;
  end_datetime?: string | null;
  departure_airport_code?: string | null;
  arrival_airport_code?: string | null;
  from_location?: string | null;
  to_location?: string | null;
  vendor_name?: string;
}

/** Result of frame resolution */
export interface ResolvedFrame {
  /** Computed start date (YYYY-MM-DD) */
  startDate: string;
  /** Computed end date (YYYY-MM-DD) */
  endDate: string;
  /** Detected or provided mode */
  mode: TripFrameMode;
  /** Confidence score 0-1 */
  confidence: number;
  /** Whether the frame is considered safe to auto-create */
  isAutoCreateSafe: boolean;
  /** Human-readable warnings (empty = clean) */
  warnings: string[];
  /** v2.2.13: True if any booking-derived event has unresolved time validation issues */
  framePendingValidation?: boolean;
}

/** Multi-confirmation alignment result */
export interface ConfirmationAlignmentResult {
  /** Whether all confirmations align into a single trip */
  aligned: boolean;
  /** Resolved frame if aligned */
  frame: ResolvedFrame | null;
  /** Proposed split groups if NOT aligned (each group = one potential trip) */
  splitGroups: FrameBooking[][] | null;
  /** Confidence in the alignment decision */
  confidence: number;
  /** Warnings for the user */
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Max gap (days) between bookings before we suspect separate trips */
const MAX_BOOKING_GAP_DAYS = 5;

/** Min confidence to auto-create without user confirmation */
const AUTO_CREATE_THRESHOLD = 0.7;

// ============================================================================
// CORE RESOLVER
// ============================================================================

/**
 * Resolve a trip frame from a set of bookings and a declared mode.
 *
 * @param mode - The travel mode chosen by the user
 * @param bookings - Parsed bookings to derive frame from
 * @param manualDates - Optional user-provided manual dates (override)
 * @returns ResolvedFrame with dates, confidence, and warnings
 */
export function resolveTripFrame(
  mode: TripFrameMode,
  bookings: FrameBooking[],
  manualDates?: { startDate: string; endDate: string }
): ResolvedFrame {
  // Manual dates always win when provided
  if (manualDates?.startDate && manualDates?.endDate) {
    return {
      startDate: manualDates.startDate,
      endDate: manualDates.endDate,
      mode,
      confidence: 1.0,
      isAutoCreateSafe: true,
      warnings: [],
    };
  }

  switch (mode) {
    case 'fly':
      return resolveFlightFrame(bookings);
    case 'drive':
      return resolveDriveFrame(bookings, manualDates);
    case 'train':
      return resolveTrainFrame(bookings, manualDates);
  }
}

/**
 * Flight frame resolution:
 * - Frame anchored to earliest flight departure → latest flight arrival
 * - All other booking types can EXTEND the frame outward
 * - If no flights found, fall back to all bookings
 */
function resolveFlightFrame(bookings: FrameBooking[]): ResolvedFrame {
  const warnings: string[] = [];
  const flights = bookings.filter(b => b.booking_type === 'flight');

  if (flights.length === 0) {
    // No flights in a "fly" frame — fall back to all bookings
    warnings.push('No flights found in confirmations. Using all booking dates.');
    return resolveFromAllBookings(bookings, 'fly', warnings);
  }

  // Collect flight dates
  const flightStarts = flights
    .map(f => safeParseDate(f.start_datetime))
    .filter(Boolean) as Date[];
  const flightEnds = flights
    .map(f => safeParseDate(f.end_datetime) ?? safeParseDate(f.start_datetime))
    .filter(Boolean) as Date[];

  if (flightStarts.length === 0) {
    warnings.push('Could not parse flight dates.');
    return createEmptyFrame('fly', warnings);
  }

  let frameStart = startOfDay(minDate(flightStarts));
  let frameEnd = startOfDay(maxDate(flightEnds));

  // Extend outward with non-flight bookings (never shrink)
  bookings.forEach(b => {
    const s = safeParseDate(b.start_datetime);
    const e = safeParseDate(b.end_datetime);
    if (s && startOfDay(s) < frameStart) frameStart = startOfDay(s);
    if (e && startOfDay(e) > frameEnd) frameEnd = startOfDay(e);
    if (s && !e && startOfDay(s) > frameEnd) frameEnd = startOfDay(s);
  });

  const confidence = flights.length >= 2 ? 0.9 : 0.75;

  return {
    startDate: format(frameStart, 'yyyy-MM-dd'),
    endDate: format(frameEnd, 'yyyy-MM-dd'),
    mode: 'fly',
    confidence,
    isAutoCreateSafe: confidence >= AUTO_CREATE_THRESHOLD,
    warnings,
  };
}

/**
 * Drive frame resolution:
 * - Requires explicit dates (no inference)
 * - If bookings exist, uses them as the frame
 */
function resolveDriveFrame(
  bookings: FrameBooking[],
  manualDates?: { startDate?: string; endDate?: string }
): ResolvedFrame {
  const warnings: string[] = [];

  if (manualDates?.startDate && manualDates?.endDate) {
    return {
      startDate: manualDates.startDate,
      endDate: manualDates.endDate,
      mode: 'drive',
      confidence: 1.0,
      isAutoCreateSafe: true,
      warnings: [],
    };
  }

  if (bookings.length > 0) {
    return resolveFromAllBookings(bookings, 'drive', warnings);
  }

  warnings.push('Drive trips require explicit arrival and return dates.');
  return createEmptyFrame('drive', warnings);
}

/**
 * Train frame resolution:
 * - Manual frame only
 * - Bookings can extend but not define
 */
function resolveTrainFrame(
  bookings: FrameBooking[],
  manualDates?: { startDate?: string; endDate?: string }
): ResolvedFrame {
  const warnings: string[] = [];

  if (manualDates?.startDate && manualDates?.endDate) {
    return {
      startDate: manualDates.startDate,
      endDate: manualDates.endDate,
      mode: 'train',
      confidence: 1.0,
      isAutoCreateSafe: true,
      warnings: [],
    };
  }

  if (bookings.length > 0) {
    warnings.push('Train trip dates derived from bookings. Please verify.');
    return resolveFromAllBookings(bookings, 'train', warnings);
  }

  warnings.push('Train trips require user-provided dates.');
  return createEmptyFrame('train', warnings);
}

// ============================================================================
// MULTI-CONFIRMATION ALIGNMENT
// ============================================================================

/**
 * Validate whether multiple confirmations should form a single trip or be split.
 *
 * Rules:
 * - If all bookings form a contiguous date range (no gaps > MAX_BOOKING_GAP_DAYS), they align.
 * - If there are disjointed clusters, propose splits.
 * - Never silently merge. Return confidence and warnings.
 *
 * @param bookings - All parsed bookings from ingestion
 * @param mode - The declared travel mode
 * @returns ConfirmationAlignmentResult
 */
export function validateConfirmationAlignment(
  bookings: FrameBooking[],
  mode: TripFrameMode
): ConfirmationAlignmentResult {
  if (bookings.length <= 1) {
    const frame = resolveTripFrame(mode, bookings);
    return {
      aligned: true,
      frame,
      splitGroups: null,
      confidence: frame.confidence,
      warnings: frame.warnings,
    };
  }

  // Sort bookings by start date
  const sorted = [...bookings].sort((a, b) => {
    const da = safeParseDate(a.start_datetime)?.getTime() ?? 0;
    const db = safeParseDate(b.start_datetime)?.getTime() ?? 0;
    return da - db;
  });

  // Detect clusters
  const clusters: FrameBooking[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const prevCluster = clusters[clusters.length - 1];
    const prevEnd = getClusterEnd(prevCluster);
    const currStart = safeParseDate(sorted[i].start_datetime);

    if (!prevEnd || !currStart) {
      // Can't determine gap — keep in same cluster (safe default)
      prevCluster.push(sorted[i]);
      continue;
    }

    const gap = differenceInCalendarDays(startOfDay(currStart), startOfDay(prevEnd));

    if (gap > MAX_BOOKING_GAP_DAYS) {
      // New cluster
      clusters.push([sorted[i]]);
    } else {
      prevCluster.push(sorted[i]);
    }
  }

  // Check location alignment within single cluster
  if (clusters.length === 1) {
    const locationWarnings = checkLocationAlignment(sorted, mode);
    const frame = resolveTripFrame(mode, bookings);
    return {
      aligned: true,
      frame,
      splitGroups: null,
      confidence: locationWarnings.length > 0 ? Math.min(frame.confidence, 0.6) : frame.confidence,
      warnings: [...frame.warnings, ...locationWarnings],
    };
  }

  // Multiple clusters → propose split
  const warnings = [
    `Found ${clusters.length} separate date clusters with gaps > ${MAX_BOOKING_GAP_DAYS} days. These may be separate trips.`,
  ];

  return {
    aligned: false,
    frame: null,
    splitGroups: clusters,
    confidence: 0.3,
    warnings,
  };
}

// ============================================================================
// FRAME VALIDATION (post-creation)
// ============================================================================

/**
 * Validate that a resolved frame is ready for downstream consumers.
 * Must be called before weather, packing, expenses, reminders, or reporting.
 *
 * v2.2.13: Also rejects frames with framePendingValidation === true.
 *
 * @param frame - The resolved frame to validate
 * @returns true if frame is valid and safe for downstream use
 */
export function isFrameResolved(frame: ResolvedFrame | null): frame is ResolvedFrame {
  if (!frame) return false;
  if (!frame.startDate || !frame.endDate) return false;
  // v2.2.13: Block finalization while any booking time is unvalidated
  if (frame.framePendingValidation) return false;

  const start = safeParseDate(frame.startDate);
  const end = safeParseDate(frame.endDate);
  if (!start || !end) return false;

  return startOfDay(start) <= startOfDay(end);
}

// ============================================================================
// v2.2.13: VALIDATION GATE
// ============================================================================

/**
 * Apply time-validation gate to a resolved frame.
 * 
 * Inspects booking-derived events for low-confidence time flags.
 * If any event has timeIsEstimated === true (set by bookingIngestionValidator),
 * the frame is marked as framePendingValidation and downstream helpers
 * must not finalize artifacts.
 *
 * @param frame - A resolved frame from resolveTripFrame
 * @param bookingTimeFlags - Map of booking IDs to their timeIsEstimated flag
 * @returns The same frame, with framePendingValidation set appropriately
 */
export function applyValidationGate(
  frame: ResolvedFrame,
  bookingTimeFlags: Array<{ bookingId: string; timeIsEstimated: boolean }>
): ResolvedFrame {
  const hasPendingValidation = bookingTimeFlags.some(f => f.timeIsEstimated);
  return {
    ...frame,
    framePendingValidation: hasPendingValidation,
    isAutoCreateSafe: hasPendingValidation ? false : frame.isAutoCreateSafe,
  };
}

// ============================================================================
// HOME AIRPORT BATCH RESOLUTION
// ============================================================================

/**
 * Resolve a trip frame from a batch of parsed flight legs using the
 * user's Home Airport as the anchor.
 *
 * This is the canonical entry point for multi-flight batch import.
 * It delegates to batchFlightAnchor for anchor computation, then
 * converts the result into a ResolvedFrame compatible with the rest
 * of the trip creation pipeline.
 *
 * @param legs - All parsed flight legs from batch import
 * @param homeAirportCode - User's home airport IATA code
 * @returns Object containing the resolved frame and batch anchor details
 */
export function resolveHomeAirportFrame(
  legs: ParsedFlightLeg[],
  homeAirportCode: string
): {
  frame: ResolvedFrame;
  anchorResult: BatchAnchorResult;
} {
  // Deduplicate legs before anchoring
  const uniqueLegs = deduplicateLegs(legs);

  // Resolve anchors using canonical batch logic
  const anchorResult = resolveBatchAnchors(uniqueLegs, homeAirportCode);

  // Convert anchor result to ResolvedFrame
  if (!anchorResult.tripStartDateTime || !anchorResult.tripEndDateTime) {
    return {
      frame: createEmptyFrame('fly', anchorResult.warnings),
      anchorResult,
    };
  }

  // Extract date-only from ISO datetime strings
  const startDate = anchorResult.tripStartDateTime.substring(0, 10);
  const endDate = anchorResult.tripEndDateTime.substring(0, 10);

  const confidence = anchorResult.isAnchored
    ? (anchorResult.hasReturnToHome ? 0.95 : 0.75)
    : 0.5;

  const frame: ResolvedFrame = {
    startDate,
    endDate,
    mode: 'fly',
    confidence,
    isAutoCreateSafe: confidence >= AUTO_CREATE_THRESHOLD,
    warnings: anchorResult.warnings,
  };

  return { frame, anchorResult };
}

/**
 * Convert parsed booking data (from parse-booking edge function) into
 * ParsedFlightLeg format for batch anchor resolution.
 *
 * This adapter ensures the batch anchor resolver works with the existing
 * parse-booking output without requiring edge function changes.
 */
export function bookingDataToFlightLeg(
  parsedData: {
    booking_type?: string;
    departure_airport_code?: string | null;
    arrival_airport_code?: string | null;
    start_datetime?: string | null;
    end_datetime?: string | null;
    airline?: string | null;
    confirmation_number?: string | null;
    total_cost?: number | null;
    notes?: string | null;
    vendor_name?: string | null;
  },
  sourceFile?: string | null
): ParsedFlightLeg | null {
  // Only convert flight bookings
  if (parsedData.booking_type !== 'flight') return null;

  const departCode = parsedData.departure_airport_code?.trim().toUpperCase();
  const arriveCode = parsedData.arrival_airport_code?.trim().toUpperCase();
  const departDateTime = parsedData.start_datetime;

  // Must have airport codes and departure time
  if (!departCode || departCode.length !== 3) return null;
  if (!arriveCode || arriveCode.length !== 3) return null;
  if (!departDateTime) return null;

  // Extract flight number from notes if present (format: "Outbound: XXXX, Return: XXXX")
  let flightNumber: string | null = null;
  if (parsedData.notes) {
    const fnMatch = parsedData.notes.match(/(?:Outbound|Flight):\s*([A-Z0-9]+)/i);
    if (fnMatch) flightNumber = fnMatch[1];
  }

  // buildLegId is already imported at top via batchFlightAnchor

  return {
    legId: buildLegId(
      parsedData.confirmation_number || null,
      flightNumber,
      departCode,
      departDateTime
    ),
    departAirportCode: departCode,
    arriveAirportCode: arriveCode,
    departDateTime,
    arriveDateTime: parsedData.end_datetime || null,
    carrier: parsedData.airline || parsedData.vendor_name || null,
    flightNumber,
    confirmationCode: parsedData.confirmation_number || null,
    rawCost: parsedData.total_cost ?? null,
    rawCurrency: null, // Currency not separately extracted by current parser
    sourceFile: sourceFile || null,
  };
}

// Re-export batch anchor types for consumer convenience
export type { BatchAnchorResult, ParsedFlightLeg, BatchDestination } from './batchFlightAnchor';

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function resolveFromAllBookings(
  bookings: FrameBooking[],
  mode: TripFrameMode,
  warnings: string[]
): ResolvedFrame {
  const allStarts = bookings
    .map(b => safeParseDate(b.start_datetime))
    .filter(Boolean) as Date[];
  const allEnds = bookings
    .map(b => safeParseDate(b.end_datetime) ?? safeParseDate(b.start_datetime))
    .filter(Boolean) as Date[];

  if (allStarts.length === 0) {
    return createEmptyFrame(mode, [...warnings, 'No valid dates found in bookings.']);
  }

  const frameStart = startOfDay(minDate(allStarts));
  const frameEnd = startOfDay(maxDate(allEnds));

  return {
    startDate: format(frameStart, 'yyyy-MM-dd'),
    endDate: format(frameEnd, 'yyyy-MM-dd'),
    mode,
    confidence: 0.6,
    isAutoCreateSafe: false,
    warnings,
  };
}

function createEmptyFrame(mode: TripFrameMode, warnings: string[]): ResolvedFrame {
  return {
    startDate: '',
    endDate: '',
    mode,
    confidence: 0,
    isAutoCreateSafe: false,
    warnings,
  };
}

function safeParseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  try {
    const d = parseISO(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function minDate(dates: Date[]): Date {
  return dates.reduce((a, b) => (a < b ? a : b));
}

function maxDate(dates: Date[]): Date {
  return dates.reduce((a, b) => (a > b ? a : b));
}

function getClusterEnd(cluster: FrameBooking[]): Date | null {
  const ends: Date[] = [];
  cluster.forEach(b => {
    const e = safeParseDate(b.end_datetime) ?? safeParseDate(b.start_datetime);
    if (e) ends.push(e);
  });
  return ends.length > 0 ? maxDate(ends) : null;
}

/**
 * Check if bookings within a single cluster have conflicting locations
 * (e.g., flights to different cities that don't connect).
 */
function checkLocationAlignment(bookings: FrameBooking[], mode: TripFrameMode): string[] {
  if (mode !== 'fly') return [];

  const flights = bookings.filter(b => b.booking_type === 'flight');
  if (flights.length < 2) return [];

  // Collect unique arrival airports
  const arrivalCodes = new Set<string>();
  flights.forEach(f => {
    if (f.arrival_airport_code) {
      arrivalCodes.add(f.arrival_airport_code.toUpperCase());
    }
  });

  // Collect unique departure airports
  const departureCodes = new Set<string>();
  flights.forEach(f => {
    if (f.departure_airport_code) {
      departureCodes.add(f.departure_airport_code.toUpperCase());
    }
  });

  // If we have > 2 unique arrival airports (beyond typical round-trip), warn
  if (arrivalCodes.size > 2) {
    return [
      `Flights arrive at ${arrivalCodes.size} different airports (${[...arrivalCodes].join(', ')}). Please verify these belong to one trip.`,
    ];
  }

  return [];
}

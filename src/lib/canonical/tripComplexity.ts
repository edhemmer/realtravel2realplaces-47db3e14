/**
 * v3.8.23: Complexity-Aware Confirmation Gate
 *
 * Pure, deterministic evaluator that classifies a set of canonical items
 * into SIMPLE / MODERATE / COMPLEX bands. Used to decide whether the user
 * should review items before timeline construction.
 *
 * Rules:
 * - No timezone math, no date rewriting, no parsing changes.
 * - Uses only CanonicalFlight, CanonicalLodging, CanonicalCarRental, CanonicalActivity.
 * - Thresholds are explicit — no fuzzy scoring.
 */

import type { CanonicalItem, CanonicalFlight, CanonicalLodging, CanonicalCarRental } from './canonicalTypes';

export type ComplexityBand = 'SIMPLE' | 'MODERATE' | 'COMPLEX';

export interface TripComplexityResult {
  band: ComplexityBand;
  reasons: string[];
}

// ── helpers ──────────────────────────────────────────────────

function uniqueCountries(flights: CanonicalFlight[]): number {
  const countries = new Set<string>();
  for (const f of flights) {
    if (f.dep.city) countries.add(f.dep.city.toLowerCase());
    if (f.arr.city) countries.add(f.arr.city.toLowerCase());
  }
  // Heuristic: unique arrival cities as proxy for countries when
  // canonical items don't carry country codes directly.
  // We count distinct departure/arrival IATA codes' country instead.
  // Since canonical flights don't expose country, we use unique
  // departure + arrival airport codes as a proxy for country diversity.
  const codes = new Set<string>();
  for (const f of flights) {
    if (f.departureAirportCode) codes.add(f.departureAirportCode);
    if (f.arrivalAirportCode) codes.add(f.arrivalAirportCode);
  }
  return codes.size;
}

/** Detect open-jaw: last arrival !== first departure */
function hasOpenJaw(flights: CanonicalFlight[]): boolean {
  if (flights.length < 2) return false;
  const sorted = [...flights].sort((a, b) => {
    const aTime = a.startDatetime ?? '';
    const bTime = b.startDatetime ?? '';
    return aTime < bTime ? -1 : aTime > bTime ? 1 : 0;
  });
  const firstDep = sorted[0].departureAirportCode;
  const lastArr = sorted[sorted.length - 1].arrivalAirportCode;
  if (!firstDep || !lastArr) return false;
  return firstDep !== lastArr;
}

/** Detect overlapping time ranges among items with start/end datetimes */
function hasOverlappingSegments(items: Array<{ startDatetime: string | null; endDatetime: string | null }>): boolean {
  const ranges = items
    .filter(i => i.startDatetime && i.endDatetime)
    .map(i => ({ start: i.startDatetime!, end: i.endDatetime! }))
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].start < ranges[i - 1].end) return true;
  }
  return false;
}

/** Detect gaps > 48 hours between consecutive segments */
function hasLargeGaps(items: Array<{ startDatetime: string | null; endDatetime: string | null }>): boolean {
  const sorted = items
    .filter(i => i.startDatetime)
    .sort((a, b) => (a.startDatetime! < b.startDatetime! ? -1 : 1));

  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].endDatetime || sorted[i - 1].startDatetime!;
    const nextStart = sorted[i].startDatetime!;
    // Simple string comparison for ISO datetimes — no timezone math
    try {
      const diffMs = new Date(nextStart).getTime() - new Date(prevEnd).getTime();
      if (diffMs > 48 * 60 * 60 * 1000) return true;
    } catch {
      // Can't parse — skip
    }
  }
  return false;
}

// ── main evaluator ───────────────────────────────────────────

export function evaluateTripComplexity(canonicalItems: CanonicalItem[]): TripComplexityResult {
  const flights = canonicalItems.filter((i): i is CanonicalFlight => i.type === 'flight');
  const lodgings = canonicalItems.filter((i): i is CanonicalLodging => i.type === 'stay');
  const carRentals = canonicalItems.filter((i): i is CanonicalCarRental => i.type === 'car_rental');

  const reasons: string[] = [];

  const flightCount = flights.length;
  const lodgingCount = lodgings.length;
  const carRentalCount = carRentals.length;
  const countryProxy = uniqueCountries(flights);

  // All items with time ranges for overlap / gap detection
  const timedItems = canonicalItems
    .filter(i => 'startDatetime' in i)
    .map(i => ({
      startDatetime: (i as any).startDatetime as string | null,
      endDatetime: (i as any).endDatetime as string | null,
    }));

  const overlaps = hasOverlappingSegments(timedItems);
  const openJaw = hasOpenJaw(flights);
  const largeGaps = hasLargeGaps(timedItems);

  // ── COMPLEX checks ──
  let isComplex = false;

  if (flightCount >= 5) { reasons.push('5+ flights'); isComplex = true; }
  if (lodgingCount >= 3) { reasons.push('3+ lodgings'); isComplex = true; }
  if (countryProxy >= 6) { reasons.push('3+ countries (6+ unique airports)'); isComplex = true; }
  if (overlaps) { reasons.push('Overlapping segments'); isComplex = true; }
  if (openJaw) { reasons.push('Open-jaw routing'); isComplex = true; }
  if (largeGaps) { reasons.push('Gaps >48 hours'); isComplex = true; }

  if (isComplex) {
    return { band: 'COMPLEX', reasons };
  }

  // ── MODERATE checks ──
  let isModerate = false;

  if (flightCount >= 3) { reasons.push('3–4 flights'); isModerate = true; }
  if (lodgingCount >= 2) { reasons.push('2 lodgings'); isModerate = true; }
  if (countryProxy >= 4) { reasons.push('2+ countries (4+ unique airports)'); isModerate = true; }

  if (isModerate) {
    return { band: 'MODERATE', reasons };
  }

  // ── SIMPLE ──
  // ≤2 flights, ≤1 lodging, ≤1 car rental, ≤1 country, no overlaps
  return { band: 'SIMPLE', reasons: ['Standard itinerary'] };
}

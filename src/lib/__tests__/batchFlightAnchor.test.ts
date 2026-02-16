/**
 * Tests for batchFlightAnchor — canonical batch flight anchor resolution
 */
import { describe, it, expect } from 'vitest';
import {
  resolveBatchAnchors,
  deduplicateLegs,
  buildLegId,
  type ParsedFlightLeg,
} from '../batchFlightAnchor';

function makeLeg(overrides: Partial<ParsedFlightLeg> & Pick<ParsedFlightLeg, 'departAirportCode' | 'arriveAirportCode' | 'departDateTime'>): ParsedFlightLeg {
  return {
    legId: buildLegId(null, null, overrides.departAirportCode, overrides.departDateTime),
    arriveDateTime: null,
    carrier: null,
    flightNumber: null,
    confirmationCode: null,
    rawCost: null,
    rawCurrency: null,
    sourceFile: null,
    ...overrides,
  };
}

describe('resolveBatchAnchors', () => {
  const HOME = 'ATL';

  it('identifies outbound and return anchors correctly', () => {
    const legs: ParsedFlightLeg[] = [
      makeLeg({ departAirportCode: 'ATL', arriveAirportCode: 'FCO', departDateTime: '2026-03-10T08:00:00', arriveDateTime: '2026-03-10T22:00:00' }),
      makeLeg({ departAirportCode: 'FCO', arriveAirportCode: 'BCN', departDateTime: '2026-03-13T10:00:00', arriveDateTime: '2026-03-13T12:00:00' }),
      makeLeg({ departAirportCode: 'BCN', arriveAirportCode: 'ATL', departDateTime: '2026-03-17T14:00:00', arriveDateTime: '2026-03-17T20:00:00' }),
    ];

    const result = resolveBatchAnchors(legs, HOME);

    expect(result.isAnchored).toBe(true);
    expect(result.hasReturnToHome).toBe(true);
    expect(result.outboundAnchor?.departAirportCode).toBe('ATL');
    expect(result.returnAnchor?.arriveAirportCode).toBe('ATL');
    expect(result.tripStartDateTime).toBe('2026-03-10T08:00:00');
    expect(result.tripEndDateTime).toBe('2026-03-17T20:00:00');
    expect(result.outsideShellLegs).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('derives destination from first non-home arrival', () => {
    const legs: ParsedFlightLeg[] = [
      makeLeg({ departAirportCode: 'ATL', arriveAirportCode: 'FCO', departDateTime: '2026-03-10T08:00:00' }),
      makeLeg({ departAirportCode: 'FCO', arriveAirportCode: 'ATL', departDateTime: '2026-03-17T14:00:00', arriveDateTime: '2026-03-17T20:00:00' }),
    ];

    const result = resolveBatchAnchors(legs, HOME);

    expect(result.destination).not.toBeNull();
    expect(result.destination?.city).toBe('Rome');
    expect(result.destination?.country).toBe('Italy');
    expect(result.destination?.airportCode).toBe('FCO');
  });

  it('handles one-way trip (no return to home)', () => {
    const legs: ParsedFlightLeg[] = [
      makeLeg({ departAirportCode: 'ATL', arriveAirportCode: 'LAX', departDateTime: '2026-04-01T06:00:00', arriveDateTime: '2026-04-01T09:00:00' }),
      makeLeg({ departAirportCode: 'LAX', arriveAirportCode: 'SFO', departDateTime: '2026-04-03T10:00:00', arriveDateTime: '2026-04-03T11:30:00' }),
    ];

    const result = resolveBatchAnchors(legs, HOME);

    expect(result.isAnchored).toBe(true);
    expect(result.hasReturnToHome).toBe(false);
    expect(result.tripStartDateTime).toBe('2026-04-01T06:00:00');
    expect(result.tripEndDateTime).toBe('2026-04-03T11:30:00');
    expect(result.warnings.some(w => w.includes('Return flight'))).toBe(true);
  });

  it('flags legs outside trip shell', () => {
    const legs: ParsedFlightLeg[] = [
      // Unrelated leg well before the trip
      makeLeg({ departAirportCode: 'JFK', arriveAirportCode: 'MIA', departDateTime: '2026-02-01T10:00:00', arriveDateTime: '2026-02-01T13:00:00' }),
      // Actual trip
      makeLeg({ departAirportCode: 'ATL', arriveAirportCode: 'CDG', departDateTime: '2026-03-10T08:00:00', arriveDateTime: '2026-03-10T22:00:00' }),
      makeLeg({ departAirportCode: 'CDG', arriveAirportCode: 'ATL', departDateTime: '2026-03-15T14:00:00', arriveDateTime: '2026-03-15T20:00:00' }),
    ];

    const result = resolveBatchAnchors(legs, HOME);

    expect(result.outsideShellLegs).toHaveLength(1);
    expect(result.outsideShellLegs[0].departAirportCode).toBe('JFK');
    expect(result.warnings.some(w => w.includes('outside'))).toBe(true);
  });

  it('returns empty result for missing home airport', () => {
    const legs: ParsedFlightLeg[] = [
      makeLeg({ departAirportCode: 'ATL', arriveAirportCode: 'LAX', departDateTime: '2026-04-01T06:00:00' }),
    ];

    const result = resolveBatchAnchors(legs, '');

    expect(result.isAnchored).toBe(false);
    expect(result.warnings.some(w => w.includes('missing'))).toBe(true);
  });

  it('handles no flights departing from home', () => {
    const legs: ParsedFlightLeg[] = [
      makeLeg({ departAirportCode: 'LAX', arriveAirportCode: 'SFO', departDateTime: '2026-04-01T06:00:00' }),
      makeLeg({ departAirportCode: 'SFO', arriveAirportCode: 'ATL', departDateTime: '2026-04-03T10:00:00', arriveDateTime: '2026-04-03T16:00:00' }),
    ];

    const result = resolveBatchAnchors(legs, HOME);

    expect(result.outboundAnchor).toBeNull();
    expect(result.isAnchored).toBe(false);
    expect(result.tripStartDateTime).toBe('2026-04-01T06:00:00'); // fallback to earliest
    expect(result.warnings.some(w => w.includes('No flight departing'))).toBe(true);
  });
});

describe('deduplicateLegs', () => {
  it('removes exact duplicates by confirmation + flight + datetime', () => {
    const leg1 = makeLeg({
      departAirportCode: 'ATL', arriveAirportCode: 'LAX', departDateTime: '2026-04-01T06:00:00',
      confirmationCode: 'ABC123', flightNumber: 'DL100',
    });
    const leg2 = makeLeg({
      departAirportCode: 'ATL', arriveAirportCode: 'LAX', departDateTime: '2026-04-01T06:00:00',
      confirmationCode: 'ABC123', flightNumber: 'DL100',
    });

    const result = deduplicateLegs([leg1, leg2]);
    expect(result).toHaveLength(1);
  });

  it('keeps different legs', () => {
    const leg1 = makeLeg({
      departAirportCode: 'ATL', arriveAirportCode: 'LAX', departDateTime: '2026-04-01T06:00:00',
      confirmationCode: 'ABC123', flightNumber: 'DL100',
    });
    const leg2 = makeLeg({
      departAirportCode: 'LAX', arriveAirportCode: 'ATL', departDateTime: '2026-04-05T14:00:00',
      confirmationCode: 'ABC123', flightNumber: 'DL200',
    });

    const result = deduplicateLegs([leg1, leg2]);
    expect(result).toHaveLength(2);
  });
});

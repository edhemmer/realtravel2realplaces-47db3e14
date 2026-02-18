import { describe, it, expect } from 'vitest';
import { evaluateTripComplexity, type TripComplexityResult } from '../tripComplexity';
import type { CanonicalFlight, CanonicalLodging, CanonicalCarRental, CanonicalActivity, CanonicalItem } from '../canonicalTypes';

const baseFields = {
  sourceId: 'test',
  canonicalId: 'test',
  vendorName: 'Test',
  confirmationNumber: null,
  confirmationNumbers: [],
  totalCost: 0,
  myShare: 0,
  notes: null,
  linkUrl: null,
  rawEvidence: [],
  warnings: [],
  rawStartTime: { dateText: null, timeText: null, datetimeText: null, timezoneText: null },
  rawEndTime: { dateText: null, timeText: null, datetimeText: null, timezoneText: null },
  costAttributionMode: 'NONE' as const,
  bookingCostTotal: null,
  bookingCostBreakdown: [],
};

function makeFlight(overrides: Partial<CanonicalFlight> = {}): CanonicalFlight {
  return {
    ...baseFields,
    type: 'flight',
    airline: null,
    passengers: [],
    passengerName: null,
    dep: { iata: 'ATL' },
    arr: { iata: 'JFK' },
    departureAirportCode: 'ATL',
    departureAirportName: null,
    arrivalAirportCode: 'JFK',
    arrivalAirportName: null,
    startDatetime: '2025-06-01T08:00',
    endDatetime: '2025-06-01T11:00',
    iataConfidence: 'high',
    flightNumber: null,
    departLocalDate: '2025-06-01',
    departLocalTime: '08:00',
    arriveLocalDate: '2025-06-01',
    arriveLocalTime: '11:00',
    departLocalKey: '2025-06-01T08:00',
    arriveLocalKey: '2025-06-01T11:00',
    arrivalDateDerived: false,
    legCost: null,
    legCostSourceRef: null,
    ...overrides,
  };
}

function makeLodging(overrides: Partial<CanonicalLodging> = {}): CanonicalLodging {
  return {
    ...baseFields,
    type: 'stay',
    propertyName: null,
    stayType: 'hotel',
    address: null,
    startDatetime: '2025-06-01T15:00',
    endDatetime: '2025-06-03T11:00',
    ...overrides,
  };
}

describe('evaluateTripComplexity', () => {
  it('returns SIMPLE for 1 flight + 1 hotel', () => {
    const items: CanonicalItem[] = [makeFlight(), makeLodging()];
    const result = evaluateTripComplexity(items);
    expect(result.band).toBe('SIMPLE');
  });

  it('returns SIMPLE for 2 flights + 1 hotel', () => {
    const items: CanonicalItem[] = [
      makeFlight({ departureAirportCode: 'ATL', arrivalAirportCode: 'JFK' }),
      makeFlight({ departureAirportCode: 'JFK', arrivalAirportCode: 'ATL', startDatetime: '2025-06-05T08:00', endDatetime: '2025-06-05T11:00' }),
      makeLodging(),
    ];
    const result = evaluateTripComplexity(items);
    expect(result.band).toBe('SIMPLE');
  });

  it('returns MODERATE for 3 flights (no open-jaw)', () => {
    const items: CanonicalItem[] = [
      makeFlight({ departureAirportCode: 'ATL', arrivalAirportCode: 'JFK', startDatetime: '2025-06-01T08:00', endDatetime: '2025-06-01T11:00' }),
      makeFlight({ departureAirportCode: 'JFK', arrivalAirportCode: 'MIA', startDatetime: '2025-06-03T08:00', endDatetime: '2025-06-03T11:00' }),
      makeFlight({ departureAirportCode: 'MIA', arrivalAirportCode: 'ATL', startDatetime: '2025-06-05T08:00', endDatetime: '2025-06-05T11:00' }),
    ];
    const result = evaluateTripComplexity(items);
    expect(result.band).toBe('MODERATE');
  });

  it('returns MODERATE for 2 lodgings', () => {
    const items: CanonicalItem[] = [
      makeFlight(),
      makeLodging({ startDatetime: '2025-06-01T15:00', endDatetime: '2025-06-03T11:00' }),
      makeLodging({ startDatetime: '2025-06-03T15:00', endDatetime: '2025-06-05T11:00' }),
    ];
    const result = evaluateTripComplexity(items);
    expect(result.band).toBe('MODERATE');
  });

  it('returns COMPLEX for 5+ flights', () => {
    const items: CanonicalItem[] = Array.from({ length: 5 }, (_, i) =>
      makeFlight({ startDatetime: `2025-06-0${i + 1}T08:00`, endDatetime: `2025-06-0${i + 1}T11:00` })
    );
    const result = evaluateTripComplexity(items);
    expect(result.band).toBe('COMPLEX');
  });

  it('returns COMPLEX for overlapping segments', () => {
    const items: CanonicalItem[] = [
      makeLodging({ startDatetime: '2025-06-01T15:00', endDatetime: '2025-06-05T11:00' }),
      makeLodging({ startDatetime: '2025-06-03T15:00', endDatetime: '2025-06-07T11:00' }),
      makeLodging({ startDatetime: '2025-06-06T15:00', endDatetime: '2025-06-09T11:00' }),
    ];
    const result = evaluateTripComplexity(items);
    expect(result.band).toBe('COMPLEX');
    expect(result.reasons).toContain('Overlapping segments');
  });

  it('returns COMPLEX for open-jaw routing', () => {
    const items: CanonicalItem[] = [
      makeFlight({ departureAirportCode: 'ATL', arrivalAirportCode: 'CDG', startDatetime: '2025-06-01T08:00' }),
      makeFlight({ departureAirportCode: 'CDG', arrivalAirportCode: 'LHR', startDatetime: '2025-06-03T08:00' }),
      makeFlight({ departureAirportCode: 'LHR', arrivalAirportCode: 'FCO', startDatetime: '2025-06-05T08:00' }),
      makeFlight({ departureAirportCode: 'FCO', arrivalAirportCode: 'CDG', startDatetime: '2025-06-07T08:00' }),
      makeFlight({ departureAirportCode: 'CDG', arrivalAirportCode: 'JFK', startDatetime: '2025-06-09T08:00' }),
    ];
    const result = evaluateTripComplexity(items);
    expect(result.band).toBe('COMPLEX');
    expect(result.reasons).toContain('Open-jaw routing');
  });

  it('is deterministic — same input always returns same output', () => {
    const items: CanonicalItem[] = [makeFlight(), makeFlight(), makeFlight(), makeLodging()];
    const r1 = evaluateTripComplexity(items);
    const r2 = evaluateTripComplexity(items);
    expect(r1).toEqual(r2);
  });

  it('returns SIMPLE for empty array', () => {
    expect(evaluateTripComplexity([]).band).toBe('SIMPLE');
  });
});

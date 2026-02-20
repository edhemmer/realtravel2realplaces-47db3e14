/**
 * v3.9.70: Global Itinerary + Expense Accuracy Test Matrix
 *
 * Tests A-F: single flight, roundtrip, flights+hotel, flights+hotel+car,
 * complex international multi-leg, multi-currency mixed trip.
 */
import { describe, it, expect } from 'vitest';
import { buildCanonicalItinerary } from '@/lib/import/itineraryEngine';
import { computeTripFrameFromConfirmations } from '@/lib/import/tripFrame';
import { buildExpensesFromConfirmations } from '@/lib/import/buildExpensesFromConfirmations';
import type { ParsedConfirmation, FlightLeg } from '@/lib/import/types';

// ============================================================================
// HELPERS
// ============================================================================

function makeLeg(overrides: Partial<FlightLeg> = {}): FlightLeg {
  return {
    originCode: 'LHR', originName: 'London Heathrow',
    destinationCode: 'JFK', destinationName: 'John F Kennedy',
    rawDepartureString: '2026-03-11T10:30', rawArrivalString: '2026-03-11T14:45',
    departureDate: null, arrivalDate: null,
    airline: 'BA', flightNumber: 'BA123',
    legCostAmount: null, legCostCurrency: null, legId: `leg_${Math.random()}`,
    ...overrides,
  };
}

function makeConf(overrides: Partial<ParsedConfirmation> = {}): ParsedConfirmation {
  return {
    confirmationId: `conf_${Math.random()}`,
    type: 'FLIGHT',
    confirmationNumber: 'REF001',
    vendorName: 'Test Airline',
    rawStartString: '2026-03-11T10:30',
    rawEndString: '2026-03-11T14:45',
    startDate: null, endDate: null,
    legs: [makeLeg()],
    totalCost: 500, costCurrency: 'USD',
    isTotalForBooking: true,
    propertyName: null, address: null,
    needsReview: false, reviewReason: null,
    originalParsed: {},
    ...overrides,
  };
}

// ============================================================================
// A) Single domestic one-way flight
// ============================================================================

describe('A) Single domestic one-way flight', () => {
  const leg = makeLeg({
    originCode: 'ORD', originName: 'Chicago OHare',
    destinationCode: 'LAX', destinationName: 'Los Angeles',
    rawDepartureString: '2026-04-10T08:00', rawArrivalString: '2026-04-10T10:30',
    legId: 'leg_a1',
  });
  const conf = makeConf({
    confirmationId: 'conf_a', type: 'FLIGHT',
    vendorName: 'United', totalCost: 289, costCurrency: 'USD',
    rawStartString: '2026-04-10T08:00', rawEndString: '2026-04-10T10:30',
    legs: [leg],
  });

  it('frame = departure → arrival', () => {
    const frame = computeTripFrameFromConfirmations([conf]);
    expect(frame).not.toBeNull();
    expect(frame!.startDate.getUTCHours()).toBe(8);
    expect(frame!.endDate.getUTCHours()).toBe(10);
    expect(frame!.startDate.getUTCDate()).toBe(10);
    expect(frame!.endDate.getUTCDate()).toBe(10);
  });

  it('itinerary = 1 flight, 0 lodgings, 0 cars', () => {
    const it = buildCanonicalItinerary([conf]);
    expect(it.flights).toHaveLength(1);
    expect(it.lodgings).toHaveLength(0);
    expect(it.cars).toHaveLength(0);
  });

  it('expenses = 1 USD expense', () => {
    const expenses = buildExpensesFromConfirmations('trip_a', [conf]);
    expect(expenses).toHaveLength(1);
    expect(expenses[0].amount).toBe(289);
    expect(expenses[0].currency).toBe('USD');
  });
});

// ============================================================================
// B) Domestic roundtrip, no lodging
// ============================================================================

describe('B) Domestic roundtrip, no lodging', () => {
  const outLeg = makeLeg({
    originCode: 'SFO', destinationCode: 'JFK',
    rawDepartureString: '2026-05-01T07:00', rawArrivalString: '2026-05-01T15:30',
    legId: 'leg_b1',
  });
  const retLeg = makeLeg({
    originCode: 'JFK', destinationCode: 'SFO',
    rawDepartureString: '2026-05-05T18:00', rawArrivalString: '2026-05-05T21:30',
    legId: 'leg_b2',
  });
  const conf = makeConf({
    confirmationId: 'conf_b', vendorName: 'Delta',
    totalCost: 650, costCurrency: 'USD', isTotalForBooking: true,
    rawStartString: '2026-05-01T07:00', rawEndString: '2026-05-05T21:30',
    legs: [outLeg, retLeg],
  });

  it('frame spans outbound → return', () => {
    const frame = computeTripFrameFromConfirmations([conf]);
    expect(frame!.startDate.getUTCDate()).toBe(1);
    expect(frame!.endDate.getUTCDate()).toBe(5);
  });

  it('itinerary has 2 flight legs', () => {
    const it = buildCanonicalItinerary([conf]);
    expect(it.flights).toHaveLength(2);
  });

  it('expenses = 1 bookingTotal (not duplicated per leg)', () => {
    const expenses = buildExpensesFromConfirmations('trip_b', [conf]);
    expect(expenses).toHaveLength(1);
    expect(expenses[0].amount).toBe(650);
  });
});

// ============================================================================
// C) Domestic roundtrip + hotel
// ============================================================================

describe('C) Domestic roundtrip + hotel', () => {
  const flightConf = makeConf({
    confirmationId: 'conf_c_flight', vendorName: 'American',
    totalCost: 480, costCurrency: 'USD',
    rawStartString: '2026-06-10T06:00', rawEndString: '2026-06-15T22:00',
    legs: [
      makeLeg({ originCode: 'DFW', destinationCode: 'MIA',
        rawDepartureString: '2026-06-10T06:00', rawArrivalString: '2026-06-10T10:00', legId: 'leg_c1' }),
      makeLeg({ originCode: 'MIA', destinationCode: 'DFW',
        rawDepartureString: '2026-06-15T19:00', rawArrivalString: '2026-06-15T22:00', legId: 'leg_c2' }),
    ],
  });
  const hotelConf = makeConf({
    confirmationId: 'conf_c_hotel', type: 'LODGING',
    vendorName: 'Hilton Miami', propertyName: 'Hilton Miami Beach',
    totalCost: 1200, costCurrency: 'USD',
    rawStartString: '2026-06-10T15:00', rawEndString: '2026-06-15T11:00',
    legs: [],
  });

  it('frame spans first flight departure → return arrival', () => {
    const frame = computeTripFrameFromConfirmations([flightConf, hotelConf]);
    expect(frame!.startDate.getUTCDate()).toBe(10);
    expect(frame!.startDate.getUTCHours()).toBe(6);
    expect(frame!.endDate.getUTCDate()).toBe(15);
    expect(frame!.endDate.getUTCHours()).toBe(22);
  });

  it('itinerary has 2 flights + 1 lodging', () => {
    const it = buildCanonicalItinerary([flightConf, hotelConf]);
    expect(it.flights).toHaveLength(2);
    expect(it.lodgings).toHaveLength(1);
    expect(it.lodgings[0].propertyName).toBe('Hilton Miami Beach');
  });

  it('expenses: 1 flight + 1 lodging', () => {
    const expenses = buildExpensesFromConfirmations('trip_c', [flightConf, hotelConf]);
    expect(expenses).toHaveLength(2);
    const categories = expenses.map(e => e.category);
    expect(categories).toContain('transport');
    expect(categories).toContain('lodging');
  });
});

// ============================================================================
// D) Flights + hotel + car
// ============================================================================

describe('D) Flights + hotel + car', () => {
  const flightConf = makeConf({
    confirmationId: 'conf_d_flight', vendorName: 'Southwest',
    totalCost: 350, costCurrency: 'USD',
    rawStartString: '2026-07-01T09:00', rawEndString: '2026-07-07T20:00',
    legs: [
      makeLeg({ originCode: 'PHX', destinationCode: 'DEN',
        rawDepartureString: '2026-07-01T09:00', rawArrivalString: '2026-07-01T12:00', legId: 'leg_d1' }),
      makeLeg({ originCode: 'DEN', destinationCode: 'PHX',
        rawDepartureString: '2026-07-07T17:00', rawArrivalString: '2026-07-07T20:00', legId: 'leg_d2' }),
    ],
  });
  const hotelConf = makeConf({
    confirmationId: 'conf_d_hotel', type: 'LODGING',
    vendorName: 'Marriott Denver', propertyName: 'Marriott Downtown',
    totalCost: 900, costCurrency: 'USD',
    rawStartString: '2026-07-01T15:00', rawEndString: '2026-07-07T11:00',
    legs: [],
  });
  const carConf = makeConf({
    confirmationId: 'conf_d_car', type: 'CAR_RENTAL',
    vendorName: 'Hertz', totalCost: 420, costCurrency: 'USD',
    rawStartString: '2026-07-01T13:00', rawEndString: '2026-07-07T13:00',
    legs: [],
  });

  it('frame spans earliest start to latest end across all types', () => {
    const frame = computeTripFrameFromConfirmations([flightConf, hotelConf, carConf]);
    expect(frame!.startDate.getUTCDate()).toBe(1);
    expect(frame!.startDate.getUTCHours()).toBe(9); // flight departs earliest
    expect(frame!.endDate.getUTCDate()).toBe(7);
    expect(frame!.endDate.getUTCHours()).toBe(20); // flight arrives latest
  });

  it('itinerary includes flights + lodging + car', () => {
    const it = buildCanonicalItinerary([flightConf, hotelConf, carConf]);
    expect(it.flights).toHaveLength(2);
    expect(it.lodgings).toHaveLength(1);
    expect(it.cars).toHaveLength(1);
    expect(it.cars[0].vendorName).toBe('Hertz');
  });

  it('expenses: 1 per booking total', () => {
    const expenses = buildExpensesFromConfirmations('trip_d', [flightConf, hotelConf, carConf]);
    expect(expenses).toHaveLength(3);
    expect(expenses.reduce((sum, e) => sum + e.amount, 0)).toBe(350 + 900 + 420);
  });
});

// ============================================================================
// E) Complex international (BA + Wizz + Ryanair)
// ============================================================================

describe('E) Complex international multi-leg + multi-currency', () => {
  const baConf = makeConf({
    confirmationId: 'conf_e_ba', vendorName: 'British Airways',
    totalCost: 924, costCurrency: 'USD', isTotalForBooking: true,
    rawStartString: 'Thu, 11 Mar 2026 23:10 CET',
    rawEndString: 'Fri, 12 Mar 2026 06:40 EST',
    legs: [
      makeLeg({ originCode: 'FCO', destinationCode: 'LHR',
        rawDepartureString: 'Thu, 11 Mar 2026 23:10 CET',
        rawArrivalString: 'Fri, 12 Mar 2026 01:10 GMT', legId: 'leg_e_ba1' }),
      makeLeg({ originCode: 'LHR', destinationCode: 'JFK',
        rawDepartureString: 'Fri, 12 Mar 2026 09:30 GMT',
        rawArrivalString: 'Fri, 12 Mar 2026 12:45 EST', legId: 'leg_e_ba2' }),
      makeLeg({ originCode: 'JFK', destinationCode: 'LHR',
        rawDepartureString: '2026-03-25T22:00',
        rawArrivalString: '2026-03-26T10:00', legId: 'leg_e_ba3' }),
      makeLeg({ originCode: 'LHR', destinationCode: 'FCO',
        rawDepartureString: '2026-03-26T14:00',
        rawArrivalString: '2026-03-26T17:30', legId: 'leg_e_ba4' }),
    ],
  });

  const wizzConf = makeConf({
    confirmationId: 'conf_e_wizz', vendorName: 'Wizz Air',
    totalCost: 89, costCurrency: 'EUR',
    rawStartString: 'Thu, 11 Mar 2026 06:10 CET',
    rawEndString: 'Thu, 11 Mar 2026 10:30 CET',
    legs: [
      makeLeg({ originCode: 'FCO', destinationCode: 'TFS',
        rawDepartureString: 'Thu, 11 Mar 2026 06:10 CET',
        rawArrivalString: 'Thu, 11 Mar 2026 10:30 CET',
        airline: 'Wizz Air', legId: 'leg_e_wizz1' }),
    ],
  });

  const ryanairConf = makeConf({
    confirmationId: 'conf_e_ryanair', vendorName: 'Ryanair',
    totalCost: 75, costCurrency: 'EUR',
    rawStartString: 'Mon, 24 March 2026, 21:45 CEST',
    rawEndString: 'Tue, 25 March 2026, 01:30 CEST',
    legs: [
      makeLeg({ originCode: 'TFS', destinationCode: 'FCO',
        rawDepartureString: 'Mon, 24 March 2026, 21:45 CEST',
        rawArrivalString: 'Tue, 25 March 2026, 01:30 CEST',
        airline: 'Ryanair', legId: 'leg_e_ryanair1' }),
    ],
  });

  const confs = [baConf, wizzConf, ryanairConf];

  it('frame spans earliest departure to latest arrival', () => {
    const frame = computeTripFrameFromConfirmations(confs);
    expect(frame).not.toBeNull();
    // Wizz departs earliest: 11 Mar 06:10
    expect(frame!.startDate.getUTCDate()).toBe(11);
    expect(frame!.startDate.getUTCHours()).toBe(6);
    // BA returns latest: 26 Mar 17:30
    expect(frame!.endDate.getUTCDate()).toBe(26);
    expect(frame!.endDate.getUTCHours()).toBe(17);
  });

  it('itinerary includes all 6 flight legs', () => {
    const it = buildCanonicalItinerary(confs);
    expect(it.flights).toHaveLength(6); // 4 BA + 1 Wizz + 1 Ryanair
  });

  it('expenses: BA in USD, Wizz + Ryanair in EUR', () => {
    const expenses = buildExpensesFromConfirmations('trip_e', confs);
    expect(expenses).toHaveLength(3);

    const ba = expenses.find(e => e.confirmationId === 'conf_e_ba');
    expect(ba!.amount).toBe(924);
    expect(ba!.currency).toBe('USD');

    const wizz = expenses.find(e => e.confirmationId === 'conf_e_wizz');
    expect(wizz!.amount).toBe(89);
    expect(wizz!.currency).toBe('EUR');

    const ryanair = expenses.find(e => e.confirmationId === 'conf_e_ryanair');
    expect(ryanair!.amount).toBe(75);
    expect(ryanair!.currency).toBe('EUR');
  });
});

// ============================================================================
// F) Multi-currency mixed trip
// ============================================================================

describe('F) Multi-currency mixed trip', () => {
  const usdFlight = makeConf({
    confirmationId: 'conf_f_usd', vendorName: 'United',
    totalCost: 500, costCurrency: 'USD',
    rawStartString: '2026-08-01T08:00', rawEndString: '2026-08-01T16:00',
    legs: [makeLeg({ rawDepartureString: '2026-08-01T08:00', rawArrivalString: '2026-08-01T16:00', legId: 'leg_f1' })],
  });
  const eurHotel = makeConf({
    confirmationId: 'conf_f_eur', type: 'LODGING',
    vendorName: 'Hotel Paris', propertyName: 'Le Grand Hotel',
    totalCost: 800, costCurrency: 'EUR',
    rawStartString: '2026-08-01T15:00', rawEndString: '2026-08-07T11:00',
    legs: [],
  });
  const gbpCar = makeConf({
    confirmationId: 'conf_f_gbp', type: 'CAR_RENTAL',
    vendorName: 'Europcar', totalCost: 320, costCurrency: 'GBP',
    rawStartString: '2026-08-01T16:30', rawEndString: '2026-08-07T10:00',
    legs: [],
  });

  const confs = [usdFlight, eurHotel, gbpCar];

  it('all expenses preserve original currencies', () => {
    const expenses = buildExpensesFromConfirmations('trip_f', confs);
    expect(expenses).toHaveLength(3);

    const currencies = expenses.map(e => e.currency).sort();
    expect(currencies).toEqual(['EUR', 'GBP', 'USD']);
  });

  it('no forced conversion — amounts unchanged', () => {
    const expenses = buildExpensesFromConfirmations('trip_f', confs);
    expect(expenses.find(e => e.currency === 'USD')!.amount).toBe(500);
    expect(expenses.find(e => e.currency === 'EUR')!.amount).toBe(800);
    expect(expenses.find(e => e.currency === 'GBP')!.amount).toBe(320);
  });

  it('non-USD expenses flagged needsReview', () => {
    const expenses = buildExpensesFromConfirmations('trip_f', confs);
    expect(expenses.find(e => e.currency === 'EUR')!.needsReview).toBe(true);
    expect(expenses.find(e => e.currency === 'GBP')!.needsReview).toBe(true);
  });

  it('frame includes lodging and car rental dates', () => {
    const frame = computeTripFrameFromConfirmations(confs);
    expect(frame!.startDate.getUTCDate()).toBe(1);
    expect(frame!.startDate.getUTCHours()).toBe(8);
    expect(frame!.endDate.getUTCDate()).toBe(7);
    expect(frame!.endDate.getUTCHours()).toBe(11);
  });

  it('itinerary includes all types', () => {
    const it = buildCanonicalItinerary(confs);
    expect(it.flights).toHaveLength(1);
    expect(it.lodgings).toHaveLength(1);
    expect(it.cars).toHaveLength(1);
  });
});

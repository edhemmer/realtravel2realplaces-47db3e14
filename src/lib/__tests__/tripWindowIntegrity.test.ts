/**
 * v3.9.80: Trip Window Integrity Tests
 *
 * Proves that computeTripWindowFromBatch and computeTripWindowFromParsedBookings
 * produce identical results to computeTripFrame, and that the wizard's
 * computeWizardTripWindow delegates correctly.
 *
 * These are APP-WIDE integrity tests: they verify that the wizard, the engine,
 * and the canonical helper all agree on trip start/end for every scenario.
 */

import { describe, it, expect } from 'vitest';
import { computeTripWindowFromBatch, computeTripWindowFromParsedBookings } from '@/lib/import/tripWindow';
import { computeTripFrame, tripFrameToDateTokens } from '@/lib/import/tripFrame';
import { computeWizardTripWindow } from '@/components/trips/CreateTripDialog';
import type { ImportBatch, ParsedConfirmation } from '@/lib/import/types';
import { generateBatchId, generateConfirmationId, generateLegId } from '@/lib/import/types';

// ============================================================================
// HELPERS
// ============================================================================

function makeBatch(items: ParsedConfirmation[]): ImportBatch {
  return { batchId: generateBatchId(), createdAt: new Date(), items };
}

function makeFlightConf(
  rawStart: string,
  rawEnd: string | null,
  legs?: Array<{ rawDep: string; rawArr: string | null }>,
): ParsedConfirmation {
  const flightLegs = (legs || [{ rawDep: rawStart, rawArr: rawEnd }]).map(l => ({
    originCode: null, originName: null,
    destinationCode: null, destinationName: null,
    rawDepartureString: l.rawDep,
    rawArrivalString: l.rawArr,
    departureDate: null, arrivalDate: null,
    airline: null, flightNumber: null,
    legCostAmount: null, legCostCurrency: null,
    legId: generateLegId(),
  }));

  return {
    confirmationId: generateConfirmationId(),
    type: 'FLIGHT',
    confirmationNumber: null,
    vendorName: 'Test Airline',
    rawStartString: rawStart,
    rawEndString: rawEnd,
    startDate: null, endDate: null,
    legs: flightLegs,
    totalCost: null, costCurrency: null,
    isTotalForBooking: true,
    propertyName: null, address: null,
    needsReview: false, reviewReason: null,
    originalParsed: {},
  };
}

function makeLodgingConf(rawCheckIn: string, rawCheckOut: string): ParsedConfirmation {
  return {
    confirmationId: generateConfirmationId(),
    type: 'LODGING',
    confirmationNumber: null,
    vendorName: 'Test Hotel',
    rawStartString: rawCheckIn,
    rawEndString: rawCheckOut,
    startDate: null, endDate: null,
    legs: [],
    totalCost: null, costCurrency: null,
    isTotalForBooking: true,
    propertyName: 'Test Hotel',
    address: null,
    needsReview: false, reviewReason: null,
    originalParsed: {},
  };
}

// Minimal wizard-style parsed booking (like ParsedBooking in CreateTripDialog)
function wizardBooking(start: string, end?: string, type = 'flight') {
  return {
    booking_type: type,
    vendor_name: 'Test',
    start_datetime: start,
    end_datetime: end,
  };
}

// ============================================================================
// 1) Pipeline → TripWindow consistency
// ============================================================================

describe('Trip Window Integrity (v3.9.80)', () => {
  it('computeTripWindowFromBatch equals computeTripFrame for simple roundtrip', () => {
    const conf = makeFlightConf('2026-03-11T08:00', '2026-03-20T18:00', [
      { rawDep: '2026-03-11T08:00', rawArr: '2026-03-11T14:00' },
      { rawDep: '2026-03-20T12:00', rawArr: '2026-03-20T18:00' },
    ]);
    const batch = makeBatch([conf]);

    const engineFrame = computeTripFrame(batch);
    const window = computeTripWindowFromBatch(batch);

    expect(engineFrame).not.toBeNull();
    const tokens = tripFrameToDateTokens(engineFrame!);
    expect(window.startDate).toBe(tokens.startDateToken);
    expect(window.endDate).toBe(tokens.endDateToken);
  });

  it('computeTripWindowFromBatch equals computeTripFrame for flights + hotel', () => {
    const flight = makeFlightConf('2026-03-11T08:00', '2026-03-20T18:00', [
      { rawDep: '2026-03-11T08:00', rawArr: '2026-03-11T14:00' },
      { rawDep: '2026-03-20T12:00', rawArr: '2026-03-20T18:00' },
    ]);
    const hotel = makeLodgingConf('2026-03-11T15:00', '2026-03-22T11:00');
    const batch = makeBatch([flight, hotel]);

    const engineFrame = computeTripFrame(batch);
    const window = computeTripWindowFromBatch(batch);

    expect(engineFrame).not.toBeNull();
    const tokens = tripFrameToDateTokens(engineFrame!);
    expect(window.startDate).toBe(tokens.startDateToken);
    expect(window.endDate).toBe(tokens.endDateToken);
    // Hotel checkout extends end date
    expect(window.endDate).toBe('2026-03-22');
  });

  it('complex international multi-airline: engine and window agree', () => {
    const ba = makeFlightConf('2026-03-11T23:10', '2026-03-26T21:10', [
      { rawDep: '2026-03-11T23:10', rawArr: '2026-03-12T05:30' },
      { rawDep: '2026-03-12T08:00', rawArr: '2026-03-12T12:30' },
      { rawDep: '2026-03-26T14:00', rawArr: '2026-03-26T18:30' },
      { rawDep: '2026-03-26T20:00', rawArr: '2026-03-26T21:10' },
    ]);
    const wizz = makeFlightConf('Thu, 11 Mar 2026 06:10 CET', '11 Mar 2026 09:45', [
      { rawDep: 'Thu, 11 Mar 2026 06:10 CET', rawArr: '11 Mar 2026 09:45' },
    ]);
    const ryanair = makeFlightConf('Mon, 24 March 2026 21:45 CEST', '25 March 2026 01:15', [
      { rawDep: 'Mon, 24 March 2026 21:45 CEST', rawArr: '25 March 2026 01:15' },
    ]);
    const batch = makeBatch([ba, wizz, ryanair]);

    const engineFrame = computeTripFrame(batch);
    const window = computeTripWindowFromBatch(batch);

    expect(engineFrame).not.toBeNull();
    const tokens = tripFrameToDateTokens(engineFrame!);
    expect(window.startDate).toBe(tokens.startDateToken);
    expect(window.endDate).toBe(tokens.endDateToken);

    // BA leg on Mar 26 21:10 is the latest
    expect(window.startDate).toBe('2026-03-11');
    expect(window.endDate).toBe('2026-03-26');
  });
});

// ============================================================================
// 2) Wizard-init consistency
// ============================================================================

describe('Wizard ↔ Engine consistency (v3.9.80)', () => {
  it('wizard computeWizardTripWindow matches computeTripWindowFromParsedBookings', () => {
    const bookings = [
      wizardBooking('2026-03-11T08:00', '2026-03-11T14:00'),
      wizardBooking('2026-03-20T12:00', '2026-03-20T18:00'),
    ];
    const wizardResult = computeWizardTripWindow(bookings as any);
    const engineResult = computeTripWindowFromParsedBookings(bookings as any);

    expect(wizardResult.startDate).toBe(engineResult.startDate);
    expect(wizardResult.endDate).toBe(engineResult.endDate);
  });

  it('wizard matches engine for EU-format multi-airline batch', () => {
    const bookings = [
      wizardBooking('Thu, 11 Mar 2026 06:10 CET', '11 Mar 2026 09:45'),
      wizardBooking('Mon, 24 March 2026 21:45 CEST', '25 March 2026 01:15'),
      wizardBooking('2026-03-11T15:00', '2026-03-24T11:00'),
    ];
    const wizardResult = computeWizardTripWindow(bookings as any);
    const engineResult = computeTripWindowFromParsedBookings(bookings as any);

    expect(wizardResult.startDate).toBe(engineResult.startDate);
    expect(wizardResult.endDate).toBe(engineResult.endDate);
    expect(wizardResult.startDate).toBe('2026-03-11');
    expect(wizardResult.endDate).toBe('2026-03-25');
  });

  it('complex BA-style 4 legs: wizard end date = last leg arrival', () => {
    const bookings = [
      // BA 4-leg itinerary — top-level dates span the trip
      {
        booking_type: 'flight',
        vendor_name: 'British Airways',
        start_datetime: '2026-03-11T23:10',
        end_datetime: '2026-03-26T21:10',
        flight_legs: [
          { departure_datetime: '2026-03-11T23:10', arrival_datetime: '2026-03-12T05:30', departure_airport_code: 'LHR', arrival_airport_code: 'DOH' },
          { departure_datetime: '2026-03-12T08:00', arrival_datetime: '2026-03-12T12:30', departure_airport_code: 'DOH', arrival_airport_code: 'TFS' },
          { departure_datetime: '2026-03-26T14:00', arrival_datetime: '2026-03-26T18:30', departure_airport_code: 'TFS', arrival_airport_code: 'DOH' },
          { departure_datetime: '2026-03-26T20:00', arrival_datetime: '2026-03-26T21:10', departure_airport_code: 'DOH', arrival_airport_code: 'LHR' },
        ],
      },
    ];
    const wizardResult = computeWizardTripWindow(bookings as any);
    expect(wizardResult.startDate).toBe('2026-03-11');
    expect(wizardResult.endDate).toBe('2026-03-26');
  });

  it('order of confirmations does not change result', () => {
    const bookings = [
      wizardBooking('2026-03-20T14:00', '2026-03-20T18:00'),
      wizardBooking('2026-03-11T06:10', '2026-03-11T10:30'),
      wizardBooking('2026-03-27T09:10', '2026-03-27T13:00'),
    ];
    const r1 = computeWizardTripWindow(bookings as any);
    const r2 = computeWizardTripWindow([...bookings].reverse() as any);
    expect(r1.startDate).toBe(r2.startDate);
    expect(r1.endDate).toBe(r2.endDate);
    expect(r1.startDate).toBe('2026-03-11');
    expect(r1.endDate).toBe('2026-03-27');
  });

  it('empty bookings → null dates', () => {
    const result = computeWizardTripWindow([]);
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
  });

  it('unrecognized date formats → null dates, no crash', () => {
    const result = computeWizardTripWindow([
      { booking_type: 'flight', vendor_name: 'X', start_datetime: 'WEIRD_FORMAT' } as any,
    ]);
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
  });
});

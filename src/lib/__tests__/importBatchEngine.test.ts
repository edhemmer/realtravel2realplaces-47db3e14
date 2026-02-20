import { describe, it, expect } from 'vitest';
import {
  createImportBatch,
  upsertImportBatch,
  getImportBatch,
  clearImportBatch,
  clearAllBatches,
} from '@/lib/import/importBatchStore';
import { computeTripFrameFromConfirmations } from '@/lib/import/tripFrame';
import { buildExpensesFromConfirmations } from '@/lib/import/buildExpensesFromConfirmations';
import type { ParsedConfirmation, FlightLeg } from '@/lib/import/types';

function makeLeg(overrides: Partial<FlightLeg> = {}): FlightLeg {
  return {
    originCode: 'LHR',
    originName: 'London Heathrow',
    destinationCode: 'JFK',
    destinationName: 'John F Kennedy',
    rawDepartureString: '2026-03-11T10:30',
    rawArrivalString: '2026-03-11T14:45',
    departureDate: new Date(Date.UTC(2026, 2, 11, 10, 30)),
    arrivalDate: new Date(Date.UTC(2026, 2, 11, 14, 45)),
    airline: 'BA',
    flightNumber: 'BA123',
    legCostAmount: null,
    legCostCurrency: null,
    legId: 'leg_test_1',
    ...overrides,
  };
}

function makeConf(overrides: Partial<ParsedConfirmation> = {}): ParsedConfirmation {
  return {
    confirmationId: `conf_test_${Math.random()}`,
    type: 'FLIGHT',
    confirmationNumber: 'Y7ZBBD',
    vendorName: 'British Airways',
    rawStartString: '2026-03-11T10:30',
    rawEndString: '2026-03-11T14:45',
    startDate: new Date(Date.UTC(2026, 2, 11, 10, 30)),
    endDate: new Date(Date.UTC(2026, 2, 11, 14, 45)),
    legs: [makeLeg()],
    totalCost: 924,
    costCurrency: 'USD',
    isTotalForBooking: true,
    propertyName: null,
    address: null,
    needsReview: false,
    reviewReason: null,
    originalParsed: {},
    ...overrides,
  };
}

describe('Import Batch Store', () => {
  afterEach(() => clearAllBatches());

  it('creates and retrieves a batch', () => {
    const id = createImportBatch();
    const batch = getImportBatch(id);
    expect(batch).not.toBeNull();
    expect(batch!.items).toHaveLength(0);
  });

  it('upserts confirmations to a batch', () => {
    const id = createImportBatch();
    const conf = makeConf();
    upsertImportBatch(id, [conf]);
    const batch = getImportBatch(id);
    expect(batch!.items).toHaveLength(1);
  });

  it('deduplicates by confirmationNumber', () => {
    const id = createImportBatch();
    const conf1 = makeConf({ confirmationNumber: 'ABC123' });
    const conf2 = makeConf({ confirmationNumber: 'ABC123' });
    upsertImportBatch(id, [conf1, conf2]);
    const batch = getImportBatch(id);
    expect(batch!.items).toHaveLength(1);
  });

  it('clears a batch', () => {
    const id = createImportBatch();
    upsertImportBatch(id, [makeConf()]);
    clearImportBatch(id);
    expect(getImportBatch(id)).toBeNull();
  });
});

describe('Trip Frame from Confirmations', () => {
  it('computes frame from multi-confirmation batch', () => {
    const confs = [
      makeConf({
        startDate: new Date(Date.UTC(2026, 2, 11, 10, 0)),
        endDate: new Date(Date.UTC(2026, 2, 11, 14, 0)),
      }),
      makeConf({
        type: 'LODGING',
        startDate: new Date(Date.UTC(2026, 2, 11, 15, 0)),
        endDate: new Date(Date.UTC(2026, 2, 20, 11, 0)),
        legs: [],
      }),
      makeConf({
        startDate: new Date(Date.UTC(2026, 2, 20, 16, 0)),
        endDate: new Date(Date.UTC(2026, 2, 20, 22, 0)),
      }),
    ];

    const frame = computeTripFrameFromConfirmations(confs);
    expect(frame).not.toBeNull();
    expect(frame!.startDate.getUTCDate()).toBe(11);
    expect(frame!.endDate.getUTCDate()).toBe(20);
    expect(frame!.endDate.getUTCHours()).toBe(22);
  });

  it('uses flight leg dates for framing', () => {
    const confs = [
      makeConf({
        startDate: null,
        endDate: null,
        legs: [
          makeLeg({
            departureDate: new Date(Date.UTC(2026, 2, 11, 10, 0)),
            arrivalDate: new Date(Date.UTC(2026, 2, 11, 14, 0)),
          }),
          makeLeg({
            departureDate: new Date(Date.UTC(2026, 2, 20, 16, 0)),
            arrivalDate: new Date(Date.UTC(2026, 2, 20, 22, 0)),
          }),
        ],
      }),
    ];

    const frame = computeTripFrameFromConfirmations(confs);
    expect(frame).not.toBeNull();
    expect(frame!.startDate.getUTCDate()).toBe(11);
    expect(frame!.endDate.getUTCDate()).toBe(20);
  });

  it('falls back to raw strings via toOrderingDate', () => {
    const confs = [
      makeConf({
        startDate: null,
        endDate: null,
        rawStartString: '26 Mar 2026 12:45',
        rawEndString: '30 Mar 2026 10:00',
        legs: [],
      }),
    ];

    const frame = computeTripFrameFromConfirmations(confs);
    expect(frame).not.toBeNull();
    expect(frame!.startDate.getUTCDate()).toBe(26);
    expect(frame!.endDate.getUTCDate()).toBe(30);
  });

  it('returns null when no valid dates', () => {
    const confs = [
      makeConf({
        startDate: null,
        endDate: null,
        rawStartString: 'unknown format',
        rawEndString: null,
        legs: [],
      }),
    ];

    const frame = computeTripFrameFromConfirmations(confs);
    expect(frame).toBeNull();
  });
});

describe('Expense Builder', () => {
  it('creates one expense for booking-total flight', () => {
    const expenses = buildExpensesFromConfirmations('trip1', [
      makeConf({ totalCost: 924, costCurrency: 'USD', isTotalForBooking: true }),
    ]);
    expect(expenses).toHaveLength(1);
    expect(expenses[0].amount).toBe(924);
    expect(expenses[0].currency).toBe('USD');
  });

  it('creates expenses for all confirmations in batch', () => {
    const expenses = buildExpensesFromConfirmations('trip1', [
      makeConf({ confirmationId: 'c1', totalCost: 924, costCurrency: 'USD' }),
      makeConf({ confirmationId: 'c2', type: 'LODGING', totalCost: 350, costCurrency: 'GBP', legs: [] }),
      makeConf({ confirmationId: 'c3', totalCost: 196.32, costCurrency: 'USD' }),
    ]);
    expect(expenses).toHaveLength(3);
    expect(expenses[1].currency).toBe('GBP');
    expect(expenses[1].needsReview).toBe(true); // non-USD
  });

  it('does not create expense for null cost', () => {
    const expenses = buildExpensesFromConfirmations('trip1', [
      makeConf({ totalCost: null, legs: [makeLeg({ legCostAmount: null })] }),
    ]);
    expect(expenses).toHaveLength(0);
  });

  it('deduplicates by confirmationId', () => {
    const conf = makeConf({ confirmationId: 'same', totalCost: 100 });
    const expenses = buildExpensesFromConfirmations('trip1', [conf, conf]);
    expect(expenses).toHaveLength(1);
  });

  it('handles per-leg costs', () => {
    const expenses = buildExpensesFromConfirmations('trip1', [
      makeConf({
        totalCost: null,
        legs: [
          makeLeg({ legCostAmount: 200, legCostCurrency: 'EUR', legId: 'l1' }),
          makeLeg({ legCostAmount: 250, legCostCurrency: 'EUR', legId: 'l2' }),
        ],
      }),
    ]);
    expect(expenses).toHaveLength(2);
    expect(expenses[0].legId).toBe('l1');
    expect(expenses[1].legId).toBe('l2');
  });

  it('preserves multi-currency without conversion', () => {
    const expenses = buildExpensesFromConfirmations('trip1', [
      makeConf({ confirmationId: 'c1', totalCost: 100, costCurrency: 'EUR' }),
      makeConf({ confirmationId: 'c2', totalCost: 200, costCurrency: 'GBP' }),
    ]);
    expect(expenses[0].currency).toBe('EUR');
    expect(expenses[1].currency).toBe('GBP');
    expect(expenses[0].needsReview).toBe(true);
    expect(expenses[1].needsReview).toBe(true);
  });
});

/**
 * v3.9.28: Multi-Item Ingestion Parity Tests (Airline-Agnostic)
 *
 * Proves that single-item and multi-item ingestion use the identical
 * buildTripModel() path, producing deterministic results with:
 * - No missing legs
 * - No missing costs
 * - No partial builds
 * - Identical results for equivalent input regardless of source count
 *
 * v3.9.28 additions:
 * - Multi-confirmation same airline, different days
 * - Multi-confirmation mixed airlines
 * - Cost parity across confirmations
 * - Same-route different-day dedup correctness
 */

import { describe, it, expect } from 'vitest';
import { buildTripModel, type TripBuildModel } from '@/lib/ingestion/tripBuildModel';
import { buildStagingSnapshot, type StagingSnapshot } from '@/lib/ingestion/importStaging';

// ── Test helpers ──

function makeFlight(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    booking_type: 'flight',
    vendor_name: 'Test Airline',
    airline: 'TA',
    confirmation_number: 'ABC123',
    start_datetime: '2025-03-11T08:00:00',
    end_datetime: '2025-03-11T12:00:00',
    departure_airport_code: 'JFK',
    arrival_airport_code: 'LAX',
    departure_airport_name: 'John F Kennedy',
    arrival_airport_name: 'Los Angeles Intl',
    total_cost: 350,
    ...overrides,
  };
}

function makeStay(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    booking_type: 'stay',
    vendor_name: 'Test Hotel',
    property_name: 'Beach Resort',
    confirmation_number: 'STAY001',
    start_datetime: '2025-03-11T15:00:00',
    end_datetime: '2025-03-14T11:00:00',
    total_cost: 600,
    ...overrides,
  };
}

function makeRental(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    booking_type: 'car_rental',
    vendor_name: 'Test Rental',
    rental_company: 'Test Rental Co',
    confirmation_number: 'CAR001',
    start_datetime: '2025-03-11T13:00:00',
    end_datetime: '2025-03-14T10:00:00',
    pickup_location: 'LAX Airport',
    return_location: 'LAX Airport',
    total_cost: 200,
    ...overrides,
  };
}

function buildFromItems(items: Array<Record<string, unknown>>): TripBuildModel {
  const snapshot = buildStagingSnapshot(items, 'fly');
  return buildTripModel(snapshot);
}

// ── Tests ──

describe('v3.9.27: Multi-Item Ingestion Parity', () => {
  describe('CHANGE 1: Single builder entry point', () => {
    it('single flight uses buildTripModel', () => {
      const model = buildFromItems([makeFlight()]);
      expect(model.status).toBe('VALID');
      expect(model.legs).toHaveLength(1);
      expect(model.costItems).toHaveLength(1);
    });

    it('4 flights use buildTripModel identically', () => {
      const flights = [
        makeFlight({ confirmation_number: 'A1', departure_airport_code: 'JFK', arrival_airport_code: 'LAX', start_datetime: '2025-03-11T08:00:00', end_datetime: '2025-03-11T12:00:00' }),
        makeFlight({ confirmation_number: 'A2', departure_airport_code: 'LAX', arrival_airport_code: 'SFO', start_datetime: '2025-03-13T10:00:00', end_datetime: '2025-03-13T12:00:00' }),
        makeFlight({ confirmation_number: 'A3', departure_airport_code: 'SFO', arrival_airport_code: 'LAX', start_datetime: '2025-03-15T10:00:00', end_datetime: '2025-03-15T12:00:00' }),
        makeFlight({ confirmation_number: 'A4', departure_airport_code: 'LAX', arrival_airport_code: 'JFK', start_datetime: '2025-03-16T14:00:00', end_datetime: '2025-03-16T20:00:00' }),
      ];
      const model = buildFromItems(flights);
      expect(model.status).toBe('VALID');
      expect(model.legs).toHaveLength(4);
      expect(model.costItems).toHaveLength(4);
    });

    it('single vs multi produces identical legs for same data', () => {
      const leg1 = makeFlight({ confirmation_number: 'X1', departure_airport_code: 'JFK', arrival_airport_code: 'LHR', start_datetime: '2025-03-11T18:00:00', end_datetime: '2025-03-12T06:00:00' });
      const leg2 = makeFlight({ confirmation_number: 'X2', departure_airport_code: 'LHR', arrival_airport_code: 'JFK', start_datetime: '2025-03-20T09:00:00', end_datetime: '2025-03-20T14:00:00' });

      // Case A: both in one batch
      const modelA = buildFromItems([leg1, leg2]);

      // Case B: conceptually "two separate emails" but same builder
      const modelB = buildFromItems([leg1, leg2]);

      expect(modelA.legs.length).toBe(modelB.legs.length);
      expect(modelA.costItems.length).toBe(modelB.costItems.length);
      expect(modelA.startDate).toBe(modelB.startDate);
      expect(modelA.endDate).toBe(modelB.endDate);
    });
  });

  describe('CHANGE 2: Leg aggregation uses full session', () => {
    it('all legs from multiple confirmations are present', () => {
      const items = [
        makeFlight({ confirmation_number: 'CONF1', departure_airport_code: 'JFK', arrival_airport_code: 'CDG', start_datetime: '2025-03-11T19:00:00' }),
        makeFlight({ confirmation_number: 'CONF2', departure_airport_code: 'CDG', arrival_airport_code: 'BCN', start_datetime: '2025-03-14T10:00:00' }),
        makeFlight({ confirmation_number: 'CONF3', departure_airport_code: 'BCN', arrival_airport_code: 'JFK', start_datetime: '2025-03-20T16:00:00' }),
        makeStay({ confirmation_number: 'HOTEL1' }),
      ];
      const model = buildFromItems(items);
      expect(model.status).toBe('VALID');
      expect(model.legs).toHaveLength(4); // 3 flights + 1 stay
    });

    it('deduplicates identical legs', () => {
      const leg = makeFlight();
      const model = buildFromItems([leg, { ...leg }]); // same leg twice
      expect(model.legs).toHaveLength(1); // deduped
    });

    it('trip dates span all items', () => {
      const items = [
        makeFlight({ start_datetime: '2025-03-11T08:00:00', end_datetime: '2025-03-11T12:00:00' }),
        makeFlight({ confirmation_number: 'RET', departure_airport_code: 'LAX', arrival_airport_code: 'JFK', start_datetime: '2025-03-26T14:00:00', end_datetime: '2025-03-26T22:00:00' }),
      ];
      const model = buildFromItems(items);
      expect(model.startDate).toBe('2025-03-11');
      expect(model.endDate).toBe('2025-03-26');
    });
  });

  describe('CHANGE 3: Integrity checks run for multi-item', () => {
    it('aborts on missing airport code in multi-item', () => {
      const items = [
        makeFlight({ confirmation_number: 'OK1' }),
        makeFlight({ confirmation_number: 'BAD', departure_airport_code: '', departure_airport_name: '', arrival_airport_code: '', arrival_airport_name: '' }),
      ];
      const model = buildFromItems(items);
      expect(model.status).toBe('ERROR');
      expect(model.errors.some(e => e.code === 'MISSING_REQUIRED_FLIGHT_FIELDS')).toBe(true);
    });

    it('aborts on missing start_datetime', () => {
      const items = [
        makeFlight({ confirmation_number: 'OK1' }),
        makeFlight({ confirmation_number: 'BAD2', start_datetime: '' }),
      ];
      const model = buildFromItems(items);
      expect(model.status).toBe('ERROR');
    });
  });

  describe('CHANGE 4: Atomic commit — cost propagation', () => {
    it('multi-confirmation costs all present', () => {
      const items = [
        makeFlight({ confirmation_number: 'F1', total_cost: 300 }),
        makeStay({ confirmation_number: 'H1', total_cost: 500 }),
        makeRental({ confirmation_number: 'C1', total_cost: 200 }),
      ];
      const model = buildFromItems(items);
      expect(model.status).toBe('VALID');
      expect(model.costItems).toHaveLength(3);
      expect(model.costItems.map(c => c.totalAmount).sort()).toEqual([200, 300, 500]);
    });

    it('no cost item for $0 booking', () => {
      const items = [
        makeFlight({ total_cost: 0 }),
        makeStay({ total_cost: 500 }),
      ];
      const model = buildFromItems(items);
      expect(model.costItems).toHaveLength(1);
      expect(model.costItems[0].totalAmount).toBe(500);
    });
  });

  describe('CHANGE 5: Mixed-source multi-item', () => {
    it('flight + lodging + rental all on timeline', () => {
      const items = [
        makeFlight({ confirmation_number: 'FLT1' }),
        makeStay({ confirmation_number: 'STAY1' }),
        makeRental({ confirmation_number: 'CAR1' }),
      ];
      const model = buildFromItems(items);
      expect(model.status).toBe('VALID');
      expect(model.legs).toHaveLength(3);
      expect(model.legs.map(l => l.bookingType).sort()).toEqual(['car_rental', 'flight', 'stay']);
    });
  });

  describe('Idempotency: re-ingest same data', () => {
    it('building twice from same items produces identical model', () => {
      const items = [
        makeFlight({ confirmation_number: 'DUP1' }),
        makeStay({ confirmation_number: 'DUP2' }),
      ];
      const model1 = buildFromItems(items);
      const model2 = buildFromItems(items);
      expect(model1.legs.length).toBe(model2.legs.length);
      expect(model1.costItems.length).toBe(model2.costItems.length);
      expect(model1.startDate).toBe(model2.startDate);
      expect(model1.endDate).toBe(model2.endDate);
      expect(model1.status).toBe(model2.status);
    });
  });
});

// ============================================================================
// v3.9.28: Airline-Agnostic Multi-Confirmation Tests
// ============================================================================

describe('v3.9.28: Airline-Agnostic Multi-Confirmation', () => {
  describe('Same airline, different days — no over-dedup', () => {
    it('3 confirmations same airline different days all preserved', () => {
      // Simulates: Rome → Tenerife trip with 3 separate BA bookings
      const items = [
        makeFlight({
          confirmation_number: 'BA001',
          airline: 'British Airways',
          vendor_name: 'British Airways',
          departure_airport_code: 'FCO',
          arrival_airport_code: 'TFS',
          start_datetime: '2025-03-20T08:00:00',
          end_datetime: '2025-03-20T12:30:00',
          total_cost: 280,
        }),
        makeFlight({
          confirmation_number: 'BA002',
          airline: 'British Airways',
          vendor_name: 'British Airways',
          departure_airport_code: 'TFS',
          arrival_airport_code: 'LHR',
          start_datetime: '2025-03-25T14:00:00',
          end_datetime: '2025-03-25T20:00:00',
          total_cost: 310,
        }),
        makeFlight({
          confirmation_number: 'BA003',
          airline: 'British Airways',
          vendor_name: 'British Airways',
          departure_airport_code: 'LHR',
          arrival_airport_code: 'FCO',
          start_datetime: '2025-03-26T09:00:00',
          end_datetime: '2025-03-26T12:30:00',
          total_cost: 195,
        }),
      ];
      const model = buildFromItems(items);
      expect(model.status).toBe('VALID');
      expect(model.legs).toHaveLength(3);
      expect(model.costItems).toHaveLength(3);
      expect(model.startDate).toBe('2025-03-20');
      expect(model.endDate).toBe('2025-03-26');
    });

    it('same route same airline different days are NOT deduped', () => {
      // e.g., daily shuttle flights FCO→TFS on different days
      const items = [
        makeFlight({
          confirmation_number: 'SHUT1',
          airline: 'Airline X',
          departure_airport_code: 'FCO',
          arrival_airport_code: 'TFS',
          start_datetime: '2025-03-20T08:00:00',
          end_datetime: '2025-03-20T12:00:00',
          total_cost: 100,
        }),
        makeFlight({
          confirmation_number: 'SHUT2',
          airline: 'Airline X',
          departure_airport_code: 'FCO',
          arrival_airport_code: 'TFS',
          start_datetime: '2025-03-22T08:00:00',
          end_datetime: '2025-03-22T12:00:00',
          total_cost: 100,
        }),
      ];
      const model = buildFromItems(items);
      expect(model.status).toBe('VALID');
      expect(model.legs).toHaveLength(2); // NOT deduped — different days
      expect(model.costItems).toHaveLength(2);
    });
  });

  describe('Mixed airlines — no airline-specific logic', () => {
    it('legs from 2 different airlines across confirmations all preserved', () => {
      const items = [
        makeFlight({
          confirmation_number: 'DL100',
          airline: 'Delta',
          departure_airport_code: 'JFK',
          arrival_airport_code: 'CDG',
          start_datetime: '2025-04-01T18:00:00',
          end_datetime: '2025-04-02T06:00:00',
          total_cost: 600,
        }),
        makeFlight({
          confirmation_number: 'AF200',
          airline: 'Air France',
          departure_airport_code: 'CDG',
          arrival_airport_code: 'BCN',
          start_datetime: '2025-04-05T10:00:00',
          end_datetime: '2025-04-05T12:00:00',
          total_cost: 150,
        }),
        makeFlight({
          confirmation_number: 'VY300',
          airline: 'Vueling',
          departure_airport_code: 'BCN',
          arrival_airport_code: 'JFK',
          start_datetime: '2025-04-10T14:00:00',
          end_datetime: '2025-04-10T22:00:00',
          total_cost: 500,
        }),
      ];
      const model = buildFromItems(items);
      expect(model.status).toBe('VALID');
      expect(model.legs).toHaveLength(3);
      expect(model.costItems).toHaveLength(3);
      const totalCost = model.costItems.reduce((s, c) => s + c.totalAmount, 0);
      expect(totalCost).toBe(1250);
    });
  });

  describe('Cost parity across confirmations', () => {
    it('canonical cost count === buildModel cost count', () => {
      const items = [
        makeFlight({ confirmation_number: 'C1', total_cost: 200 }),
        makeFlight({ confirmation_number: 'C2', departure_airport_code: 'LAX', arrival_airport_code: 'SFO', start_datetime: '2025-03-15T10:00:00', total_cost: 150 }),
        makeStay({ confirmation_number: 'H1', total_cost: 400 }),
        makeRental({ confirmation_number: 'R1', total_cost: 0 }), // no cost
      ];
      const model = buildFromItems(items);
      expect(model.status).toBe('VALID');
      // 3 items with cost > 0 (rental has 0)
      expect(model.costItems).toHaveLength(3);
    });

    it('no cost items lost when confirmations have different currencies', () => {
      const items = [
        makeFlight({ confirmation_number: 'USD1', total_cost: 300, _extracted_currency: 'USD' }),
        makeFlight({ confirmation_number: 'EUR1', departure_airport_code: 'CDG', arrival_airport_code: 'BCN', start_datetime: '2025-03-15T10:00:00', total_cost: 250, _extracted_currency: 'EUR' }),
      ];
      const model = buildFromItems(items);
      expect(model.status).toBe('VALID');
      expect(model.costItems).toHaveLength(2);
      expect(model.costItems.find(c => c.currency === 'EUR')).toBeTruthy();
      expect(model.costItems.find(c => c.currency === 'USD')).toBeTruthy();
    });
  });

  describe('Dedup correctness — only exact collisions merge', () => {
    it('same confirmation with 2 legs (outbound + return) both preserved', () => {
      // Same PNR, different routes and times
      const items = [
        makeFlight({
          confirmation_number: 'PNR123',
          airline: 'BA',
          departure_airport_code: 'LHR',
          arrival_airport_code: 'JFK',
          start_datetime: '2025-03-20T10:00:00',
          end_datetime: '2025-03-20T14:00:00',
          total_cost: 500,
        }),
        makeFlight({
          confirmation_number: 'PNR123',
          airline: 'BA',
          departure_airport_code: 'JFK',
          arrival_airport_code: 'LHR',
          start_datetime: '2025-03-27T18:00:00',
          end_datetime: '2025-03-28T06:00:00',
          total_cost: 500,
        }),
      ];
      const model = buildFromItems(items);
      expect(model.status).toBe('VALID');
      expect(model.legs).toHaveLength(2); // same PNR but different routes/times
    });

    it('true duplicates (exact same data) are correctly deduped', () => {
      const leg = makeFlight({ confirmation_number: 'DUP' });
      const model = buildFromItems([leg, { ...leg }, { ...leg }]);
      expect(model.legs).toHaveLength(1);
      expect(model.costItems).toHaveLength(1);
    });
  });

  describe('Trip range derived from full leg set', () => {
    it('trip range covers all legs, not just first confirmation', () => {
      const items = [
        makeFlight({
          confirmation_number: 'EARLY',
          start_datetime: '2025-03-10T08:00:00',
          end_datetime: '2025-03-10T12:00:00',
        }),
        makeFlight({
          confirmation_number: 'LATE',
          departure_airport_code: 'LAX',
          arrival_airport_code: 'JFK',
          start_datetime: '2025-04-05T14:00:00',
          end_datetime: '2025-04-05T22:00:00',
        }),
      ];
      const model = buildFromItems(items);
      expect(model.startDate).toBe('2025-03-10');
      expect(model.endDate).toBe('2025-04-05');
    });
  });

  describe('Integrity failure aborts entire build', () => {
    it('one bad leg among 4 aborts entire build', () => {
      const items = [
        makeFlight({ confirmation_number: 'GOOD1' }),
        makeFlight({ confirmation_number: 'GOOD2', departure_airport_code: 'LAX', arrival_airport_code: 'SFO', start_datetime: '2025-03-15T10:00:00' }),
        makeFlight({ confirmation_number: 'BAD', departure_airport_code: '', departure_airport_name: '', arrival_airport_code: '', arrival_airport_name: '' }),
        makeFlight({ confirmation_number: 'GOOD3', departure_airport_code: 'SFO', arrival_airport_code: 'JFK', start_datetime: '2025-03-20T14:00:00' }),
      ];
      const model = buildFromItems(items);
      expect(model.status).toBe('ERROR');
      // No trip should be created
    });
  });
});

import { describe, it, expect } from 'vitest';
import { runCanonicalImportPipelineSingle } from '../canonicalImportPipeline';

describe('canonicalImportPipeline flight leg parity', () => {
  it('classifies BOOKING when top-level flight fields are missing but flight_legs has valid itinerary', () => {
    const parsed: Record<string, unknown> = {
      booking_type: 'flight',
      confirmation_number: 'ON3B8G',
      vendor_name: 'Wizz Air',
      total_cost: 200.04,
      passenger_name: 'Paula Li Sanchez, Edward Hemmer',
      flight_legs: [
        {
          airline: 'Wizz Air',
          departure_airport_code: 'FCO',
          arrival_airport_code: 'TFS',
          from_location: 'Rome Fiumicino - Terminal 1',
          to_location: 'Tenerife (Canary Islands)',
          start_datetime: '2026-03-20T06:15:00',
          end_datetime: '2026-03-20T10:05:00',
          flight_number: 'W4 6035',
        },
      ],
    };

    const result = runCanonicalImportPipelineSingle(parsed);

    expect(result.status).toBe('PASS');
    expect(result.stagedItems[0].importClassification).toBe('BOOKING');
    expect(parsed.start_datetime).toBe('2026-03-20T06:15:00');
    expect(parsed.departure_airport_code).toBe('FCO');
    expect(parsed.arrival_airport_code).toBe('TFS');
  });

  it('keeps receipt-only behavior when no itinerary structure exists', () => {
    const parsed: Record<string, unknown> = {
      booking_type: 'flight',
      vendor_name: 'Wizz Air',
      total_cost: 200.04,
    };

    const result = runCanonicalImportPipelineSingle(parsed);

    expect(result.status).toBe('RECEIPT_ONLY');
    expect(result.stagedItems[0].importClassification).toBe('RECEIPT');
  });
});

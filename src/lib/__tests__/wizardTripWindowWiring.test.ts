/**
 * v3.9.61: Wizard Trip Window Wiring Tests
 *
 * Proves that computeWizardTripWindow uses canonical dateRecognition
 * (toOrderingDate) to handle ALL date formats, not just ISO.
 * This is the "wiring test" — engine-level tests for dateRecognition
 * and tripFrame live in their own suites.
 */

import { describe, it, expect } from 'vitest';
import { computeWizardTripWindow } from '@/components/trips/CreateTripDialog';

// Minimal ParsedBooking-like shape needed by computeWizardTripWindow
function booking(start: string, end?: string) {
  return {
    booking_type: 'flight' as const,
    vendor_name: 'Test Airline',
    start_datetime: start,
    end_datetime: end,
  };
}

describe('computeWizardTripWindow (v3.9.61 wiring)', () => {
  // =========================================================================
  // 1) Batch with non-chronological confirmations
  // =========================================================================
  it('uses earliest/latest across all items regardless of array order', () => {
    const bookings = [
      booking('2026-03-20T14:00', '2026-03-20T18:00'),
      booking('2026-03-11T06:10', '2026-03-11T10:30'),
      booking('2026-03-27T09:10', '2026-03-27T13:00'),
    ];

    const result = computeWizardTripWindow(bookings);
    expect(result.startDate).toBe('2026-03-11');
    expect(result.endDate).toBe('2026-03-27');

    // Reverse order — same result
    const reversed = [...bookings].reverse();
    const result2 = computeWizardTripWindow(reversed);
    expect(result2.startDate).toBe('2026-03-11');
    expect(result2.endDate).toBe('2026-03-27');
  });

  // =========================================================================
  // 2) Rome → Tenerife multi-email scenario (EU carrier dates)
  // =========================================================================
  it('handles EU carrier date formats (Wizz Air / Ryanair)', () => {
    const bookings = [
      // Wizz Air outbound: Rome → Tenerife (EU named month format)
      booking('Thu, 11 Mar 2026 06:10 CET', '11 Mar 2026 09:45'),
      // Ryanair return: Tenerife → Rome (full month name)
      booking('Mon, 24 March 2026 21:45 CEST', '25 March 2026 01:15'),
      // Hotel in Tenerife (AI parser outputs ISO for hotels)
      booking('2026-03-11T15:00', '2026-03-24T11:00'),
    ];

    const result = computeWizardTripWindow(bookings);
    expect(result.startDate).toBe('2026-03-11');
    expect(result.endDate).toBe('2026-03-25'); // return flight lands Mar 25
  });

  it('order of EU-format confirmations does not affect result', () => {
    const bookings = [
      booking('Mon, 24 March 2026 21:45 CEST', '25 March 2026 01:15'),
      booking('2026-03-11T15:00', '2026-03-24T11:00'),
      booking('Thu, 11 Mar 2026 06:10 CET', '11 Mar 2026 09:45'),
    ];
    const result = computeWizardTripWindow(bookings);
    expect(result.startDate).toBe('2026-03-11');
    expect(result.endDate).toBe('2026-03-25');
  });

  // =========================================================================
  // 3) Mixed ISO + EU formats in one batch
  // =========================================================================
  it('handles mixed ISO and EU date formats', () => {
    const bookings = [
      booking('2026-03-26T12:45'),
      booking('03/27/2026 09:10 AM'),
      booking('Thu, 11 Mar 2026 06:10 CET'),
    ];
    const result = computeWizardTripWindow(bookings);
    expect(result.startDate).toBe('2026-03-11');
    expect(result.endDate).toBe('2026-03-27');
  });

  // =========================================================================
  // 4) Unrecognized date format — does not crash
  // =========================================================================
  it('skips unrecognized formats without crashing', () => {
    const bookings = [
      booking('2026-03-15T10:00', '2026-03-20T18:00'),
      booking('WEIRD_DATE_FORMAT_XYZ', 'ALSO_WEIRD'),
    ];
    const result = computeWizardTripWindow(bookings);
    expect(result.startDate).toBe('2026-03-15');
    expect(result.endDate).toBe('2026-03-20');
  });

  it('returns null dates when ALL formats are unrecognized', () => {
    const result = computeWizardTripWindow([booking('WEIRD_1', 'WEIRD_2')]);
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
  });

  // =========================================================================
  // 5) Empty bookings
  // =========================================================================
  it('returns null for empty bookings array', () => {
    const result = computeWizardTripWindow([]);
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
  });

  // =========================================================================
  // 6) Regression: pure function — no external state
  // =========================================================================
  it('computes window independently of any external state', () => {
    const bookings = [booking('2026-04-01T08:00', '2026-04-05T20:00')];
    const r1 = computeWizardTripWindow(bookings);
    const r2 = computeWizardTripWindow(bookings);
    expect(r1).toEqual(r2);
  });
});

/**
 * Tests for PNR-aware canonical expense sync (v5.0.0)
 *
 * Covers:
 * 1. Single PNR with 4 legs → 1 expense on earliest leg
 * 2. Two different PNRs same airline → 2 separate expenses
 * 3. No cost parsed → exactly 1 placeholder
 * 4. User-modified expense → never deleted/overwritten
 * 5. Re-import same PNR → no duplication
 * 6. Idempotency across multiple runs
 */

import { describe, it, expect } from 'vitest';
import {
  getCanonicalBookingPerPNR,
  selectCanonicalLeg,
  buildPNRKey,
  isUserModifiedExpense,
  isSafeToDeleteOrphan,
} from '../useBookingExpenseSync';
import { Booking, Expense } from '@/types/database';

// ── Helpers ───────────────────────────────────────────────────────────

const mockBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'b-1',
  trip_id: 'trip-1',
  booking_type: 'flight',
  vendor_name: 'Test Airline',
  start_datetime: '2026-03-15T10:00:00Z',
  total_cost: 500,
  my_share: 250,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const mockExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'e-1',
  trip_id: 'trip-1',
  date: '2026-03-15',
  category: 'transport',
  amount: 500,
  my_share: 250,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('buildPNRKey', () => {
  it('normalizes to uppercase and trims', () => {
    expect(buildPNRKey('trip-1', ' y7zbbd ')).toBe('trip-1::Y7ZBBD');
  });
});

describe('selectCanonicalLeg', () => {
  it('selects earliest by start_datetime string', () => {
    const legs = [
      mockBooking({ id: 'b-3', start_datetime: '2026-03-17T08:00:00Z' }),
      mockBooking({ id: 'b-1', start_datetime: '2026-03-15T10:00:00Z' }),
      mockBooking({ id: 'b-2', start_datetime: '2026-03-16T14:00:00Z' }),
    ];
    expect(selectCanonicalLeg(legs).id).toBe('b-1');
  });

  it('breaks ties with booking ID', () => {
    const legs = [
      mockBooking({ id: 'b-beta', start_datetime: '2026-03-15T10:00:00Z' }),
      mockBooking({ id: 'b-alpha', start_datetime: '2026-03-15T10:00:00Z' }),
    ];
    expect(selectCanonicalLeg(legs).id).toBe('b-alpha');
  });

  it('returns single booking unchanged', () => {
    const leg = mockBooking({ id: 'only' });
    expect(selectCanonicalLeg([leg]).id).toBe('only');
  });
});

describe('getCanonicalBookingPerPNR', () => {
  it('single PNR with 4 legs → 1 canonical booking', () => {
    const bookings = [
      mockBooking({ id: 'leg-1', confirmation_number: 'Y7ZBBD', start_datetime: '2026-03-15T10:00:00Z', total_cost: 924 }),
      mockBooking({ id: 'leg-2', confirmation_number: 'Y7ZBBD', start_datetime: '2026-03-16T14:00:00Z', total_cost: 0 }),
      mockBooking({ id: 'leg-3', confirmation_number: 'Y7ZBBD', start_datetime: '2026-03-20T08:00:00Z', total_cost: 0 }),
      mockBooking({ id: 'leg-4', confirmation_number: 'Y7ZBBD', start_datetime: '2026-03-21T12:00:00Z', total_cost: 0 }),
    ];

    const result = getCanonicalBookingPerPNR(bookings);

    // Only 1 canonical from this PNR group
    const pnrCanonicals = result.canonicalBookings.filter(b => b.booking_type === 'flight');
    expect(pnrCanonicals).toHaveLength(1);
    expect(pnrCanonicals[0].id).toBe('leg-1');
    expect(pnrCanonicals[0].total_cost).toBe(924);

    // Other 3 legs are non-canonical
    expect(result.nonCanonicalBookingIds.size).toBe(3);
    expect(result.nonCanonicalBookingIds.has('leg-2')).toBe(true);
    expect(result.nonCanonicalBookingIds.has('leg-3')).toBe(true);
    expect(result.nonCanonicalBookingIds.has('leg-4')).toBe(true);
  });

  it('hoists cost from non-canonical leg to canonical when canonical has no cost', () => {
    const bookings = [
      mockBooking({ id: 'leg-a', confirmation_number: 'ABC123', start_datetime: '2026-03-15T10:00:00Z', total_cost: 0 }),
      mockBooking({ id: 'leg-b', confirmation_number: 'ABC123', start_datetime: '2026-03-16T14:00:00Z', total_cost: 750 }),
    ];

    const result = getCanonicalBookingPerPNR(bookings);
    const canonical = result.canonicalBookings.find(b => b.id === 'leg-a');
    expect(canonical).toBeDefined();
    expect(canonical!.total_cost).toBe(750);
  });

  it('two different PNRs same airline → 2 separate canonical bookings', () => {
    const bookings = [
      mockBooking({ id: 'pnr1-leg1', confirmation_number: 'PNR111', airline: 'BA', start_datetime: '2026-03-15T10:00:00Z', total_cost: 500 }),
      mockBooking({ id: 'pnr1-leg2', confirmation_number: 'PNR111', airline: 'BA', start_datetime: '2026-03-16T10:00:00Z', total_cost: 0 }),
      mockBooking({ id: 'pnr2-leg1', confirmation_number: 'PNR222', airline: 'BA', start_datetime: '2026-03-20T10:00:00Z', total_cost: 300 }),
    ];

    const result = getCanonicalBookingPerPNR(bookings);
    const flights = result.canonicalBookings.filter(b => b.booking_type === 'flight');
    expect(flights).toHaveLength(2);
    expect(flights.map(f => f.id).sort()).toEqual(['pnr1-leg1', 'pnr2-leg1']);
  });

  it('no cost parsed → canonical still created with 0 cost', () => {
    const bookings = [
      mockBooking({ id: 'nc-1', confirmation_number: 'NOCOST', start_datetime: '2026-03-15T10:00:00Z', total_cost: 0 }),
      mockBooking({ id: 'nc-2', confirmation_number: 'NOCOST', start_datetime: '2026-03-16T10:00:00Z', total_cost: 0 }),
    ];

    const result = getCanonicalBookingPerPNR(bookings);
    const flights = result.canonicalBookings.filter(b => b.booking_type === 'flight');
    expect(flights).toHaveLength(1);
    expect(flights[0].id).toBe('nc-1');
    expect(flights[0].total_cost).toBe(0);
  });

  it('non-flight bookings pass through unchanged', () => {
    const bookings = [
      mockBooking({ id: 'stay-1', booking_type: 'stay', confirmation_number: 'HOTEL1', total_cost: 200 }),
      mockBooking({ id: 'car-1', booking_type: 'car_rental', confirmation_number: 'CAR1', total_cost: 100 }),
    ];

    const result = getCanonicalBookingPerPNR(bookings);
    expect(result.canonicalBookings).toHaveLength(2);
    expect(result.nonCanonicalBookingIds.size).toBe(0);
  });

  it('flights without confirmation_number are ungrouped (each gets own expense)', () => {
    const bookings = [
      mockBooking({ id: 'no-conf-1', confirmation_number: undefined, total_cost: 100 }),
      mockBooking({ id: 'no-conf-2', confirmation_number: '', total_cost: 200 }),
      mockBooking({ id: 'no-conf-3', confirmation_number: 'AB', total_cost: 50 }), // too short
    ];

    const result = getCanonicalBookingPerPNR(bookings);
    expect(result.canonicalBookings).toHaveLength(3);
    expect(result.nonCanonicalBookingIds.size).toBe(0);
  });

  it('canonical selection is stable across reloads (deterministic)', () => {
    const bookings = [
      mockBooking({ id: 'leg-z', confirmation_number: 'STABLE', start_datetime: '2026-03-15T10:00:00Z' }),
      mockBooking({ id: 'leg-a', confirmation_number: 'STABLE', start_datetime: '2026-03-15T10:00:00Z' }),
      mockBooking({ id: 'leg-m', confirmation_number: 'STABLE', start_datetime: '2026-03-15T10:00:00Z' }),
    ];

    // Run multiple times — same result every time
    for (let i = 0; i < 5; i++) {
      const result = getCanonicalBookingPerPNR(bookings);
      const flights = result.canonicalBookings.filter(b => b.booking_type === 'flight');
      expect(flights).toHaveLength(1);
      expect(flights[0].id).toBe('leg-a'); // lexicographically earliest ID
    }
  });
});

describe('isUserModifiedExpense', () => {
  it('auto-generated with only markers → NOT user-modified', () => {
    const expense = mockExpense({ notes: '[linked_booking:b-1]' });
    expect(isUserModifiedExpense(expense)).toBe(false);
  });

  it('auto-generated with needs_pricing → NOT user-modified', () => {
    const expense = mockExpense({ notes: '[linked_booking:b-1] [needs_pricing]' });
    expect(isUserModifiedExpense(expense)).toBe(false);
  });

  it('auto-generated with user notes → IS user-modified', () => {
    const expense = mockExpense({ notes: '[linked_booking:b-1] My custom note' });
    expect(isUserModifiedExpense(expense)).toBe(true);
  });

  it('no booking marker → IS user-modified (user-created)', () => {
    const expense = mockExpense({ notes: 'Manual expense' });
    expect(isUserModifiedExpense(expense)).toBe(true);
  });

  it('auto-generated with receipt → IS user-modified', () => {
    const expense = mockExpense({ notes: '[linked_booking:b-1]', receipt_url: 'https://...' });
    expect(isUserModifiedExpense(expense)).toBe(true);
  });

  it('auto-generated with converted_amount → IS user-modified', () => {
    const expense = mockExpense({ notes: '[linked_booking:b-1]', converted_amount: 49 });
    expect(isUserModifiedExpense(expense)).toBe(true);
  });

  it('auto-generated with expense_purpose → IS user-modified', () => {
    const expense = mockExpense({ notes: '[linked_booking:b-1]', expense_purpose: 'business' });
    expect(isUserModifiedExpense(expense)).toBe(true);
  });
});

describe('isSafeToDeleteOrphan', () => {
  const nonCanonicalIds = new Set(['orphan-b1', 'orphan-b2']);

  it('orphan auto-generated expense → safe to delete', () => {
    const expense = mockExpense({ notes: '[linked_booking:orphan-b1]' });
    expect(isSafeToDeleteOrphan(expense, nonCanonicalIds)).toBe(true);
  });

  it('canonical booking expense → NOT safe to delete', () => {
    const expense = mockExpense({ notes: '[linked_booking:canonical-b1]' });
    expect(isSafeToDeleteOrphan(expense, nonCanonicalIds)).toBe(false);
  });

  it('user-modified orphan → NOT safe to delete', () => {
    const expense = mockExpense({ notes: '[linked_booking:orphan-b1] User note', });
    expect(isSafeToDeleteOrphan(expense, nonCanonicalIds)).toBe(false);
  });

  it('no booking marker → NOT safe to delete', () => {
    const expense = mockExpense({ notes: 'Manual expense' });
    expect(isSafeToDeleteOrphan(expense, nonCanonicalIds)).toBe(false);
  });
});

describe('trip load idempotency', () => {
  it('running getCanonicalBookingPerPNR multiple times produces same result', () => {
    const bookings = [
      mockBooking({ id: 'b1', confirmation_number: 'PNR1', start_datetime: '2026-03-15T10:00:00Z', total_cost: 500 }),
      mockBooking({ id: 'b2', confirmation_number: 'PNR1', start_datetime: '2026-03-16T14:00:00Z', total_cost: 0 }),
      mockBooking({ id: 'b3', confirmation_number: 'PNR2', start_datetime: '2026-03-20T08:00:00Z', total_cost: 300 }),
      mockBooking({ id: 'b4', booking_type: 'stay', total_cost: 200 }),
    ];

    const run1 = getCanonicalBookingPerPNR(bookings);
    const run2 = getCanonicalBookingPerPNR(bookings);
    const run3 = getCanonicalBookingPerPNR(bookings);

    // Same canonical bookings
    const ids1 = run1.canonicalBookings.map(b => b.id).sort();
    const ids2 = run2.canonicalBookings.map(b => b.id).sort();
    const ids3 = run3.canonicalBookings.map(b => b.id).sort();
    expect(ids1).toEqual(ids2);
    expect(ids2).toEqual(ids3);

    // Same non-canonical IDs
    expect([...run1.nonCanonicalBookingIds].sort()).toEqual([...run2.nonCanonicalBookingIds].sort());
    expect([...run2.nonCanonicalBookingIds].sort()).toEqual([...run3.nonCanonicalBookingIds].sort());
  });
});

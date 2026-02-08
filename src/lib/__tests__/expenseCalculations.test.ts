 /**
  * v2.2.0: Expense calculation tests
  * Tests for the centralized expense math utilities
  */
 
 import { describe, it, expect } from 'vitest';
 import {
   getExpenseMyShare,
   getBookingMyShare,
   getParkingMyShare,
   calculateTripCostSummary,
   isBookingLinkedExpense,
   getOutOfPocketExpenses,
   calculateExpensePurposeBreakdown,
 } from '../expenseCalculations';
 import { Expense, Booking, Parking } from '@/types/database';
 
 // Helper to create mock expense
 const mockExpense = (overrides: Partial<Expense> = {}): Expense => ({
   id: 'exp-1',
   trip_id: 'trip-1',
   date: '2026-01-15',
   category: 'meals',
   amount: 100,
   my_share: 50,
   created_at: '2026-01-01T00:00:00Z',
   updated_at: '2026-01-01T00:00:00Z',
   ...overrides,
 });
 
 // Helper to create mock booking
 const mockBooking = (overrides: Partial<Booking> = {}): Booking => ({
   id: 'book-1',
   trip_id: 'trip-1',
   booking_type: 'flight',
   vendor_name: 'Test Airline',
   start_datetime: '2026-01-15T10:00:00Z',
   total_cost: 500,
   my_share: 250,
   created_at: '2026-01-01T00:00:00Z',
   updated_at: '2026-01-01T00:00:00Z',
   ...overrides,
 });
 
 // Helper to create mock parking
 const mockParking = (overrides: Partial<Parking> = {}): Parking => ({
   id: 'park-1',
   trip_id: 'trip-1',
   parking_type: 'airport',
   label: 'Test Parking',
   start_datetime: '2026-01-15T08:00:00Z',
   billing_type: 'daily',
   total_cost: 100,
   my_share: 50,
   created_at: '2026-01-01T00:00:00Z',
   updated_at: '2026-01-01T00:00:00Z',
   ...overrides,
 });
 
 describe('getExpenseMyShare', () => {
   it('returns my_share when defined', () => {
     const expense = mockExpense({ amount: 100, my_share: 50 });
     expect(getExpenseMyShare(expense)).toBe(50);
   });
 
   it('returns full amount when my_share is null', () => {
     const expense = mockExpense({ amount: 100, my_share: null as unknown as number });
     expect(getExpenseMyShare(expense)).toBe(100);
   });
 
   it('returns full amount when my_share is undefined', () => {
     const expense = mockExpense({ amount: 100 });
     delete (expense as unknown as Record<string, unknown>).my_share;
     expect(getExpenseMyShare(expense)).toBe(100);
   });
 
   it('handles zero my_share correctly', () => {
     const expense = mockExpense({ amount: 100, my_share: 0 });
     expect(getExpenseMyShare(expense)).toBe(0);
   });
 });
 
 describe('getBookingMyShare', () => {
   it('returns my_share when defined', () => {
     const booking = mockBooking({ total_cost: 500, my_share: 250 });
     expect(getBookingMyShare(booking)).toBe(250);
   });
 
   it('returns total_cost when my_share is null', () => {
     const booking = mockBooking({ total_cost: 500, my_share: null as unknown as number });
     expect(getBookingMyShare(booking)).toBe(500);
   });
 });
 
 describe('getParkingMyShare', () => {
   it('returns my_share when defined', () => {
     const parking = mockParking({ total_cost: 100, my_share: 50 });
     expect(getParkingMyShare(parking)).toBe(50);
   });
 
   it('returns total_cost when my_share is null', () => {
     const parking = mockParking({ total_cost: 100, my_share: null as unknown as number });
     expect(getParkingMyShare(parking)).toBe(100);
   });
 });
 
 describe('isBookingLinkedExpense', () => {
   it('returns true for expense with booking link marker', () => {
     const expense = mockExpense({ notes: '[linked_booking:abc-123]' });
     expect(isBookingLinkedExpense(expense)).toBe(true);
   });
 
   it('returns false for expense without booking link marker', () => {
     const expense = mockExpense({ notes: 'Just a regular note' });
     expect(isBookingLinkedExpense(expense)).toBe(false);
   });
 
   it('returns false for expense with null notes', () => {
     const expense = mockExpense({ notes: null as unknown as string });
     expect(isBookingLinkedExpense(expense)).toBe(false);
   });
 });
 
 describe('getOutOfPocketExpenses', () => {
   it('filters out booking-linked expenses', () => {
     const expenses = [
       mockExpense({ id: 'exp-1', notes: '[linked_booking:book-1]' }),
       mockExpense({ id: 'exp-2', notes: 'Manual expense' }),
       mockExpense({ id: 'exp-3', notes: null as unknown as string }),
     ];
     const outOfPocket = getOutOfPocketExpenses(expenses);
     expect(outOfPocket).toHaveLength(2);
     expect(outOfPocket.map(e => e.id)).toEqual(['exp-2', 'exp-3']);
   });
 });
 
 describe('calculateTripCostSummary', () => {
   it('calculates totals correctly with no data', () => {
     const summary = calculateTripCostSummary([], [], []);
     expect(summary.totalCost).toBe(0);
     expect(summary.totalMyShare).toBe(0);
     expect(summary.bookingsTotal).toBe(0);
     expect(summary.expensesTotal).toBe(0);
     expect(summary.parkingTotal).toBe(0);
   });
 
  it('calculates booking totals correctly', () => {
    const bookings = [
      mockBooking({ total_cost: 500, my_share: 250 }),
      mockBooking({ id: 'book-2', total_cost: 300, my_share: 300 }),
    ];
    const summary = calculateTripCostSummary([], bookings, []);
    expect(summary.bookingsTotal).toBe(800);
    expect(summary.bookingsMyShare).toBe(550);
  });

  it('normalizes duplicated flight costs (Frontier-style: same total on each leg)', () => {
    // v2.1.19 Cost Integrity: When the same confirmation has the same cost on each leg,
    // we count it only ONCE (this is the legacy duplication pattern)
    const bookings = [
      mockBooking({
        id: 'book-1',
        booking_type: 'flight',
        confirmation_number: 'ABC123',
        airline: 'Frontier',
        total_cost: 350,
        my_share: 350,
        start_datetime: '2026-01-15T10:00:00Z', // Outbound
      }),
      mockBooking({
        id: 'book-2',
        booking_type: 'flight',
        confirmation_number: 'ABC123',
        airline: 'Frontier',
        total_cost: 350, // Same cost = duplication pattern
        my_share: 350,
        start_datetime: '2026-01-20T15:00:00Z', // Return
      }),
    ];
    const summary = calculateTripCostSummary([], bookings, []);
    // Should be $350, not $700
    expect(summary.bookingsTotal).toBe(350);
    expect(summary.bookingsMyShare).toBe(350);
  });

  it('sums different per-leg costs correctly (not duplicated)', () => {
    // v2.1.19 Cost Integrity: When legs have DIFFERENT costs, sum them normally
    const bookings = [
      mockBooking({
        id: 'book-1',
        booking_type: 'flight',
        confirmation_number: 'ABC123',
        airline: 'Delta',
        total_cost: 200,
        my_share: 200,
        start_datetime: '2026-01-15T10:00:00Z',
      }),
      mockBooking({
        id: 'book-2',
        booking_type: 'flight',
        confirmation_number: 'ABC123',
        airline: 'Delta',
        total_cost: 150, // Different cost = not duplication
        my_share: 150,
        start_datetime: '2026-01-20T15:00:00Z',
      }),
    ];
    const summary = calculateTripCostSummary([], bookings, []);
    // Should sum: $200 + $150 = $350
    expect(summary.bookingsTotal).toBe(350);
    expect(summary.bookingsMyShare).toBe(350);
  });

  it('handles single booking flight correctly (no normalization needed)', () => {
    // v2.1.19: Single booking = use as-is
    const bookings = [
      mockBooking({
        id: 'book-1',
        booking_type: 'flight',
        confirmation_number: 'XYZ789',
        airline: 'United',
        total_cost: 450,
        my_share: 225,
      }),
    ];
    const summary = calculateTripCostSummary([], bookings, []);
    expect(summary.bookingsTotal).toBe(450);
    expect(summary.bookingsMyShare).toBe(225);
  });

  it('excludes booking-linked expenses from expense totals', () => {
    const expenses = [
      mockExpense({ amount: 100, my_share: 50, notes: '[linked_booking:book-1]' }),
      mockExpense({ id: 'exp-2', amount: 75, my_share: 75, notes: 'Dinner' }),
    ];
    const summary = calculateTripCostSummary(expenses, [], []);
    // Only the dinner expense should be counted
    expect(summary.expensesTotal).toBe(75);
    expect(summary.expensesMyShare).toBe(75);
  });

  it('parking is tracked separately and not included in totalCost', () => {
    const parkingList = [mockParking({ total_cost: 100, my_share: 50 })];
    const summary = calculateTripCostSummary([], [], parkingList);
    expect(summary.parkingTotal).toBe(100);
    expect(summary.parkingMyShare).toBe(50);
    expect(summary.totalCost).toBe(0); // Parking not in total
  });

  it('calculates category breakdown correctly', () => {
    const expenses = [
      mockExpense({ category: 'meals', amount: 100 }),
      mockExpense({ id: 'exp-2', category: 'meals', amount: 50 }),
      mockExpense({ id: 'exp-3', category: 'transport', amount: 75 }),
      mockExpense({ id: 'exp-4', category: 'shopping', amount: 200 }),
    ];
    const summary = calculateTripCostSummary(expenses, [], []);
    expect(summary.byCategory.meals).toBe(150);
    expect(summary.byCategory.transport).toBe(75);
    expect(summary.byCategory.shopping).toBe(200);
    expect(summary.byCategory.activity).toBe(0);
  });

  it('handles missing total_cost as zero (no guessing)', () => {
    // v2.1.19: Never fill fields when data is missing
    const bookings = [
      mockBooking({
        id: 'book-1',
        booking_type: 'flight',
        total_cost: null as unknown as number,
        my_share: null as unknown as number,
      }),
    ];
    const summary = calculateTripCostSummary([], bookings, []);
    expect(summary.bookingsTotal).toBe(0);
    expect(summary.bookingsMyShare).toBe(0);
  });
 });
 
 describe('calculateExpensePurposeBreakdown', () => {
   it('categorizes expenses by business/personal purpose', () => {
     const expenses = [
       mockExpense({ amount: 100, my_share: 100, expense_purpose: 'business' }),
       mockExpense({ id: 'exp-2', amount: 50, my_share: 50, expense_purpose: 'personal' }),
       mockExpense({ id: 'exp-3', amount: 75, my_share: 75 }), // unassigned
     ];
     const breakdown = calculateExpensePurposeBreakdown(expenses);
     expect(breakdown.businessTotal).toBe(100);
     expect(breakdown.businessMyShare).toBe(100);
     expect(breakdown.personalTotal).toBe(50);
     expect(breakdown.personalMyShare).toBe(50);
     expect(breakdown.unassignedTotal).toBe(75);
     expect(breakdown.unassignedMyShare).toBe(75);
   });
 
   it('excludes booking-linked expenses', () => {
     const expenses = [
       mockExpense({ amount: 100, expense_purpose: 'business', notes: '[linked_booking:book-1]' }),
       mockExpense({ id: 'exp-2', amount: 50, expense_purpose: 'business', notes: 'Client dinner' }),
     ];
     const breakdown = calculateExpensePurposeBreakdown(expenses);
     expect(breakdown.businessTotal).toBe(50); // Only manual expense counted
   });
 });
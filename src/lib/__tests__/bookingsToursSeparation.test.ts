/**
 * Bookings vs Tours Separation Tests
 * 
 * v2.1.28: Performance hardening patch
 * 
 * CRITICAL INVARIANT:
 * - Bookings = monetary records (flights, stays, rentals, activities)
 * - Tours = non-monetary stops (work locations, meetings)
 * - Cost calculations NEVER include Tours
 * 
 * These tests validate that the separation is maintained.
 */

import { describe, it, expect } from 'vitest';
import { 
  calculateTripCostSummary, 
  normalizeFlightBookingCosts,
} from '@/lib/expenseCalculations';
import type { Booking, Expense, Parking } from '@/types/database';

// Mock booking data
const createMockBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-1',
  trip_id: 'trip-1',
  vendor_name: 'Test Vendor',
  booking_type: 'flight',
  start_datetime: '2026-02-10T10:00:00',
  end_datetime: null,
  confirmation_number: 'ABC123',
  total_cost: 500,
  my_share: 500,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
  // Optional fields
  address: null,
  airline: null,
  arrival_airport_code: null,
  arrival_airport_name: null,
  booking_pattern: null,
  booking_url: null,
  departure_airport_code: null,
  departure_airport_name: null,
  frequent_flyer_number: null,
  from_location: null,
  link_url: null,
  location_summary: null,
  notes: null,
  operator: null,
  passenger_name: null,
  pickup_location: null,
  property_name: null,
  rental_company: null,
  return_location: null,
  stay_type: null,
  ticket_required: null,
  tickets_purchased: null,
  to_location: null,
  transport_mode: null,
  tsa_precheck_number: null,
  activity_source: null,
  advance_recommended: null,
  ...overrides,
});

const createMockExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'expense-1',
  trip_id: 'trip-1',
  date: '2026-02-10',
  category: 'meals',
  amount: 50,
  my_share: 50,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
  description: null,
  notes: null,
  receipt_url: null,
  sub_category: null,
  expense_purpose: null,
  engagement_id: null,
  ...overrides,
});

const createMockParking = (overrides: Partial<Parking> = {}): Parking => ({
  id: 'parking-1',
  trip_id: 'trip-1',
  label: 'Airport Parking',
  parking_type: 'airport',
  billing_type: 'daily',
  start_datetime: '2026-02-10T06:00:00',
  end_datetime: '2026-02-15T18:00:00',
  total_cost: 100,
  my_share: 100,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
  address: null,
  level_section_space: null,
  ...overrides,
});

describe('Bookings vs Tours Separation - Cost Calculations', () => {
  it('calculateTripCostSummary uses only bookings, expenses, and parking', () => {
    const bookings = [createMockBooking({ total_cost: 500, my_share: 500 })];
    const expenses = [createMockExpense({ amount: 50, my_share: 50 })];
    const parkingList = [createMockParking({ total_cost: 100, my_share: 100 })];

    // Note: function signature is (expenses, bookings, parkingList)
    const summary = calculateTripCostSummary(expenses, bookings, parkingList);

    // Total = bookings + expenses (parking tracked separately per architecture docs)
    expect(summary.totalCost).toBe(550); // 500 + 50 (parking is separate)
    expect(summary.totalMyShare).toBe(550);
    expect(summary.bookingsTotal).toBe(500);
    expect(summary.expensesTotal).toBe(50);
    expect(summary.parkingTotal).toBe(100); // Tracked separately
  });

  it('calculates correct totals with multiple bookings', () => {
    const bookings = [
      createMockBooking({ id: '1', total_cost: 300, my_share: 300 }),
      createMockBooking({ id: '2', total_cost: 200, my_share: 150, booking_type: 'stay' }),
    ];
    const expenses: Expense[] = [];
    const parkingList: Parking[] = [];

    const summary = calculateTripCostSummary(expenses, bookings, parkingList);

    expect(summary.bookingsTotal).toBe(500);
    expect(summary.bookingsMyShare).toBe(450);
    expect(summary.totalCost).toBe(500);
    expect(summary.totalMyShare).toBe(450);
  });

  it('handles empty arrays gracefully', () => {
    const summary = calculateTripCostSummary([], [], []);

    expect(summary.totalCost).toBe(0);
    expect(summary.totalMyShare).toBe(0);
    expect(summary.bookingsTotal).toBe(0);
    expect(summary.expensesTotal).toBe(0);
    expect(summary.parkingTotal).toBe(0);
  });
});

describe('Bookings vs Tours Separation - Flight Cost Normalization', () => {
  it('normalizes Frontier-style single total across legs', () => {
    // Frontier-style: One total for entire booking, multiple legs share confirmation
    const bookings = [
      createMockBooking({ 
        id: 'leg-1', 
        confirmation_number: 'FTR123',
        total_cost: 400, // Full fare on first leg
        my_share: 400,
        start_datetime: '2026-02-10T08:00:00',
      }),
      createMockBooking({ 
        id: 'leg-2', 
        confirmation_number: 'FTR123', // Same confirmation
        total_cost: 0, // No cost on subsequent leg
        my_share: 0,
        start_datetime: '2026-02-10T14:00:00',
      }),
    ];

    const result = normalizeFlightBookingCosts(bookings);

    // perBookingCost is Record<string, number>, not Map
    expect(result.perBookingCost['leg-1']).toBe(400);
    expect(result.perBookingCost['leg-2']).toBe(0);
    expect(result.perBookingMyShare['leg-1']).toBe(400);
    expect(result.perBookingMyShare['leg-2']).toBe(0);
  });

  it('handles per-leg pricing correctly', () => {
    // Each leg has its own cost
    const bookings = [
      createMockBooking({ 
        id: 'leg-1', 
        confirmation_number: 'ABC123',
        total_cost: 200,
        my_share: 200,
      }),
      createMockBooking({ 
        id: 'leg-2', 
        confirmation_number: 'DEF456', // Different confirmation
        total_cost: 250,
        my_share: 250,
      }),
    ];

    const result = normalizeFlightBookingCosts(bookings);

    expect(result.perBookingCost['leg-1']).toBe(200);
    expect(result.perBookingCost['leg-2']).toBe(250);
  });

  it('does not affect non-flight bookings', () => {
    const bookings = [
      createMockBooking({ 
        id: 'stay-1', 
        booking_type: 'stay',
        total_cost: 300,
        my_share: 300,
      }),
      createMockBooking({ 
        id: 'rental-1', 
        booking_type: 'car_rental',
        total_cost: 150,
        my_share: 150,
      }),
    ];

    const result = normalizeFlightBookingCosts(bookings);

    // Non-flights should pass through unchanged
    expect(result.perBookingCost['stay-1']).toBe(300);
    expect(result.perBookingCost['rental-1']).toBe(150);
  });
});

describe('Bookings vs Tours Separation - Type Safety', () => {
  it('calculateTripCostSummary processes all three entity types', () => {
    // Test that all three parameters are used correctly
    const bookings: Booking[] = [createMockBooking({ total_cost: 100 })];
    const expenses: Expense[] = [createMockExpense({ amount: 50 })];
    const parkingList: Parking[] = [createMockParking({ total_cost: 25 })];
    
    // Note: function signature is (expenses, bookings, parkingList)
    const summary = calculateTripCostSummary(expenses, bookings, parkingList);
    
    // All three should contribute to totals
    expect(summary.bookingsTotal).toBeGreaterThan(0);
    expect(summary.expensesTotal).toBeGreaterThan(0);
    expect(summary.parkingTotal).toBeGreaterThan(0);
  });
});

/**
 * Centralized expense calculation utilities
 * Single source of truth for all expense math
 */

import { Expense, Booking, Parking } from '@/types/database';

/**
 * Calculate My Share for a single expense
 * If my_share is defined, use it; otherwise fallback to full amount
 */
export function getExpenseMyShare(expense: Expense): number {
  const amount = Number(expense.amount || 0);
  const myShare = expense.my_share !== undefined && expense.my_share !== null
    ? Number(expense.my_share)
    : amount;
  return myShare;
}

/**
 * Calculate My Share for a single booking
 * If my_share is defined, use it; otherwise fallback to total_cost
 */
export function getBookingMyShare(booking: Booking): number {
  const totalCost = Number(booking.total_cost || 0);
  const myShare = booking.my_share !== undefined && booking.my_share !== null
    ? Number(booking.my_share)
    : totalCost;
  return myShare;
}

/**
 * Calculate My Share for a single parking entry
 * If my_share is defined, use it; otherwise fallback to total_cost
 */
export function getParkingMyShare(parking: Parking): number {
  const totalCost = Number(parking.total_cost || 0);
  const myShare = parking.my_share !== undefined && parking.my_share !== null
    ? Number(parking.my_share)
    : totalCost;
  return myShare;
}

export interface ExpenseTotals {
  totalAmount: number;
  totalMyShare: number;
}

export interface CategorySummary {
  meals: number;
  transport: number;
  activity: number;
  shopping: number;
  parking: number;
  other: number;
}

export interface TripCostSummary {
  // Expenses
  expensesTotal: number;
  expensesMyShare: number;
  // Bookings
  bookingsTotal: number;
  bookingsMyShare: number;
  // Parking
  parkingTotal: number;
  parkingMyShare: number;
  // Combined
  totalCost: number;
  totalMyShare: number;
  // Category breakdown for expenses only
  byCategory: CategorySummary;
}

/**
 * Calculate totals for a list of expenses
 */
export function calculateExpenseTotals(expenses: Expense[]): ExpenseTotals {
  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalMyShare = expenses.reduce((sum, e) => sum + getExpenseMyShare(e), 0);
  
  return { totalAmount, totalMyShare };
}

/**
 * Calculate category breakdown for expenses
 */
export function calculateCategorySummary(expenses: Expense[]): CategorySummary {
  return expenses.reduce((acc, e) => {
    const category = e.category as keyof CategorySummary;
    if (category in acc) {
      acc[category] += Number(e.amount || 0);
    }
    return acc;
  }, {
    meals: 0,
    transport: 0,
    activity: 0,
    shopping: 0,
    parking: 0,
    other: 0,
  } as CategorySummary);
}

/**
 * Calculate complete trip cost summary from all sources
 */
export function calculateTripCostSummary(
  expenses: Expense[],
  bookings: Booking[],
  parkingList: Parking[]
): TripCostSummary {
  // Expenses
  const expensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const expensesMyShare = expenses.reduce((sum, e) => sum + getExpenseMyShare(e), 0);
  
  // Bookings
  const bookingsTotal = bookings.reduce((sum, b) => sum + Number(b.total_cost || 0), 0);
  const bookingsMyShare = bookings.reduce((sum, b) => sum + getBookingMyShare(b), 0);
  
  // Parking
  const parkingTotal = parkingList.reduce((sum, p) => sum + Number(p.total_cost || 0), 0);
  const parkingMyShare = parkingList.reduce((sum, p) => sum + getParkingMyShare(p), 0);
  
  // Combined totals
  const totalCost = expensesTotal + bookingsTotal + parkingTotal;
  const totalMyShare = expensesMyShare + bookingsMyShare + parkingMyShare;
  
  // Category breakdown
  const byCategory = calculateCategorySummary(expenses);
  
  return {
    expensesTotal,
    expensesMyShare,
    bookingsTotal,
    bookingsMyShare,
    parkingTotal,
    parkingMyShare,
    totalCost,
    totalMyShare,
    byCategory,
  };
}

/**
 * Debug logging for expense aggregation
 * Call this after calculating totals to verify math
 */
export function logExpenseDebug(
  tripId: string,
  expenses: Expense[],
  summary: TripCostSummary
): void {
  // Only log in development
  if (process.env.NODE_ENV === 'production') return;

  console.group('ExpensesDebug');
  console.log(`tripId=${tripId}`);
  console.log(`expenseCount=${expenses.length}`);
  console.log(`totalExpenses=${summary.expensesTotal.toFixed(2)}`);
  console.log(`myShare=${summary.expensesMyShare.toFixed(2)}`);
  console.groupEnd();

  console.group('ExpensesDebugByCategory');
  console.log(`Meals=${summary.byCategory.meals.toFixed(2)}`);
  console.log(`Transport=${summary.byCategory.transport.toFixed(2)}`);
  console.log(`Activity=${summary.byCategory.activity.toFixed(2)}`);
  console.log(`Shopping=${summary.byCategory.shopping.toFixed(2)}`);
  console.log(`Parking=${summary.byCategory.parking.toFixed(2)}`);
  console.log(`Other=${summary.byCategory.other.toFixed(2)}`);
  console.groupEnd();

  console.group('TripCostDebug');
  console.log(`tripId=${tripId}`);
  console.log(`bookingsTotal=${summary.bookingsTotal.toFixed(2)}`);
  console.log(`bookingsMyShare=${summary.bookingsMyShare.toFixed(2)}`);
  console.log(`parkingTotal=${summary.parkingTotal.toFixed(2)}`);
  console.log(`parkingMyShare=${summary.parkingMyShare.toFixed(2)}`);
  console.log(`grandTotal=${summary.totalCost.toFixed(2)}`);
  console.log(`totalMyShare=${summary.totalMyShare.toFixed(2)}`);
  console.groupEnd();
}

/**
 * Group expenses by booking-related subcategories
 */
export interface BookingExpenseGroup {
  flights: number;
  lodging: number;
  rentalCars: number;
  parking: number;
}

export function groupExpensesByBookingType(expenses: Expense[]): BookingExpenseGroup {
  return expenses.reduce((acc, e) => {
    // Transport subcategories that map to booking types
    if (e.category === 'transport') {
      if (e.sub_category === 'rental_car') {
        acc.rentalCars += Number(e.amount || 0);
      }
    }
    // Parking category
    if (e.category === 'parking') {
      acc.parking += Number(e.amount || 0);
    }
    return acc;
  }, {
    flights: 0,
    lodging: 0,
    rentalCars: 0,
    parking: 0,
  } as BookingExpenseGroup);
}

/**
 * Centralized expense calculation utilities
 * Single source of truth for all expense math
 * 
 * v2.1.9 - Airfare Cost Duplication Fix:
 * - Booking costs are ALWAYS calculated at the booking level, not segment level
 * - For flights: One booking = one cost, regardless of number of legs
 * - Booking-linked expenses are excluded from expenses total to avoid double counting
 * - The getBookingMyShare() function is the ONLY path to calculate booking costs
 */

import { Expense, Booking, Parking } from '@/types/database';
import { extractBookingIdFromNotes } from './bookingExpenseSync';

/**
 * Check if an expense is linked to a booking (auto-generated from booking sync)
 * These should NOT be counted in expenses total to avoid double counting with bookings
 */
export function isBookingLinkedExpense(expense: Expense): boolean {
  return extractBookingIdFromNotes(expense.notes) !== null;
}

/**
 * Filter expenses to only include true out-of-pocket expenses (not booking-linked)
 */
export function getOutOfPocketExpenses(expenses: Expense[]): Expense[] {
  return expenses.filter(e => !isBookingLinkedExpense(e));
}

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
 * 
 * CRITICAL (v2.1.9): This function is the ONLY correct way to get booking cost.
 * Do NOT access booking.total_cost directly for summation purposes.
 * This ensures costs are calculated at booking-level (not segment-level).
 */
export function getBookingMyShare(booking: Booking): number {
  const totalCost = Number(booking.total_cost || 0);
  
  // Guard against invalid values
  if (!Number.isFinite(totalCost) || totalCost < 0) {
    return 0;
  }
  
  const myShare = booking.my_share !== undefined && booking.my_share !== null
    ? Number(booking.my_share)
    : totalCost;
    
  // Guard the my_share value as well
  if (!Number.isFinite(myShare) || myShare < 0) {
    return totalCost;
  }
  
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

export interface ExpensePurposeBreakdown {
  businessTotal: number;
  businessMyShare: number;
  personalTotal: number;
  personalMyShare: number;
  unassignedTotal: number;
  unassignedMyShare: number;
}

/**
 * Calculate Business vs Personal expense breakdown for mixed trips
 * Only considers out-of-pocket expenses (excludes booking-linked expenses)
 * 
 * v2.1.3: Added for mixed trip expense categorization
 */
export function calculateExpensePurposeBreakdown(expenses: Expense[]): ExpensePurposeBreakdown {
  // Filter to only out-of-pocket expenses (exclude booking-linked to prevent double counting)
  const outOfPocketExpenses = getOutOfPocketExpenses(expenses);
  
  const breakdown: ExpensePurposeBreakdown = {
    businessTotal: 0,
    businessMyShare: 0,
    personalTotal: 0,
    personalMyShare: 0,
    unassignedTotal: 0,
    unassignedMyShare: 0,
  };
  
  for (const expense of outOfPocketExpenses) {
    const amount = Number(expense.amount || 0);
    const myShare = getExpenseMyShare(expense);
    
    switch (expense.expense_purpose) {
      case 'business':
        breakdown.businessTotal += amount;
        breakdown.businessMyShare += myShare;
        break;
      case 'personal':
        breakdown.personalTotal += amount;
        breakdown.personalMyShare += myShare;
        break;
      default:
        breakdown.unassignedTotal += amount;
        breakdown.unassignedMyShare += myShare;
        break;
    }
  }
  
  return breakdown;
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
  // Expenses (out-of-pocket only, excluding booking-linked)
  expensesTotal: number;
  expensesMyShare: number;
  // Bookings
  bookingsTotal: number;
  bookingsMyShare: number;
  // Parking (tracked separately, NOT included in totalCost)
  parkingTotal: number;
  parkingMyShare: number;
  // Combined (bookings + out-of-pocket expenses only, NO parking)
  totalCost: number;
  totalMyShare: number;
  // Category breakdown for out-of-pocket expenses only
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
 * 
 * IMPORTANT (v2.1.9 - Airfare Duplication Prevention):
 * - This function filters out booking-linked expenses to prevent double counting.
 * - Booking costs are calculated using getBookingMyShare() which returns booking-level totals.
 * - For flights: Each booking record = one airfare cost (not per-leg/segment).
 * - We NEVER sum segment-level costs - only booking-level.
 * 
 * Structure:
 * - Bookings total: Sum of all booking costs (flights, stays, rentals, activities)
 * - Expenses total: Sum of out-of-pocket expenses ONLY (excludes booking-linked expenses)
 * - Parking total: Tracked separately, NOT included in Total Trip Cost
 * - Total Trip Cost = Bookings + Out-of-pocket Expenses (NO parking)
 */
export function calculateTripCostSummary(
  expenses: Expense[],
  bookings: Booking[],
  parkingList: Parking[]
): TripCostSummary {
  // Filter to only out-of-pocket expenses (exclude booking-linked to prevent double counting)
  const outOfPocketExpenses = getOutOfPocketExpenses(expenses);
  
  // Expenses (out-of-pocket only)
  const expensesTotal = outOfPocketExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const expensesMyShare = outOfPocketExpenses.reduce((sum, e) => sum + getExpenseMyShare(e), 0);
  
  // Bookings - use getBookingMyShare() to ensure booking-level calculation
  // This prevents any segment-level duplication from affecting totals
  const bookingsTotal = bookings.reduce((sum, b) => {
    const cost = Number(b.total_cost || 0);
    // Guard against invalid values
    return sum + (Number.isFinite(cost) && cost >= 0 ? cost : 0);
  }, 0);
  const bookingsMyShare = bookings.reduce((sum, b) => sum + getBookingMyShare(b), 0);
  
  // Parking (tracked separately, NOT included in total trip cost)
  const parkingTotal = parkingList.reduce((sum, p) => sum + Number(p.total_cost || 0), 0);
  const parkingMyShare = parkingList.reduce((sum, p) => sum + getParkingMyShare(p), 0);
  
  // Combined totals: Bookings + Out-of-pocket Expenses (NO parking, NO booking-linked expenses)
  const totalCost = bookingsTotal + expensesTotal;
  const totalMyShare = bookingsMyShare + expensesMyShare;
  
  // Category breakdown (out-of-pocket expenses only)
  const byCategory = calculateCategorySummary(outOfPocketExpenses);
  
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

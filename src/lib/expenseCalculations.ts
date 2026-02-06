/**
 * Centralized expense calculation utilities
 * Single source of truth for all expense math
 * 
 * v2.1.10 - Legacy Airfare Normalizer:
 * - Added calculation-time fallback to detect legacy duplicated flight costs
 * - Trips created before 2.1.9 may have per-leg costs duplicated (same total on each leg)
 * - This normalizer detects the pattern and counts the cost only once at calculation time
 * - No data migration required - this is a read-time safeguard
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
 * Generate a stable booking key for grouping flight bookings
 * Used to detect legacy duplicated leg costs
 */
function getFlightBookingKey(booking: Booking): string {
  // Primary grouping key: confirmation number + airline (case-insensitive, trimmed)
  const confirmationNumber = (booking.confirmation_number || '').toLowerCase().trim();
  const airline = (booking.airline || booking.vendor_name || '').toLowerCase().trim();
  
  // If no confirmation number, use vendor + approximate date as fallback
  if (!confirmationNumber) {
    const dateKey = booking.start_datetime?.split('T')[0] || '';
    return `${airline}::${dateKey}::no-conf`;
  }
  
  return `${confirmationNumber}::${airline}`;
}

/**
 * LEGACY AIRFARE NORMALIZER (v2.1.10)
 * 
 * Detects and normalizes duplicated flight costs from trips created before v2.1.9.
 * 
 * Legacy Pattern:
 * - Multiple flight bookings (one per leg) with the same confirmation number
 * - Each booking has the same total_cost (full trip fare copied to each leg)
 * - This causes trip totals to be N× the actual airfare
 * 
 * Detection:
 * - Group flight bookings by confirmation_number + airline
 * - If 2+ bookings in a group have the SAME non-zero cost, it's duplicated
 * - Count that cost only ONCE for the group
 * 
 * This applies at calculation-time only - no data is modified.
 * 
 * @param bookings All bookings for the trip
 * @returns Object with normalized totals and my_share for bookings
 */
export function normalizeFlightBookingCosts(bookings: Booking[]): { 
  normalizedTotal: number; 
  normalizedMyShare: number;
} {
  // Separate flight and non-flight bookings
  const flightBookings = bookings.filter(b => b.booking_type === 'flight');
  const nonFlightBookings = bookings.filter(b => b.booking_type !== 'flight');
  
  // Calculate non-flight bookings normally
  const nonFlightTotal = nonFlightBookings.reduce((sum, b) => {
    const cost = Number(b.total_cost || 0);
    return sum + (Number.isFinite(cost) && cost >= 0 ? cost : 0);
  }, 0);
  
  const nonFlightMyShare = nonFlightBookings.reduce((sum, b) => sum + getBookingMyShare(b), 0);
  
  // If no flight bookings, return non-flight totals only
  if (flightBookings.length === 0) {
    return { normalizedTotal: nonFlightTotal, normalizedMyShare: nonFlightMyShare };
  }
  
  // Group flight bookings by their booking key
  const flightGroups = new Map<string, Booking[]>();
  
  for (const booking of flightBookings) {
    const key = getFlightBookingKey(booking);
    if (!flightGroups.has(key)) {
      flightGroups.set(key, []);
    }
    flightGroups.get(key)!.push(booking);
  }
  
  // Calculate normalized flight totals
  let flightTotal = 0;
  let flightMyShare = 0;
  
  for (const [, groupBookings] of flightGroups) {
    if (groupBookings.length === 1) {
      // Single booking in group - use as-is
      const booking = groupBookings[0];
      const cost = Number(booking.total_cost || 0);
      if (Number.isFinite(cost) && cost >= 0) {
        flightTotal += cost;
        flightMyShare += getBookingMyShare(booking);
      }
    } else {
      // Multiple bookings in group - check for legacy duplication pattern
      const costs = groupBookings.map(b => Number(b.total_cost || 0));
      const validCosts = costs.filter(c => Number.isFinite(c) && c > 0);
      
      if (validCosts.length === 0) {
        // No valid costs - skip
        continue;
      }
      
      // Check if all valid costs are the same (legacy duplication pattern)
      const uniqueCosts = [...new Set(validCosts)];
      
      if (uniqueCosts.length === 1 && groupBookings.length >= 2) {
        // LEGACY DUPLICATION DETECTED:
        // All bookings have the same cost, meaning the total was copied to each leg
        // Count this cost only ONCE
        const singleCost = uniqueCosts[0];
        flightTotal += singleCost;
        
        // For my_share: use the first booking's my_share ratio
        // If my_share was also duplicated, it should be the same value
        const firstBooking = groupBookings.find(b => Number(b.total_cost || 0) === singleCost);
        if (firstBooking) {
          flightMyShare += getBookingMyShare(firstBooking);
        } else {
          flightMyShare += singleCost;
        }
      } else {
        // Different costs in group - not a duplication, sum normally
        // This handles cases where per-leg costs were explicitly different
        for (const booking of groupBookings) {
          const cost = Number(booking.total_cost || 0);
          if (Number.isFinite(cost) && cost >= 0) {
            flightTotal += cost;
            flightMyShare += getBookingMyShare(booking);
          }
        }
      }
    }
  }
  
  return {
    normalizedTotal: nonFlightTotal + flightTotal,
    normalizedMyShare: nonFlightMyShare + flightMyShare,
  };
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
 * IMPORTANT (v2.1.10 - Legacy Airfare Normalizer):
 * - Uses normalizeFlightBookingCosts() to detect legacy duplicated flight costs
 * - Trips created before v2.1.9 may have per-leg costs duplicated
 * - The normalizer counts duplicated costs only ONCE at calculation time
 * 
 * IMPORTANT (v2.1.9 - Airfare Duplication Prevention):
 * - This function filters out booking-linked expenses to prevent double counting.
 * - Booking costs are calculated using getBookingMyShare() which returns booking-level totals.
 * - For flights: Each booking record = one airfare cost (not per-leg/segment).
 * - We NEVER sum segment-level costs - only booking-level.
 * 
 * Structure:
 * - Bookings total: Sum of all booking costs (flights, stays, rentals, activities)
 *   - Flights are normalized to prevent legacy duplication
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
  
  // Bookings - use normalizeFlightBookingCosts() to handle legacy duplicated flights
  // This function:
  // 1. Detects legacy per-leg duplication patterns (same confirmation, same cost)
  // 2. Counts duplicated flight costs only ONCE
  // 3. Calculates non-flight bookings normally
  const { normalizedTotal: bookingsTotal, normalizedMyShare: bookingsMyShare } = 
    normalizeFlightBookingCosts(bookings);
  
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

/**
 * Centralized expense calculation utilities
 * Single source of truth for all expense math
 * 
 * Patch 2.6.2: Commercial Code Integrity Documentation
 * Patch 2.1.23: Tour/Booking Separation Enforcement
 * 
 * DATA INTEGRITY - SINGLE SOURCE OF TRUTH:
 * - calculateTripCostSummary() is the ONLY function for trip cost aggregation
 * - All UI summaries (TripSummaryTab, ExpensesTab) use this function
 * - All exports (Trip Summary Report PDF) use this function
 * - This ensures UI and exports always match
 * 
 * TOUR/BOOKING SEPARATION (v2.1.23):
 * - Bookings = anything with money (flights, stays, rentals, activities, tickets)
 * - Tours = timeline "stops" / places we go, with NO cost logic
 * - Tour/Engagement entities are NEVER included in any cost calculations
 * - calculateTripCostSummary() uses ONLY: expenses, bookings, parkingList
 * - The Engagement table has no cost fields and must stay that way
 * 
 * CALCULATION PHILOSOPHY:
 * - Bookings: Calculated at booking-level, NOT segment-level
 * - Expenses: Only out-of-pocket (excludes booking-linked to prevent double counting)
 * - Parking: Tracked separately, NOT included in Total Trip Cost
 * - Total = Bookings + Out-of-pocket Expenses
 * - Tours/Engagements = EXCLUDED from all cost math
 * 
 * ERROR PREVENTION:
 * - safeNumber() guards ensure all returned values are finite and non-negative
 * - Invalid inputs (NaN, Infinity, negative) fallback to 0
 * - This prevents UI rendering errors and export corruption
 * 
 * LEGACY DATA HANDLING:
 * - v2.1.10 Legacy Airfare Normalizer detects pre-v2.1.9 duplicated flight costs
 * - Trips created before v2.1.9 may have per-leg costs duplicated (same total on each leg)
 * - The normalizer counts duplicated costs only ONCE at calculation time
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
 * Check if an expense is in a non-default (foreign) currency.
 * Foreign-currency expenses are shown in the list but excluded from totals
 * until the user manually converts them.
 * 
 * v4.4.1: Compares against user's preferred home currency (from profile),
 * not hardcoded USD. Falls back to 'USD' only if no home currency provided.
 */
export function isForeignCurrencyExpense(expense: Expense, homeCurrency: string = 'USD'): boolean {
  const currency = (expense as any).currency;
  if (!currency) return false;
  return currency.toUpperCase() !== homeCurrency.toUpperCase();
}

/**
 * Filter expenses to only include true out-of-pocket expenses (not booking-linked)
 * v4.4.1: Also excludes foreign-currency expenses from totals (compared to user's home currency)
 */
export function getOutOfPocketExpenses(expenses: Expense[], homeCurrency: string = 'USD'): Expense[] {
  return expenses.filter(e => !isBookingLinkedExpense(e) && !isForeignCurrencyExpense(e, homeCurrency));
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
  
  // v3.9.62 (STEP 2): Treat my_share <= 0 as "unset" when total_cost > 0.
  // Parser defaults and DB column default (0) cause my_share=0 even when
  // the booking has a valid cost. Return total_cost to prevent $0 propagation.
  if (myShare <= 0 && totalCost > 0) {
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
export function calculateExpensePurposeBreakdown(expenses: Expense[], homeCurrency: string = 'USD'): ExpensePurposeBreakdown {
  // Filter to only out-of-pocket expenses (exclude booking-linked to prevent double counting)
  const outOfPocketExpenses = getOutOfPocketExpenses(expenses, homeCurrency);
  
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
 * Generate a stable booking key for grouping bookings by provider + reference.
 * v3.9.25: Extended to all booking types (flights, stays, rentals, activities).
 * Used to detect legacy duplicated leg costs and prevent multi-email import duplicates.
 *
 * Key format: providerCanonical::bookingRefRaw
 */
export function getStableBookingKey(booking: Booking): string {
  // Provider = airline for flights, vendor_name for everything else
  const provider = (
    booking.booking_type === 'flight'
      ? (booking.airline || booking.vendor_name || '')
      : (booking.vendor_name || booking.rental_company || booking.property_name || '')
  ).toLowerCase().trim();

  // Reference = confirmation_number (the raw booking ref from the confirmation)
  const bookingRef = (booking.confirmation_number || '').toLowerCase().trim();

  // If no reference, use provider + approximate date as fallback
  if (!bookingRef) {
    const dateKey = booking.start_datetime?.split('T')[0] || '';
    return `${provider}::${dateKey}::no-ref`;
  }

  return `${provider}::${bookingRef}`;
}

/**
 * @deprecated v3.9.25: Use getStableBookingKey instead.
 * Kept for backward compatibility.
 */
function getFlightBookingKey(booking: Booking): string {
  return getStableBookingKey(booking);
}

/**
 * Result of flight booking normalization
 * 
 * v2.1.21: Extended to include per-booking cost map
 * - normalizedTotal / normalizedMyShare: for summary card totals
 * - perBookingCost / perBookingMyShare: for expense tab per-row display
 */
export interface NormalizedAirfareResult {
  normalizedTotal: number;
  normalizedMyShare: number;
  /** Per-booking ID -> normalized cost. For duplicated legs, only canonical booking has the cost; others are 0. */
  perBookingCost: Record<string, number>;
  /** Per-booking ID -> normalized my share. */
  perBookingMyShare: Record<string, number>;
}

/**
 * LEGACY AIRFARE NORMALIZER (v2.1.10, extended v2.1.21)
 * 
 * Detects and normalizes duplicated flight costs from trips created before v2.1.9.
 * 
 * v2.1.21: Extended to return per-booking cost map for Expenses tab alignment.
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
 * @returns Object with normalized totals, my_share, and per-booking cost maps
 */
export function normalizeFlightBookingCosts(bookings: Booking[]): NormalizedAirfareResult {
  // Separate flight and non-flight bookings
  const flightBookings = bookings.filter(b => b.booking_type === 'flight');
  const nonFlightBookings = bookings.filter(b => b.booking_type !== 'flight');
  
  // Initialize per-booking cost maps
  const perBookingCost: Record<string, number> = {};
  const perBookingMyShare: Record<string, number> = {};
  
  // Calculate non-flight bookings normally and populate per-booking maps
  let nonFlightTotal = 0;
  let nonFlightMyShare = 0;
  
  for (const b of nonFlightBookings) {
    const cost = Number(b.total_cost || 0);
    const validCost = Number.isFinite(cost) && cost >= 0 ? cost : 0;
    const myShare = getBookingMyShare(b);
    
    nonFlightTotal += validCost;
    nonFlightMyShare += myShare;
    perBookingCost[b.id] = validCost;
    perBookingMyShare[b.id] = myShare;
  }
  
  // If no flight bookings, return non-flight totals only
  if (flightBookings.length === 0) {
    return { 
      normalizedTotal: nonFlightTotal, 
      normalizedMyShare: nonFlightMyShare,
      perBookingCost,
      perBookingMyShare,
    };
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
  
  // Calculate normalized flight totals and per-booking costs
  let flightTotal = 0;
  let flightMyShare = 0;
  
  for (const [, groupBookings] of flightGroups) {
    if (groupBookings.length === 1) {
      // Single booking in group - use as-is
      const booking = groupBookings[0];
      const cost = Number(booking.total_cost || 0);
      const validCost = Number.isFinite(cost) && cost >= 0 ? cost : 0;
      const myShare = getBookingMyShare(booking);
      
      flightTotal += validCost;
      flightMyShare += myShare;
      perBookingCost[booking.id] = validCost;
      perBookingMyShare[booking.id] = myShare;
    } else {
      // Multiple bookings in group - check for legacy duplication pattern
      const costs = groupBookings.map(b => Number(b.total_cost || 0));
      const validCosts = costs.filter(c => Number.isFinite(c) && c > 0);
      
      if (validCosts.length === 0) {
        // No valid costs - all get 0
        for (const booking of groupBookings) {
          perBookingCost[booking.id] = 0;
          perBookingMyShare[booking.id] = 0;
        }
        continue;
      }
      
      // Check if all valid costs are the same (legacy duplication pattern)
      const uniqueCosts = [...new Set(validCosts)];
      
      if (uniqueCosts.length === 1 && groupBookings.length >= 2) {
        // LEGACY DUPLICATION DETECTED:
        // All bookings have the same cost, meaning the total was copied to each leg
        // Count this cost only ONCE - assign to the canonical (earliest departure) booking
        const singleCost = uniqueCosts[0];
        
        // Sort by start_datetime to find canonical (earliest) booking
        const sortedBookings = [...groupBookings].sort((a, b) => {
          // v3.11.2: String comparison — no new Date()
          const aTime = a.start_datetime || '';
          const bTime = b.start_datetime || '';
          return aTime < bTime ? -1 : aTime > bTime ? 1 : 0;
        });
        
        const canonicalBooking = sortedBookings[0];
        const canonicalMyShare = getBookingMyShare(canonicalBooking);
        
        flightTotal += singleCost;
        flightMyShare += canonicalMyShare;
        
        // Assign cost to canonical booking, 0 to others
        for (const booking of groupBookings) {
          if (booking.id === canonicalBooking.id) {
            perBookingCost[booking.id] = singleCost;
            perBookingMyShare[booking.id] = canonicalMyShare;
          } else {
            perBookingCost[booking.id] = 0;
            perBookingMyShare[booking.id] = 0;
          }
        }
      } else {
        // Different costs in group - not a duplication, sum normally
        // This handles cases where per-leg costs were explicitly different
        for (const booking of groupBookings) {
          const cost = Number(booking.total_cost || 0);
          const validCost = Number.isFinite(cost) && cost >= 0 ? cost : 0;
          const myShare = getBookingMyShare(booking);
          
          flightTotal += validCost;
          flightMyShare += myShare;
          perBookingCost[booking.id] = validCost;
          perBookingMyShare[booking.id] = myShare;
        }
      }
    }
  }
  
  return {
    normalizedTotal: nonFlightTotal + flightTotal,
    normalizedMyShare: nonFlightMyShare + flightMyShare,
    perBookingCost,
    perBookingMyShare,
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
 * Calculate totals for expenses using normalized booking costs (v2.1.21)
 * 
 * For expenses linked to bookings, this uses the normalized per-booking cost
 * from normalizeFlightBookingCosts() to ensure multi-leg flights with duplicated
 * costs are counted correctly (only once).
 * 
 * @param expenses All expenses for the trip
 * @param bookings All bookings for the trip (used to calculate normalized costs)
 * @returns Totals with normalized flight costs
 */
export function calculateNormalizedExpenseTotals(
  expenses: Expense[],
  bookings: Booking[]
): ExpenseTotals {
  // Get normalized per-booking costs
  const { perBookingCost, perBookingMyShare } = normalizeFlightBookingCosts(bookings);
  
  let totalAmount = 0;
  let totalMyShare = 0;
  
  for (const expense of expenses) {
    // Check if this expense is linked to a booking
    const linkedBookingId = extractBookingIdFromNotes(expense.notes);
    
    if (linkedBookingId && perBookingCost[linkedBookingId] !== undefined) {
      // Use normalized cost for this linked booking
      totalAmount += perBookingCost[linkedBookingId];
      totalMyShare += perBookingMyShare[linkedBookingId];
    } else {
      // Regular expense - use as-is
      totalAmount += Number(expense.amount || 0);
      totalMyShare += getExpenseMyShare(expense);
    }
  }
  
  return { totalAmount, totalMyShare };
}

/**
 * Get the normalized amount for a single expense (v2.1.21)
 * 
 * For flight-linked expenses that are part of a duplicated leg group,
 * this returns 0 for non-canonical legs and the full cost for the canonical leg.
 * 
 * @param expense The expense to get normalized amount for
 * @param perBookingCost The per-booking cost map from normalizeFlightBookingCosts()
 * @returns The normalized amount (may be 0 for duplicate flight legs)
 */
export function getNormalizedExpenseAmount(
  expense: Expense,
  perBookingCost: Record<string, number>
): number {
  const linkedBookingId = extractBookingIdFromNotes(expense.notes);
  
  if (linkedBookingId && perBookingCost[linkedBookingId] !== undefined) {
    return perBookingCost[linkedBookingId];
  }
  
  return Number(expense.amount || 0);
}

/**
 * Get the normalized my_share for a single expense (v2.1.21)
 */
export function getNormalizedExpenseMyShare(
  expense: Expense,
  perBookingMyShare: Record<string, number>
): number {
  const linkedBookingId = extractBookingIdFromNotes(expense.notes);
  
  if (linkedBookingId && perBookingMyShare[linkedBookingId] !== undefined) {
    return perBookingMyShare[linkedBookingId];
  }
  
  return getExpenseMyShare(expense);
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
  parkingList: Parking[],
  homeCurrency: string = 'USD'
): TripCostSummary {
  // Filter to only out-of-pocket expenses (exclude booking-linked to prevent double counting)
  // v4.4.1: Uses user's home currency for foreign expense detection
  const outOfPocketExpenses = getOutOfPocketExpenses(expenses, homeCurrency);
  
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
  
  // v2.1.30: Defensive guards - ensure all values are finite numbers, fallback to 0
  const safeNumber = (val: number): number => 
    Number.isFinite(val) && val >= 0 ? val : 0;
  
  return {
    expensesTotal: safeNumber(expensesTotal),
    expensesMyShare: safeNumber(expensesMyShare),
    bookingsTotal: safeNumber(bookingsTotal),
    bookingsMyShare: safeNumber(bookingsMyShare),
    parkingTotal: safeNumber(parkingTotal),
    parkingMyShare: safeNumber(parkingMyShare),
    totalCost: safeNumber(totalCost),
    totalMyShare: safeNumber(totalMyShare),
    byCategory,
  };
}

/**
 * Debug logging for expense aggregation
 * Call this after calculating totals to verify math
 */
export function logExpenseDebug(
  _tripId: string,
  _expenses: Expense[],
  _summary: TripCostSummary
): void {
  // No-op in production. Retained as a stable call-site for future diagnostics.
  return;
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

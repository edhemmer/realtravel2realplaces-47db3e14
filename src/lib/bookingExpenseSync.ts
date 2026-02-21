/**
 * Booking-Expense Synchronization Utilities
 * v3.9.22 - Links expenses to bookings for accurate financial tracking
 * 
 * Since we cannot add a booking_id column, we use a marker in the notes field:
 * Format: [linked_booking:booking_uuid]
 * 
 * AIRFARE COST RULES (v3.9.21 - Canonical Cost Attribution):
 * - Each booking represents ONE confirmation (may contain multiple legs)
 * - booking.total_cost is the SINGLE source of truth - the total from the confirmation
 * - costAttributionMode determines how expenses are created:
 *   BOOKING_TOTAL: one expense per confirmation total (non-duplicative)
 *   PER_LEG: one expense per leg with explicit leg cost
 *   MIXED_NEEDS_REVIEW: no automatic expense; user must review
 *   NONE: no cost data — creates a $0 placeholder expense flagged [needs_pricing]
 * - If booking.total_cost is null/0, a placeholder expense is created so the user
 *   can update it once they know the final cost. The expense is visually flagged.
 */

import { supabase } from '@/integrations/supabase/client';
import { Expense, ExpenseCategory, Booking } from '@/types/database';
// v3.9.38: safeMonetaryForDb removed — booking.total_cost from DB is already normalized at insert time

// Marker format for linking expenses to bookings
const BOOKING_LINK_PREFIX = '[linked_booking:';
const BOOKING_LINK_SUFFIX = ']';
const NEEDS_PRICING_FLAG = '[needs_pricing]';

/**
 * Generate the booking link marker to embed in expense notes
 */
export function createBookingLinkMarker(bookingId: string): string {
  return `${BOOKING_LINK_PREFIX}${bookingId}${BOOKING_LINK_SUFFIX}`;
}

/**
 * Extract booking ID from expense notes if present
 */
export function extractBookingIdFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  
  const startIdx = notes.indexOf(BOOKING_LINK_PREFIX);
  if (startIdx === -1) return null;
  
  const idStart = startIdx + BOOKING_LINK_PREFIX.length;
  const endIdx = notes.indexOf(BOOKING_LINK_SUFFIX, idStart);
  if (endIdx === -1) return null;
  
  return notes.substring(idStart, endIdx);
}

/**
 * Check if an expense is linked to a specific booking
 */
export function isExpenseLinkedToBooking(expense: Expense, bookingId: string): boolean {
  return extractBookingIdFromNotes(expense.notes) === bookingId;
}

/**
 * Map booking type to expense category
 */
export function mapBookingTypeToExpenseCategory(bookingType: string): ExpenseCategory {
  switch (bookingType) {
    case 'flight':
    case 'car_rental':
      return 'transport';
    case 'stay':
      return 'other'; // Lodging falls under 'other' since there's no 'lodging' category
    case 'parking':
      return 'parking';
    case 'activity':
      return 'activity';
    default:
      return 'other';
  }
}

/**
 * Map booking type to human-readable expense description prefix
 */
export function getExpenseDescriptionForBooking(booking: Booking): string {
  const vendorName = booking.vendor_name || 'Unknown';
  
  switch (booking.booking_type) {
    case 'flight':
      return booking.airline ? `${booking.airline} Flight` : `Flight - ${vendorName}`;
    case 'stay':
      return booking.property_name || `Stay - ${vendorName}`;
    case 'car_rental':
      return booking.rental_company || `Car Rental - ${vendorName}`;
    case 'activity':
      return `Activity - ${vendorName}`;
    default:
      return vendorName;
  }
}

/**
 * Find existing expense linked to a booking
 */
export async function findLinkedExpense(tripId: string, bookingId: string): Promise<Expense | null> {
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('trip_id', tripId);
  
  if (error || !expenses) return null;
  
  const linked = expenses.find(e => extractBookingIdFromNotes(e.notes) === bookingId);
  return linked ? (linked as Expense) : null;
}

/**
 * Determine the effective cost for a booking expense
 * 
 * AIRFARE COST NORMALIZATION (v2.1.9):
 * - For ALL booking types: Use booking.total_cost as the SINGLE source of truth
 * - This is the booking-level cost from the original confirmation
 * - Per-segment/per-leg costs are NOT tracked separately
 * - If total_cost is null/undefined/0, return 0 (no expense will be created)
 * 
 * v3.9.38: booking.total_cost from DB is already a safe numeric (or null).
 * We only guard for NaN/Infinity/negative — no re-normalization needed since
 * safeMonetaryForDb was already applied at insert time.
 */
export function getBookingExpenseCost(booking: Booking): number {
  const raw = booking.total_cost;
  if (raw === null || raw === undefined) return 0;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return num;
}

/**
 * Create or update expense for a booking
 * Returns the expense ID on success, null on failure
 * 
 * AIRFARE ALLOCATION (v2.1.9 - Duplication Prevention):
 * - Creates exactly ONE expense per booking using getBookingExpenseCost()
 * - For multi-leg flights: The booking represents the entire confirmation
 * - Each booking ID gets exactly one linked expense
 * - We NEVER create segment-level or per-leg expenses
 * - This ensures the fare is counted exactly ONCE regardless of:
 *   a) Number of legs/segments
 *   b) Number of passengers
 *   c) How the data was parsed
 *
 * v3.9.25: Guard — never creates $0 placeholder expenses.
 * If totalCost is null/0/undefined, no expense is created and any existing
 * linked expense is left unchanged (not zeroed out).
 *
 * v4.9.4: REVERSED — now creates $0 placeholder expenses when booking has no cost.
 * The expense is flagged with [needs_pricing] so the UI can show a visual indicator.
 * This ensures users always see their booking in the expenses tab and can update the
 * cost once they receive a receipt or final charge.
 */
export async function syncExpenseFromBooking(booking: Booking, currency: string = 'USD'): Promise<string | null> {
  // Get normalized booking cost — coerce string to number defensively
  const rawCost = booking.total_cost;
  const totalCost = (rawCost === null || rawCost === undefined)
    ? 0
    : (() => {
        const n = Number(rawCost);
        return Number.isFinite(n) && n > 0 ? n : 0;
      })();

  const needsPricing = totalCost <= 0;
  
  const bookingLinkMarker = createBookingLinkMarker(booking.id);
  const category = mapBookingTypeToExpenseCategory(booking.booking_type);
  const description = getExpenseDescriptionForBooking(booking);
  
  // Extract date — string slice only, no Date construction, no timezone risk
  const rawStart = booking.start_datetime || '';
  const expenseDate = rawStart.length >= 10
    ? rawStart.substring(0, 10)
    : new Date().toISOString().split('T')[0];
  
  // Build notes with markers
  const notesMarkers = needsPricing
    ? `${bookingLinkMarker} ${NEEDS_PRICING_FLAG}`
    : bookingLinkMarker;
  
  // Check for existing linked expense
  const existingExpense = await findLinkedExpense(booking.trip_id, booking.id);
  
  if (existingExpense) {
    // v4.9.4: If existing expense was a placeholder and now we have a real cost, upgrade it
    const existingNeedsPricing = hasNeedsPricingFlag(existingExpense.notes);
    
    if (needsPricing && existingNeedsPricing) {
      // Still no cost — leave placeholder as-is
      return existingExpense.id;
    }
    
    // Update existing expense
    const safeAmount = totalCost;
    const rawMyShare = booking.my_share != null ? Number(booking.my_share) : null;
    const safeMyShare = (rawMyShare != null && Number.isFinite(rawMyShare) && rawMyShare > 0) ? rawMyShare : safeAmount;
    
    // If we now have a real cost, remove the needs_pricing flag
    const updatedNotes = needsPricing 
      ? existingExpense.notes 
      : (existingExpense.notes || '').replace(NEEDS_PRICING_FLAG, '').trim();
    
    const { error } = await supabase
      .from('expenses')
      .update({
        date: expenseDate,
        category,
        description,
        amount: safeAmount,
        my_share: safeMyShare,
        currency: currency || 'USD',
        notes: updatedNotes,
      })
      .eq('id', existingExpense.id);
    
    if (error) {
      console.error('Failed to update linked expense:', error);
      return null;
    }
    return existingExpense.id;
  } else {
    // Create new expense (with or without cost)
    const safeAmount = totalCost;
    const rawMyShare = booking.my_share != null ? Number(booking.my_share) : null;
    const safeMyShare = (rawMyShare != null && Number.isFinite(rawMyShare) && rawMyShare > 0) ? rawMyShare : safeAmount;
    const { data: newExpense, error } = await supabase
      .from('expenses')
      .insert({
        trip_id: booking.trip_id,
        date: expenseDate,
        category,
        description,
        amount: safeAmount,
        my_share: safeMyShare,
        currency: currency || 'USD',
        notes: notesMarkers,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create linked expense:', error);
      return null;
    }
    return newExpense?.id || null;
  }
}

/**
 * Delete expense linked to a booking
 */
export async function deleteLinkedExpense(tripId: string, bookingId: string): Promise<boolean> {
  const existingExpense = await findLinkedExpense(tripId, bookingId);
  
  if (!existingExpense) return true; // Nothing to delete
  
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', existingExpense.id);
  
  if (error) {
    console.error('Failed to delete linked expense:', error);
    return false;
  }
  return true;
}

/**
 * Check if an expense was auto-generated from a booking
 * (Used to display indicators in the UI)
 */
export function isAutoGeneratedExpense(expense: Expense): boolean {
  return extractBookingIdFromNotes(expense.notes) !== null;
}

/**
 * v4.9.4: Check if an expense is flagged as needing pricing from the user
 */
export function hasNeedsPricingFlag(notes: string | null | undefined): boolean {
  if (!notes) return false;
  return notes.includes(NEEDS_PRICING_FLAG);
}

/**
 * Get clean notes without the booking link marker or needs_pricing flag (for display)
 */
export function getCleanNotesForDisplay(notes: string | null | undefined): string {
  if (!notes) return '';
  
  let cleaned = notes;
  
  // Remove booking link marker
  const startIdx = cleaned.indexOf(BOOKING_LINK_PREFIX);
  if (startIdx !== -1) {
    const endIdx = cleaned.indexOf(BOOKING_LINK_SUFFIX, startIdx);
    if (endIdx !== -1) {
      const before = cleaned.substring(0, startIdx).trim();
      const after = cleaned.substring(endIdx + BOOKING_LINK_SUFFIX.length).trim();
      cleaned = [before, after].filter(Boolean).join(' ').trim();
    }
  }
  
  // Remove needs_pricing flag
  cleaned = cleaned.replace(NEEDS_PRICING_FLAG, '').trim();
  
  return cleaned;
}

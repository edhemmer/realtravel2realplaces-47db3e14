/**
 * Booking-Expense Synchronization Utilities
 * v1.2.5 - Links expenses to bookings for accurate financial tracking
 * 
 * Since we cannot add a booking_id column, we use a marker in the notes field:
 * Format: [linked_booking:booking_uuid]
 */

import { supabase } from '@/integrations/supabase/client';
import { Expense, ExpenseCategory, Booking } from '@/types/database';

// Marker format for linking expenses to bookings
const BOOKING_LINK_PREFIX = '[linked_booking:';
const BOOKING_LINK_SUFFIX = ']';

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
 * Create or update expense for a booking
 * Returns the expense ID on success, null on failure
 */
export async function syncExpenseFromBooking(booking: Booking): Promise<string | null> {
  // Only sync if booking has a valid cost
  const totalCost = Number(booking.total_cost || 0);
  if (totalCost <= 0) return null;
  
  const bookingLinkMarker = createBookingLinkMarker(booking.id);
  const category = mapBookingTypeToExpenseCategory(booking.booking_type);
  const description = getExpenseDescriptionForBooking(booking);
  
  // Extract date from booking start_datetime
  const expenseDate = booking.start_datetime 
    ? new Date(booking.start_datetime).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  
  // Check for existing linked expense
  const existingExpense = await findLinkedExpense(booking.trip_id, booking.id);
  
  if (existingExpense) {
    // Update existing expense
    const { error } = await supabase
      .from('expenses')
      .update({
        date: expenseDate,
        category,
        description,
        amount: totalCost,
        my_share: Number(booking.my_share || totalCost),
        notes: existingExpense.notes, // Preserve existing notes with marker
      })
      .eq('id', existingExpense.id);
    
    if (error) {
      console.error('Failed to update linked expense:', error);
      return null;
    }
    return existingExpense.id;
  } else {
    // Create new expense
    const { data: newExpense, error } = await supabase
      .from('expenses')
      .insert({
        trip_id: booking.trip_id,
        date: expenseDate,
        category,
        description,
        amount: totalCost,
        my_share: Number(booking.my_share || totalCost),
        notes: bookingLinkMarker,
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
 * Get clean notes without the booking link marker (for display)
 */
export function getCleanNotesForDisplay(notes: string | null | undefined): string {
  if (!notes) return '';
  
  const startIdx = notes.indexOf(BOOKING_LINK_PREFIX);
  if (startIdx === -1) return notes;
  
  const endIdx = notes.indexOf(BOOKING_LINK_SUFFIX, startIdx);
  if (endIdx === -1) return notes;
  
  // Remove the marker and any surrounding whitespace
  const before = notes.substring(0, startIdx).trim();
  const after = notes.substring(endIdx + BOOKING_LINK_SUFFIX.length).trim();
  
  return [before, after].filter(Boolean).join(' ').trim();
}

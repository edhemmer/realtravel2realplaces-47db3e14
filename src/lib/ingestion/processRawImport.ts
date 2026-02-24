/**
 * v3.9.27: Canonical Raw Import Processor
 *
 * Unified entry point for all "paste/upload confirmation" flows.
 * Ensures parity between global import (Create Trip) and in-trip "Add Booking".
 *
 * Every UI path (BookingsTab paste, BookingsTab photo, DropzoneIntake)
 * MUST call processRawImport() so classification + persistence are identical.
 */

import { supabase } from '@/integrations/supabase/client';
import { enrichParsedBookingCost } from '@/lib/costAttribution';
import { enrichFlightCostIntelligence } from '@/lib/import/flightCostIntelligence';
import {
  runCanonicalImportPipelineSingle,
  type CanonicalImportResult,
} from '@/lib/ingestion/canonicalImportPipeline';

// ============================================================================
// TYPES
// ============================================================================

export type ImportMode = 'AUTO_TRIP_FRAME' | 'ATTACH_TO_EXISTING_TRIP';

export interface ProcessRawImportParams {
  rawContent: string;
  mode: ImportMode;
  tripId: string;
  /** Preferred currency for expense creation (default: 'USD') */
  currency?: string;
  /** Source type for edge function ('booking' | 'receipt') */
  edgeFunctionType?: 'booking' | 'receipt';
}

export interface ProcessRawImportResult {
  /** Pipeline result with classification + staged items */
  pipelineResult: CanonicalImportResult;
  /** Parsed data from edge function (enriched) */
  parsed: Record<string, unknown> | null;
  /** Whether a booking was auto-created */
  bookingCreated: boolean;
  /** ID of auto-created booking (if any) */
  bookingId: string | null;
  /** Whether an expense was auto-created (receipt path) */
  expenseCreated: boolean;
  /** Error message if processing failed */
  error: string | null;
}

// ============================================================================
// PROCESSOR
// ============================================================================

/**
 * Process raw confirmation text through the canonical import pipeline.
 *
 * 1. Calls parse-booking edge function
 * 2. Enriches parsed data (cost, flight intelligence)
 * 3. Runs canonical classification pipeline
 * 4. Persists based on classification:
 *    - BOOKING → creates booking + linked "From Booking" expense
 *    - RECEIPT → creates expense only
 *    - IGNORE  → nothing
 *
 * When mode = ATTACH_TO_EXISTING_TRIP, all records attach to provided tripId.
 */
export async function processRawImport(
  params: ProcessRawImportParams,
): Promise<ProcessRawImportResult> {
  const {
    rawContent,
    mode,
    tripId,
    currency = 'USD',
    edgeFunctionType = 'booking',
  } = params;

  const emptyResult = (error: string): ProcessRawImportResult => ({
    pipelineResult: {
      status: 'FAIL',
      stagedItems: [],
      importableItems: [],
      needsAttentionItems: [],
      hasReceipts: false,
      receiptItems: [],
      allIssues: [],
      summary: error,
    },
    parsed: null,
    bookingCreated: false,
    bookingId: null,
    expenseCreated: false,
    error,
  });

  if (!rawContent.trim()) {
    return emptyResult('No content to parse.');
  }

  // ── Step 1: Edge function parse ──────────────────────────
  let parsed: Record<string, unknown>;
  try {
    const { data, error } = await supabase.functions.invoke('parse-booking', {
      body: { text: rawContent, type: edgeFunctionType },
    });

    if (error) {
      console.error('[processRawImport] Edge function error:', error);
      return emptyResult('Connection error. Please try again.');
    }

    if (!data?.success || !data?.data) {
      return emptyResult('Could not parse confirmation.');
    }

    parsed = data.data;
  } catch (err) {
    console.error('[processRawImport] Unexpected error:', err);
    return emptyResult('Something went wrong during parsing.');
  }

  // ── Step 2: Enrich ───────────────────────────────────────
  enrichParsedBookingCost(parsed, rawContent);
  enrichFlightCostIntelligence(parsed, rawContent, currency);

  // ── Step 3: Canonical pipeline ───────────────────────────
  const pipelineResult = runCanonicalImportPipelineSingle(parsed, rawContent);

  // ── Step 4: Persist based on classification ──────────────
  const result: ProcessRawImportResult = {
    pipelineResult,
    parsed,
    bookingCreated: false,
    bookingId: null,
    expenseCreated: false,
    error: null,
  };

  // ALL_IGNORED or IGNORE — nothing persisted
  if (pipelineResult.status === 'ALL_IGNORED') {
    return result;
  }

  const stagedItem = pipelineResult.stagedItems[0];
  if (!stagedItem) return result;

  // IGNORE classification — nothing
  if (stagedItem.importClassification === 'IGNORE') {
    return result;
  }

  // RECEIPT classification — expense only
  if (stagedItem.importClassification === 'RECEIPT' || pipelineResult.status === 'RECEIPT_ONLY') {
    try {
      const category = mapBookingTypeToExpenseCategory(parsed.booking_type as string || 'other');
      const expenseDate = (parsed.receipt_date as string) || new Date().toISOString().split('T')[0];
      const { error: insertErr } = await supabase.from('expenses').insert([{
        trip_id: tripId,
        date: expenseDate,
        category: category as any,
        description: (parsed.vendor_name as string) || 'Receipt upload',
        amount: (parsed.total_cost as number) || 0,
        notes: `Created from receipt upload. Vendor: ${(parsed.vendor_name as string) || 'Unknown'}`,
      }]);
      if (!insertErr) {
        result.expenseCreated = true;
      }
    } catch (err) {
      console.error('[processRawImport] Expense creation failed:', err);
    }
    return result;
  }

  // BOOKING classification — create booking + linked expense
  // Only auto-create if ATTACH_TO_EXISTING_TRIP and pipeline says importable
  if (
    stagedItem.importClassification === 'BOOKING' &&
    mode === 'ATTACH_TO_EXISTING_TRIP'
  ) {
    // Build booking data from parsed fields
    const bookingType = (parsed.booking_type as string) || 'flight';
    const startDatetime = (parsed.start_datetime as string) || '';
    
    if (!startDatetime) {
      // Can't create booking without a start datetime — let caller handle via form
      return result;
    }

    try {
      const bookingInsert: Record<string, unknown> = {
        trip_id: tripId,
        booking_type: bookingType,
        vendor_name: (parsed.vendor_name as string) || 'Unknown',
        start_datetime: startDatetime,
        end_datetime: (parsed.end_datetime as string) || null,
        confirmation_number: (parsed.confirmation_number as string) || null,
        total_cost: (parsed.total_cost as number) || 0,
        my_share: (parsed.my_share as number) || (parsed.total_cost as number) || 0,
        address: (parsed.address as string) || null,
        airline: (parsed.airline as string) || null,
        passenger_name: (parsed.passenger_name as string) || null,
        notes: (parsed.notes as string) || null,
        link_url: (parsed.link_url as string) || null,
        // Flight-specific
        departure_airport_code: (parsed.departure_airport_code as string) || null,
        arrival_airport_code: (parsed.arrival_airport_code as string) || null,
        departure_airport_name: (parsed.departure_airport_name as string) || null,
        arrival_airport_name: (parsed.arrival_airport_name as string) || null,
        from_location: (parsed.from_location as string) || null,
        to_location: (parsed.to_location as string) || null,
        // Stay-specific
        property_name: (parsed.property_name as string) || null,
        stay_type: bookingType === 'stay' ? ((parsed.stay_type as string) || 'hotel') : null,
        // Car rental-specific
        rental_company: (parsed.rental_company as string) || null,
        pickup_location: (parsed.pickup_location as string) || null,
        return_location: (parsed.return_location as string) || null,
        // Transport-specific
        transport_mode: bookingType === 'transport' ? ((parsed.transport_mode as string) || null) : null,
        operator: (parsed.operator as string) || null,
        // Activity source marker
        activity_source: 'confirmation',
      };

      const { data: newBooking, error: bookingErr } = await supabase
        .from('bookings')
        .insert([bookingInsert as any])
        .select()
        .single();

      if (bookingErr) {
        console.error('[processRawImport] Booking creation failed:', bookingErr);
        // Fall through — caller can still populate form
      } else if (newBooking) {
        result.bookingCreated = true;
        result.bookingId = newBooking.id;

        // Sync linked expense ("From Booking")
        try {
          const { syncExpenseFromBooking } = await import('@/lib/bookingExpenseSync');
          await syncExpenseFromBooking(newBooking as any, currency);
          result.expenseCreated = true;
        } catch (err) {
          console.error('[processRawImport] Expense sync failed (non-blocking):', err);
        }
      }
    } catch (err) {
      console.error('[processRawImport] Booking creation error:', err);
    }
  }

  return result;
}

// ============================================================================
// HELPERS
// ============================================================================

function mapBookingTypeToExpenseCategory(bookingType: string): string {
  switch (bookingType) {
    case 'flight':
    case 'car_rental':
    case 'transport':
      return 'transport';
    case 'parking':
      return 'parking';
    case 'activity':
      return 'activity';
    default:
      return 'other';
  }
}

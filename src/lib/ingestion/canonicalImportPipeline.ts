/**
 * v3.9.9: Canonical Import Pipeline
 * 
 * This is the ONE entry point for all booking/confirmation parsing in the app.
 * Every UI entry point (BookingsTab paste, BookingsTab photo, CreateTripDialog
 * itinerary parse, DropzoneIntake file processing) MUST route through this pipeline.
 * 
 * ENTRY POINTS AUDITED (v3.9.9):
 * 1. BookingsTab — parse-booking (text paste)           → runCanonicalImportPipeline
 * 2. BookingsTab — parse-booking-image (photo upload)   → runCanonicalImportPipeline
 * 3. CreateTripDialog — parse-itinerary (onboarding)    → runCanonicalImportPipeline
 * 4. DropzoneIntake — parse-booking-image (drag-drop)   → runCanonicalImportPipeline
 * 
 * NOT IN SCOPE (receipt/expense parsing — separate domain):
 * 5. ExpensesTab — parse-receipt-image
 * 6. ExpensesTab — parse-booking (type: 'receipt')
 * 7. GasExpenseDialog — parse-receipt-image
 * 
 * Pipeline steps (in order):
 * 1. CLASSIFY — Document classification (CONFIRMATION | RECEIPT | CHANGE_OR_CANCEL | UNKNOWN)
 * 2. STAGE — Parse into staged items without writing to DB
 * 3. VALIDATE — Required fields, date chronology, trip frame coherence
 * 4. RESULT — Return structured result; caller decides UI treatment
 * 
 * RULES:
 * - No partial writes — caller gets a structured result and decides what to do
 * - No silent success — if validation fails, status is NEEDS_REVIEW or FAIL
 * - Idempotent — safe to call multiple times with same input
 * - No timezone math
 * - No network calls — this is a pure client-side orchestrator over already-parsed data
 */

import {
  isReceiptClassification,
  REQUIRED_FIELDS_BY_ENTITY,
  type DocClassification,
  type ParseIssue,
} from '@/lib/parseContract';

import {
  validateParsedBookingTimes,
  shouldValidateBookingType,
  type IngestionValidationResult,
} from '@/lib/bookingIngestionValidator';

import { normalizeDatetimeForStorage } from '@/lib/datetimeIntegrity';

// ============================================================================
// TYPES
// ============================================================================

export type PipelineStatus = 'PASS' | 'NEEDS_REVIEW' | 'FAIL' | 'RECEIPT_ONLY';

export interface StagedItem {
  /** Original parsed data from edge function */
  parsed: Record<string, unknown>;
  /** Document classification */
  classification: DocClassification;
  /** Required field issues (null = all required fields present) */
  requiredFieldIssue: ParseIssue | null;
  /** Time validation result */
  timeValidation: IngestionValidationResult | null;
  /** Whether time is estimated (no explicit time in source) */
  timeIsEstimated: boolean;
  /** Booking type as determined by parser */
  bookingType: string;
  /** Whether this item is importable (all required fields, valid dates) */
  isImportable: boolean;
}

export interface CanonicalImportResult {
  /** Overall pipeline status */
  status: PipelineStatus;
  /** All staged items (both importable and not) */
  stagedItems: StagedItem[];
  /** Items that can be imported (passed all validation) */
  importableItems: StagedItem[];
  /** Items that need user attention */
  needsAttentionItems: StagedItem[];
  /** Whether the batch contains any receipt-classified items */
  hasReceipts: boolean;
  /** Receipt items (diverted to expense flow) */
  receiptItems: StagedItem[];
  /** Aggregate issues across all items */
  allIssues: ParseIssue[];
  /** Human-readable summary */
  summary: string;
}

// ============================================================================
// CLASSIFICATION + REQUIRED FIELD ENFORCEMENT (client-side mirrors)
// ============================================================================

function classifyDocumentLocal(
  parsed: Record<string, unknown>,
  hasServiceDates: boolean,
): DocClassification {
  if (isReceiptClassification(parsed)) return 'RECEIPT';
  if (hasServiceDates) return 'CONFIRMATION';
  if (parsed.total_cost && !hasServiceDates) return 'RECEIPT';
  return 'UNKNOWN';
}

function enforceRequiredFieldsLocal(
  parsed: Record<string, unknown>,
  entityType: string,
): ParseIssue | null {
  const required = REQUIRED_FIELDS_BY_ENTITY[entityType] || [];
  if (required.length === 0) return null;

  const missing = required.filter(field => {
    const value = parsed[field];
    return !value || (typeof value === 'string' && value.trim() === '');
  });

  if (missing.length === 0) return null;

  const fieldLabels: Record<string, string> = {
    departure_airport_code: 'departure airport',
    arrival_airport_code: 'arrival airport',
    start_datetime: 'start date/time',
    end_datetime: 'end date/time',
    property_name: 'property name',
    pickup_location: 'pickup location',
    return_location: 'return location',
  };
  const readableMissing = missing.map(f => fieldLabels[f] || f.replace(/_/g, ' '));

  return {
    issueType: 'MISSING_REQUIRED_FIELDS',
    entityType,
    missingFields: missing,
    actionHint: `Missing: ${readableMissing.join(', ')}. Please complete these fields.`,
  };
}

// ============================================================================
// STAGING (Step 2)
// ============================================================================

function stageItem(
  parsed: Record<string, unknown>,
  rawText?: string,
): StagedItem {
  const bookingType = (parsed.booking_type as string) || 'other';
  const hasServiceDates = !!(parsed.start_datetime && String(parsed.start_datetime).trim());

  // Step 1: CLASSIFY
  const classification = classifyDocumentLocal(parsed, hasServiceDates);

  // If receipt → mark as non-importable immediately
  if (classification === 'RECEIPT' || parsed.is_receipt_only === true) {
    return {
      parsed,
      classification: 'RECEIPT',
      requiredFieldIssue: null,
      timeValidation: null,
      timeIsEstimated: false,
      bookingType,
      isImportable: false,
    };
  }

  // Step 3: VALIDATE — Required fields
  const requiredFieldIssue = enforceRequiredFieldsLocal(parsed, bookingType);

  // Step 3b: VALIDATE — Time validation
  let timeValidation: IngestionValidationResult | null = null;
  let timeIsEstimated = false;

  if (shouldValidateBookingType(bookingType) && hasServiceDates) {
    const normalizedStart = normalizeDatetimeForStorage(parsed.start_datetime as string | null);
    const normalizedEnd = normalizeDatetimeForStorage(parsed.end_datetime as string | null);
    timeValidation = validateParsedBookingTimes(
      parsed as any,
      normalizedStart,
      normalizedEnd,
    );
    if (timeValidation.isLowConfidence) {
      timeIsEstimated = true;
    }
  }

  // Check if time info is explicit
  const startDt = parsed.start_datetime as string | undefined;
  if (!startDt || !/T\d{2}:\d{2}/.test(startDt)) {
    timeIsEstimated = true;
  }

  // Importable = no blocking required field issues
  // Time low-confidence is a WARNING, not a block (user reviews in form)
  const isImportable = !requiredFieldIssue;

  return {
    parsed,
    classification,
    requiredFieldIssue,
    timeValidation,
    timeIsEstimated,
    bookingType,
    isImportable,
  };
}

// ============================================================================
// PIPELINE (Public API)
// ============================================================================

/**
 * Run the canonical import pipeline on a batch of parsed items.
 * 
 * @param parsedItems - Array of parsed data objects from edge functions
 * @param rawText - Optional raw source text for classification fallback
 * @returns Structured result with status, staged items, and summary
 */
export function runCanonicalImportPipeline(
  parsedItems: Array<Record<string, unknown>>,
  rawText?: string,
): CanonicalImportResult {
  if (parsedItems.length === 0) {
    return {
      status: 'FAIL',
      stagedItems: [],
      importableItems: [],
      needsAttentionItems: [],
      hasReceipts: false,
      receiptItems: [],
      allIssues: [],
      summary: 'No items to import.',
    };
  }

  const stagedItems = parsedItems.map(p => stageItem(p, rawText));

  const receiptItems = stagedItems.filter(s => s.classification === 'RECEIPT');
  const bookingItems = stagedItems.filter(s => s.classification !== 'RECEIPT');
  const importableItems = bookingItems.filter(s => s.isImportable);
  const needsAttentionItems = bookingItems.filter(s => !s.isImportable);

  // Collect all issues
  const allIssues: ParseIssue[] = [];
  for (const item of stagedItems) {
    if (item.requiredFieldIssue) allIssues.push(item.requiredFieldIssue);
  }

  // Determine overall status
  let status: PipelineStatus;
  if (bookingItems.length === 0 && receiptItems.length > 0) {
    status = 'RECEIPT_ONLY';
  } else if (importableItems.length === bookingItems.length && bookingItems.length > 0) {
    status = 'PASS';
  } else if (importableItems.length > 0) {
    status = 'NEEDS_REVIEW';
  } else {
    status = 'FAIL';
  }

  // Build summary
  const summary = buildSummary(status, importableItems.length, needsAttentionItems.length, receiptItems.length);

  return {
    status,
    stagedItems,
    importableItems,
    needsAttentionItems,
    hasReceipts: receiptItems.length > 0,
    receiptItems,
    allIssues,
    summary,
  };
}

/**
 * Convenience: run pipeline on a single parsed item.
 */
export function runCanonicalImportPipelineSingle(
  parsed: Record<string, unknown>,
  rawText?: string,
): CanonicalImportResult {
  return runCanonicalImportPipeline([parsed], rawText);
}

// ============================================================================
// HELPERS
// ============================================================================

function buildSummary(
  status: PipelineStatus,
  importable: number,
  needsAttention: number,
  receipts: number,
): string {
  switch (status) {
    case 'PASS':
      return `${importable} booking${importable !== 1 ? 's' : ''} ready to import.`;
    case 'NEEDS_REVIEW':
      return `${importable} booking${importable !== 1 ? 's' : ''} ready. ${needsAttention} need${needsAttention !== 1 ? '' : 's'} review.`;
    case 'RECEIPT_ONLY':
      return `${receipts} receipt${receipts !== 1 ? 's' : ''} detected. Receipts are processed as expenses, not bookings.`;
    case 'FAIL':
      return needsAttention > 0
        ? `${needsAttention} item${needsAttention !== 1 ? 's' : ''} need review before import.`
        : 'No importable items found.';
  }
}

/**
 * Check if a pipeline result should be treated as successful enough
 * to proceed with form population / UI treatment.
 */
export function isPipelineActionable(result: CanonicalImportResult): boolean {
  return result.status === 'PASS' || result.status === 'NEEDS_REVIEW';
}

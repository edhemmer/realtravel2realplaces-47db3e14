/**
 * v3.9.21: Canonical Booking Cost Attribution
 *
 * Determines how costs from confirmations are attributed:
 * - BOOKING_TOTAL: One total covers all legs (e.g., BA "Payment Total USD 924.00")
 * - PER_LEG: Per-segment prices explicitly provided
 * - MIXED_NEEDS_REVIEW: Ambiguous — multiple totals that don't reconcile
 * - NONE: No cost data found
 *
 * RULES:
 * - No guessing. If ambiguous, mark MIXED_NEEDS_REVIEW.
 * - Booking totals stored once, never copied to each leg.
 * - Per-leg costs only assigned when explicitly provided.
 * - UI may display booking total on first leg (derived, not stored).
 */

// ============================================================================
// TYPES
// ============================================================================

export type CostAttributionMode = 'BOOKING_TOTAL' | 'PER_LEG' | 'NONE' | 'MIXED_NEEDS_REVIEW';
export type CostConfidence = 'HIGH' | 'MED' | 'LOW';
export type CostSource = 'email' | 'manual';

export interface BookingCostTotal {
  amount: number;
  currency: string;
  source: CostSource;
  confidence: CostConfidence;
}

export interface CostBreakdownItem {
  label: string;
  amount: number;
  currency: string;
}

export interface LegCost {
  amount: number;
  currency: string;
  source: CostSource;
  confidence: CostConfidence;
}

export interface LegCostSourceRef {
  confirmationId: string;
  extractedFrom: string;
}

export interface CostAttributionResult {
  costAttributionMode: CostAttributionMode;
  bookingCostTotal: BookingCostTotal | null;
  bookingCostBreakdown: CostBreakdownItem[];
  /** Per-leg costs keyed by leg index (0-based) */
  perLegCosts: Map<number, LegCost>;
}

// ============================================================================
// MONETARY EXTRACTION PATTERNS
// ============================================================================

/** Patterns that indicate a booking-level total */
const BOOKING_TOTAL_PATTERNS = [
  /payment\s+total\s*[:=]?\s*([A-Z]{3})?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  /total\s+paid\s*[:=]?\s*([A-Z]{3})?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  /grand\s+total\s*[:=]?\s*([A-Z]{3})?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  /amount\s+charged\s*[:=]?\s*([A-Z]{3})?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  /total\s+charge[ds]?\s*[:=]?\s*([A-Z]{3})?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  /total\s+amount\s*[:=]?\s*([A-Z]{3})?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  /(?:^|\n)\s*total\s*[:=]?\s*([A-Z]{3})?\s*\$?\s*([\d,]+(?:\.\d{2})?)/im,
];

/** Patterns for per-leg/segment pricing */
const PER_LEG_COST_PATTERNS = [
  /(?:fare|price|cost)\s*[:=]?\s*([A-Z]{3})?\s*\$?\s*([\d,]+(?:\.\d{2})?)\s*(?:per\s+(?:passenger|person|segment|leg))/i,
  /segment\s+(?:fare|price|cost)\s*[:=]?\s*([A-Z]{3})?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
];

interface MonetaryCandidate {
  amount: number;
  currency: string;
  label: string;
  confidence: CostConfidence;
  isBookingTotal: boolean;
  isPerLeg: boolean;
}

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Extract monetary total candidates from confirmation text.
 * Returns structured candidates with confidence scores.
 */
export function extractMonetaryTotalsFromConfirmation(text: string): MonetaryCandidate[] {
  if (!text || typeof text !== 'string') return [];

  const candidates: MonetaryCandidate[] = [];

  // Check booking total patterns
  for (const pattern of BOOKING_TOTAL_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const currency = match[1] || 'USD';
      const amountStr = match[2]?.replace(/,/g, '');
      const amount = parseFloat(amountStr || '0');
      if (amount > 0 && Number.isFinite(amount)) {
        candidates.push({
          amount,
          currency,
          label: match[0].trim(),
          confidence: 'HIGH',
          isBookingTotal: true,
          isPerLeg: false,
        });
      }
    }
  }

  // Check per-leg patterns
  for (const pattern of PER_LEG_COST_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const currency = match[1] || 'USD';
      const amountStr = match[2]?.replace(/,/g, '');
      const amount = parseFloat(amountStr || '0');
      if (amount > 0 && Number.isFinite(amount)) {
        candidates.push({
          amount,
          currency,
          label: match[0].trim(),
          confidence: 'MED',
          isBookingTotal: false,
          isPerLeg: true,
        });
      }
    }
  }

  return candidates;
}

/**
 * Extract per-leg costs when explicitly present in confirmation text.
 * Returns a map of leg index → cost.
 */
export function extractPerLegCosts(text: string): Map<number, LegCost> {
  const result = new Map<number, LegCost>();
  if (!text || typeof text !== 'string') return result;

  // Look for segment-by-segment pricing patterns
  const segmentPattern = /(?:segment|leg|flight)\s*(\d+)?\s*[:=]?\s*([A-Z]{3})?\s*\$?\s*([\d,]+(?:\.\d{2})?)/gi;
  let match: RegExpExecArray | null;
  let legIndex = 0;

  while ((match = segmentPattern.exec(text)) !== null) {
    const explicitIndex = match[1] ? parseInt(match[1], 10) - 1 : legIndex;
    const currency = match[2] || 'USD';
    const amountStr = match[3]?.replace(/,/g, '');
    const amount = parseFloat(amountStr || '0');

    if (amount > 0 && Number.isFinite(amount)) {
      result.set(explicitIndex, {
        amount,
        currency,
        source: 'email',
        confidence: 'MED',
      });
    }
    legIndex++;
  }

  return result;
}

// ============================================================================
// COST ATTRIBUTION RESOLVER
// ============================================================================

/**
 * Determine cost attribution mode from parsed data.
 * Uses deterministic rules — no guessing.
 *
 * @param parsedData - The parsed booking data from AI parser
 * @param rawText - Optional raw confirmation text for extraction
 * @param legCount - Number of legs in the booking (1 for single, >1 for multi-leg)
 */
export function resolveCostAttribution(
  parsedData: Record<string, unknown>,
  rawText?: string,
  legCount: number = 1,
): CostAttributionResult {
  const totalCost = parsedData.total_cost as number | null | undefined;
  const hasTotalCost = typeof totalCost === 'number' && totalCost > 0 && Number.isFinite(totalCost);

  // Extract from raw text if available
  const textCandidates = rawText ? extractMonetaryTotalsFromConfirmation(rawText) : [];
  const textPerLeg = rawText ? extractPerLegCosts(rawText) : new Map<number, LegCost>();

  const bookingTotalCandidates = textCandidates.filter(c => c.isBookingTotal);
  const perLegCandidates = textCandidates.filter(c => c.isPerLeg);

  // Decision tree (deterministic)

  // Case 1: Per-leg costs explicitly found in text
  if (textPerLeg.size > 0 && textPerLeg.size >= legCount) {
    // Check if there's also a booking total that doesn't reconcile
    if (bookingTotalCandidates.length > 0) {
      const perLegSum = Array.from(textPerLeg.values()).reduce((s, l) => s + l.amount, 0);
      const bookingTotal = bookingTotalCandidates[0].amount;
      const tolerance = bookingTotal * 0.05; // 5% tolerance

      if (Math.abs(perLegSum - bookingTotal) <= tolerance) {
        // Reconciles — use per-leg
        return {
          costAttributionMode: 'PER_LEG',
          bookingCostTotal: {
            amount: bookingTotal,
            currency: bookingTotalCandidates[0].currency,
            source: 'email',
            confidence: 'HIGH',
          },
          bookingCostBreakdown: [],
          perLegCosts: textPerLeg,
        };
      } else {
        // Doesn't reconcile — flag for review
        return {
          costAttributionMode: 'MIXED_NEEDS_REVIEW',
          bookingCostTotal: {
            amount: bookingTotal,
            currency: bookingTotalCandidates[0].currency,
            source: 'email',
            confidence: 'LOW',
          },
          bookingCostBreakdown: textCandidates.map(c => ({
            label: c.label,
            amount: c.amount,
            currency: c.currency,
          })),
          perLegCosts: textPerLeg,
        };
      }
    }

    // Per-leg only, no booking total
    return {
      costAttributionMode: 'PER_LEG',
      bookingCostTotal: null,
      bookingCostBreakdown: [],
      perLegCosts: textPerLeg,
    };
  }

  // Case 2: Clear booking total from parser or text
  if (hasTotalCost) {
    const confidence: CostConfidence = bookingTotalCandidates.length > 0 ? 'HIGH' : 'MED';
    const currency = bookingTotalCandidates[0]?.currency || 'USD';

    return {
      costAttributionMode: 'BOOKING_TOTAL',
      bookingCostTotal: {
        amount: totalCost!,
        currency,
        source: 'email',
        confidence,
      },
      bookingCostBreakdown: textCandidates.map(c => ({
        label: c.label,
        amount: c.amount,
        currency: c.currency,
      })),
      perLegCosts: new Map(),
    };
  }

  // Case 3: Booking total from text extraction only (parser didn't capture)
  if (bookingTotalCandidates.length === 1) {
    return {
      costAttributionMode: 'BOOKING_TOTAL',
      bookingCostTotal: {
        amount: bookingTotalCandidates[0].amount,
        currency: bookingTotalCandidates[0].currency,
        source: 'email',
        confidence: 'MED',
      },
      bookingCostBreakdown: [],
      perLegCosts: new Map(),
    };
  }

  // Case 4: Multiple ambiguous totals
  if (bookingTotalCandidates.length > 1 || (perLegCandidates.length > 0 && bookingTotalCandidates.length > 0)) {
    return {
      costAttributionMode: 'MIXED_NEEDS_REVIEW',
      bookingCostTotal: null,
      bookingCostBreakdown: textCandidates.map(c => ({
        label: c.label,
        amount: c.amount,
        currency: c.currency,
      })),
      perLegCosts: new Map(),
    };
  }

  // Case 5: No cost data
  return {
    costAttributionMode: 'NONE',
    bookingCostTotal: null,
    bookingCostBreakdown: [],
    perLegCosts: new Map(),
  };
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * For BOOKING_TOTAL mode, determine if a specific booking (by index in a
 * multi-leg group) should display the total.
 * Only the first leg (index 0) displays the booking total.
 */
export function shouldDisplayBookingTotal(
  costAttributionMode: CostAttributionMode,
  legIndex: number,
): boolean {
  if (costAttributionMode !== 'BOOKING_TOTAL') return false;
  return legIndex === 0;
}

/**
 * Get display cost for a specific booking in a multi-leg group.
 * Returns the amount to show (0 for non-first legs in BOOKING_TOTAL mode).
 */
export function getDisplayCostForLeg(
  costAttributionMode: CostAttributionMode,
  bookingCostTotal: BookingCostTotal | null,
  perLegCosts: Map<number, LegCost>,
  legIndex: number,
  fallbackCost: number,
): number {
  switch (costAttributionMode) {
    case 'BOOKING_TOTAL':
      // Only first leg shows the total (display-derived)
      return legIndex === 0 ? (bookingCostTotal?.amount ?? fallbackCost) : 0;

    case 'PER_LEG': {
      const legCost = perLegCosts.get(legIndex);
      return legCost?.amount ?? fallbackCost;
    }

    case 'MIXED_NEEDS_REVIEW':
    case 'NONE':
    default:
      // For NONE/MIXED, fall back to whatever cost is on the booking record
      return fallbackCost;
  }
}

/**
 * Check if a booking's cost needs review due to ambiguous attribution.
 */
export function costNeedsReview(costAttributionMode: CostAttributionMode): boolean {
  return costAttributionMode === 'MIXED_NEEDS_REVIEW';
}

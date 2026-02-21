/**
 * v3.9.9: Flight Cost Intelligence
 *
 * Provides three capabilities for the import pipeline:
 * 1. Primary charge line detection (single cost per confirmation)
 * 2. Multi-currency preference (user-currency-aware selection)
 * 3. Declined/cancelled confirmation detection
 *
 * RULES:
 * - No date/time math
 * - No currency conversion
 * - Pure string matching, deterministic
 * - Never creates more than one cost per confirmation
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CostCandidate {
  amount: number;
  currency: string;
  label: string;
  /** True if this line matches "Equivalent to", "Approx.", etc. */
  isEstimateOrEquivalent: boolean;
}

export interface AltTotal {
  amount: number;
  currency: string;
  label: string;
}

export interface FlightCostResult {
  /** The canonical charge amount (null if none found) */
  totalCost: number | null;
  /** The canonical charge currency (null if none found) */
  currency: string | null;
  /** Alternative totals from other currencies in the same confirmation */
  altTotals: AltTotal[];
}

// ============================================================================
// DECLINED / CANCELLED DETECTION
// ============================================================================

const DECLINED_PATTERNS = [
  /\bdeclined\b/i,
  /\bdecline\b/i,
  /\brejected\b/i,
  /\bvoid(?:ed)?\b/i,
  /\bcancell?ed\b/i,
  /\bdid\s+not\s+go\s+through\b/i,
  /\bpayment\s+failed\b/i,
  /\btransaction\s+failed\b/i,
  /\bnot\s+(?:been\s+)?(?:confirmed|approved)\b/i,
  /\bunsuccessful\b/i,
];

/**
 * Detect whether a confirmation represents a declined, cancelled, or voided item.
 * Only returns true when the status indicators are clearly present.
 * Confirmed flights with valid itineraries are NOT flagged.
 */
export function isDeclinedOrCancelled(
  parsed: Record<string, unknown>,
): boolean {
  // Check AI-extracted flag first
  if (parsed.is_payment_declined === true || parsed._payment_declined === true) {
    return true;
  }

  // Check subject/notes for declined indicators
  const subject = String(parsed._email_subject || parsed.subject || '');
  const notes = String(parsed.notes || '');
  const docClass = String(parsed._doc_classification || '');

  // If doc classification is CHANGE_OR_CANCEL, flag it
  if (docClass === 'CHANGE_OR_CANCEL') return true;

  // Check subject and notes for strong declined indicators
  const textToScan = `${subject} ${notes}`;
  for (const pattern of DECLINED_PATTERNS) {
    if (pattern.test(textToScan)) {
      // But only if there are no confirmed service dates
      // (a confirmed flight with dates is not declined just because "cancelled" appears in notes about something else)
      const hasConfirmedDates = !!(parsed.start_datetime && String(parsed.start_datetime).length >= 10);
      if (!hasConfirmedDates) return true;
    }
  }

  return false;
}

/**
 * Check if a CanonicalBooking represents a declined/cancelled item.
 * Used to filter bookings before DB insertion.
 */
export function isDeclinedCanonicalBooking(
  booking: Record<string, unknown>,
): boolean {
  // Check _parse_issues for declined markers
  const issues = booking._parse_issues;
  if (Array.isArray(issues)) {
    for (const issue of issues) {
      const issueObj = issue as Record<string, unknown>;
      if (issueObj?.issueType === 'PAYMENT_DECLINED') return true;
    }
  }

  // Check doc classification
  if (booking._doc_classification === 'CHANGE_OR_CANCEL') return true;

  return false;
}

// ============================================================================
// MONETARY EXTRACTION
// ============================================================================

/** Patterns for "total" / "amount charged" lines */
const TOTAL_LINE_PATTERNS = [
  /(?:payment\s+total|total\s+paid|grand\s+total|amount\s+charged|amount\s+due|total\s+charge[ds]?|total\s+amount|total\s+price)\s*[:=]?\s*/i,
  /(?:^|\n)\s*total\s*[:=]?\s*/im,
];

/** Patterns for estimate / equivalent lines to IGNORE */
const ESTIMATE_PATTERNS = [
  /\bequivalent\s+to\b/i,
  /\bapprox\.?\b/i,
  /\bconverted\b/i,
  /\bfor\s+reference\b/i,
  /\bestimated?\b/i,
  /\bindicative\b/i,
];

/** Extract amount+currency from a text fragment */
const AMOUNT_CURRENCY_PATTERNS = [
  // "USD 924.00" or "EUR 146.40"
  /([A-Z]{3})\s+([\d,]+(?:\.\d{1,2})?)/,
  // "$924.00" or "€146.40"
  /([€£$¥₹])\s*([\d,]+(?:\.\d{1,2})?)/,
  // "924.00 USD" or "146.40 EUR"
  /([\d,]+(?:\.\d{1,2})?)\s+([A-Z]{3})/,
  // "924.00" (no currency)
  /(?:^|\s)([\d,]+\.\d{2})(?:\s|$)/,
];

const SYMBOL_TO_CODE: Record<string, string> = {
  '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR',
};

/**
 * Extract all monetary candidates from a confirmation text.
 * Each candidate has amount, currency, label, and estimate flag.
 */
export function extractAllMonetaryCandidates(text: string): CostCandidate[] {
  if (!text || typeof text !== 'string') return [];

  const candidates: CostCandidate[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if this line contains a total-related keyword
    const isTotalLine = TOTAL_LINE_PATTERNS.some(p => p.test(trimmed));
    if (!isTotalLine) continue;

    // Check if this is an estimate/equivalent line
    const isEstimate = ESTIMATE_PATTERNS.some(p => p.test(trimmed));

    // Extract all amount+currency pairs from this line
    for (const pattern of AMOUNT_CURRENCY_PATTERNS) {
      const matches = trimmed.match(pattern);
      if (!matches) continue;

      let amount: number;
      let currency: string;

      if (/^[A-Z]{3}$/.test(matches[1])) {
        // "USD 924.00" pattern
        currency = matches[1];
        amount = parseFloat(matches[2].replace(/,/g, ''));
      } else if (SYMBOL_TO_CODE[matches[1]]) {
        // "$924.00" pattern
        currency = SYMBOL_TO_CODE[matches[1]];
        amount = parseFloat(matches[2].replace(/,/g, ''));
      } else if (/^[\d,]+/.test(matches[1]) && /^[A-Z]{3}$/.test(matches[2])) {
        // "924.00 USD" pattern
        amount = parseFloat(matches[1].replace(/,/g, ''));
        currency = matches[2];
      } else if (/^\d/.test(matches[1] || matches[0])) {
        // Plain number — no currency
        amount = parseFloat((matches[1] || matches[0]).replace(/,/g, ''));
        currency = ''; // Will default later
      } else {
        continue;
      }

      if (!Number.isFinite(amount) || amount <= 0) continue;

      candidates.push({
        amount,
        currency,
        label: trimmed.substring(0, 80),
        isEstimateOrEquivalent: isEstimate,
      });
      break; // One amount per line
    }
  }

  return candidates;
}

// ============================================================================
// PRIMARY CHARGE RESOLUTION
// ============================================================================

/**
 * Resolve the primary charge for a flight confirmation.
 *
 * Rules (in order):
 * 1. Filter out estimate/equivalent lines.
 * 2. If user has a preferred currency and a candidate matches it, prefer that.
 * 3. Among remaining candidates in the same currency, pick the LAST one in the document.
 * 4. Store non-selected currencies as alt_totals.
 *
 * @param parsed - The AI-extracted parsed data
 * @param rawText - Optional raw email text for fallback extraction
 * @param userCurrency - User's preferred currency (e.g., 'USD')
 */
export function resolveFlightCost(
  parsed: Record<string, unknown>,
  rawText?: string,
  userCurrency?: string,
): FlightCostResult {
  const aiCost = parsed.total_cost as number | null | undefined;
  const aiCurrency = (parsed.currency_code as string) || (parsed._extracted_currency as string) || null;

  // If AI already extracted a valid cost + currency, use it as primary candidate
  const candidates: CostCandidate[] = [];

  if (typeof aiCost === 'number' && aiCost > 0 && Number.isFinite(aiCost)) {
    candidates.push({
      amount: aiCost,
      currency: aiCurrency || '',
      label: 'AI-extracted total_cost',
      isEstimateOrEquivalent: false,
    });
  }

  // Also extract from raw text if available
  if (rawText) {
    const textCandidates = extractAllMonetaryCandidates(rawText);
    candidates.push(...textCandidates);
  }

  if (candidates.length === 0) {
    return { totalCost: null, currency: null, altTotals: [] };
  }

  // Filter out estimates
  const realCandidates = candidates.filter(c => !c.isEstimateOrEquivalent);
  if (realCandidates.length === 0) {
    return { totalCost: null, currency: null, altTotals: [] };
  }

  // Group by currency
  const byCurrency = new Map<string, CostCandidate[]>();
  for (const c of realCandidates) {
    const key = c.currency || 'UNKNOWN';
    if (!byCurrency.has(key)) byCurrency.set(key, []);
    byCurrency.get(key)!.push(c);
  }

  // For each currency group, pick the LAST candidate (last occurrence in document)
  const perCurrency: CostCandidate[] = [];
  for (const [, group] of byCurrency) {
    perCurrency.push(group[group.length - 1]);
  }

  // If user has a preferred currency and a candidate matches, use it
  const uc = (userCurrency || '').toUpperCase();
  let primary: CostCandidate;
  const altTotals: AltTotal[] = [];

  const userMatch = uc ? perCurrency.find(c => c.currency.toUpperCase() === uc) : null;

  if (userMatch) {
    primary = userMatch;
    // Store others as alt_totals
    for (const c of perCurrency) {
      if (c !== primary) {
        altTotals.push({ amount: c.amount, currency: c.currency, label: c.label });
      }
    }
  } else {
    // No user-currency match: pick the last candidate overall (last in document)
    primary = realCandidates[realCandidates.length - 1];
    for (const c of perCurrency) {
      if (c !== primary) {
        altTotals.push({ amount: c.amount, currency: c.currency, label: c.label });
      }
    }
  }

  return {
    totalCost: primary.amount,
    currency: primary.currency || null,
    altTotals,
  };
}

// ============================================================================
// ENRICHMENT — Apply to parsed booking data
// ============================================================================

/**
 * Enrich a parsed booking record with intelligent cost extraction.
 * Applies primary charge line detection and multi-currency preference.
 * Mutates the parsed record in place.
 *
 * @param parsed - Raw parsed data from AI
 * @param rawText - Raw email/confirmation text
 * @param userCurrency - User's preferred currency
 * @returns The mutated parsed record
 */
export function enrichFlightCostIntelligence(
  parsed: Record<string, unknown>,
  rawText?: string,
  userCurrency?: string,
): Record<string, unknown> {
  const bookingType = (parsed.booking_type as string) || '';
  if (bookingType !== 'flight') return parsed;

  // Only enrich if cost is missing or zero
  const existingCost = parsed.total_cost as number | null | undefined;
  if (typeof existingCost === 'number' && existingCost > 0 && Number.isFinite(existingCost)) {
    // Cost already set by AI — still apply multi-currency preference if raw text available
    if (rawText && userCurrency) {
      const result = resolveFlightCost(parsed, rawText, userCurrency);
      if (result.totalCost !== null) {
        parsed.total_cost = result.totalCost;
        if (result.currency) {
          parsed.currency_code = result.currency;
          parsed._extracted_currency = result.currency;
        }
        if (result.altTotals.length > 0) {
          parsed._alt_totals = result.altTotals;
        }
      }
    }
    return parsed;
  }

  // Cost missing — try to extract
  const result = resolveFlightCost(parsed, rawText, userCurrency);
  if (result.totalCost !== null) {
    parsed.total_cost = result.totalCost;
    if (result.currency) {
      parsed.currency_code = result.currency;
      parsed._extracted_currency = result.currency;
    }
    if (result.altTotals.length > 0) {
      parsed._alt_totals = result.altTotals;
    }
  }

  return parsed;
}

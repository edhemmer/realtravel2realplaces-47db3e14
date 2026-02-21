/**
 * v3.9.70: Expense Builder from Full Confirmation Batch
 *
 * Creates expense records from ALL parsed confirmations in a batch.
 * No drops, no duplicates, multi-currency safe.
 *
 * RULES:
 * - Iterate ALL confirmations — never skip silently
 * - isTotalForBooking → ONE expense for the entire booking (not per leg)
 * - Explicit per-leg costs → one expense per leg with legId
 * - Ambiguous → create single expense, mark needsReview
 * - Multi-currency: keep original currency, never convert
 * - If no conversion logic → store as-is, mark needsReview if non-USD
 * - Dedup by confirmationId to prevent re-import duplicates
 *
 * v3.9.70: Lodging expenses now correctly use 'lodging' category.
 * Car rental expenses use 'transport'. Activity uses 'activity'.
 */

import type { ParsedConfirmation, ExpenseRecord } from './types';
import { toDateTokenFromString } from '@/lib/dateTokenExtractor';
import { normalizeCurrencyCode, buildCurrencyAssumedNote } from '@/lib/currencyNormalization';

// ============================================================================
// CORE
// ============================================================================

/**
 * Build expense records from all confirmations in a batch.
 *
 * @param tripId - Trip to attach expenses to
 * @param confirmations - All parsed confirmations
 * @returns Array of ExpenseRecord ready for DB insertion
 */
export function buildExpensesFromConfirmations(
  tripId: string,
  confirmations: ParsedConfirmation[],
): ExpenseRecord[] {
  const expenses: ExpenseRecord[] = [];
  // v4.4.x: Currency-aware dedupe key: confirmationId + currency + totalCost
  // Ensures EUR 924 and USD 924 are NOT treated as duplicates.
  const seenDedupeKeys = new Set<string>();

  for (const conf of confirmations) {
    const dedupeKey = `${conf.confirmationId}::${conf.costCurrency || 'USD'}::${conf.totalCost ?? 'null'}`;
    if (seenDedupeKeys.has(dedupeKey)) continue;
    seenDedupeKeys.add(dedupeKey);

    // Skip if no cost data at all
    if (conf.totalCost === null && !hasAnyLegCost(conf)) continue;

    // v4.4.x: Normalize currency from raw confirmation data
    const normalizedCurrency = normalizeCurrencyCode(conf.costCurrency);
    const currency = normalizedCurrency || 'USD';
    const currencyWasAssumed = !normalizedCurrency && !conf.costCurrency;
    const needsCurrencyReview = currency !== 'USD';

    if (conf.type === 'FLIGHT') {
      const flightExpenses = buildFlightExpenses(tripId, conf, currency, needsCurrencyReview);
      if (currencyWasAssumed) {
        for (const fe of flightExpenses) {
          fe.notes = fe.notes ? `${fe.notes} | ${buildCurrencyAssumedNote(currency)}` : buildCurrencyAssumedNote(currency);
        }
      }
      expenses.push(...flightExpenses);
    } else {
      const bookingExpense = buildBookingExpense(tripId, conf, currency, needsCurrencyReview);
      if (currencyWasAssumed) {
        bookingExpense.notes = bookingExpense.notes ? `${bookingExpense.notes} | ${buildCurrencyAssumedNote(currency)}` : buildCurrencyAssumedNote(currency);
      }
      expenses.push(bookingExpense);
    }
  }

  return expenses;
}

// ============================================================================
// FLIGHT EXPENSES
// ============================================================================

function buildFlightExpenses(
  tripId: string,
  conf: ParsedConfirmation,
  currency: string,
  needsCurrencyReview: boolean,
): ExpenseRecord[] {
  const expenses: ExpenseRecord[] = [];

  // Check if there are explicit per-leg costs
  const legsWithCosts = conf.legs.filter(l => l.legCostAmount !== null && l.legCostAmount > 0);

  if (legsWithCosts.length > 0 && legsWithCosts.length === conf.legs.length) {
    // All legs have explicit costs → one expense per leg
    for (const leg of legsWithCosts) {
      const date = extractExpenseDate(leg.rawDepartureString || conf.rawStartString);
      const route = buildRouteDescription(leg.originCode || leg.originName, leg.destinationCode || leg.destinationName);
      expenses.push({
        tripId,
        date,
        category: 'transport',
        description: `${conf.vendorName || leg.airline || 'Flight'} ${route}`,
        amount: leg.legCostAmount!,
        currency: leg.legCostCurrency || currency,
        needsReview: needsCurrencyReview,
        notes: buildExpenseNotes(conf, leg.legId),
        confirmationId: conf.confirmationId,
        legId: leg.legId,
      });
    }
  } else if (conf.totalCost !== null && conf.totalCost > 0) {
    // Booking total → ONE expense for the entire booking (on first leg's date)
    const firstLeg = conf.legs[0];
    const date = extractExpenseDate(
      firstLeg?.rawDepartureString || conf.rawStartString,
    );
    const route = conf.legs.length > 0
      ? buildFullRouteDescription(conf)
      : '';

    expenses.push({
      tripId,
      date,
      category: 'transport',
      description: `${conf.vendorName || 'Flight'} ${route}`.trim(),
      amount: conf.totalCost,
      currency,
      needsReview: needsCurrencyReview || (legsWithCosts.length > 0 && legsWithCosts.length < conf.legs.length),
      notes: buildExpenseNotes(conf, null),
      confirmationId: conf.confirmationId,
      legId: null,
    });
  } else if (legsWithCosts.length > 0) {
    // Some legs have costs, some don't → create what we can, flag as needsReview
    for (const leg of legsWithCosts) {
      const date = extractExpenseDate(leg.rawDepartureString || conf.rawStartString);
      const route = buildRouteDescription(leg.originCode || leg.originName, leg.destinationCode || leg.destinationName);
      expenses.push({
        tripId,
        date,
        category: 'transport',
        description: `${conf.vendorName || leg.airline || 'Flight'} ${route}`,
        amount: leg.legCostAmount!,
        currency: leg.legCostCurrency || currency,
        needsReview: true,
        notes: `Partial leg costs detected. ${buildExpenseNotes(conf, leg.legId)}`,
        confirmationId: conf.confirmationId,
        legId: leg.legId,
      });
    }
  }

  return expenses;
}

// ============================================================================
// NON-FLIGHT EXPENSES
// ============================================================================

function buildBookingExpense(
  tripId: string,
  conf: ParsedConfirmation,
  currency: string,
  needsCurrencyReview: boolean,
): ExpenseRecord {
  const date = extractExpenseDate(conf.rawStartString);
  const amount = conf.totalCost || 0;

  return {
    tripId,
    date,
    category: mapTypeToExpenseCategory(conf.type),
    description: buildBookingDescription(conf),
    amount,
    currency,
    needsReview: needsCurrencyReview || amount === 0 || conf.needsReview,
    notes: buildExpenseNotes(conf, null),
    confirmationId: conf.confirmationId,
    legId: null,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function hasAnyLegCost(conf: ParsedConfirmation): boolean {
  return conf.legs.some(l => l.legCostAmount !== null && l.legCostAmount > 0);
}

function extractExpenseDate(raw: string | null | undefined): string {
  if (!raw) return new Date().toISOString().substring(0, 10);
  // Try to extract YYYY-MM-DD token
  const token = toDateTokenFromString(raw);
  if (token) return token;
  // Fallback: try substring
  if (raw.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.substring(0, 10);
  }
  return new Date().toISOString().substring(0, 10);
}

function buildRouteDescription(
  origin: string | null,
  destination: string | null,
): string {
  if (origin && destination) return `${origin} → ${destination}`;
  if (origin) return `from ${origin}`;
  if (destination) return `to ${destination}`;
  return '';
}

function buildFullRouteDescription(conf: ParsedConfirmation): string {
  if (conf.legs.length === 0) return '';
  const first = conf.legs[0];
  const last = conf.legs[conf.legs.length - 1];
  const origin = first.originCode || first.originName || '?';
  const dest = last.destinationCode || last.destinationName || '?';
  return `${origin} → ${dest}`;
}

function buildBookingDescription(conf: ParsedConfirmation): string {
  switch (conf.type) {
    case 'LODGING':
      return conf.propertyName || conf.vendorName || 'Hotel Stay';
    case 'CAR_RENTAL':
      return conf.vendorName ? `Car Rental - ${conf.vendorName}` : 'Car Rental';
    case 'ACTIVITY':
      return conf.vendorName || 'Activity';
    case 'TRANSPORT':
      return conf.vendorName || 'Transport';
    default:
      return conf.vendorName || 'Booking';
  }
}

function mapTypeToExpenseCategory(type: string): string {
  switch (type) {
    case 'FLIGHT':
    case 'CAR_RENTAL':
    case 'TRANSPORT':
      return 'transport';
    case 'LODGING':
      return 'lodging';
    case 'ACTIVITY':
      return 'activity';
    default:
      return 'other';
  }
}

function buildExpenseNotes(conf: ParsedConfirmation, legId: string | null): string {
  const parts: string[] = [];
  if (conf.confirmationNumber) {
    parts.push(`Ref: ${conf.confirmationNumber}`);
  }
  if (conf.costCurrency && conf.costCurrency !== 'USD') {
    parts.push(`Currency: ${conf.costCurrency}`);
  }
  if (legId) {
    parts.push(`Leg: ${legId}`);
  }
  if (conf.needsReview) {
    parts.push('⚠️ Review needed');
  }
  return parts.join(' | ');
}

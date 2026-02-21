/**
 * v3.9.9: Tests for Flight Cost Intelligence
 */
import { describe, it, expect } from 'vitest';
import {
  extractAllMonetaryCandidates,
  resolveFlightCost,
  enrichFlightCostIntelligence,
  isDeclinedOrCancelled,
  isDeclinedCanonicalBooking,
} from '../flightCostIntelligence';

describe('extractAllMonetaryCandidates', () => {
  it('extracts USD total from BA-style email', () => {
    const text = 'Your booking Y7ZBBD\nPayment Total USD 924.00\nThank you';
    const candidates = extractAllMonetaryCandidates(text);
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates[0].amount).toBe(924);
    expect(candidates[0].currency).toBe('USD');
  });

  it('extracts multiple currencies from Wizz-style email', () => {
    const text = 'Flight confirmed\nTotal: 146.40 EUR\nTotal: 196.32 USD\nEquivalent to 180.00 GBP';
    const candidates = extractAllMonetaryCandidates(text);
    const real = candidates.filter(c => !c.isEstimateOrEquivalent);
    expect(real.length).toBe(2);
    const eur = real.find(c => c.currency === 'EUR');
    const usd = real.find(c => c.currency === 'USD');
    expect(eur?.amount).toBe(146.40);
    expect(usd?.amount).toBe(196.32);
  });

  it('marks equivalent lines as estimates', () => {
    const text = 'Total: 196.32 USD\nTotal equivalent to 146.40 EUR';
    const candidates = extractAllMonetaryCandidates(text);
    expect(candidates.length).toBe(2);
    const estimate = candidates.find(c => c.isEstimateOrEquivalent);
    expect(estimate?.amount).toBe(146.40);
    expect(estimate?.currency).toBe('EUR');
  });

  it('returns empty for no totals', () => {
    const text = 'Hello, your flight is confirmed. No cost info here.';
    expect(extractAllMonetaryCandidates(text)).toEqual([]);
  });
});

describe('resolveFlightCost', () => {
  it('selects user currency when available', () => {
    const parsed = { booking_type: 'flight', total_cost: null, currency_code: null };
    const rawText = 'Total: 146.40 EUR\nTotal: 196.32 USD';
    const result = resolveFlightCost(parsed, rawText, 'USD');
    expect(result.totalCost).toBe(196.32);
    expect(result.currency).toBe('USD');
    expect(result.altTotals).toEqual([{ amount: 146.40, currency: 'EUR', label: expect.any(String) }]);
  });

  it('selects EUR when user prefers EUR', () => {
    const parsed = { booking_type: 'flight', total_cost: null, currency_code: null };
    const rawText = 'Total: 146.40 EUR\nTotal: 196.32 USD';
    const result = resolveFlightCost(parsed, rawText, 'EUR');
    expect(result.totalCost).toBe(146.40);
    expect(result.currency).toBe('EUR');
  });

  it('falls back to last candidate when no user currency match', () => {
    const parsed = { booking_type: 'flight', total_cost: null, currency_code: null };
    const rawText = 'Total: 146.40 EUR\nTotal: 50.00 GBP';
    const result = resolveFlightCost(parsed, rawText, 'USD');
    // No USD match; falls back to last candidate = GBP
    expect(result.totalCost).toBe(50.00);
    expect(result.currency).toBe('GBP');
  });

  it('uses AI-extracted cost when no raw text', () => {
    const parsed = { booking_type: 'flight', total_cost: 924, currency_code: 'USD' };
    const result = resolveFlightCost(parsed, undefined, 'USD');
    expect(result.totalCost).toBe(924);
    expect(result.currency).toBe('USD');
  });

  it('returns null when no candidates found', () => {
    const parsed = { booking_type: 'flight', total_cost: null };
    const result = resolveFlightCost(parsed, 'No cost info here', 'USD');
    expect(result.totalCost).toBeNull();
    expect(result.currency).toBeNull();
  });

  it('filters out estimate lines', () => {
    const parsed = { booking_type: 'flight', total_cost: null };
    const rawText = 'Equivalent to 146.40 EUR\nApprox. total: 200.00 USD';
    const result = resolveFlightCost(parsed, rawText, 'USD');
    // Both are estimates — should return null
    expect(result.totalCost).toBeNull();
  });
});

describe('enrichFlightCostIntelligence', () => {
  it('enriches missing flight cost from raw text', () => {
    const parsed: Record<string, unknown> = { booking_type: 'flight', total_cost: null };
    const rawText = 'Grand Total USD 262.40';
    enrichFlightCostIntelligence(parsed, rawText, 'USD');
    expect(parsed.total_cost).toBe(262.40);
    expect(parsed.currency_code).toBe('USD');
  });

  it('does not enrich non-flight bookings', () => {
    const parsed: Record<string, unknown> = { booking_type: 'stay', total_cost: null };
    enrichFlightCostIntelligence(parsed, 'Total: 500.00 USD', 'USD');
    expect(parsed.total_cost).toBeNull();
  });

  it('stores alt_totals for multi-currency', () => {
    const parsed: Record<string, unknown> = { booking_type: 'flight', total_cost: null };
    const rawText = 'Total: 146.40 EUR\nTotal: 196.32 USD';
    enrichFlightCostIntelligence(parsed, rawText, 'USD');
    expect(parsed.total_cost).toBe(196.32);
    expect(parsed._alt_totals).toEqual([{ amount: 146.40, currency: 'EUR', label: expect.any(String) }]);
  });

  it('preserves existing valid cost but applies multi-currency preference', () => {
    const parsed: Record<string, unknown> = { booking_type: 'flight', total_cost: 146.40, currency_code: 'EUR' };
    const rawText = 'Total: 146.40 EUR\nTotal: 196.32 USD';
    enrichFlightCostIntelligence(parsed, rawText, 'USD');
    // Should switch to USD since user prefers it
    expect(parsed.total_cost).toBe(196.32);
    expect(parsed.currency_code).toBe('USD');
  });
});

describe('isDeclinedOrCancelled', () => {
  it('detects AI-flagged declined payment', () => {
    expect(isDeclinedOrCancelled({ is_payment_declined: true })).toBe(true);
  });

  it('detects _payment_declined flag', () => {
    expect(isDeclinedOrCancelled({ _payment_declined: true })).toBe(true);
  });

  it('detects CHANGE_OR_CANCEL classification', () => {
    expect(isDeclinedOrCancelled({ _doc_classification: 'CHANGE_OR_CANCEL' })).toBe(true);
  });

  it('detects declined in subject without service dates', () => {
    expect(isDeclinedOrCancelled({ _email_subject: 'Your rental car booking was Declined', start_datetime: null })).toBe(true);
  });

  it('does NOT flag confirmed flights with dates even if "cancelled" in notes', () => {
    expect(isDeclinedOrCancelled({ 
      notes: 'Free cancellation available',
      start_datetime: '2026-03-15T10:00:00',
    })).toBe(false);
  });

  it('returns false for normal bookings', () => {
    expect(isDeclinedOrCancelled({ vendor_name: 'BA', start_datetime: '2026-03-15' })).toBe(false);
  });
});

describe('isDeclinedCanonicalBooking', () => {
  it('detects PAYMENT_DECLINED parse issue', () => {
    expect(isDeclinedCanonicalBooking({
      _parse_issues: [{ issueType: 'PAYMENT_DECLINED' }],
    })).toBe(true);
  });

  it('detects CHANGE_OR_CANCEL doc classification', () => {
    expect(isDeclinedCanonicalBooking({
      _doc_classification: 'CHANGE_OR_CANCEL',
    })).toBe(true);
  });

  it('returns false for normal booking', () => {
    expect(isDeclinedCanonicalBooking({
      _doc_classification: 'CONFIRMATION',
    })).toBe(false);
  });
});

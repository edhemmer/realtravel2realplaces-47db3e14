/**
 * v5.2.0: Tests for enrichParsedBookingCost and extractMonetaryTotalsFromConfirmation
 * Includes carrier-specific cost extraction for Ryanair, Wizz Air, British Airways
 */
import { describe, it, expect } from 'vitest';
import {
  extractMonetaryTotalsFromConfirmation,
  enrichParsedBookingCost,
} from '../costAttribution';

describe('extractMonetaryTotalsFromConfirmation', () => {
  it('extracts "Payment Total USD 924.00"', () => {
    const text = 'Your booking ref Y7ZBBD\nPayment Total USD 924.00\nThank you';
    const candidates = extractMonetaryTotalsFromConfirmation(text);
    const totals = candidates.filter(c => c.isBookingTotal);
    expect(totals.length).toBeGreaterThanOrEqual(1);
    expect(totals[0].amount).toBe(924);
    expect(totals[0].currency).toBe('USD');
  });

  it('extracts "Total Paid $124.95"', () => {
    const text = 'Ryanair confirmation\nTotal Paid $124.95';
    const candidates = extractMonetaryTotalsFromConfirmation(text);
    const totals = candidates.filter(c => c.isBookingTotal);
    expect(totals.length).toBeGreaterThanOrEqual(1);
    expect(totals[0].amount).toBe(124.95);
  });

  it('extracts "Grand Total EUR 1,250.00"', () => {
    const text = 'Grand Total EUR 1,250.00';
    const candidates = extractMonetaryTotalsFromConfirmation(text);
    const totals = candidates.filter(c => c.isBookingTotal);
    expect(totals.length).toBeGreaterThanOrEqual(1);
    expect(totals[0].amount).toBe(1250);
    expect(totals[0].currency).toBe('EUR');
  });

  it('extracts "Amount Paid USD 500.00"', () => {
    const text = 'Amount Paid USD 500.00';
    const candidates = extractMonetaryTotalsFromConfirmation(text);
    const totals = candidates.filter(c => c.isBookingTotal);
    expect(totals.length).toBeGreaterThanOrEqual(1);
    expect(totals[0].amount).toBe(500);
  });

  it('returns empty for no monetary values', () => {
    const candidates = extractMonetaryTotalsFromConfirmation('Hello world, no money here');
    expect(candidates.length).toBe(0);
  });

  // ── v5.2.0: CARRIER-SPECIFIC TESTS ──────────────────────────────────

  it('extracts Ryanair "Total price of your trip purchased via PayPal" format', () => {
    const text = 'Receipt:\nTotal price of your trip purchased via PayPal ending in: 0000\t262.40 USD\n\nVAT is not applicable';
    const candidates = extractMonetaryTotalsFromConfirmation(text);
    const totals = candidates.filter(c => c.isBookingTotal);
    expect(totals.length).toBeGreaterThanOrEqual(1);
    const match = totals.find(t => t.amount === 262.40);
    expect(match).toBeDefined();
    expect(match!.currency).toBe('USD');
  });

  it('extracts Wizz Air "Grand total" with amount-before-currency (EUR)', () => {
    const text = 'Description \t \tTotal\nFare price\t46.99  EUR\nGrand total \t \t146.44  EUR';
    const candidates = extractMonetaryTotalsFromConfirmation(text);
    const totals = candidates.filter(c => c.isBookingTotal);
    expect(totals.length).toBeGreaterThanOrEqual(1);
    const match = totals.find(t => t.amount === 146.44);
    expect(match).toBeDefined();
    expect(match!.currency).toBe('EUR');
  });

  it('extracts Wizz Air confirmed payment row with USD conversion', () => {
    const text = '27/01/2026\tV2\t417946783\tconfirmed\t146.44 EUR\t196.32 USD';
    const candidates = extractMonetaryTotalsFromConfirmation(text);
    const totals = candidates.filter(c => c.isBookingTotal);
    expect(totals.length).toBeGreaterThanOrEqual(1);
    // Should capture at least the USD amount from the confirmed row
    const usdMatch = totals.find(t => t.currency === 'USD');
    expect(usdMatch).toBeDefined();
  });

  it('extracts Ryanair "purchased via" alternate format', () => {
    const text = 'Total price of your trip purchased via PayPal ending in: 0000\n262.40 USD';
    const candidates = extractMonetaryTotalsFromConfirmation(text);
    const totals = candidates.filter(c => c.isBookingTotal);
    const match = totals.find(t => t.amount === 262.40);
    expect(match).toBeDefined();
    expect(match!.currency).toBe('USD');
  });
});

describe('enrichParsedBookingCost', () => {
  it('enriches missing total_cost from raw text', () => {
    const parsed: Record<string, unknown> = { vendor_name: 'British Airways', total_cost: null };
    const rawText = 'Booking Y7ZBBD\nPayment Total USD 924.00\nThank you';
    enrichParsedBookingCost(parsed, rawText);
    expect(parsed.total_cost).toBe(924);
  });

  it('does NOT overwrite existing valid cost', () => {
    const parsed: Record<string, unknown> = { vendor_name: 'Ryanair', total_cost: 124.95 };
    const rawText = 'Payment Total USD 999.00';
    enrichParsedBookingCost(parsed, rawText);
    expect(parsed.total_cost).toBe(124.95);
  });

  it('enriches when total_cost is 0', () => {
    const parsed: Record<string, unknown> = { total_cost: 0 };
    const rawText = 'Total Paid $50.00';
    enrichParsedBookingCost(parsed, rawText);
    expect(parsed.total_cost).toBe(50);
  });

  it('does nothing when no raw text', () => {
    const parsed: Record<string, unknown> = { total_cost: null };
    enrichParsedBookingCost(parsed, undefined);
    expect(parsed.total_cost).toBeNull();
  });

  // ── v5.2.0: CARRIER-SPECIFIC ENRICHMENT TESTS ──────────────────────

  it('enriches Ryanair booking with cost from raw text', () => {
    const parsed: Record<string, unknown> = {
      vendor_name: 'Ryanair',
      confirmation_number: 'LPND9L',
      total_cost: null,
    };
    const rawText = 'Reservation:\nLPND9L\n\nReceipt:\nTotal price of your trip purchased via PayPal ending in: 0000\t262.40 USD';
    enrichParsedBookingCost(parsed, rawText);
    expect(parsed.total_cost).toBe(262.40);
    expect(parsed.currency_code).toBe('USD');
  });

  it('enriches Wizz Air booking with EUR cost from raw text', () => {
    const parsed: Record<string, unknown> = {
      vendor_name: 'Wizz Air',
      confirmation_number: 'KHRBMI',
      total_cost: null,
    };
    const rawText = 'Flight confirmation code: \tKHRBMI\n\nGrand total \t \t146.44  EUR';
    enrichParsedBookingCost(parsed, rawText);
    expect(parsed.total_cost).toBe(146.44);
    expect(parsed.currency_code).toBe('EUR');
  });

  it('propagates currency_code on enrichment', () => {
    const parsed: Record<string, unknown> = {
      vendor_name: 'Test Airline',
      total_cost: null,
    };
    const rawText = 'Grand Total EUR 500.00';
    enrichParsedBookingCost(parsed, rawText);
    expect(parsed.total_cost).toBe(500);
    expect(parsed.currency_code).toBe('EUR');
  });
});

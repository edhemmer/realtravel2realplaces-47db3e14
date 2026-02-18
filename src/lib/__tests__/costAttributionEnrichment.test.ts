/**
 * v3.9.28: Tests for enrichParsedBookingCost and extractMonetaryTotalsFromConfirmation
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
});

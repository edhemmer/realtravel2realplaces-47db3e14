/**
 * v3.9.36: Monetary Normalization Tests
 */
import { describe, it, expect } from 'vitest';
import { normalizeMonetaryAmount, safeMonetaryForDb } from '../monetaryNormalization';

describe('normalizeMonetaryAmount', () => {
  it('accepts valid numbers', () => {
    expect(normalizeMonetaryAmount(924)).toEqual({ kind: 'ok', numeric: 924 });
    expect(normalizeMonetaryAmount(0)).toEqual({ kind: 'ok', numeric: 0 });
    expect(normalizeMonetaryAmount(1234.56)).toEqual({ kind: 'ok', numeric: 1234.56 });
  });

  it('accepts valid string amounts', () => {
    expect(normalizeMonetaryAmount('924.00')).toEqual({ kind: 'ok', numeric: 924 });
    expect(normalizeMonetaryAmount('$1,234.56')).toEqual({ kind: 'ok', numeric: 1234.56 });
    expect(normalizeMonetaryAmount('£99.99')).toEqual({ kind: 'ok', numeric: 99.99 });
    expect(normalizeMonetaryAmount('€150')).toEqual({ kind: 'ok', numeric: 150 });
  });

  it('rejects non-finite numbers', () => {
    expect(normalizeMonetaryAmount(Infinity)).toEqual({ kind: 'invalid', reason: expect.stringContaining('Non-finite') });
    expect(normalizeMonetaryAmount(NaN)).toEqual({ kind: 'invalid', reason: expect.stringContaining('Non-finite') });
  });

  it('rejects negative values', () => {
    expect(normalizeMonetaryAmount(-50)).toEqual({ kind: 'invalid', reason: expect.stringContaining('Negative') });
  });

  it('rejects out-of-range values (numeric overflow)', () => {
    expect(normalizeMonetaryAmount(99_999_999_999)).toEqual({ kind: 'invalid', reason: expect.stringContaining('Exceeds max') });
    expect(normalizeMonetaryAmount('99999999999.99')).toEqual({ kind: 'invalid', reason: expect.stringContaining('Exceeds max') });
  });

  it('rejects non-numeric strings', () => {
    expect(normalizeMonetaryAmount('abc')).toEqual({ kind: 'invalid', reason: expect.stringContaining('Non-numeric') });
    expect(normalizeMonetaryAmount('12.34.56')).toEqual({ kind: 'invalid', reason: expect.stringContaining('Non-numeric') });
  });

  it('handles empty/null/undefined', () => {
    expect(normalizeMonetaryAmount(null)).toEqual({ kind: 'empty' });
    expect(normalizeMonetaryAmount(undefined)).toEqual({ kind: 'empty' });
    expect(normalizeMonetaryAmount('')).toEqual({ kind: 'empty' });
  });
});

describe('safeMonetaryForDb', () => {
  it('returns numeric for valid values', () => {
    expect(safeMonetaryForDb(924)).toBe(924);
    expect(safeMonetaryForDb('$1,234.56')).toBe(1234.56);
  });

  it('returns null for invalid/overflow values', () => {
    expect(safeMonetaryForDb(Infinity)).toBeNull();
    expect(safeMonetaryForDb(99_999_999_999)).toBeNull();
    expect(safeMonetaryForDb('abc')).toBeNull();
  });

  it('returns null for empty values', () => {
    expect(safeMonetaryForDb(null)).toBeNull();
    expect(safeMonetaryForDb(undefined)).toBeNull();
  });
});

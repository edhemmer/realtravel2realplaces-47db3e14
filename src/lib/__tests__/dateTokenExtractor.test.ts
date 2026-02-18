import { describe, it, expect } from 'vitest';
import { toDateTokenFromString } from '../dateTokenExtractor';

describe('toDateTokenFromString', () => {
  it('extracts from ISO-like: 2026-03-11', () => {
    expect(toDateTokenFromString('2026-03-11')).toBe('2026-03-11');
  });

  it('extracts from ISO datetime: 2026-03-11T10:30:00', () => {
    expect(toDateTokenFromString('2026-03-11T10:30:00')).toBe('2026-03-11');
  });

  it('extracts from "March 20, 2026"', () => {
    expect(toDateTokenFromString('March 20, 2026')).toBe('2026-03-20');
  });

  it('extracts from "March 20th, 2026"', () => {
    expect(toDateTokenFromString('March 20th, 2026')).toBe('2026-03-20');
  });

  it('extracts from "20 March 2026"', () => {
    expect(toDateTokenFromString('20 March 2026')).toBe('2026-03-20');
  });

  it('extracts from "20 Mar 2026"', () => {
    expect(toDateTokenFromString('20 Mar 2026')).toBe('2026-03-20');
  });

  it('extracts from "Wed 11 Mar 2026"', () => {
    expect(toDateTokenFromString('Wed 11 Mar 2026')).toBe('2026-03-11');
  });

  it('extracts from "Thu, March 11 2026"', () => {
    expect(toDateTokenFromString('Thu, March 11 2026')).toBe('2026-03-11');
  });

  it('extracts from US numeric: 03/11/2026', () => {
    expect(toDateTokenFromString('03/11/2026')).toBe('2026-03-11');
  });

  it('extracts from numeric with dashes: 03-11-2026', () => {
    expect(toDateTokenFromString('03-11-2026')).toBe('2026-03-11');
  });

  it('returns null for null/undefined/empty', () => {
    expect(toDateTokenFromString(null)).toBeNull();
    expect(toDateTokenFromString(undefined)).toBeNull();
    expect(toDateTokenFromString('')).toBeNull();
  });

  it('returns null for unrecognized strings', () => {
    expect(toDateTokenFromString('flight BA2490')).toBeNull();
  });

  it('extracts from "1 Jan 2026"', () => {
    expect(toDateTokenFromString('1 Jan 2026')).toBe('2026-01-01');
  });
});

 /**
  * v2.2.0: Parsed data type validation tests
  */
 
 import { describe, it, expect } from 'vitest';
 import {
   isValidBookingType,
   isValidExpenseCategory,
   safeParseNumber,
   safeParseDateString,
 } from '../parsedData';
 
 describe('isValidBookingType', () => {
   it('returns true for valid booking types', () => {
     expect(isValidBookingType('flight')).toBe(true);
     expect(isValidBookingType('stay')).toBe(true);
     expect(isValidBookingType('car_rental')).toBe(true);
     expect(isValidBookingType('activity')).toBe(true);
   });
 
   it('returns false for invalid booking types', () => {
     expect(isValidBookingType('parking')).toBe(false); // parking is separate
     expect(isValidBookingType('other')).toBe(false);
     expect(isValidBookingType('')).toBe(false);
     expect(isValidBookingType(null)).toBe(false);
     expect(isValidBookingType(undefined)).toBe(false);
     expect(isValidBookingType(123)).toBe(false);
   });
 });
 
 describe('isValidExpenseCategory', () => {
   it('returns true for valid expense categories', () => {
     expect(isValidExpenseCategory('meals')).toBe(true);
     expect(isValidExpenseCategory('transport')).toBe(true);
     expect(isValidExpenseCategory('activity')).toBe(true);
     expect(isValidExpenseCategory('shopping')).toBe(true);
     expect(isValidExpenseCategory('parking')).toBe(true);
     expect(isValidExpenseCategory('other')).toBe(true);
   });
 
   it('returns false for invalid expense categories', () => {
     expect(isValidExpenseCategory('food')).toBe(false);
     expect(isValidExpenseCategory('')).toBe(false);
     expect(isValidExpenseCategory(null)).toBe(false);
     expect(isValidExpenseCategory(undefined)).toBe(false);
   });
 });
 
 describe('safeParseNumber', () => {
   it('parses valid numbers', () => {
     expect(safeParseNumber(100)).toBe(100);
     expect(safeParseNumber(0)).toBe(0);
     expect(safeParseNumber(-50)).toBe(-50);
     expect(safeParseNumber(99.99)).toBe(99.99);
     expect(safeParseNumber('123')).toBe(123);
     expect(safeParseNumber('45.67')).toBe(45.67);
   });
 
   it('returns null for invalid values', () => {
     expect(safeParseNumber(null)).toBeNull();
     expect(safeParseNumber(undefined)).toBeNull();
     expect(safeParseNumber('abc')).toBeNull();
     expect(safeParseNumber(NaN)).toBeNull();
     expect(safeParseNumber(Infinity)).toBeNull();
     expect(safeParseNumber(-Infinity)).toBeNull();
   });
 });
 
 describe('safeParseDateString', () => {
   it('parses valid date strings', () => {
     expect(safeParseDateString('2026-01-15')).toBe('2026-01-15');
     expect(safeParseDateString('2026-12-31T23:59:59Z')).toBe('2026-12-31T23:59:59Z');
   });
 
   it('returns null for invalid values', () => {
     expect(safeParseDateString(null)).toBeNull();
     expect(safeParseDateString(undefined)).toBeNull();
     expect(safeParseDateString('')).toBeNull();
     expect(safeParseDateString('   ')).toBeNull();
     expect(safeParseDateString('Jan 15, 2026')).toBeNull(); // Not ISO format
     expect(safeParseDateString('15-01-2026')).toBeNull(); // Wrong order
     expect(safeParseDateString(12345)).toBeNull();
   });
 });
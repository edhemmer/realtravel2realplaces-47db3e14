 /**
  * v2.2.0: Datetime integrity tests
  * Tests for the datetime handling utilities
  */
 
 import { describe, it, expect } from 'vitest';
 import {
   hasExplicitTime,
   formatDatetimeSafe,
   isValidForTripEvent,
   getTimeDisplay,
   UNKNOWN_TIME_PLACEHOLDER,
 } from '../datetimeIntegrity';
 
 describe('UNKNOWN_TIME_PLACEHOLDER', () => {
   it('should be --:--', () => {
     expect(UNKNOWN_TIME_PLACEHOLDER).toBe('--:--');
   });
 });
 
 describe('hasExplicitTime', () => {
   it('returns false for null/undefined', () => {
     expect(hasExplicitTime(null)).toBe(false);
     expect(hasExplicitTime(undefined)).toBe(false);
   });
 
   it('returns false for date-only strings', () => {
     expect(hasExplicitTime('2026-01-15')).toBe(false);
   });
 
   it('returns false for midnight times (defaulted)', () => {
     expect(hasExplicitTime('2026-01-15T00:00:00')).toBe(false);
     expect(hasExplicitTime('2026-01-15T00:00:00Z')).toBe(false);
     expect(hasExplicitTime('2026-01-15T00:00:00.000Z')).toBe(false);
   });
 
   it('returns true for explicit non-midnight times', () => {
     expect(hasExplicitTime('2026-01-15T14:30:00')).toBe(true);
     expect(hasExplicitTime('2026-01-15T06:00:00Z')).toBe(true);
     expect(hasExplicitTime('2026-01-15T23:59:00')).toBe(true);
   });
 
   it('returns true for times just after midnight', () => {
     expect(hasExplicitTime('2026-01-15T00:01:00')).toBe(true);
     expect(hasExplicitTime('2026-01-15T00:00:01')).toBe(true);
   });
 });
 
 describe('formatDatetimeSafe', () => {
   it('returns empty for null/undefined', () => {
     const result = formatDatetimeSafe(null);
     expect(result.date).toBe('');
     expect(result.time).toBeNull();
     expect(result.hasTime).toBe(false);
   });
 
   it('formats date correctly for date-only string', () => {
     const result = formatDatetimeSafe('2026-01-15');
     expect(result.date).toBe('Jan 15');
     expect(result.time).toBeNull();
     expect(result.hasTime).toBe(false);
   });
 
   it('formats date and time for datetime with explicit time', () => {
     const result = formatDatetimeSafe('2026-01-15T14:30:00');
     expect(result.date).toBe('Jan 15');
     expect(result.time).toBe('2:30 PM');
     expect(result.hasTime).toBe(true);
   });
 
   it('respects custom date format', () => {
     const result = formatDatetimeSafe('2026-01-15T14:30:00', {
       dateFormat: 'MMMM d, yyyy',
     });
     expect(result.date).toBe('January 15, 2026');
   });
 
   it('respects custom time format', () => {
     const result = formatDatetimeSafe('2026-01-15T14:30:00', {
       timeFormat: 'HH:mm',
     });
     expect(result.time).toBe('14:30');
   });
 });
 
 describe('isValidForTripEvent', () => {
   it('returns false for null/undefined', () => {
     expect(isValidForTripEvent(null)).toBe(false);
     expect(isValidForTripEvent(undefined)).toBe(false);
   });
 
   it('returns false for date-only strings', () => {
     expect(isValidForTripEvent('2026-01-15')).toBe(false);
   });
 
   it('returns false for midnight times', () => {
     expect(isValidForTripEvent('2026-01-15T00:00:00')).toBe(false);
   });
 
   it('returns true for explicit times', () => {
     expect(isValidForTripEvent('2026-01-15T14:30:00')).toBe(true);
   });
 });
 
 describe('getTimeDisplay', () => {
   it('returns placeholder for null/undefined', () => {
     expect(getTimeDisplay(null)).toBe('--:--');
     expect(getTimeDisplay(undefined)).toBe('--:--');
   });
 
   it('returns placeholder for date-only strings', () => {
     expect(getTimeDisplay('2026-01-15')).toBe('--:--');
   });
 
   it('returns placeholder for midnight times', () => {
     expect(getTimeDisplay('2026-01-15T00:00:00')).toBe('--:--');
   });
 
   it('returns formatted time for explicit times', () => {
     expect(getTimeDisplay('2026-01-15T14:30:00')).toBe('2:30 PM');
   });
 
   it('uses custom fallback when provided', () => {
     expect(getTimeDisplay(null, 'TBD')).toBe('TBD');
     expect(getTimeDisplay('2026-01-15', 'N/A')).toBe('N/A');
   });
 });
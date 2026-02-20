import { describe, it, expect } from 'vitest';
import { recognizeDateFormat, toOrderingDate, parsedDateToOrderingDate } from '@/lib/dates/dateRecognition';

describe('recognizeDateFormat', () => {
  it('parses ISO: 2026-03-26T12:45', () => {
    const r = recognizeDateFormat('2026-03-26T12:45');
    expect(r).toEqual({ year: 2026, month: 3, day: 26, hour: 12, minute: 45 });
  });

  it('parses ISO date only: 2026-03-26', () => {
    const r = recognizeDateFormat('2026-03-26');
    expect(r).toEqual({ year: 2026, month: 3, day: 26, hour: 0, minute: 0 });
  });

  it('parses "26 Mar 2026 12:45"', () => {
    const r = recognizeDateFormat('26 Mar 2026 12:45');
    expect(r).toEqual({ year: 2026, month: 3, day: 26, hour: 12, minute: 45 });
  });

  it('parses "March 26, 2026 12:45 PM"', () => {
    const r = recognizeDateFormat('March 26, 2026 12:45 PM');
    expect(r).toEqual({ year: 2026, month: 3, day: 26, hour: 12, minute: 45 });
  });

  it('parses "03/26/2026 12:45 PM"', () => {
    const r = recognizeDateFormat('03/26/2026 12:45 PM');
    expect(r).toEqual({ year: 2026, month: 3, day: 26, hour: 12, minute: 45 });
  });

  it('parses "03/27/2026 09:10 AM"', () => {
    const r = recognizeDateFormat('03/27/2026 09:10 AM');
    expect(r).toEqual({ year: 2026, month: 3, day: 27, hour: 9, minute: 10 });
  });

  it('parses day-first numeric "26/03/2026 12:45" when day > 12', () => {
    const r = recognizeDateFormat('26/03/2026 12:45');
    expect(r).toEqual({ year: 2026, month: 3, day: 26, hour: 12, minute: 45 });
  });

  it('strips day-of-week prefix: "Wed 26 Mar 2026 12:45"', () => {
    const r = recognizeDateFormat('Wed 26 Mar 2026 12:45');
    expect(r).toEqual({ year: 2026, month: 3, day: 26, hour: 12, minute: 45 });
  });

  it('returns null for unrecognized strings', () => {
    expect(recognizeDateFormat('flight BA2490')).toBeNull();
    expect(recognizeDateFormat('')).toBeNull();
    expect(recognizeDateFormat(null)).toBeNull();
    expect(recognizeDateFormat(undefined)).toBeNull();
  });

  it('handles AM/PM correctly: 12:00 AM = hour 0', () => {
    const r = recognizeDateFormat('03/26/2026 12:00 AM');
    expect(r?.hour).toBe(0);
  });

  it('handles PM: 2:30 PM = hour 14', () => {
    const r = recognizeDateFormat('03/26/2026 2:30 PM');
    expect(r?.hour).toBe(14);
  });

  // ===== v3.9.60: EU Carrier Date Formats =====

  it('parses "Thu, 11 Mar 2026 06:10 CET"', () => {
    const r = recognizeDateFormat('Thu, 11 Mar 2026 06:10 CET');
    expect(r).toEqual({ year: 2026, month: 3, day: 11, hour: 6, minute: 10 });
  });

  it('parses "Mon, 24 March 2026 21:45 CEST"', () => {
    const r = recognizeDateFormat('Mon, 24 March 2026 21:45 CEST');
    expect(r).toEqual({ year: 2026, month: 3, day: 24, hour: 21, minute: 45 });
  });

  it('parses "Monday, 24 March 2026, 21:45 CEST"', () => {
    const r = recognizeDateFormat('Monday, 24 March 2026, 21:45 CEST');
    expect(r).toEqual({ year: 2026, month: 3, day: 24, hour: 21, minute: 45 });
  });

  it('parses "11 March 2026 06:10 (local time)"', () => {
    const r = recognizeDateFormat('11 March 2026 06:10 (local time)');
    expect(r).toEqual({ year: 2026, month: 3, day: 11, hour: 6, minute: 10 });
  });

  it('parses "11 March 2026 06:10"', () => {
    const r = recognizeDateFormat('11 March 2026 06:10');
    expect(r).toEqual({ year: 2026, month: 3, day: 11, hour: 6, minute: 10 });
  });

  it('parses ISO with timezone offset "2026-03-11T06:10+01:00"', () => {
    const r = recognizeDateFormat('2026-03-11T06:10+01:00');
    expect(r).toEqual({ year: 2026, month: 3, day: 11, hour: 6, minute: 10 });
  });

  it('parses day-first numeric with seconds "13/03/2026 06:10:30"', () => {
    const r = recognizeDateFormat('13/03/2026 06:10:30');
    expect(r).toEqual({ year: 2026, month: 3, day: 13, hour: 6, minute: 10 });
  });

  it('parses full weekday "Thursday, 11 Mar 2026 06:10"', () => {
    const r = recognizeDateFormat('Thursday, 11 Mar 2026 06:10');
    expect(r).toEqual({ year: 2026, month: 3, day: 11, hour: 6, minute: 10 });
  });

  it('parses "Sat, 14 Mar 2026 18:30 GMT"', () => {
    const r = recognizeDateFormat('Sat, 14 Mar 2026 18:30 GMT');
    expect(r).toEqual({ year: 2026, month: 3, day: 14, hour: 18, minute: 30 });
  });

  it('returns null for truly unrecognizable format', () => {
    expect(recognizeDateFormat('Departs soon')).toBeNull();
    expect(recognizeDateFormat('TBD')).toBeNull();
    expect(recognizeDateFormat('next Tuesday')).toBeNull();
  });
});

describe('toOrderingDate', () => {
  it('returns a Date for valid input', () => {
    const d = toOrderingDate('2026-03-26T12:45');
    expect(d).toBeInstanceOf(Date);
    expect(d!.getUTCFullYear()).toBe(2026);
    expect(d!.getUTCMonth()).toBe(2); // 0-indexed
    expect(d!.getUTCDate()).toBe(26);
    expect(d!.getUTCHours()).toBe(12);
  });

  it('returns null for unrecognized', () => {
    expect(toOrderingDate('nope')).toBeNull();
  });

  it('uses Date.UTC so env TZ does not shift', () => {
    const d = toOrderingDate('26 Mar 2026 12:45');
    expect(d!.getUTCDate()).toBe(26);
  });

  // v3.9.60: EU carrier formats produce valid ordering dates
  it('returns non-null for EU carrier formats', () => {
    expect(toOrderingDate('Thu, 11 Mar 2026 06:10 CET')).toBeInstanceOf(Date);
    expect(toOrderingDate('Mon, 24 March 2026 21:45 CEST')).toBeInstanceOf(Date);
    expect(toOrderingDate('11 March 2026 06:10 (local time)')).toBeInstanceOf(Date);
    expect(toOrderingDate('2026-03-11T06:10+01:00')).toBeInstanceOf(Date);
  });
});

describe('parsedDateToOrderingDate', () => {
  it('converts ParsedDate to UTC Date', () => {
    const d = parsedDateToOrderingDate({ year: 2026, month: 3, day: 26, hour: 14, minute: 30 });
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(2);
    expect(d.getUTCDate()).toBe(26);
    expect(d.getUTCHours()).toBe(14);
    expect(d.getUTCMinutes()).toBe(30);
  });
});

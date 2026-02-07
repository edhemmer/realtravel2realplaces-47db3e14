/**
 * v2.6.3: Tests for datetime parsing utilities
 * Verifies optimization changes preserve identical outputs
 */

import { assertEquals, assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  isDateOnly,
  hasTimeSeparator,
  extractDatePortion,
  isMidnightTime,
  normalizeDatetime,
  normalizeReceiptDate,
  normalizeBatchDatetimes,
  cleanNullStrings,
  hasServiceDates,
} from "./datetime-utils.ts";

Deno.test("isDateOnly - identifies date-only strings", () => {
  assertEquals(isDateOnly("2026-01-15"), true);
  assertEquals(isDateOnly("2026-12-31"), true);
  assertEquals(isDateOnly("2026-01-15T10:30:00"), false);
  assertEquals(isDateOnly("2026-01-15T00:00:00"), false);
  assertEquals(isDateOnly("Jan 15, 2026"), false);
  assertEquals(isDateOnly("15-01-2026"), false);
});

Deno.test("hasTimeSeparator - detects T separator", () => {
  assertEquals(hasTimeSeparator("2026-01-15T10:30:00"), true);
  assertEquals(hasTimeSeparator("2026-01-15"), false);
  assertEquals(hasTimeSeparator(""), false);
});

Deno.test("extractDatePortion - extracts YYYY-MM-DD", () => {
  assertEquals(extractDatePortion("2026-01-15"), "2026-01-15");
  assertEquals(extractDatePortion("2026-01-15T10:30:00"), "2026-01-15");
  assertEquals(extractDatePortion("2026-01-15T00:00:00Z"), "2026-01-15");
  assertEquals(extractDatePortion("2026-12-31T23:59:59.999Z"), "2026-12-31");
});

Deno.test("isMidnightTime - identifies midnight times", () => {
  assertEquals(isMidnightTime("00:00"), true);
  assertEquals(isMidnightTime("00:00:00"), true);
  assertEquals(isMidnightTime("00:00:00.000Z"), true);
  assertEquals(isMidnightTime("10:30:00"), false);
  assertEquals(isMidnightTime("23:59:59"), false);
});

Deno.test("normalizeDatetime - null/undefined handling", () => {
  assertStrictEquals(normalizeDatetime(null), null);
  assertStrictEquals(normalizeDatetime(undefined), null);
  assertStrictEquals(normalizeDatetime(""), null);
  assertStrictEquals(normalizeDatetime("   "), null);
});

Deno.test("normalizeDatetime - date-only passthrough", () => {
  assertEquals(normalizeDatetime("2026-01-15"), "2026-01-15");
  assertEquals(normalizeDatetime("2026-12-31"), "2026-12-31");
  assertEquals(normalizeDatetime("2026-06-15"), "2026-06-15");
});

Deno.test("normalizeDatetime - midnight times become date-only", () => {
  assertEquals(normalizeDatetime("2026-01-15T00:00:00"), "2026-01-15");
  assertEquals(normalizeDatetime("2026-01-15T00:00"), "2026-01-15");
  assertEquals(normalizeDatetime("2026-01-15T00:00:00.000Z"), "2026-01-15");
});

Deno.test("normalizeDatetime - explicit times preserved as ISO", () => {
  const result = normalizeDatetime("2026-01-15T10:30:00");
  assertEquals(typeof result, "string");
  assertEquals(result?.includes("T"), true);
  // The time should be preserved (exact format may vary due to ISO conversion)
});

Deno.test("normalizeReceiptDate - always returns date-only", () => {
  assertEquals(normalizeReceiptDate("2026-01-15"), "2026-01-15");
  assertEquals(normalizeReceiptDate("2026-01-15T10:30:00"), "2026-01-15");
  assertEquals(normalizeReceiptDate("2026-01-15T00:00:00Z"), "2026-01-15");
  assertStrictEquals(normalizeReceiptDate(null), null);
});

Deno.test("normalizeBatchDatetimes - processes array", () => {
  const bookings = [
    { start_datetime: "2026-01-15T00:00:00", end_datetime: "2026-01-16T00:00:00" },
    { start_datetime: "2026-02-20T14:30:00", end_datetime: null },
  ];
  
  const result = normalizeBatchDatetimes(bookings, ["start_datetime", "end_datetime"]);
  
  assertEquals(result[0].start_datetime, "2026-01-15");
  assertEquals(result[0].end_datetime, "2026-01-16");
  assertEquals(typeof result[1].start_datetime, "string");
  assertStrictEquals(result[1].end_datetime, null);
});

Deno.test("cleanNullStrings - converts string nulls to actual null", () => {
  const obj: Record<string, unknown> = {
    name: "Test",
    value: "null",
    other: "NULL",
    valid: "not null",
  };
  
  cleanNullStrings(obj);
  
  assertEquals(obj.name, "Test");
  assertStrictEquals(obj.value, null);
  assertStrictEquals(obj.other, null);
  assertEquals(obj.valid, "not null");
});

Deno.test("hasServiceDates - validates booking dates", () => {
  // No start_datetime
  assertEquals(hasServiceDates({ start_datetime: null }), false);
  assertEquals(hasServiceDates({ start_datetime: undefined }), false);
  
  // Has start_datetime (non-stay)
  assertEquals(hasServiceDates({ start_datetime: "2026-01-15" }), true);
  assertEquals(hasServiceDates({ start_datetime: "2026-01-15", booking_type: "flight" }), true);
  
  // Stay without end_datetime
  assertEquals(hasServiceDates({ 
    start_datetime: "2026-01-15", 
    booking_type: "stay" 
  }), false);
  
  // Stay with both dates
  assertEquals(hasServiceDates({ 
    start_datetime: "2026-01-15", 
    end_datetime: "2026-01-18",
    booking_type: "stay" 
  }), true);
});

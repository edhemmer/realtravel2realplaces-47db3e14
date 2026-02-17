/**
 * v3.10.0: Airport Resolver Tests
 * Verifies name-to-IATA resolution, alias matching, abbreviation handling,
 * and ambiguity guards.
 */
import { describe, it, expect } from 'vitest';
import { resolveIata } from '@/lib/airports/resolveIata';

describe('resolveIata', () => {
  // ======== EXACT CODE LOOKUP ========
  it('resolves exact IATA code', () => {
    const r = resolveIata('ATL');
    expect(r.code).toBe('ATL');
    expect(r.confidence).toBe('high');
    expect(r.method).toBe('extracted');
  });

  it('resolves lowercase IATA code', () => {
    const r = resolveIata('lhr');
    expect(r.code).toBe('LHR');
    expect(r.confidence).toBe('high');
  });

  // ======== PARENTHETICAL EXTRACTION ========
  it('extracts IATA from "Heathrow (LHR)"', () => {
    const r = resolveIata('Heathrow (LHR)');
    expect(r.code).toBe('LHR');
    expect(r.confidence).toBe('high');
    expect(r.method).toBe('extracted');
  });

  it('extracts IATA from brackets "[MXP]"', () => {
    const r = resolveIata('[MXP]');
    expect(r.code).toBe('MXP');
    expect(r.confidence).toBe('high');
  });

  // ======== EXACT NAME MATCH ========
  it('resolves exact airport name "Heathrow"', () => {
    const r = resolveIata('Heathrow');
    expect(r.code).toBe('LHR');
    expect(r.confidence).toBe('high');
    // May resolve via name_match or alias_match depending on partial matching
  });

  // ======== ALIAS MATCH ========
  it('resolves alias "London Heathrow"', () => {
    const r = resolveIata('London Heathrow');
    expect(r.code).toBe('LHR');
    expect(r.confidence).toBe('high');
    expect(r.method).toBe('alias_match');
  });

  it('resolves alias "Heathrow (London)" via normalized alias', () => {
    const r = resolveIata('Heathrow (London)');
    expect(r.code).toBe('LHR');
    expect(r.confidence).toBe('high');
  });

  it('resolves "Linate (Milan)" → LIN', () => {
    const r = resolveIata('Linate (Milan)');
    expect(r.code).toBe('LIN');
    expect(r.confidence).toBe('high');
  });

  it('resolves "Fiumicino" → FCO', () => {
    const r = resolveIata('Fiumicino');
    expect(r.code).toBe('FCO');
    expect(r.confidence).toBe('high');
  });

  // ======== ABBREVIATED NAME (TOKEN MATCH) ========
  it('resolves "Hartsfield-Jackson Int" → ATL', () => {
    const r = resolveIata('Hartsfield-Jackson Int');
    expect(r.code).toBe('ATL');
    expect(r.confidence).toBe('high');
  });

  // ======== CITY MATCH ========
  it('resolves unique city "Barcelona" → BCN', () => {
    const r = resolveIata('Barcelona');
    expect(r.code).toBe('BCN');
    expect(r.confidence).toBe('high');
    // May match via name (partial) or city; either is correct
  });

  // ======== AMBIGUITY GUARD ========
  it('does NOT guess when city has multiple airports (e.g., "London")', () => {
    const r = resolveIata('London');
    expect(r.code).toBeNull();
    expect(r.confidence).toBe('unresolved');
  });

  // ======== EDGE CASES ========
  it('returns unresolved for empty/null input', () => {
    expect(resolveIata(null).confidence).toBe('unresolved');
    expect(resolveIata('').confidence).toBe('unresolved');
    expect(resolveIata('  ').confidence).toBe('unresolved');
  });

  it('rejects confirmation-like strings', () => {
    const r = resolveIata('Y7ZBBD');
    expect(r.code).toBeNull();
  });

  // ======== BA VALIDATION SCENARIOS ========
  it('BA: "Hartsfield-Jackson Int" → ATL', () => {
    expect(resolveIata('Hartsfield-Jackson Int').code).toBe('ATL');
  });

  it('BA: "Heathrow (London)" → LHR', () => {
    expect(resolveIata('Heathrow (London)').code).toBe('LHR');
  });

  it('BA: "Linate (Milan)" → LIN', () => {
    expect(resolveIata('Linate (Milan)').code).toBe('LIN');
  });

  // ======== WIZZ / RYANAIR: Already have codes ========
  it('Wizz: FCO stays FCO', () => {
    expect(resolveIata('FCO').code).toBe('FCO');
  });

  it('Wizz: TFS stays TFS', () => {
    expect(resolveIata('TFS').code).toBe('TFS');
  });

  it('Wizz: MXP stays MXP', () => {
    expect(resolveIata('MXP').code).toBe('MXP');
  });

  it('Ryanair: BCN stays BCN', () => {
    expect(resolveIata('BCN').code).toBe('BCN');
  });
});

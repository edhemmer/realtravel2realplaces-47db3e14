/**
 * v5.8.8.1: External Signal Resolver — Stability & Cache Hardening
 *
 * Flight-keyed deterministic cache with duplicate request guards,
 * stability filtering, and conditional fetch triggers.
 *
 * RULES:
 * - Never blocks the app
 * - Never throws uncaught errors
 * - Degrades to NO_SIGNAL cleanly
 * - Flight-keyed cache (flightNumber + departureDate)
 * - No duplicate in-flight requests per flight
 * - Stability filter prevents signal oscillation
 * - Fetch only on explicit trigger conditions
 * - No polling, no intervals, no loops
 */

import { supabase } from '@/integrations/supabase/client';

export type FlightIdentifier = {
  flightNumber: string;
  departureDate: string; // YYYY-MM-DD
  airline?: string;
};

export type FlightStatusSignal = {
  type: 'delay' | 'gate_change' | 'cancellation';
  flightNumber: string;
  confidence: 'high' | 'low';
};

export type ExternalSignals = {
  hasFlightStatusChange: boolean;
  hasDriveTimingDisruption: boolean;
  confidence: 'high' | 'low' | 'none';
  flightSignal?: FlightStatusSignal;
};

export const NO_SIGNAL: ExternalSignals = {
  hasFlightStatusChange: false,
  hasDriveTimingDisruption: false,
  confidence: 'none',
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isMatchableFlightId(id: FlightIdentifier | null | undefined): id is FlightIdentifier {
  if (!id) return false;
  if (!id.flightNumber || typeof id.flightNumber !== 'string') return false;
  if (!id.departureDate || !/^\d{4}-\d{2}-\d{2}$/.test(id.departureDate)) return false;
  if (!/^[A-Z0-9]{2,3}\d{1,5}$/i.test(id.flightNumber.replace(/\s/g, ''))) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Flight-keyed cache
// ---------------------------------------------------------------------------

type CachedFlightEntry = {
  signal: ExternalSignals;
  lastFetchedAt: number;
  lastSignalType: string | null; // for stability filter
  lastSignalChangedAt: number;   // when signal type last changed
};

const _flightCache = new Map<string, CachedFlightEntry>();
const _inFlightRequests = new Set<string>();

/** Minimum gap between fetches for a single flight: 90 seconds */
const MIN_REFRESH_GAP_MS = 90 * 1000;

/** Stability filter window: reject rapid signal changes within 60s */
const STABILITY_WINDOW_MS = 60 * 1000;

/** Execution window: flight within 12 hours of now */
const EXECUTION_WINDOW_MS = 12 * 60 * 60 * 1000;

function flightCacheKey(id: FlightIdentifier): string {
  return `${id.flightNumber.replace(/\s/g, '').toUpperCase()}:${id.departureDate}`;
}

function isInExecutionWindow(departureDate: string): boolean {
  try {
    const depStart = new Date(`${departureDate}T00:00:00`).getTime();
    const depEnd = new Date(`${departureDate}T23:59:59`).getTime();
    const now = Date.now();
    // Within 12h before departure day start OR during departure day
    return now >= depStart - EXECUTION_WINDOW_MS && now <= depEnd + EXECUTION_WINDOW_MS;
  } catch {
    return false;
  }
}

function shouldFetch(key: string, flight: FlightIdentifier): boolean {
  const entry = _flightCache.get(key);

  // A: No cached signal exists
  if (!entry) return true;

  const age = Date.now() - entry.lastFetchedAt;

  // Enforce minimum refresh gap — never re-fetch too soon
  if (age < MIN_REFRESH_GAP_MS) return false;

  // B: Flight in execution window AND cache is stale (> min gap)
  if (isInExecutionWindow(flight.departureDate)) return true;

  // C: Previous signal indicated disruption — confirm stability
  if (entry.signal.hasFlightStatusChange && age >= MIN_REFRESH_GAP_MS) return true;

  // Otherwise no fetch needed
  return false;
}

// ---------------------------------------------------------------------------
// Stability filter
// ---------------------------------------------------------------------------

function applyStabilityFilter(
  key: string,
  newSignal: ExternalSignals
): ExternalSignals {
  const entry = _flightCache.get(key);
  if (!entry) return newSignal;

  const newType = newSignal.flightSignal?.type ?? null;
  const prevType = entry.lastSignalType;

  // If signal type hasn't changed, accept it
  if (newType === prevType) return newSignal;

  // Signal changed — check stability window
  const timeSinceLastChange = Date.now() - entry.lastSignalChangedAt;
  if (timeSinceLastChange < STABILITY_WINDOW_MS) {
    // Rapid flip detected — keep previous stable signal
    return entry.signal;
  }

  // Change is outside stability window — accept new signal
  return newSignal;
}

// ---------------------------------------------------------------------------
// Build signal from edge function response
// ---------------------------------------------------------------------------

const VALID_SIGNAL_TYPES = ['delay', 'gate_change', 'cancellation'];

function buildSignalFromResponse(data: unknown): ExternalSignals | null {
  if (!data || typeof data !== 'object') return null;

  const d = data as Record<string, unknown>;
  const sig = d.signal as Record<string, unknown> | undefined;
  if (!sig || !sig.type || !sig.flightNumber) return null;
  if (!VALID_SIGNAL_TYPES.includes(sig.type as string)) return null;

  return {
    hasFlightStatusChange: true,
    hasDriveTimingDisruption: false,
    confidence: sig.confidence === 'high' ? 'high' : 'low',
    flightSignal: {
      type: sig.type as FlightStatusSignal['type'],
      flightNumber: sig.flightNumber as string,
      confidence: sig.confidence === 'high' ? 'high' : 'low',
    },
  };
}

// ---------------------------------------------------------------------------
// Async prefetch — fire-and-forget, never throws
// ---------------------------------------------------------------------------

async function prefetchFlightSignal(flight: FlightIdentifier, key: string): Promise<void> {
  // Duplicate request guard
  if (_inFlightRequests.has(key)) return;
  _inFlightRequests.add(key);

  try {
    const { data, error } = await supabase.functions.invoke('flight-status', {
      body: {
        flightNumber: flight.flightNumber,
        departureDate: flight.departureDate,
      },
    });

    if (error || !data) {
      // On failure: keep existing cached signal if available
      if (!_flightCache.has(key)) {
        writeCache(key, NO_SIGNAL, null);
      } else {
        // Update lastFetchedAt to prevent immediate retry
        const existing = _flightCache.get(key)!;
        existing.lastFetchedAt = Date.now();
      }
      return;
    }

    const rawSignal = buildSignalFromResponse(data);
    const newSignal = rawSignal ?? NO_SIGNAL;
    const newType = newSignal.flightSignal?.type ?? null;

    // Apply stability filter before writing
    const stableSignal = applyStabilityFilter(key, newSignal);
    const stableType = stableSignal.flightSignal?.type ?? null;

    writeCache(key, stableSignal, stableType);
  } catch {
    // Fail closed — preserve existing cache or write NO_SIGNAL
    if (!_flightCache.has(key)) {
      writeCache(key, NO_SIGNAL, null);
    } else {
      const existing = _flightCache.get(key)!;
      existing.lastFetchedAt = Date.now();
    }
  } finally {
    _inFlightRequests.delete(key);
  }
}

function writeCache(key: string, signal: ExternalSignals, signalType: string | null): void {
  const existing = _flightCache.get(key);
  const now = Date.now();

  // Cache write rule: don't overwrite stable signal with weak/no signal
  if (
    existing &&
    existing.signal.hasFlightStatusChange &&
    existing.signal.confidence === 'high' &&
    !signal.hasFlightStatusChange
  ) {
    // Only overwrite if enough time has passed (stability confirmation)
    const age = now - existing.lastFetchedAt;
    if (age < MIN_REFRESH_GAP_MS * 2) {
      existing.lastFetchedAt = now;
      return;
    }
  }

  const prevType = existing?.lastSignalType ?? null;
  const signalChangedAt =
    signalType !== prevType ? now : (existing?.lastSignalChangedAt ?? now);

  _flightCache.set(key, {
    signal,
    lastFetchedAt: now,
    lastSignalType: signalType,
    lastSignalChangedAt: signalChangedAt,
  });
}

// ---------------------------------------------------------------------------
// Public API — SYNCHRONOUS, non-blocking
// ---------------------------------------------------------------------------

/**
 * Resolve external signals. Synchronous and non-blocking.
 *
 * Returns cached result per-flight if available and fresh.
 * Kicks off async prefetch in background if fetch conditions are met.
 * Always returns NO_SIGNAL if no cached data ready.
 */
export function resolveExternalSignals(
  upcomingFlights?: FlightIdentifier[]
): ExternalSignals {
  try {
    if (!upcomingFlights || upcomingFlights.length === 0) {
      return NO_SIGNAL;
    }

    const matchable = upcomingFlights.filter(isMatchableFlightId);
    if (matchable.length === 0) {
      return NO_SIGNAL;
    }

    // Use first matchable flight as primary lookup target
    const primary = matchable[0];
    const key = flightCacheKey(primary);

    // Check if fetch should be triggered
    if (shouldFetch(key, primary)) {
      prefetchFlightSignal(primary, key);
    }

    // Return cached entry if exists
    const entry = _flightCache.get(key);
    if (entry) {
      return entry.signal;
    }

    return NO_SIGNAL;
  } catch {
    return NO_SIGNAL;
  }
}

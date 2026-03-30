/**
 * v5.8.8: External Signal Resolver — Flight Status Provider Integration
 *
 * Canonical helper for optional external signal intake.
 * Returns a safe, normalized object representing any already-available
 * external signals (flight status changes, drive timing disruptions).
 *
 * RULES:
 * - Never blocks the app
 * - Never throws uncaught errors
 * - Degrades to NO_SIGNAL cleanly
 * - Does not simulate, fabricate, or infer external conditions
 * - Only surfaces signals from a controlled, authenticated provider
 * - Flight matching requires exact flight number + departure date
 * - No fuzzy matching, no guessing
 *
 * Provider: AviationStack via edge function proxy (flight-status)
 * The edge function holds the API key server-side.
 * If the key is not configured, the function returns null signal cleanly.
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

/**
 * Validates that a flight identifier has all required fields for exact matching.
 */
function isMatchableFlightId(id: FlightIdentifier | null | undefined): id is FlightIdentifier {
  if (!id) return false;
  if (!id.flightNumber || typeof id.flightNumber !== 'string') return false;
  if (!id.departureDate || !/^\d{4}-\d{2}-\d{2}$/.test(id.departureDate)) return false;
  if (!/^[A-Z0-9]{2,3}\d{1,5}$/i.test(id.flightNumber.replace(/\s/g, ''))) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Async prefetch cache — orchestration reads synchronously from cache.
// The prefetch fires once per set of flight identifiers and stores the result.
// This ensures orchestration is NEVER blocked by network calls.
// ---------------------------------------------------------------------------

type CachedSignalResult = {
  key: string;
  signal: ExternalSignals;
  fetchedAt: number;
};

let _cachedResult: CachedSignalResult | null = null;
let _pendingFetch: boolean = false;

/** Cache TTL: 5 minutes — don't re-fetch too often */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Build a stable cache key from flight identifiers to detect changes.
 */
function buildCacheKey(flights: FlightIdentifier[]): string {
  return flights
    .map(f => `${f.flightNumber}:${f.departureDate}`)
    .sort()
    .join('|');
}

/**
 * Fire-and-forget async fetch of flight status via edge function.
 * Updates _cachedResult when complete. Never throws.
 */
async function prefetchFlightSignal(flight: FlightIdentifier, cacheKey: string): Promise<void> {
  if (_pendingFetch) return;
  _pendingFetch = true;

  try {
    const { data, error } = await supabase.functions.invoke('flight-status', {
      body: {
        flightNumber: flight.flightNumber,
        departureDate: flight.departureDate,
      },
    });

    if (error || !data) {
      _cachedResult = { key: cacheKey, signal: NO_SIGNAL, fetchedAt: Date.now() };
      return;
    }

    const sig = data.signal;
    if (!sig || !sig.type || !sig.flightNumber) {
      _cachedResult = { key: cacheKey, signal: NO_SIGNAL, fetchedAt: Date.now() };
      return;
    }

    // Validate signal type
    const validTypes = ['delay', 'gate_change', 'cancellation'];
    if (!validTypes.includes(sig.type)) {
      _cachedResult = { key: cacheKey, signal: NO_SIGNAL, fetchedAt: Date.now() };
      return;
    }

    _cachedResult = {
      key: cacheKey,
      signal: {
        hasFlightStatusChange: true,
        hasDriveTimingDisruption: false,
        confidence: sig.confidence === 'high' ? 'high' : 'low',
        flightSignal: {
          type: sig.type as FlightStatusSignal['type'],
          flightNumber: sig.flightNumber,
          confidence: sig.confidence === 'high' ? 'high' : 'low',
        },
      },
      fetchedAt: Date.now(),
    };
  } catch {
    // Fail closed — cache NO_SIGNAL to prevent repeated failed fetches
    _cachedResult = { key: cacheKey, signal: NO_SIGNAL, fetchedAt: Date.now() };
  } finally {
    _pendingFetch = false;
  }
}

/**
 * Resolve external signals. This is SYNCHRONOUS and non-blocking.
 *
 * Returns cached result if available and fresh.
 * Kicks off an async prefetch in the background if cache is stale or missing.
 * Always returns NO_SIGNAL if no cached data is ready yet.
 *
 * @param upcomingFlights - Flight identifiers from canonical bookings (optional)
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

    const cacheKey = buildCacheKey(matchable);

    // Check cache freshness
    if (_cachedResult && _cachedResult.key === cacheKey) {
      const age = Date.now() - _cachedResult.fetchedAt;
      if (age < CACHE_TTL_MS) {
        return _cachedResult.signal;
      }
    }

    // Cache is stale or missing — kick off async prefetch for the first matchable flight
    // Use the first upcoming flight as the primary lookup target
    prefetchFlightSignal(matchable[0], cacheKey);

    // Return cached result if it exists (even if slightly stale), otherwise NO_SIGNAL
    if (_cachedResult && _cachedResult.key === cacheKey) {
      return _cachedResult.signal;
    }

    return NO_SIGNAL;
  } catch {
    return NO_SIGNAL;
  }
}

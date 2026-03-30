/**
 * v5.8.7: External Signal Resolver — Flight Status Signal Integration
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
 * - Only surfaces signals already available in app-accessible data
 * - Flight matching requires exact flight number + departure date
 * - No fuzzy matching, no guessing
 *
 * Currently: no real flight status provider is integrated.
 * The matching infrastructure is ready for a future controlled provider.
 */

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
 * Returns false if any required field is missing or ambiguous.
 */
function isMatchableFlightId(id: FlightIdentifier | null | undefined): id is FlightIdentifier {
  if (!id) return false;
  if (!id.flightNumber || typeof id.flightNumber !== 'string') return false;
  if (!id.departureDate || !/^\d{4}-\d{2}-\d{2}$/.test(id.departureDate)) return false;
  // Flight number must look real (e.g., "AA123", "UA4567")
  if (!/^[A-Z0-9]{2,3}\d{1,5}$/i.test(id.flightNumber.replace(/\s/g, ''))) return false;
  return true;
}

/**
 * Attempt to resolve flight status from already-available app data.
 *
 * This function is synchronous and non-blocking.
 * It will ONLY return a signal when:
 * 1. A matchable flight identifier is provided
 * 2. A reliable, already-integrated flight status source exists
 * 3. The signal is explicit (delay, gate change, cancellation)
 *
 * Currently: no flight status provider is integrated.
 * When one becomes available, it wires in here with defensive checks.
 */
function resolveFlightSignal(
  _upcomingFlights: FlightIdentifier[]
): FlightStatusSignal | null {
  // -----------------------------------------------------------------------
  // No real flight status provider is currently integrated.
  //
  // When a provider becomes available, wire in here:
  //
  //   for (const flight of upcomingFlights) {
  //     if (!isMatchableFlightId(flight)) continue;
  //     try {
  //       const status = getAlreadyAvailableFlightStatus(flight.flightNumber, flight.departureDate);
  //       if (status?.isDelay) {
  //         return { type: 'delay', flightNumber: flight.flightNumber, confidence: 'high' };
  //       }
  //       if (status?.isCancelled) {
  //         return { type: 'cancellation', flightNumber: flight.flightNumber, confidence: 'high' };
  //       }
  //       if (status?.hasGateChange) {
  //         return { type: 'gate_change', flightNumber: flight.flightNumber, confidence: 'high' };
  //       }
  //     } catch { /* fail closed */ }
  //   }
  //
  // -----------------------------------------------------------------------
  return null;
}

/**
 * Resolve external signals from already-available app-accessible data.
 *
 * Accepts optional upcoming flight identifiers extracted from canonical
 * trip state. If identifiers are missing or no provider exists, returns
 * NO_SIGNAL cleanly.
 *
 * @param upcomingFlights - Flight identifiers from canonical bookings (optional)
 */
export function resolveExternalSignals(
  upcomingFlights?: FlightIdentifier[]
): ExternalSignals {
  try {
    // Flight status resolution
    if (upcomingFlights && upcomingFlights.length > 0) {
      const matchable = upcomingFlights.filter(isMatchableFlightId);
      if (matchable.length > 0) {
        const flightSignal = resolveFlightSignal(matchable);
        if (flightSignal) {
          return {
            hasFlightStatusChange: true,
            hasDriveTimingDisruption: false,
            confidence: flightSignal.confidence,
            flightSignal,
          };
        }
      }
    }

    // No signal available
    return NO_SIGNAL;
  } catch {
    // Fail closed — never let resolver errors propagate
    return NO_SIGNAL;
  }
}

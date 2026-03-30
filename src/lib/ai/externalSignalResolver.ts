/**
 * v5.8.6: External Signal Resolver
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
 * - Does not add new provider integrations
 * - Only surfaces signals already available in app-accessible data
 *
 * Currently: no real external signal sources are integrated.
 * This foundation returns the safe default and is ready for future
 * controlled signal sources to be wired in.
 */

export type ExternalSignals = {
  hasFlightStatusChange: boolean;
  hasDriveTimingDisruption: boolean;
  confidence: 'high' | 'low' | 'none';
};

export const NO_SIGNAL: ExternalSignals = {
  hasFlightStatusChange: false,
  hasDriveTimingDisruption: false,
  confidence: 'none',
};

/**
 * Resolve external signals from already-available app-accessible data.
 *
 * This is synchronous and non-blocking. When real external signal sources
 * become available (e.g., flight status API already wired into the app),
 * they can be consumed here with defensive checks.
 *
 * Until then, this returns the safe NO_SIGNAL default.
 */
export function resolveExternalSignals(): ExternalSignals {
  // -----------------------------------------------------------------------
  // No real external signal sources are currently integrated.
  // Return safe default. Future signal sources wire in here with:
  //
  //   try {
  //     const flightData = getAlreadyAvailableFlightStatus();
  //     if (flightData?.hasDelay) {
  //       return { hasFlightStatusChange: true, ... confidence: 'high' };
  //     }
  //   } catch { /* fail closed */ }
  //
  // -----------------------------------------------------------------------
  return NO_SIGNAL;
}

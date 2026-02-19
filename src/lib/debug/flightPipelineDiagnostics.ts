/**
 * v3.9.28: Flight & Cost Pipeline Diagnostics (Dev-Only)
 *
 * Central diagnostic helper for tracing leg and cost counts through
 * the full ingestion → canonical → build → DB pipeline.
 *
 * Called at three points:
 * 1. After canonicalization (before build)
 * 2. After buildTripModel() (before commit)
 * 3. After successful commit (after DB writes)
 *
 * RULES:
 * - Dev-only; no user-facing output.
 * - No side effects.
 * - No date/time math.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FlightCostDiagnosticsInput {
  sessionId: string;
  sourceSummary: string;
  phase: 'POST_CANONICAL' | 'POST_BUILD' | 'POST_COMMIT';
  rawParsedLegCount: number;
  canonicalLegCount: number;
  tripBuildModelLegCount: number;
  dbTimelineLegCount?: number;
  canonicalCostItemCount: number;
  tripBuildModelCostCount: number;
  dbExpenseCount?: number;
}

export interface DiagnosticDivergence {
  field: string;
  expected: number;
  actual: number;
  severity: 'WARNING' | 'ERROR';
}

// ============================================================================
// DIAGNOSTIC LOGGER
// ============================================================================

/**
 * Log flight + cost pipeline counts and flag divergences.
 * Dev-only — guarded by import.meta.env.DEV.
 */
export function logFlightCostDiagnostics(input: FlightCostDiagnosticsInput): DiagnosticDivergence[] {
  const divergences: DiagnosticDivergence[] = [];

  // Check leg count alignment
  if (input.canonicalLegCount !== input.tripBuildModelLegCount) {
    divergences.push({
      field: 'legCount (canonical vs buildModel)',
      expected: input.canonicalLegCount,
      actual: input.tripBuildModelLegCount,
      severity: 'ERROR',
    });
  }

  if (input.dbTimelineLegCount !== undefined && input.dbTimelineLegCount !== input.tripBuildModelLegCount) {
    divergences.push({
      field: 'legCount (buildModel vs DB)',
      expected: input.tripBuildModelLegCount,
      actual: input.dbTimelineLegCount,
      severity: 'ERROR',
    });
  }

  // Check cost count alignment
  if (input.canonicalCostItemCount !== input.tripBuildModelCostCount) {
    divergences.push({
      field: 'costCount (canonical vs buildModel)',
      expected: input.canonicalCostItemCount,
      actual: input.tripBuildModelCostCount,
      severity: 'ERROR',
    });
  }

  if (input.dbExpenseCount !== undefined && input.dbExpenseCount !== input.tripBuildModelCostCount) {
    divergences.push({
      field: 'costCount (buildModel vs DB)',
      expected: input.tripBuildModelCostCount,
      actual: input.dbExpenseCount,
      severity: 'WARNING',
    });
  }

  // Dev-only console output
  if (import.meta.env.DEV) {
    const tag = `[FLIGHT_COST_DIAG:${input.phase}]`;
    console.log(tag, {
      sessionId: input.sessionId,
      source: input.sourceSummary,
      rawParsed: input.rawParsedLegCount,
      canonical: input.canonicalLegCount,
      buildModel: input.tripBuildModelLegCount,
      dbTimeline: input.dbTimelineLegCount ?? '(not yet)',
      canonicalCosts: input.canonicalCostItemCount,
      buildModelCosts: input.tripBuildModelCostCount,
      dbExpenses: input.dbExpenseCount ?? '(not yet)',
    });

    if (divergences.length > 0) {
      console.warn(`${tag} DIVERGENCES_DETECTED`, divergences);
    } else {
      console.log(`${tag} ✓ All counts aligned`);
    }
  }

  return divergences;
}

// ============================================================================
// CANONICAL FLIGHT LEG COUNTER
// ============================================================================

/**
 * Count flight legs in a set of canonical items (items with booking_type === 'flight').
 * Generic — no airline-specific logic.
 */
export function countCanonicalFlightLegs(items: Array<Record<string, unknown>>): number {
  return items.filter(item => (item.booking_type as string) === 'flight').length;
}

/**
 * Count items with valid cost (total_cost > 0 and finite).
 */
export function countCanonicalCostItems(items: Array<Record<string, unknown>>): number {
  return items.filter(item => {
    const cost = item.total_cost as number | null | undefined;
    return typeof cost === 'number' && cost > 0 && Number.isFinite(cost);
  }).length;
}

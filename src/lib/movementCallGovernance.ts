/**
 * v5.10.2.1: Movement Call Governance — Canonical API Cost Control Layer
 *
 * Single authority for:
 * - Refresh decisions (freshness tiers)
 * - Per-routeKey + mode rate limiting
 * - Per-session budget enforcement
 * - Priority-based call allowance
 * - Graceful degradation under constraints
 * - Cross-engine deduplication + locking
 * - Background/visibility rules
 *
 * NO polling. NO UI exposure. Internal governance only.
 */

// ============================================================================
// TYPES
// ============================================================================

export type MovementSource = 'traffic' | 'transit';
export type FreshnessTier = 'critical' | 'active' | 'passive' | 'dormant';
export type CallPriority = 'high' | 'medium' | 'low';

export interface GovernanceDecision {
  allowed: boolean;
  reason: string;
  useCachedFallback: boolean;
  degradationLevel: 0 | 1 | 2 | 3;
}

export interface GovernanceContext {
  source: MovementSource;
  routeKey: string;
  priority: CallPriority;
  freshnessTier: FreshnessTier;
  /** Whether this route has a time-critical event */
  timeSensitive?: boolean;
}

// ============================================================================
// FRESHNESS TIER CONFIGURATION
// ============================================================================

/** Minimum refresh interval per freshness tier (ms) */
const TIER_MIN_INTERVAL_MS: Record<FreshnessTier, number> = {
  critical: 75 * 1000,     // 75 seconds
  active: 150 * 1000,      // 2.5 minutes
  passive: 10 * 60 * 1000, // 10 minutes
  dormant: Infinity,       // no refresh
};

// ============================================================================
// SESSION BUDGET
// ============================================================================

const SESSION_SOFT_CAP: Record<MovementSource, number> = {
  traffic: 30,
  transit: 30,
};

/** When within this percentage of cap, tighten thresholds */
const BUDGET_TIGHTEN_RATIO = 0.75;

interface SessionBudget {
  traffic: number;
  transit: number;
  sessionStartedAt: number;
}

const _sessionBudget: SessionBudget = {
  traffic: 0,
  transit: 0,
  sessionStartedAt: Date.now(),
};

// ============================================================================
// RATE LIMIT TRACKING (per routeKey + source)
// ============================================================================

interface RateLimitEntry {
  lastCallAt: number;
  callCount: number;
}

const _rateLimits = new Map<string, RateLimitEntry>();

/** Rolling window for global burst detection */
const GLOBAL_BURST_WINDOW_MS = 30 * 1000; // 30 seconds
const GLOBAL_BURST_MAX_CALLS = 4;
const _globalCallTimestamps: number[] = [];

// ============================================================================
// LOCK TRACKING (prevent rapid-fire on same route+source)
// ============================================================================

const _activeLocks = new Set<string>();
const LOCK_WINDOW_MS = 5 * 1000; // 5 seconds

// ============================================================================
// VISIBILITY STATE
// ============================================================================

let _appVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    _appVisible = document.visibilityState === 'visible';
  });
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function getRateLimitKey(source: MovementSource, routeKey: string): string {
  return `${source}:${routeKey}`;
}

function pruneGlobalTimestamps(): void {
  const cutoff = Date.now() - GLOBAL_BURST_WINDOW_MS;
  while (_globalCallTimestamps.length > 0 && _globalCallTimestamps[0] < cutoff) {
    _globalCallTimestamps.shift();
  }
}

function isNearBudgetCap(source: MovementSource): boolean {
  const used = _sessionBudget[source];
  const cap = SESSION_SOFT_CAP[source];
  return used >= cap * BUDGET_TIGHTEN_RATIO;
}

function isOverBudgetCap(source: MovementSource): boolean {
  return _sessionBudget[source] >= SESSION_SOFT_CAP[source];
}

function getEffectiveInterval(tier: FreshnessTier, source: MovementSource): number {
  let interval = TIER_MIN_INTERVAL_MS[tier];

  // Tighten interval when near budget cap
  if (isNearBudgetCap(source)) {
    interval = Math.max(interval, interval * 1.5);
  }

  return interval;
}

// ============================================================================
// CORE: REQUEST GOVERNANCE CHECK
// ============================================================================

/**
 * Check whether an API call should be allowed.
 * This is the ONLY authority for refresh decisions.
 *
 * Returns a GovernanceDecision indicating whether the call
 * is permitted, should use cache, or what degradation level applies.
 */
export function checkCallAllowed(ctx: GovernanceContext): GovernanceDecision {
  const { source, routeKey, priority, freshnessTier } = ctx;
  const rlKey = getRateLimitKey(source, routeKey);

  // ── Dormant tier: never refresh ──
  if (freshnessTier === 'dormant') {
    return {
      allowed: false,
      reason: 'dormant_tier',
      useCachedFallback: true,
      degradationLevel: 3,
    };
  }

  // ── Backgrounded: block non-critical ──
  if (!_appVisible) {
    return {
      allowed: false,
      reason: 'app_backgrounded',
      useCachedFallback: true,
      degradationLevel: 2,
    };
  }

  // ── Active lock guard ──
  if (_activeLocks.has(rlKey)) {
    return {
      allowed: false,
      reason: 'active_lock',
      useCachedFallback: true,
      degradationLevel: 0,
    };
  }

  // ── Budget cap enforcement ──
  if (isOverBudgetCap(source)) {
    // HIGH priority with timeSensitive can bypass
    if (priority === 'high' && ctx.timeSensitive) {
      // Allow but note it
    } else {
      return {
        allowed: false,
        reason: 'budget_cap_reached',
        useCachedFallback: true,
        degradationLevel: 2,
      };
    }
  }

  // ── Priority gating under budget pressure ──
  if (isNearBudgetCap(source)) {
    if (priority === 'low') {
      return {
        allowed: false,
        reason: 'low_priority_budget_pressure',
        useCachedFallback: true,
        degradationLevel: 1,
      };
    }
  }

  // ── Global burst detection ──
  pruneGlobalTimestamps();
  if (_globalCallTimestamps.length >= GLOBAL_BURST_MAX_CALLS) {
    // HIGH + timeSensitive can still proceed
    if (!(priority === 'high' && ctx.timeSensitive)) {
      return {
        allowed: false,
        reason: 'global_burst_limit',
        useCachedFallback: true,
        degradationLevel: 1,
      };
    }
  }

  // ── Per-route rate limiting ──
  const entry = _rateLimits.get(rlKey);
  if (entry) {
    const effectiveInterval = getEffectiveInterval(freshnessTier, source);
    const elapsed = Date.now() - entry.lastCallAt;
    if (elapsed < effectiveInterval) {
      return {
        allowed: false,
        reason: 'rate_limited',
        useCachedFallback: true,
        degradationLevel: 0,
      };
    }
  }

  // ── All checks passed ──
  return {
    allowed: true,
    reason: 'approved',
    useCachedFallback: false,
    degradationLevel: 0,
  };
}

// ============================================================================
// CALL RECORDING (must be called AFTER a successful API call)
// ============================================================================

/**
 * Record that an API call was made. Updates rate limits, budget, and global tracking.
 * Must be called by the engine AFTER a successful fetch.
 */
export function recordCall(source: MovementSource, routeKey: string): void {
  const rlKey = getRateLimitKey(source, routeKey);
  const now = Date.now();

  // Update rate limit
  const entry = _rateLimits.get(rlKey);
  if (entry) {
    entry.lastCallAt = now;
    entry.callCount += 1;
  } else {
    _rateLimits.set(rlKey, { lastCallAt: now, callCount: 1 });
  }

  // Evict old rate limit entries (keep last 30)
  if (_rateLimits.size > 30) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, e] of _rateLimits) {
      if (e.lastCallAt < oldestTime) {
        oldestTime = e.lastCallAt;
        oldestKey = k;
      }
    }
    if (oldestKey) _rateLimits.delete(oldestKey);
  }

  // Update session budget
  _sessionBudget[source] += 1;

  // Update global burst tracker
  _globalCallTimestamps.push(now);
}

// ============================================================================
// LOCK MANAGEMENT
// ============================================================================

/**
 * Acquire a short lock for a route+source to prevent rapid-fire.
 * Returns true if lock acquired, false if already locked.
 */
export function acquireLock(source: MovementSource, routeKey: string): boolean {
  const rlKey = getRateLimitKey(source, routeKey);
  if (_activeLocks.has(rlKey)) return false;

  _activeLocks.add(rlKey);
  setTimeout(() => {
    _activeLocks.delete(rlKey);
  }, LOCK_WINDOW_MS);
  return true;
}

/**
 * Release a lock explicitly (e.g., after fetch completes).
 */
export function releaseLock(source: MovementSource, routeKey: string): void {
  _activeLocks.delete(getRateLimitKey(source, routeKey));
}

// ============================================================================
// CROSS-ENGINE COORDINATION
// ============================================================================

/**
 * Determine whether a specific source should be fetched based on mode eligibility.
 * Prevents calling transit API when transit is clearly invalid, etc.
 */
export function shouldFetchSource(
  source: MovementSource,
  modeEligible: boolean,
  hasFreshCache: boolean,
): boolean {
  if (!modeEligible) return false;
  if (hasFreshCache) return false;
  return true;
}

// ============================================================================
// FRESHNESS TIER DERIVATION
// ============================================================================

/**
 * Determine the freshness tier for a given context.
 * Centralizes the logic so engines don't implement their own.
 */
export function deriveFreshnessTier(input: {
  timeSensitive?: boolean;
  lastViableDepartureNear?: boolean;
  activeNavigation?: boolean;
  isPassiveViewing?: boolean;
}): FreshnessTier {
  if (input.activeNavigation || input.lastViableDepartureNear) return 'critical';
  if (input.timeSensitive) return 'active';
  if (input.isPassiveViewing) return 'passive';
  return 'active'; // default for most trip viewing
}

// ============================================================================
// RESUME HANDLING
// ============================================================================

/**
 * Check if a refresh is warranted after app resume.
 * Returns true only if cache is expired or context is critical.
 */
export function shouldRefreshOnResume(
  cacheAgeMs: number,
  freshnessTier: FreshnessTier,
): boolean {
  if (freshnessTier === 'dormant') return false;
  if (freshnessTier === 'passive') return cacheAgeMs > 10 * 60 * 1000;
  if (freshnessTier === 'active') return cacheAgeMs > 3 * 60 * 1000;
  // critical
  return cacheAgeMs > 60 * 1000;
}

// ============================================================================
// OBSERVABILITY (internal, no UI)
// ============================================================================

export interface GovernanceStats {
  trafficCallsUsed: number;
  transitCallsUsed: number;
  trafficBudgetRemaining: number;
  transitBudgetRemaining: number;
  activeLocksCount: number;
  rateLimitEntriesCount: number;
}

export function getGovernanceStats(): GovernanceStats {
  return {
    trafficCallsUsed: _sessionBudget.traffic,
    transitCallsUsed: _sessionBudget.transit,
    trafficBudgetRemaining: Math.max(0, SESSION_SOFT_CAP.traffic - _sessionBudget.traffic),
    transitBudgetRemaining: Math.max(0, SESSION_SOFT_CAP.transit - _sessionBudget.transit),
    activeLocksCount: _activeLocks.size,
    rateLimitEntriesCount: _rateLimits.size,
  };
}

// ============================================================================
// RESET (for testing)
// ============================================================================

export function resetGovernance(): void {
  _rateLimits.clear();
  _activeLocks.clear();
  _globalCallTimestamps.length = 0;
  _sessionBudget.traffic = 0;
  _sessionBudget.transit = 0;
  _sessionBudget.sessionStartedAt = Date.now();
}

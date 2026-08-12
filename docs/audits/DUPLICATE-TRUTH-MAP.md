# RT2RP — Duplicate Truth Map

**Status:** PHASE 0 — INITIAL MAIN DUPLICATION AUDIT

**Audited branch:** `main`

## Purpose

Identify where one travel concept is represented, calculated, fetched, or interpreted in more than one place and distinguish legitimate projections/caches from competing authority.

No path listed here is deleted solely because another similar file exists. Consolidation requires reader/writer/data-path proof.

---

## Initial Matrix

| Concept | Canonical Candidate | Other Paths Found | Authority Assessment | User Risk | Initial Action |
|---|---|---|---|---|---|
| Canonical trip state | `canonicalTripState.ts` + `useCanonicalTripState` | local screen/domain derivations | Strong canonical candidate already used by desktop/mobile | HIGH if bypassed | KEEP AS CANONICAL; migrate material re-derivations toward canonical selectors |
| Desktop shared trip data | `DesktopTripShell` | individual tab hooks | Shell is intentional shared projection; React Query also dedupes raw reads | MEDIUM | KEEP shell; verify tabs do not redefine business truth |
| Today execution | `canonicalTodayExecutionStack.ts` | `execution/executionWindows`, `nextActionResolver`, `todayActionItems`, `contextualExecutionEngine`, `unifiedExecutionEngine` | Boundaries between sequencing, actions, context and legacy execution are not sufficiently obvious | HIGH | DEEP AUDIT then consolidate ownership; preserve proven algorithms |
| Proactive / AI orchestration | deterministic `proactiveInsightEngine` + `ai/aiOrchestrationEngine` | `proactiveTripIntelligenceEngine`, `predictiveActionEngine`, `sequenceEngine`, `movementOrchestrationEngine`, `multimodalDecisionEngine` | Multiple intelligence layers appear adjacent/overlapping; some are deterministic despite AI naming | HIGH | Define fact -> deterministic intelligence -> generative AI boundaries; consolidate duplicate rules |
| Active lodging / current stay | canonical trip state should own context | `NowCommandCenter` locally scans bookings for active stay address | Local derived state can diverge from canonical stay semantics | MEDIUM/HIGH | Move to canonical selector after parity tests |
| Alerts | canonical alert/finding model target | `useTravelAlerts`, drive signals, `NowCommandCenter` maps drive signals into `TravelAlert`, notification functions/reminder engine | UI-level adapter creates second alert interpretation; notification eligibility may differ from visual alert logic | HIGH | Define one alert/finding schema and explicit delivery projection |
| Flight status | `flight-status` provider adapter + `useFlightStatus` observation | flight display utils/model, disruption hooks, airport repair | Provider observation vs saved booking truth are conceptually separate but identity/freshness ownership needs clearer contract | HIGH | KEEP observation layer; centralize identity matching/freshness; no screen-specific live semantics |
| Movement / drive state | canonical movement model target | driveEngine, `drive/driveIntelligence`, `driveIntelligenceHelper`, `movementExecutionHelper`, `movementOrchestrationEngine`, `multimodalDecisionEngine`, transit/traffic engines | Likely intentional layers mixed with possible duplicate decisions | HIGH | Audit call graph; assign route observation, movement fact, decision, and presentation owners |
| Time/date | canonical time policy/normalizer/preservation | `timeDisplay`, `timeOnly`, `tripDateCalculations`, date recognition, datetime integrity, assorted screen comparisons | Strong canonical safeguards exist, but many utilities remain | CRITICAL if semantics differ | Preserve canonical policy; classify other helpers as parsing/display/legacy and prohibit alternate travel-time truth |
| Expense totals | expense calculation/cost attribution canonical candidates | booking-expense sync, report/tab summaries, canonical cost summary | Multiple legitimate projections, but reconciliation contract must be explicit | HIGH | Establish canonical ledger + summary selectors and reconciliation tests |
| Offline trip state | canonical online state + `offlineTripCache` snapshot | React Query cache, Explore cache, weather cache | Legitimate caches with different purposes; trip cache lacks visible user namespace | HIGH | KEEP as caches, add ownership/security/freshness contracts |
| Offline expenses | canonical `expenses` server table | IndexedDB queue + immediate local display | Queue is legitimate pending-write state, but durable idempotency absent | HIGH | Keep pending projection; add server idempotency + reconciliation identity |
| Import pipeline | canonical ingestion target | `lib/import/*`, `lib/ingestion/*`, parse functions, pending-import workflow | There are multiple generations/layers; boundaries between raw parsing, staging, mapping and finalization need formal call graph | HIGH | Preserve functionality; consolidate to one documented intake pipeline after parity tests |
| Stops import | `BulkStopsDialogV2` candidate unknown | `BulkStopsDialog.tsx`, `BulkStopsDialogV2.tsx`, tour import modules | Obvious versioned duplicate filenames; active callers not yet proven | MEDIUM | NEEDS CALLER AUDIT; do not delete either yet |
| Traveler vs app access | traveler identity model + trip member/share model | companions, members, shares, invites | Separation appears intentional and should remain | HIGH security impact | KEEP DISTINCT; prove RLS/PII contracts rather than merge concepts |
| Network/live status | provider-specific result metadata + network status | `navigator`/network helper, query cached states, provider result labels | Device connectivity, backend availability, and provider freshness are distinct; UI can oversimplify them | HIGH | Preserve separate technical states; standardize user truth-state mapping |

---

## Highest-Priority Consolidation Questions

### 1. Today / execution engine stack

Before changing Today, produce a call graph for:

- `canonicalTodayExecutionStack`;
- `canonicalTodayCriticalActions`;
- `executionWindows`;
- `nextActionResolver`;
- `contextualExecutionEngine`;
- `unifiedExecutionEngine`;
- `proactiveInsightEngine`;
- `proactiveTripIntelligenceEngine`;
- `aiOrchestrationEngine`;
- `predictiveActionEngine`;
- `sequenceEngine`.

For every rule, record whether it owns:

- canonical fact interpretation;
- deterministic derivation;
- prioritization;
- recommendation;
- presentation;
- legacy compatibility.

The target is not one enormous engine. The target is **one owner per decision semantic**.

### 2. Movement stack

Separate explicitly:

```text
saved movement fact
  -> provider route/transit observation
  -> normalized operational state
  -> deterministic movement intelligence
  -> alert/action eligibility
  -> Today/Timeline/Travel presentation
```

Drive, rail/transit, flight, and local movement may have mode adapters, but should not invent separate trip-state semantics.

### 3. Import stack

The repository contains both `lib/import` and `lib/ingestion` families plus server parsers/pending-import processing. This may represent a healthy staged pipeline or accumulated generations. Phase 0 must trace the current path from each intake method to canonical commit and identify dead/parallel paths.

### 4. Alert vs notification semantics

An in-app finding, a critical action, a travel alert, and a delivered push notification are not automatically the same object. Define one condition identity and explicit projections so dedupe/materiality do not drift across Today, Alerts, native reminders and server notifications.

---

## Legitimate Duplicate Representations to Preserve

The following should **not** be collapsed merely because they duplicate data shape:

- offline canonical snapshots, if clearly marked as cache and securely scoped;
- React Query read caches;
- timeline view models derived from canonical records;
- provider observations separate from booked/user facts;
- desktop shell projection over canonical state;
- native adapters around shared domain logic;
- pending offline expense records before canonical server commit.

Each retained representation needs explicit source, freshness/invalidation, reconciliation and security rules.

---

## Consolidation Rule

Do not delete a competing path until:

1. all readers are identified;
2. all writers are identified;
3. active product routes are identified;
4. persistence/data implications are understood;
5. equivalent user outcomes are regression-tested;
6. migration/rollback requirements are defined;
7. dependent surfaces are migrated;
8. old path has no remaining production caller.

---

## Exit Status

**NOT COMPLETE.**

Initial high-risk duplication is mapped. Phase 0 still requires repository call-graph evidence to distinguish active canonical, compatibility, dead, and parallel paths for the execution, movement, import, alert, and reporting stacks.

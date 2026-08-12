# RT2RP — Reliability Risk Register

**Status:** PHASE 1 — TRUST HARDENING IN PROGRESS

**Baseline audited:** `main` @ `40e25fdc79ab22c0abe29e1228a3e7a57def1eb7`

**Implementation branch:** `agent/rt2rp-phase1-trust-hardening`

## Purpose

Track production risks that could damage traveler trust, create wrong decisions, lose or duplicate data, expose private information, or make public product claims misleading.

A risk is not closed because code changed. `VALIDATING` means a mitigation exists on the implementation branch but still needs the release evidence required by the governing corpus.

---

## Current Register

| ID | Risk | Category | User Impact | Likelihood | Severity | Current Mitigation / Phase 1 Change | Required Validation / Next Action | Status |
|---|---|---|---|---|---|---|---|---|
| R-001 | Offline expense retry can create duplicate server expenses | Money / offline sync | Duplicate financial records, incorrect totals/reports | L3 Possible | **S1 Trip-Critical** | Phase 1 adds `expenses.client_expense_id`, a unique database index, stable replay payload, conflict-targeted upsert, and a regression test for stable retry identity | Apply migration in controlled environment; test crash/reload after successful server write but before local dequeue; verify one canonical row and report totals | **VALIDATING** |
| R-002 | Offline trip/expense/weather/place data can survive an authenticated account boundary | Privacy / offline | Previous user's trip data may remain on shared/account-switched device | UNKNOWN | **S0 Trust/Safety Critical until disproven** | Phase 1 adds `clearAllOfflineData()` and blocks session exposure until all RT2RP IndexedDB stores clear on user change/sign-out; failed clearing remains fail-closed and retries on later transitions | Cross-account browser/iOS test: user A loads data -> sign out/account switch -> user B cannot access A cache; test clear failure behavior | **VALIDATING** |
| R-003 | Public copy broadly claims offline behavior beyond proven scope | Product truth | Traveler relies on unavailable data during degraded connectivity | L3 Possible | **S1** | Phase 1 narrows Landing metadata, comparison table, and FAQ to cached upcoming timeline + queued expense behavior and explicitly says provider/live features require connectivity | Complete remaining claim inventory in Plans, Help Center, onboarding, install/App Store, notifications, emails | **MITIGATING** |
| R-004 | Flight client can label a result `Live checked` even though backend uses cache/gates/null-signal semantics | Provider freshness / truth | Traveler may interpret absence of signal as current all-clear | L3 Possible | **S1** | Public generic real-time wording narrowed in Phase 1 | Replace flight UI binary live-clear semantics with explicit observation freshness/source/result state | OPEN |
| R-005 | Flight provider matching is not visibly strict enough for high-consequence live status | Provider identity | Status could attach to wrong segment/date/route | L2 Uncommon/UNKNOWN | **S1** | query includes flight date + flight IATA | Validate returned service date, route/airports, carrier semantics and segment identity | OPEN |
| R-006 | No complete background flight monitoring chain proven while travel product may imply automatic alerts | Notifications / provider | User expects notification without opening app and misses disruption | UNKNOWN | **S1** if publicly promised | foreground status function + notification infrastructure | Keep monitoring claims hidden until scheduler/change detect/persistence/push/retry/production evidence exists | OPEN |
| R-007 | `generate-notifications` schedule/delivery chain not yet proven in production | Background jobs | reminders may silently not generate/deliver | UNKNOWN | **S1/S2 depending claim** | cron-secret protected function, reminder engine, send-push function | Verify scheduler, run history, token delivery, retries, observability, missed-run recovery | INVESTIGATING |
| R-008 | Multiple execution/intelligence engines may apply overlapping next-action/risk logic | Data/decision integrity | contradictory Today guidance or hard-to-debug ordering | L3 Possible | **S1/S2** | canonical Today stack used in main command center | Build rule-ownership call graph and consolidate duplicate decision semantics with regression scenarios | OPEN |
| R-009 | Today locally derives active stay address from bookings instead of one canonical selector | Current-state derivation | origin/next-action context can diverge | L2 Uncommon | **S2 Major** | deterministic booking scan | Add canonical selector and parity tests | OPEN |
| R-010 | Drive signals are converted to TravelAlert inside `NowCommandCenter` while other alert/notification systems have separate rules | Alerts/deduplication | duplicate/missing/conflicting alerts | L3 Possible | **S2** | local parking dedupe | Define canonical finding/alert identity and delivery projections | OPEN |
| R-011 | Realtime bridge invalidates only selected tables; subscription health/recovery is not observable | Collaboration/sync | state can be stale while appearing current | L3 Possible | **S2** | Supabase channel + query invalidation | Verify coverage, reconnect, telemetry and permission-change behavior | OPEN |
| R-012 | Client-supplied AI trip context is not server-resolved canonical context | AI grounding | assistant can answer from stale/partial context | L3 Possible | **S2** | strict grounding prompt, authenticated call | Move to trusted canonical structured context or explicit freshness/source contract | OPEN |
| R-013 | Scoped-sharing/security claim lacks completed RLS/PII cross-user matrix | Authorization/RLS | privacy leak or misleading security promise | UNKNOWN | **S0 until proven** | RLS migrations/hooks appear present; public wording narrowed to invitation/permission-aware actions | Complete table-by-table RLS, storage and PII tests; adversarial cross-user E2E | INVESTIGATING |
| R-014 | Financial/report outputs have not completed full canonical reconciliation | Money/reporting | incorrect trip totals/reports | UNKNOWN | **S1** | extensive expense/cost tests and booking-expense sync | Trace every report value to canonical ledger; multi-currency/refund/split scenarios | INVESTIGATING |
| R-015 | No substantial browser-level E2E suite is visible in `main` | Quality / regression | UI/offline/provider failures can escape unit tests | L4 Likely exposure | **S2** | extensive domain/Vitest coverage | Add targeted E2E for public promises and critical travel scenarios | OPEN |
| R-016 | Mobile exposes many secondary module surfaces/legacy aliases | UX / cognitive load | traveler must know app structure under stress | L4 Likely | **S2/S3** | Today/Timeline primary defaults exist | Consolidate under Today/Timeline/Travel/Places/Records while preserving workflows | OPEN |
| R-017 | Offline empty timeline state says `Offline cache is ready` even when no cached rows exist | Truthful UX | false confidence useful offline data is present | L3 Possible | **S2** | reconnect message | Change wording and expose snapshot age/availability; test empty/expired cache | OPEN |
| R-018 | Multiple import pipeline families may diverge | Import/data integrity | duplicate/inconsistent booking/timeline records | L3 Possible | **S2** | staging/validators/mappers/tests exist | Trace each intake route; declare canonical pipeline and deprecate duplicates after parity tests | OPEN |
| R-019 | `mockAttractions.ts` exists in production source tree; active production use not yet proven absent | Product truth | fabricated place content could appear as real | UNKNOWN | **S1/S2** | real places provider also exists | Prove no production caller or isolate/remove mock path | INVESTIGATING |
| R-020 | CarPlay scaffold exists but is not a proven product implementation | Product truth/native | expectation mismatch if mentioned | L1 unless claimed | **S3** | scaffold only | Keep internal until real target/entitlements/UI validated | ACCEPTED INTERNAL RISK |

---

## Phase 1 Changes Implemented

### Account-boundary cache isolation

- `src/lib/offlineTripCache.ts` now exposes one clear-all operation covering `trip_cache`, `expense_queue`, `weather_snapshot`, and `explore_essentials`.
- `AuthContext` invokes that operation before exposing a different authenticated account or completing sign-out.
- A failed clear does not mark the device clean; the old user identity remains the boundary marker so the next transition retries before a new session can be exposed.

### Offline expense idempotency

- Migration adds nullable `expenses.client_expense_id UUID` plus a unique index.
- Offline replay always persists the stable queue UUID into that column.
- Replay uses an upsert conflict target on `client_expense_id`.
- Local queue intent is removed only after the canonical server row is returned.
- Unit regression coverage asserts retry payload identity remains stable and does not mutate the queued payload.

### Public truth tightening

- Landing SEO/schema no longer describes RT2RP generically as an offline or real-time travel product.
- Landing comparison and FAQ now describe the proven cached-timeline/queued-expense boundary and connectivity requirement for provider-backed features.

---

## Validation Constraint

The current execution environment could not clone GitHub to run the repository locally because outbound DNS/network access from the container was unavailable. This is **not** treated as a passing build/test result.

Before merge, run at minimum:

1. `npm ci`
2. `npm test`
3. `npm run build`
4. `npm run lint`
5. Supabase migration apply in a controlled environment
6. offline replay crash/retry scenario
7. user A -> sign out/account switch -> user B local-data isolation scenario on web and iOS

---

## Release Blocking Rules Applied

- R-001 remains release-blocking for strong offline-financial reliability wording until database/runtime validation passes.
- R-002 and R-013 remain S0 until privacy isolation/RLS are positively proven end-to-end.
- R-003–R-007 block broad offline/live/monitoring wording in affected domains.
- R-014 blocks accounting-grade/report-accuracy claims until reconciled.

---

## Priority Remediation Order After Phase 1

1. R-013 — RLS/storage/PII/sharing verification;
2. R-017 — truthful empty/stale offline state;
3. R-008/R-009/R-010 — execution/intelligence/alert ownership consolidation;
4. R-004/R-005/R-006 — flight identity/freshness/background contract;
5. R-014 — financial/report reconciliation;
6. R-018 — import pipeline consolidation;
7. R-015 — critical browser E2E/visual/offline/provider-failure scenarios;
8. R-011/R-007 — realtime/background observability;
9. R-016 — product navigation/experience convergence.

---

## Closure Standard

A risk is not closed because code changed. Closure requires appropriate regression/E2E evidence, production configuration proof where relevant, affected-surface verification, and a recheck of public wording.

If evidence remains incomplete, status stays `VALIDATING`, `MITIGATING`, or `INVESTIGATING`, never `CLOSED`.

# RT2RP — Reliability Risk Register

**Status:** PHASE 23 — TRUTH HARDENING IN PROGRESS

**Baseline audited:** `main` @ `40e25fdc79ab22c0abe29e1228a3e7a57def1eb7`

**Current implementation branch:** `agent/phase23`

## Purpose

Track production risks that could damage traveler trust, create wrong decisions, lose or duplicate data, expose private information, or make public product claims misleading.

A risk is not closed because code changed. `VALIDATING` means a mitigation exists on an implementation branch but still needs the release evidence required by the governing corpus.

---

## Current Register

| ID | Risk | Category | User Impact | Likelihood | Severity | Current Mitigation / Change | Required Validation / Next Action | Status |
|---|---|---|---|---|---|---|---|---|
| R-001 | Offline expense retry can create duplicate server expenses | Money / offline sync | Duplicate financial records, incorrect totals/reports | L3 Possible | **S1 Trip-Critical** | Adds `expenses.client_expense_id`, unique database index, stable replay payload, conflict-targeted upsert, and regression coverage for stable retry identity | Apply migration in controlled environment; test crash/reload after successful server write but before local dequeue; verify one canonical row and report totals | **VALIDATING** |
| R-002 | Offline trip/expense/weather/place data can survive an authenticated account boundary | Privacy / offline | Previous user's trip data may remain on shared/account-switched device | UNKNOWN | **S0 Trust/Safety Critical until disproven** | Adds `clearAllOfflineData()`, persisted non-sensitive cache-owner marker, and fail-closed account transition behavior | Cross-account browser/iOS test: user A loads data -> sign out/account switch/app restart -> user B cannot access A cache; test forced clear failure behavior | **VALIDATING** |
| R-003 | Public copy broadly claims offline behavior beyond proven scope | Product truth | Traveler relies on unavailable data during degraded connectivity | L3 Possible | **S1** | Landing, Dashboard, Help, Timeline and related shell language narrowed to supported saved/cached-record behavior; provider-backed/live claims removed or hidden | Complete remaining claim inventory in onboarding, install/App Store, secondary trip modules and emails; verify degraded-connectivity behavior | **MITIGATING** |
| R-004 | Flight client can label a result as live even though backend uses foreground/cache/gate semantics | Provider freshness / truth | Traveler may interpret absence of signal as continuous current all-clear | L3 Possible | **S1** | `Live checked` / `Live alert` language removed; unvalidated traveler alerts hidden; guessed-identity polling disabled | Validate all remaining flight surfaces and provider failure/null semantics; keep monitoring claims hidden until background chain is proven | **MITIGATING** |
| R-005 | Flight provider matching is not visibly strict enough for high-consequence live status | Provider identity | Status could attach to wrong segment/date/route | L2 Uncommon/UNKNOWN | **S1** | Existing query includes flight date + flight IATA when identity is available; guessed identity polling has been disabled | Add canonical booking-level flight number; validate returned service date, route/airports, carrier semantics and segment identity | OPEN |
| R-006 | No complete background flight monitoring chain proven while travel product may imply automatic alerts | Notifications / provider | User expects notification without opening app and misses disruption | UNKNOWN | **S1** if publicly promised | Foreground status function and notification infrastructure remain internal; monitoring claims removed/hidden | Prove scheduler/change detection/persistence/push/retry/production evidence before exposure | OPEN |
| R-007 | `generate-notifications` schedule/delivery chain not yet proven in production | Background jobs | Reminders may silently not generate/deliver | UNKNOWN | **S1/S2 depending claim** | Reminder settings hidden; generator/APNs infrastructure preserved internally | Verify scheduler, run history, token delivery, retries, observability and missed-run recovery | INVESTIGATING |
| R-008 | Multiple execution/intelligence engines may apply overlapping next-action/risk logic | Data/decision integrity | Contradictory Today guidance or hard-to-debug ordering | L3 Possible | **S1/S2** | Unvalidated operating brief/command-loop intelligence has been hidden on public surfaces | Build rule-ownership call graph and consolidate duplicate decision semantics with regression scenarios | OPEN |
| R-009 | Today locally derives active stay address from bookings instead of one canonical selector | Current-state derivation | Origin/next-action context can diverge | L2 Uncommon | **S2 Major** | Deterministic booking scan remains | Add canonical selector and parity tests | OPEN |
| R-010 | Drive signals are converted to TravelAlert while other alert/notification systems have separate rules | Alerts/deduplication | Duplicate/missing/conflicting alerts | L3 Possible | **S2** | Unvalidated traveler-alert and command-loop surfaces have been hidden | Define canonical finding/alert identity and delivery projections | OPEN |
| R-011 | Realtime bridge invalidates only selected tables; subscription health/recovery is not observable | Collaboration/sync | State can be stale while appearing current | L3 Possible | **S2** | Supabase channel + query invalidation | Verify coverage, reconnect, telemetry and permission-change behavior | OPEN |
| R-012 | Client-supplied AI trip context is not server-resolved canonical context | AI grounding | Assistant can answer from stale/partial context | L3 Possible | **S2** | Strict grounding prompt and authenticated call exist; broad AI claims have been narrowed | Move to trusted canonical structured context or explicit freshness/source contract | OPEN |
| R-013 | Scoped-sharing/security claim lacks completed RLS/PII cross-user matrix | Authorization/RLS | Privacy leak or misleading security promise | UNKNOWN | **S0 until proven** | Public wording narrowed to invitation/permission-aware actions; RLS migrations/hooks appear present | Complete table-by-table RLS, storage and PII tests; adversarial cross-user E2E | INVESTIGATING |
| R-014 | Financial/report outputs have not completed full canonical reconciliation | Money/reporting | Incorrect trip totals/reports | UNKNOWN | **S1** | Expense records/export mechanics exist; accounting/audit-grade public claims remain restricted | Trace every report value to canonical ledger; multi-currency/refund/split scenarios | INVESTIGATING |
| R-015 | No substantial browser-level E2E suite is visible in `main` | Quality / regression | UI/offline/provider failures can escape unit tests | L4 Likely exposure | **S2** | Extensive domain/Vitest coverage exists; Vercel preview builds validate compilation of staged phases | Add targeted E2E for public promises and critical travel scenarios | OPEN |
| R-016 | Mobile exposes many secondary module surfaces/legacy aliases | UX / cognitive load | Traveler must know app structure under stress | L4 Likely | **S2/S3** | Today/Timeline primary defaults exist | Consolidate under Today/Timeline/Travel/Places/Records while preserving workflows | OPEN |
| R-017 | Offline empty state can imply useful cached data exists when no saved snapshot is present | Truthful UX | False confidence useful offline data is present | L3 Possible | **S2** | `OfflineLocationContextCard` now explicitly says `No saved trip snapshot on this device`; Timeline copy distinguishes loaded records from cached device records and shows cached events only when present | Test empty, fresh and stale snapshots on web/iOS; verify snapshot age and no-cache behavior across restart | **VALIDATING** |
| R-018 | Multiple import pipeline families may diverge | Import/data integrity | Duplicate/inconsistent booking/timeline records | L3 Possible | **S2** | Staging/validators/mappers/tests exist | Trace each intake route; declare canonical pipeline and deprecate duplicates after parity tests | OPEN |
| R-019 | `mockAttractions.ts` exists in production source tree; active production use not yet proven absent | Product truth | Fabricated place content could appear as real | UNKNOWN | **S1/S2** | Real places provider also exists | Prove no production caller or isolate/remove mock path | INVESTIGATING |
| R-020 | CarPlay scaffold exists but is not a proven product implementation | Product truth/native | Expectation mismatch if mentioned | L1 unless claimed | **S3** | Scaffold only | Keep internal until real target/entitlements/UI validated | ACCEPTED INTERNAL RISK |
| R-021 | Manual booking UI exposes Flight Number but current booking persistence/read contract does not store it canonically | Booking/data loss | User can enter a flight number and reasonably expect it to persist, but the value can be lost or unavailable to provider matching | L4 Likely when manually editing flights | **S1** | Guessed flight identity polling has been disabled so missing canonical identity no longer drives provider traffic | Implement one vertical slice: schema column, generated types, secure `get_bookings_safe` return, create/update/import persistence, manual UI, display/provider matching and regression tests; until then remove/hide the dead input through a controlled source edit | OPEN |
| R-022 | Packing generation is a hard AI-provider dependency with no deterministic fallback and contains broad hard-coded assumptions | AI/product truth | Generation can fail on provider config/rate/credit conditions or produce inappropriate packing advice while appearing authoritative | L3 Possible | **S2** | Manual packing remains available; provider failures are surfaced rather than silently fabricated | Define supported packing contract, deterministic baseline/fallback, schema validation, provenance/freshness, representative regression fixtures and production provider validation before marketing as reliable intelligence | INVESTIGATING |
| R-023 | Frontend Free lifetime-trip constant is 2 while proven historical database function uses 5 and deployed override is not yet evidenced | Plan/entitlement contract | User could be shown the wrong usage limit or experience inconsistent entitlement behavior | UNKNOWN | **S2** | Visible trip-limit counts removed from PlanPill and Account; tier labels remain as persisted account state | Resolve deployed database function/policy, reconcile one canonical entitlement limit, add server/client contract tests, then decide whether any numeric limit should be exposed | INVESTIGATING |

---

## Trust-Hardening Changes Implemented

### Account-boundary cache isolation

- `src/lib/offlineTripCache.ts` exposes one clear-all operation covering `trip_cache`, `expense_queue`, `weather_snapshot`, and `explore_essentials`.
- A non-sensitive local cache-owner user ID marker persists across app restarts so an interrupted cleanup remains detectable later.
- `AuthContext` checks that durable owner marker before exposing a different authenticated account or completing sign-out.
- A failed clear does not mark the device clean; the owner marker remains so the next transition/restart retries before a new session can be exposed.

### Offline expense idempotency

- Migration adds nullable `expenses.client_expense_id UUID` plus a unique index.
- Offline replay always persists the stable queue UUID into that column.
- Replay uses an upsert conflict target on `client_expense_id`.
- Local queue intent is removed only after the canonical server row is returned.
- Unit regression coverage asserts retry payload identity remains stable and does not mutate the queued payload.

### Public truth tightening

- Landing SEO/schema no longer describes RT2RP generically as an offline or real-time travel product.
- Dashboard, Account, global shell and contextual Help no longer advertise unproven monitoring, readiness, paid capability or background automation.
- Flight-status polling based on a flight number guessed from free-form notes is disabled.
- Reminder-delivery settings are hidden until the scheduled generation/delivery chain is proven.
- Timeline distinguishes loaded trip records from cached device records and no longer claims live data or a universal source of truth.
- Offline location context requires an actual saved snapshot and exposes stale/no-cache states explicitly.
- Unverified retention countdown and numeric Free trip-limit claims are hidden.

---

## Validation Constraint

The current execution environment cannot clone GitHub to run the repository locally because outbound repository access from the container is unavailable. This is **not** treated as a passing local test result.

Vercel preview `READY` validates that staged Vite production builds compile, but it does not replace unit, integration, database, native or browser E2E validation.

Before merge/release, run at minimum:

1. `npm ci`
2. `npm test`
3. `npm run build`
4. `npm run lint`
5. Supabase migration apply in a controlled environment
6. offline replay crash/retry scenario
7. user A -> sign out/account switch/app restart -> user B local-data isolation scenario on web and iOS
8. browser E2E for the public capability surfaces affected by each phase

---

## Release Blocking Rules Applied

- R-001 remains release-blocking for strong offline-financial reliability wording until database/runtime validation passes.
- R-002 and R-013 remain S0 until privacy isolation/RLS are positively proven end-to-end.
- R-003–R-007 block broad offline/live/monitoring wording in affected domains.
- R-014 blocks accounting/audit-grade report claims until reconciled.
- R-021 blocks provider flight matching or monitoring that depends on manually entered flight identity until canonical persistence exists.
- R-022 blocks dependable/smart packing marketing until provider/fallback/schema behavior is validated.
- R-023 blocks public numeric trip-limit wording until the deployed entitlement contract is reconciled.

---

## Priority Remediation Order

1. R-013 — RLS/storage/PII/sharing verification;
2. R-021/R-005/R-006 — canonical flight identity, provider matching and background contract;
3. R-008/R-009/R-010 — execution/intelligence/alert ownership consolidation;
4. R-014 — financial/report reconciliation;
5. R-022 — packing generation contract/fallback validation;
6. R-023 — entitlement/plan contract reconciliation;
7. R-018 — import pipeline consolidation;
8. R-015 — critical browser E2E/visual/offline/provider-failure scenarios;
9. R-011/R-007 — realtime/background observability;
10. R-016 — product navigation/experience convergence;
11. R-017 — complete offline empty/fresh/stale device validation and then close with evidence.

---

## Closure Standard

A risk is not closed because code changed. Closure requires appropriate regression/E2E evidence, production configuration proof where relevant, affected-surface verification, and a recheck of public wording.

If evidence remains incomplete, status stays `VALIDATING`, `MITIGATING`, or `INVESTIGATING`, never `CLOSED`.

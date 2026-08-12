# RT2RP — Reliability Risk Register

**Status:** PHASE 0 — INITIAL MAIN RISK REGISTER

**Audited branch:** `main`

## Purpose

Track production risks that could damage traveler trust, create wrong decisions, lose or duplicate data, expose private information, or make public product claims misleading.

---

## Current Register

| ID | Risk | Category | User Impact | Likelihood | Severity | Current Mitigation | Required Action | Status |
|---|---|---|---|---|---|---|---|---|
| R-001 | Offline expense retry can create duplicate server expenses because `clientExpenseId` is not persisted/enforced as durable idempotency | Money / offline sync | Duplicate financial records, incorrect totals/reports | L3 Possible | **S1 Trip-Critical** | In-memory lock, retry count, queue status | Add server-enforced idempotency key/unique constraint or idempotent command; test crash after successful insert before local dequeue | OPEN |
| R-002 | Offline trip cache is keyed by trip ID and sign-out path does not visibly clear RT2RP IndexedDB caches | Privacy / offline | Previous user's trip data may remain on shared/account-switched device | UNKNOWN | **S0 Trust/Safety Critical until disproven** | Supabase auth sign-out; browser/device isolation only | Audit all local stores; namespace by user or securely clear on sign-out/account change; cross-account tests | INVESTIGATING |
| R-003 | Landing/public copy broadly claims offline trip details while only portions of offline user outcome are proven | Product truth | Traveler relies on unavailable data during degraded connectivity | L3 Possible | **S1** | Cached Timeline and other caches exist | Narrow public copy now; validate Critical Trip Packet before restoring broad claim | OPEN |
| R-004 | Flight client can label a result `Live checked` even though backend uses cache/gates/null-signal failure semantics | Provider freshness / truth | Traveler may interpret absence of signal as current all-clear | L3 Possible | **S1** | Some provider metadata/failure labels | Replace binary live-clear semantics with explicit observation freshness/source/result state; never conflate null with clear | OPEN |
| R-005 | Flight provider matching is not visibly strict enough for high-consequence live status; first result is used after flight-number check | Provider identity | Status could attach to wrong segment/date/route under ambiguous provider results | L2 Uncommon/UNKNOWN | **S1** | query includes flight date + flight IATA | Validate returned service date, route/airports, operating/marketing carrier semantics and segment identity | OPEN |
| R-006 | No complete background flight monitoring chain proven while travel product may imply alerts/real-time updates | Notifications / provider | User expects notification without opening app and misses disruption | UNKNOWN | **S1** if publicly promised | foreground status function, notification infrastructure | Hide monitoring claims until scheduler/change detect/persistence/push/retry/production evidence exists | OPEN |
| R-007 | `generate-notifications` comments imply pg_cron schedule, but production schedule/delivery chain not yet proven | Background jobs | reminders may silently not generate/deliver | UNKNOWN | **S1/S2 depending claim** | cron-secret protected function, canonical reminder engine, send-push function | Verify actual scheduler, run history, token delivery, retries, observability, missed-run recovery | INVESTIGATING |
| R-008 | Multiple execution/intelligence engines may apply overlapping next-action/risk logic | Data/decision integrity | contradictory Today guidance or difficult-to-debug action ordering | L3 Possible | **S1/S2** | canonical Today stack used in main command center | Build rule ownership call graph; consolidate duplicate decision semantics; regression scenarios | OPEN |
| R-009 | Today locally derives active stay address from bookings instead of consuming one canonical stay/context selector | Current-state derivation | origin/next-action context can diverge from canonical trip state | L2 Uncommon | **S2 Major** | booking scan uses deterministic date range | Add canonical selector and parity tests; remove local duplicate only after proof | OPEN |
| R-010 | Drive signals are converted to TravelAlert objects inside `NowCommandCenter`, while other alert/notification systems have separate rules | Alerts/deduplication | duplicate/missing/conflicting alerts | L3 Possible | **S2** | local parking dedupe | Define canonical finding/alert identity and separate in-app vs delivery projections | OPEN |
| R-011 | Realtime bridge invalidates only selected tables; subscription health/recovery is not user-observable | Collaboration/sync | multi-user/device state can be stale while appearing current | L3 Possible | **S2** | Supabase channel + query refetch invalidation | Verify relevant table coverage, resubscribe/failure telemetry, refetch on reconnect, permission-change behavior | OPEN |
| R-012 | Client-supplied AI trip context is not server-resolved canonical context | AI grounding | assistant can answer from stale/partial client context | L3 Possible | **S2** | strict grounding prompt, authenticated call | Pass canonical structured context through trusted server contract or include explicit freshness/source metadata; deterministic timing inputs | OPEN |
| R-013 | Public scoped-sharing/security claim is not yet backed by completed RLS/PII cross-user matrix in this audit | Authorization/RLS | privacy leak or misleading security promise | UNKNOWN | **S0 until proven** | Supabase RLS migrations/hooks appear present | Complete table-by-table RLS and file/PII tests; adversarial cross-user E2E | INVESTIGATING |
| R-014 | Financial/report outputs may have multiple calculation/projection paths without completed full reconciliation | Money/reporting | incorrect trip totals, business/personal reports | UNKNOWN | **S1** | extensive expense/cost tests and booking-expense sync | Trace every report value to canonical ledger; multi-currency/refund/split scenarios | INVESTIGATING |
| R-015 | No substantial browser-level E2E suite is visible in `main` | Quality / regression | UI, offline, provider failure, navigation and real-trip regressions can escape unit tests | L4 Likely exposure | **S2** | extensive domain/Vitest coverage | Add targeted E2E for public promises and critical travel scenarios; rendered visual/accessibility checks | OPEN |
| R-016 | Mobile product still exposes many secondary module surfaces/legacy aliases | UX / cognitive load | traveler must know app structure under stress | L4 Likely | **S2/S3** | Today/Timeline primary defaults exist | Consolidate into Today/Timeline/Travel/Places/Records while preserving useful workflows | OPEN |
| R-017 | Offline empty timeline state says `Offline cache is ready` even when no cached rows are available | Truthful UX | false confidence that useful offline data is present | L3 Possible | **S2** | reconnect message | Change wording to exactly describe availability and snapshot age; test empty/expired cache | OPEN |
| R-018 | Multiple import pipeline families may cause divergent parsing/staging/finalization behavior | Import/data integrity | duplicate or inconsistent booking/timeline records | L3 Possible | **S2** | staging/validators/mappers/tests exist | Trace each intake route; declare one canonical pipeline and deprecate duplicates after parity tests | OPEN |
| R-019 | `mockAttractions.ts` exists in production source tree; active production use not yet proven absent | Product truth | fabricated place content could appear as real | UNKNOWN | **S1/S2** | real places provider also exists | Search all callers and ensure mock data is test/dev-only or remove from production bundle paths | INVESTIGATING |
| R-020 | CarPlay scaffold exists but not proven product implementation | Product truth/native | public expectation mismatch if mentioned | L1 unless claimed | **S3** | scaffold only | Keep entirely internal; no claim until complete native target validated | ACCEPTED INTERNAL RISK |

---

## Release Blocking Rules Applied

- **R-001** blocks strong public offline-expense reliability wording until fixed.
- **R-002 and R-013** are treated as S0 until privacy isolation is positively proven. Lack of evidence does not downgrade a potential privacy risk.
- **R-003–R-007** block broad offline/live/monitoring wording in the affected domains.
- **R-014** blocks accounting-grade/report-accuracy claims until reconciled.

---

## Priority Remediation Order

### Immediate truth/security/financial controls

1. R-002 — offline cache user isolation/logout clearing;
2. R-013 — RLS/PII/sharing verification;
3. R-001 — durable expense idempotency;
4. R-003/R-004/R-006 — narrow unsupported public offline/live/monitoring wording.

### Canonical decision reliability

5. R-008/R-009/R-010 — Today/alert engine ownership;
6. R-005 — flight entity identity/freshness;
7. R-014 — financial/report reconciliation;
8. R-018 — import pipeline consolidation.

### Product-grade validation

9. R-015 — critical browser E2E/visual/offline/provider-failure scenarios;
10. R-011/R-007 — realtime/background observability;
11. R-016 — product navigation/experience convergence.

---

## Closure Standard

A risk is not closed because code changed. Closure requires appropriate regression/e2e evidence, production configuration proof where relevant, affected-surface verification, and a recheck of public wording.

If evidence remains incomplete, status stays `VALIDATING` or `INVESTIGATING`, never `CLOSED`.

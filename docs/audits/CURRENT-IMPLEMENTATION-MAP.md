# RT2RP — Current Implementation Map

**Status:** PHASE 0 — INITIAL MAIN AUDIT COMPLETE; DEEP VALIDATION REQUIRED

**Audited branch:** `main`

**Repository head audited:** `40e25fdc79ab22c0abe29e1228a3e7a57def1eb7`

## Purpose

This document is the factual map of the current `main` implementation used to drive preservation-first modernization.

The audit is grounded in current code, migrations, edge functions, tests, native code, and public surfaces. File existence is not treated as proof that a capability is production-configured or reliable end-to-end.

---

## Executive Implementation Assessment

The current product is not a thin prototype. `main` contains substantial real architecture worth preserving:

- a canonical trip-state builder and hook;
- a desktop shell that computes canonical trip state once and distributes it to downstream views;
- a mobile Today command center backed by canonical execution logic;
- an established timeline projection;
- extensive booking/import/date-time normalization code;
- route/transit/places/flight provider edge functions;
- centralized AI provider infrastructure;
- native iOS/Capacitor infrastructure, local/push notification helpers, haptics, and deep-link/navigation code;
- IndexedDB trip snapshots and additional offline caches;
- an offline expense queue;
- realtime query invalidation for key trip tables;
- substantial unit/domain regression tests.

The largest current risks are not absence of functionality. They are **truth, consolidation, user-facing scope, and end-to-end proof**:

1. public claims are broader than evidence currently proves;
2. some reliability comments/claims exceed actual implementation guarantees;
3. multiple overlapping execution/intelligence engines risk duplicate ownership;
4. mobile information architecture still exposes many module-level surfaces despite the emerging Today/Timeline/Travel/Places/Records spine;
5. live flight status is a narrow foreground signal lookup, not proven background monitoring;
6. offline trip access has real foundations but account isolation, staleness, logout clearing, and complete screen behavior still require validation;
7. browser-level end-to-end and rendered visual evidence is materially thinner than domain/unit coverage.

---

## Application Routes and User Surfaces

| Surface | Entry Route | Primary User Outcome | Main Components/Containers | Current Status | Classification | Evidence/Notes |
|---|---|---|---|---|---|---|
| Landing | `/` | Explain/payoff and convert | `LandingPage` + landing components | Public, broad claims | STRENGTHEN / NARROW NOW | SEO/schema explicitly claim offline trip details, offline expense capture, transit windows, reports, business/personal management. Each claim must be independently validated. |
| Dashboard | `/dashboard` | Select/create/manage trips | `Dashboard` | Large mature surface | PRESERVE + STRENGTHEN | Needs experience consolidation and claim review, not replacement by default. |
| Trip Detail | `/trip/:tripId` | Operate a trip | `TripDetail`, `DesktopTripShell`, `MobileNavigationRouter` | Core product | PRESERVE + CONSOLIDATE | Correct center of gravity; mobile still exposes many domain tabs/aliases. |
| Today | mobile trip default | Understand now/next/action | `NowCommandCenter` | Strong differentiated foundation | PRESERVE + STRENGTHEN | Canonical execution stack is computed once, but multiple intelligence engines and local re-derivations need ownership audit. |
| Timeline | trip `flow`/timeline | Chronological trip truth | `TripTimeline`, canonical state | Real | PRESERVE + STRENGTHEN | Mobile supports cached timeline fallback. Needs rendered usability, complex multi-modal, and correction propagation validation. |
| Travel / Ops | trip `ops` | Movement/operational context | `TravelOpsTab`, drive/airport/move surfaces | Broad but fragmented | CONSOLIDATE | Movement capability exists across several screens; target should converge under Travel without deleting proven specialist flows. |
| Driving | `/trip/:tripId/drive` | Road-trip execution | `DriveMode`, drive engine/provider/helpers | Substantial implementation | PRESERVE + STRENGTHEN | Strong foundation; must prove route/live/hazard semantics and mixed-mode integration. |
| Reservations | trip bookings | Store/manage bookings | `TripBookingsContainer`, `BookingsTab` | Mature | PRESERVE + STRENGTHEN | Very large surface. Should remain durable record source while movement/stay projections are normalized. |
| Expenses | trip expenses + reports | Capture/reconcile spend | `TripExpensesContainer`, `ExpensesTab`, expense engines | Broad | PRESERVE + FIX RELIABILITY | Offline queue has an idempotency gap; financial claims need hardening. |
| Places/Explore | trip Explore | Nearby/trip-place context | `ExploreTab`, real places hooks/functions | Broad | PRESERVE + NARROW ROLE | Useful support domain, not primary differentiation. Ensure no mock data leaks into production. |
| Sharing/Travelers | Members/Companions/share routes | Share trip/manage traveler context | Members/Companions hooks and screens | Implemented paths exist | NEEDS DEEPER SECURITY AUDIT | Must prove RLS/permissions/PII behavior end-to-end. |
| AI Assistant | in-trip ask/assistant | Grounded answers | `TripAskDialog`, `trip-assistant` edge function | Real but bounded | PRESERVE + STRENGTHEN | Prompt is intentionally grounded; server trusts supplied context rather than fetching canonical state. |
| Reports | `/reports`, trip report | Closeout/business summary | Reports, TripSummaryReportTab | Real surface | NEEDS RECONCILIATION AUDIT | Must prove every total/claim reconciles to canonical financial records. |

---

## Canonical / Domain Logic

| Domain Concept | Current Canonical Owner / Candidate | Competing / Adjacent Paths | Classification | Evidence/Notes |
|---|---|---|---|---|
| Trip operational state | `src/lib/canonicalTripState.ts` + `useCanonicalTripState` | screen-specific derivations | PRESERVE AS CANONICAL; CONSOLIDATE callers | Large canonical builder already central to desktop/mobile and offline snapshot. |
| Desktop shared state | `DesktopTripShell` | tab-local hooks possible | PRESERVE | Explicitly computes canonical state and alerts once. Good architecture. |
| Today execution ordering | `canonicalTodayExecutionStack.ts` | `execution/*`, `todayActionItems`, AI orchestration, proactive engines | PRESERVE + OWNERSHIP AUDIT | Strong execution intent, but engine overlap is high. |
| Timeline | canonical trip state projection | imported/persisted `trip_events`, booking-derived rows | PRESERVE + VERIFY SOURCE RULES | Need explicit source identity and stale-copy tests. |
| Time semantics | canonical time policy/normalizer/preservation + extensive tests | assorted display/date helpers | PRESERVE + CONSOLIDATE | One of the stronger current engineering areas. Timezone regression coverage is substantial. |
| Money | expense calculations, cost attribution, monetary/currency normalization | booking-expense sync, report computations | PRESERVE + RECONCILE | Strong domain code exists; financial end-to-end reconciliation remains required. |
| Movement | drive engines + movement orchestration + transit/traffic + canonical state | multiple movement/intelligence engines | CONSOLIDATE OWNERSHIP | Capability is deep, but boundaries are not obvious enough for one authoritative movement model. |
| AI/context intelligence | deterministic proactive/orchestration engines + edge assistant | multiple similarly named engines | CONSOLIDATE / RENAME BOUNDARIES | Some "AI" orchestration is deterministic; naming and authority should make facts vs rules vs generative AI unmistakable. |
| Traveler vs member | separate hooks/types exist | sharing/member/companion paths | PRESERVE MODEL; SECURITY AUDIT | Direction matches target domain model, but RLS must be verified. |

---

## Edge Functions / Server Operations

| Function | Current Purpose | External Dependency | Auth/Boundary | Current Assessment |
|---|---|---|---|---|
| `flight-status` | delay/cancel/gate-change signal lookup | Aviationstack | bearer auth + usage RPC + service cache | STRENGTHEN. Narrow signal lookup, 10-minute cache, 12/day gate, first-result matching; not proven monitoring. |
| `here-route` | route provider boundary | HERE | server function | PRESERVE + VALIDATE route/freshness/failure semantics. |
| `here-transit` | transit routing | HERE | server function | PRESERVE + VALIDATE static/live wording. |
| `places-search` / `nearby-places` / `places-photo` | place data | external place provider(s) | server boundary | PRESERVE + COST/ATTRIBUTION VALIDATION. |
| `parse-booking`, `parse-booking-image`, `parse-itinerary`, `parse-receipt-image` | AI-assisted extraction | centralized AI/provider path | server functions | PRESERVE + EVAL. Strong amount of extraction infrastructure; release claims require accuracy corpus/evals. |
| `trip-assistant` | grounded single-turn assistant | shared AI provider | authenticated | PRESERVE + STRENGTHEN. Uses supplied trip context; should migrate toward server/canonical context contract for higher trust. |
| `generate-notifications` | scheduled canonical reminder generation | Supabase/cron | CRON secret | PRESERVE + VERIFY SCHEDULE. Code says it should be pg_cron-invoked; actual production scheduler and delivery chain must be proven. |
| `send-push` | push delivery | APNS/provider | server | PRESERVE + PROVE production delivery/retry/token lifecycle. |
| `inbound-email` / `process-pending-import` | email import workflow | email/provider + AI | server | PRESERVE + END-TO-END VALIDATE. |
| `trip-lifecycle-enforcement` | lifecycle maintenance | Supabase | server | PRESERVE + VERIFY schedule/idempotency. |

---

## Provider / Live Data Assessment

### Flight status

Current behavior is **not equivalent to continuous flight monitoring**.

Current `main` behavior:

- user-triggered/client query to `flight-status`;
- query key is flight number + departure date;
- client treats a fresh foreground result as `Live checked` / `Live alert`;
- backend caches for 10 minutes;
- backend gates provider calls to 12 per user/day;
- backend returns `signal: null` with HTTP 200 for several provider/config/error conditions;
- backend selects the first provider result and verifies flight number, but does not visibly perform full route/airport/operating-carrier entity matching before trusting it;
- only cancellation, delay, or a gate-difference signal is surfaced;
- no background flight polling chain was proven in this audit.

**Decision:** preserve the provider adapter work, strengthen identity/freshness/error semantics, and do not market proactive flight monitoring until a complete background/delivery chain is proven.

### Realtime database sync

`RealtimeSyncBridge` subscribes to Postgres changes for `trips`, `trip_engagements`, `trip_events`, `bookings`, and `expenses`, then invalidates related query keys. This is useful collaboration/multi-device synchronization infrastructure.

**Decision:** PRESERVE + STRENGTHEN. Add subscription status/recovery evidence and ensure table coverage aligns with actual shared domains.

---

## AI Assessment

### Strong current foundations

- centralized `_shared/ai-provider.ts` abstraction;
- provider selected via environment rather than hardwired UI logic;
- grounded `trip-assistant` prompt explicitly forbids invention and live-data fabrication without supplied data;
- substantial structured parsing/import infrastructure;
- deterministic orchestration/proactive engines reduce reliance on generative AI for basic sequencing.

### Gaps

- central provider helper has no obvious common timeout/retry/cost/telemetry contract;
- assistant context is supplied by client rather than server-resolved canonical trip state;
- generative prompt asks model to calculate timing from context rather than always consuming deterministic timing results;
- multiple deterministic modules labeled AI/intelligence make ownership difficult to reason about;
- repository contains many AI/parsing tests but a formal capability-level evaluation corpus/release threshold is not yet clearly established.

**Classification:** PRESERVE + CONSOLIDATE + STRENGTHEN.

---

## Native / PWA / Offline Assessment

### Proven foundations in code

- Capacitor/iOS native project exists;
- native local notification, push, navigation, haptics, and bootstrap helpers exist;
- `useNativeDepartureSync` and `useNativeReminderSync` exist;
- canonical trip snapshots are intentionally written to IndexedDB;
- mobile Timeline intentionally renders a cached trip window when offline;
- weather and Explore have dedicated offline caches;
- offline expense queue exists;
- network status handling exists.

### Unproven / problematic areas

- trip cache is keyed by `tripId`, not visibly namespaced by authenticated user;
- `AuthContext.signOut()` does not clear RT2RP IndexedDB caches;
- account switching/shared-device behavior therefore requires immediate security review;
- offline snapshot freshness/maximum retention is not clearly surfaced in the observed mobile Timeline UX;
- the offline empty-state copy says `Offline cache is ready` even when no cached timeline rows are available;
- offline expense queue's `clientExpenseId` is not actually included in the Supabase insert as a durable idempotency key, despite code comments promising dedupe/exactly-once behavior;
- an in-memory processing lock cannot prevent duplicate replay across reloads/processes;
- complete offline behavior for Today, Records, reservations, documents, and account changes remains unproven.

**Classification:** real foundation; **STRENGTHEN before broad offline claims**. Offline expense reliability has an immediate S1-quality defect.

---

## Public Product Claims Requiring Immediate Verification

`src/pages/LandingPage.tsx` currently claims or implies:

- offline trip details;
- offline expense capture;
- next actions and leave-by timing;
- Driving Mode route context/next stops;
- local transit map/routing windows;
- multi-currency expenses;
- trip sharing with scoped permissions;
- business and personal trip management;
- reports.

These claims must not remain automatically grandfathered. Each maps to the Promise vs Reality Matrix.

---

## Duplicate / Consolidation Hotspots

Initial high-value targets for the Duplicate Truth Map:

- `BulkStopsDialog.tsx` and `BulkStopsDialogV2.tsx`;
- multiple execution engines (`contextualExecutionEngine`, `unifiedExecutionEngine`, `execution/*`, canonical Today stack);
- multiple intelligence/proactive/orchestration engines (`proactiveInsightEngine`, `proactiveTripIntelligenceEngine`, `aiOrchestrationEngine`, `predictiveActionEngine`, sequence/movement/multimodal engines);
- local active-stay derivation inside Today vs canonical state ownership;
- drive signals mapped into travel alerts at the Now container layer;
- multiple date/time utility layers outside canonical time modules;
- multiple import pipelines/adapter layers that need explicit boundaries rather than parallel parsing truth.

These are **audit targets**, not automatic deletion candidates.

---

## Test Inventory

### Strong coverage

The repository contains extensive Vitest/domain tests for:

- canonical time/date behavior;
- airport timezones and flight local datetime semantics;
- trip windows/dates;
- import parsing and canonical mapping;
- booking-expense synchronization;
- cost/expense calculations;
- drive intelligence;
- trip build/model parity;
- access gating;
- selected containers/components.

### Critical gaps from repository tree

No substantial Playwright/Cypress/browser E2E suite was visible in `main` during this audit. A source-level UI audit cannot prove rendered quality, mobile tap ergonomics, visual hierarchy, service-worker behavior, provider failure presentation, or complete real-trip workflows.

**Decision:** preserve the domain test base and add targeted browser/E2E validation for every public product promise before claiming Phase 0/1 completion.

---

## Initial Preservation Decisions

### PRESERVE

- canonical trip-state foundation;
- canonical time policy and regression coverage;
- DesktopTripShell pattern;
- Today command/execution concept;
- current canonical timeline foundation;
- centralized AI provider boundary;
- Supabase/Edge provider boundary pattern;
- existing iOS/Capacitor foundation;
- realtime invalidation bridge concept;
- existing import/parsing infrastructure subject to accuracy validation;
- mature expense domain logic subject to offline/reconciliation hardening.

### STRENGTHEN

- offline/security/cache lifecycle;
- flight status identity/freshness/failure semantics;
- background notification proof and observability;
- rendered mobile/desktop UX;
- live-state language;
- AI server grounding/evaluation;
- report reconciliation;
- RLS/sharing evidence;
- provider telemetry/cost/fallback behavior.

### CONSOLIDATE

- mobile module/navigation sprawl toward Today / Timeline / Travel / Places / Records;
- overlapping execution/intelligence engines;
- movement domains into one explicit movement ownership model;
- duplicate/legacy components only after caller/data-path proof.

### HIDE / NARROW UNTIL PROVEN

- broad offline wording;
- proactive/live flight-monitoring language beyond current foreground status check;
- any automatic-import accuracy claims not backed by eval evidence;
- any claim that a provider-owned action is performed by RT2RP when the app only links/hands off.

---

## Phase 0 Exit Status

**NOT COMPLETE YET.**

This initial pass establishes the architecture and highest-risk truth gaps. Before Phase 0 can be closed, the following still require deeper evidence:

1. full RLS/security matrix for trips, members, companions, documents, expenses, sharing and cached data;
2. production cron/job configuration and push delivery proof;
3. end-to-end import accuracy/review/deduplication scenarios;
4. full financial reconciliation and offline-expense replay fix;
5. rendered/browser visual and stress-use audit;
6. exact native offline/push lifecycle tests;
7. provider production configuration and live failure-path validation;
8. public landing/help/pricing/App Store claim inventory beyond the first landing-page pass.

No runtime changes are authorized by this audit alone. Each remediation must proceed through the applicable subsystem spec and preservation classification.

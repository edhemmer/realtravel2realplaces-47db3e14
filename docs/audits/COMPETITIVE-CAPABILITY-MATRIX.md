# RT2RP — Competitive Capability Matrix

**Status:** PHASE 0 — INITIAL MAIN COMPETITIVE AUDIT

**Audited branch:** `main`

## Purpose

Compare current RT2RP implementation against the current market bar in `docs/12-MARKET-AND-PRODUCT-STANDARD.md` using code/configuration evidence rather than old feature inventories.

Rendered visual quality and production provider behavior remain unproven where browser/device or live production evidence was not available in this pass.

---

## Classification

- **LEADING** — demonstrably stronger for the user outcome;
- **DIFFERENTIATED** — creates unique integrated trip value even if specialist depth is lower;
- **PARITY** — meets modern expectation;
- **BELOW PARITY** — real but materially weaker than expected;
- **UNPROVEN** — code/claims exist but evidence is insufficient;
- **NOT SUPPORTED** — intentionally not exposed;
- **NOT IN SCOPE** — does not belong in RT2RP.

No current row is labeled LEADING solely from source review.

---

## Current Main Matrix

| Traveler Problem / Domain | Current RT2RP Evidence | Benchmark | Classification | Integration Advantage | Main Gap / Risk | Decision |
|---|---|---|---|---|---|---|
| Trip intake / confirmation import | Multiple server parsers, image/itinerary/receipt parsing, inbound email, pending-import staging, canonical mappers, validation and tests | TripIt / KAYAK / Wanderlog | **UNPROVEN / POTENTIAL PARITY** | Imported facts can flow into canonical trip/expenses/timeline | Multiple import generations and no quantified accuracy/eval threshold yet | PRESERVE + consolidate pipeline + benchmark friction/accuracy |
| Unified itinerary / timeline | Canonical trip state + TripTimeline + mobile cached timeline | TripIt / Tripsy / Wanderlog | **UNPROVEN / STRONG FOUNDATION** | Timeline can consume broader expenses/parking/movement/context than classic itinerary | Rendered clarity, dense multimodal and edit propagation not yet proven | PRESERVE + strengthen to demonstrated parity |
| Today / operational command | Canonical Today execution stack, next-action resolver, readiness, drive signals, alerts, proactive/orchestrated context | TripIt Pro / Flighty within specialist domain | **DIFFERENTIATED FOUNDATION, UNPROVEN QUALITY** | Cross-domain now/next/action is RT2RP's strongest unique concept | Overlapping engines and no full real-trip E2E proof | DIFFERENTIATE + consolidate decision ownership |
| Flight execution | authenticated Aviationstack signal lookup + flight UI hooks/display code | Flighty / TripIt Pro | **BELOW SPECIALIST PARITY** | Flight status can inform whole-trip Today/Timeline/ground movement | Narrow signal model, 10-min cache, usage gate, weak entity-match proof, no rich operational status | Keep only necessary flight context; strengthen before broader claims |
| Real-time flight/change delivery | foreground query; generic notification/push infrastructure exists | Flighty / TripIt Pro / KAYAK | **UNPROVEN / BELOW PARITY IF CLAIMED** | Potential to connect disruption to next actions | No proven background polling/change-detect/push chain | HIDE monitoring claims until complete |
| Drive / road-trip execution | dedicated DriveMode, HERE route, drive engine, route geometry, hazard/intelligence helpers, Today integration | Roadtrippers / modern maps | **UNPROVEN / DIFFERENTIATED POTENTIAL** | Can connect route, lodging, parking, expenses and next movement | Need real rendered route UX, provider freshness, hazard validation, mixed-mode behavior | PRESERVE + strengthen integrated execution rather than copy road-trip catalog |
| Rail / transit integration | HERE transit function + transit intelligence + generic booking/timeline structures | TripIt/KAYAK + operator apps | **UNPROVEN** | Fits same trip/movement graph | First-class rail semantics/live scope not yet proven | Strengthen only where real supported outcome exists |
| Multi-modal continuity | movement orchestration/multimodal engines, canonical trip/timeline and broad booking types | Fragmented market | **DIFFERENTIATED ARCHITECTURAL POTENTIAL** | Core category opportunity: one trip across modes | Multiple movement engines; transitions not yet proven end-to-end | Make this a primary differentiation spec after consolidation |
| Collaboration / sharing | member/share/invite hooks/routes + realtime sync + RLS migration history | Wanderlog / KAYAK / TripIt | **UNPROVEN** | Shared operational trip, not just shared plan | Security/RLS/PII matrix incomplete; realtime table coverage unverified | Preserve, security-validate, then benchmark usability |
| Places / nearby discovery | real place search/photo/nearby functions, Explore hooks/components/caches | Maps / Wanderlog / Roadtrippers | **UNPROVEN / LIKELY TABLE STAKES** | Places can attach to actual trip context/timeline | Not differentiated; mock attractions file must be proven non-production | Preserve as supporting capability; don't overinvest in browse breadth |
| Expense capture | extensive expense UI/domain logic, receipt parser, offline queue, multi-currency normalization | TravelSpend / Navan / Concur | **BELOW PARITY ON RELIABILITY UNTIL FIX** | Expenses connect directly to trip records, bookings and closeout | Offline idempotency defect; report reconciliation unproven | Fix S1 reliability, then strengthen traveler/business utility |
| Cost splitting / settlement | expense shares/related code exists in repo | TravelSpend / Splitwise-like | **UNPROVEN** | Could use traveler/member context | Complete settlement semantics/UX not audited | Do not claim until validated; may be optional scope |
| Business/mixed trip records | trip types, expenses, work stops, reports/business gating | Navan / Concur | **DIFFERENTIATED PROSUMER POTENTIAL** | Can support personal + business without enterprise procurement burden | Financial/report accuracy and business workflow depth unproven | Preserve/narrow to prosumer trip management |
| Offline critical trip access | IndexedDB canonical trip snapshots; mobile Timeline cached fallback; weather/Explore caches | TripIt / KAYAK / Wanderlog Pro / strong mobile apps | **BELOW PARITY / UNPROVEN BROADLY** | Canonical snapshot could become Critical Trip Packet | user isolation/logout clearing, freshness, full critical-record coverage not proven | Strengthen; narrow public offline claim now |
| Offline expense capture | IndexedDB queue and local sync flow | TravelSpend / Concur mobile | **BELOW PARITY DUE RELIABILITY DEFECT** | Could be excellent integrated travel finance | missing durable idempotency; shared/account cache lifecycle unproven | HIDE strong claim until fixed |
| Notifications / monitoring | canonical reminder engine, generate-notifications function, APNS/send-push/native helpers | Flighty / TripIt Pro / KAYAK | **UNPROVEN** | Alerts can use full trip context | scheduler/run history/delivery/retry/observability not proven | Preserve infrastructure; prove before claim |
| AI intake / trip intelligence | centralized AI provider, parsing functions, grounded assistant, deterministic orchestration | Wanderlog + broad AI planners | **DIFFERENTIATED FOUNDATION, UNPROVEN RELEASE QUALITY** | AI can work on actual trip rather than generic travel chat | context trust/evals/telemetry and overlapping intelligence engines | Preserve + centralize + objective evals |
| Native/mobile interaction quality | Capacitor/iOS project, native push/local notifications, haptics/navigation/bootstrap | Flighty / Tripsy / TripIt | **UNPROVEN** | Same canonical logic can power native shell | actual device/rendered polish and lifecycle evidence not inspected | Preserve platform; perform real device/browser visual validation |
| Visual hierarchy / graphics / maps | substantial Tailwind/CSS/component system, route/airport/explore visual surfaces | Flighty / Tripsy / Wanderlog / Roadtrippers | **UNPROVEN** | Could visualize connected operational trip rather than isolated modules | source review cannot establish stellar graphics; legacy module density may reduce clarity | Apply new UX contract and rendered visual regression |
| Loading / degraded-state UX | TripSectionStates, ErrorBoundary, network status, cached timeline, provider metadata | strong specialist apps | **UNPROVEN / MIXED** | Bounded failure architecture exists | some wording overstates cache readiness/live clear; full partial failure behavior untested | Strengthen truth states + E2E |
| Accessibility / stress usability | shadcn primitives, semantic/accessibility patterns, mobile layouts | platform-quality apps | **UNPROVEN** | Operational hierarchy can reduce cognitive load | no full rendered keyboard/screen reader/stress audit | Validate before calling production-grade |
| Post-trip closeout / durable record | reports, trip report tab, expense/records infrastructure | TravelSpend / Concur / Polarsteps (different purpose) | **UNPROVEN / DIFFERENTIATED POTENTIAL** | Operational history can combine travel + money + records | reconciliation and actual retention/reuse value unproven | Preserve; build CLOSE experience only from proven records |

---

## What Main Already Does Better Than a Typical Prototype

RT2RP already has several architectural advantages that should not be destroyed in modernization:

1. **Canonical trip-state intent is real.** The app is not purely screen-local state.
2. **Today is already execution-oriented.** The product has a genuine command-surface concept rather than only an itinerary list.
3. **Time handling has unusually serious domain treatment.** Canonical time policy/normalization and regression tests are substantial.
4. **Road travel has meaningful depth.** Driving is not merely a link to Maps.
5. **AI is partially centralized and grounded.** The codebase already resists a generic chatbot architecture.
6. **Offline is not imaginary.** There are real caches/queues, but the promises currently outrun the reliability/security proof.
7. **Native support is real infrastructure.** iOS/Capacitor and notification/haptic/navigation helpers exist.

These are preservation assets.

---

## Where Main Is Currently Below the New Standard

### 1. Product truth

Marketing/SEO can currently make stronger claims than Phase 0 evidence supports, especially offline/live/automatic behavior.

### 2. Operational continuity is implemented in layers but not yet proven as one experience

The repo has many engines and modules capable of creating the desired operating system, but too many ownership boundaries are ambiguous. The next gain comes from consolidation, not another intelligence engine.

### 3. Specialist-quality live execution is not there yet

Flight status is materially behind Flighty-level execution. That is acceptable only if RT2RP narrows its role to trustworthy trip context rather than pretending to be a flight specialist.

### 4. Offline reliability is not commercially ready as currently worded

Trip snapshot architecture is promising, but security/lifecycle/freshness must be hardened. Offline expense capture specifically has a duplicate-write risk.

### 5. Visual excellence is unproven

The codebase has a large design system, premium CSS and many visual components, but “stellar” cannot be awarded from source. A rendered mobile/desktop audit is mandatory.

### 6. End-to-end evidence is too weak relative to domain complexity

The unit/domain test base is strong. Browser/device user-promise coverage is not visible at comparable depth.

---

## Priority Competitive Moves

Do **not** add more feature categories. Raise these existing strengths to the new standard in this order:

1. **Truth + security + financial integrity** — offline cache isolation, idempotent expenses, narrow unsupported copy.
2. **Canonical execution consolidation** — Today/alerts/movement/intelligence ownership.
3. **Timeline + Today experience** — make the two central surfaces clearly better than static itinerary management.
4. **Multimodal continuity** — prove handoffs between air/drive/rail/stays/ground movement.
5. **Critical Trip Packet** — secure, intentional offline access to essential confirmed trip information.
6. **Provider/live contracts** — only then add/proclaim strong real-time behaviors.
7. **Rendered premium experience** — applied during every slice, with full convergence after architecture consolidation.
8. **Commercial/package differentiation** — only after the above is proven.

---

## Exit Status

**INITIAL BENCHMARK COMPLETE; FULL COMPETITIVE VALIDATION NOT COMPLETE.**

No current capability is labeled LEADING from source review alone. LEADING/PARITY requires rendered, end-to-end and where relevant production-provider evidence under the new subsystem spec standard.

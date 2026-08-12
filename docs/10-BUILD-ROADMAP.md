# RT2RP — Preservation-First Build Roadmap

## Purpose

This roadmap transforms the current RT2RP application into a cohesive, dependable, competitive Travel Operating System without destroying working value.

It is not a feature wishlist.

The sequence is architecture-first, preservation-first, market-aware, experience-led, and proof-driven.

Target capabilities are internal roadmap intent. They do not become user-facing promises until validated under `specs/000-SPEC-STANDARD.md`.

The market benchmark in `docs/12-MARKET-AND-PRODUCT-STANDARD.md` defines an external quality bar, not an automatic feature list.

---

# Governing Rules

## 1. Truth Before Expansion

Do not add new public promises while current product claims and behavior are being reconciled.

## 2. Preservation Before Rewrite

Preserve strong current behavior. Strengthen or consolidate before replacing. Replace only with evidence and migration safety.

## 3. Experience Is Not a Late Phase

Every user-facing vertical slice must ship with its required:

- UX hierarchy;
- mobile/desktop behavior;
- accessibility;
- visual quality;
- loading/error/stale/offline states;
- perceived-speed behavior;
- competitive interaction quality.

Phase 11 is convergence/refinement, not the first time design quality is addressed.

## 4. Real-Time Is a Contract

Any `live`, `monitoring`, `automatic update`, or `alert` capability must pass `docs/08-LIVE-DATA-AND-PROVIDERS.md`.

## 5. One Connected Trip

Every phase must strengthen the canonical trip rather than create another feature silo.

## 6. Competitive Depth Without Feature Bloat

For every exposed domain identify:

- free-market table stakes;
- strongest specialist benchmark;
- what RT2RP should match;
- what RT2RP should deliberately not copy;
- RT2RP's cross-trip integration advantage.

---

# Horizontal Release Gates

These apply to every phase and subsystem.

## Product Truth Gate

- public wording matches actual behavior;
- unsupported capability remains hidden;
- no fake/placeholder travel state;
- no stale value presented as current.

## Canonical Data Gate

- one source of truth per material concept;
- dependent projections update coherently;
- no new split-brain state;
- migration/backfill rules defined where needed.

## Reliability Gate

- failure behavior deliberate;
- retry/idempotency appropriate;
- recovery tested;
- production observability sufficient for risk.

## Security Gate

- server-side authorization verified;
- RLS preserved/strengthened;
- secrets protected;
- PII exposure reviewed.

## Experience Gate

- first viewport answers primary question;
- critical information is glanceable;
- mobile core flow is complete;
- dense/empty/error states remain clear;
- graphics/maps/charts are useful and truthful;
- visual hierarchy is deliberate;
- accessibility requirements pass;
- perceived speed is acceptable.

## Real-Time Gate

When applicable:

- provider entity matching verified;
- source authority defined;
- freshness states tested;
- material-change rules tested;
- background/delivery chain proven;
- missed-run recovery proven;
- service objectives defined and met with acceptable evidence.

## Competitive Gate

- table-stakes workflow is not knowingly inferior without a documented product reason;
- specialist depth is not copied unnecessarily;
- RT2RP's integration advantage is visible to the traveler.

---

# Phase 0 — Establish Repository and Market Truth

## Objective

Know exactly what exists, what is claimed, what fails, what duplicates truth, and where the market bar currently sits.

## Required Audit

Cover:

- routes/surfaces;
- components/containers;
- canonical/domain helpers;
- hooks;
- schema/functions/triggers/RLS;
- Edge Functions;
- providers;
- AI;
- native bridges;
- PWA/local persistence;
- background jobs;
- realtime;
- tests;
- public product copy;
- current UI/design patterns;
- current market benchmark.

## Deliverables

- `docs/audits/CURRENT-IMPLEMENTATION-MAP.md`
- `docs/audits/PROMISE-VS-REALITY-MATRIX.md`
- `docs/audits/DUPLICATE-TRUTH-MAP.md`
- `docs/audits/RELIABILITY-RISK-REGISTER.md`
- `docs/audits/COMPETITIVE-CAPABILITY-MATRIX.md`

## Exit Gate

Every major public outcome is traceable from UI -> domain -> persistence/provider -> failure behavior -> tests/evidence.

Every major exposed domain has a competitive classification and preservation decision.

---

# Phase 1 — Protect Current Users and Product Truth

## Objective

Stop misleading, fragile, inaccessible, visually misleading, or unsupported behavior from expanding.

## Work

- verify landing/onboarding/pricing/App Store/help claims;
- hide/narrow unsupported capability;
- remove placeholder/fake data;
- identify silent critical catches;
- repair auth/session traps;
- verify error boundaries/support paths;
- identify exposed flows materially below market expectation;
- establish release/rollback checklist.

## Exit Gate

Everything visible can be defended with current implementation and evidence.

---

# Phase 2 — Canonical Trip Foundation

## Objective

Make one connected trip the architectural center.

## Work

- map canonical owners;
- consolidate duplicate trip state;
- formalize fact vs derived state vs intelligence;
- establish place identity;
- establish reservation/movement/stay relationships where required;
- verify traveler/member separation;
- verify time/money invariants;
- define cross-domain handoffs;
- migrate schema only where current structure cannot support required relationships.

## Exit Gate

A core fact changes once and every implemented dependent surface updates correctly.

---

# Phase 3 — Unified Timeline

## Objective

Make the chronological trip clearer than disconnected itinerary records.

## Work

- inventory event sources;
- define canonical event adapters;
- remove stale copied event behavior;
- support validated air/rail/drive/stay/parking/activity/work events;
- preserve source drill-through;
- strengthen local-time/timezone behavior;
- design/test dense multi-modal timeline graphics;
- benchmark mobile scanning and correction flow.

## Exit Gate

Every supported itinerary is chronologically understandable without contradictions, duplicates, or stale copies.

---

# Phase 4 — Today / Command Engine

## Objective

Create RT2RP's primary differentiation: the app reduces operational thinking immediately.

## Work

- derive trip phase;
- current/next event;
- current/next movement;
- active stay/place where supported;
- deterministic critical actions;
- readiness/gaps;
- trustworthy provider observations;
- transition/handoff context;
- quiet healthy state;
- strong first-viewport command design.

## Exit Gate

A traveler can identify the next meaningful supported action within seconds and the surfaced state is fully evidence-backed.

---

# Phase 5 — Travel Movement System

## Objective

Make supported air, drive, rail, and mixed-mode movement first-class without fragmentation.

## Work

- normalize movement model;
- preserve/strengthen flight support;
- preserve/strengthen route support;
- strengthen rail before public rail claims;
- support ground/local transitions only when complete;
- connect movement to places/reservations/Timeline/Today/Records;
- verify navigation handoff;
- design mode-consistent but recognizable movement cards;
- benchmark each exposed mode against relevant specialist expectations.

## Exit Gate

A mixed supported trip behaves as one operational journey, not separate mode tools.

---

# Phase 6 — Intake and Reservation Reliability

## Objective

Make confirmed travel easy to bring into RT2RP without corrupting canonical truth.

## Work

- canonical intake pipeline;
- manual entry preservation;
- reconcile paste/image/email paths actually implemented;
- schema validation;
- deduplication;
- ambiguity review;
- provenance;
- downstream propagation;
- benchmark import/correction friction against leading itinerary products.

## Exit Gate

Supported confirmations import accurately, ambiguity is surfaced, duplicates are controlled, and the trip becomes useful with minimal manual reconstruction.

---

# Phase 7 — Live Data and Provider Reliability

## Objective

Expose only provider-backed capabilities that are trustworthy enough for real travel decisions.

## Work

For each implemented/candidate provider:

- entity identity;
- normalized adapter;
- source authority;
- freshness;
- cache/invalidation;
- timeout/retry;
- rate-limit/cost;
- material-change rules;
- background monitoring if required;
- notification delivery if promised;
- missed-run recovery;
- observability;
- service objectives;
- live-state UX/graphics;
- competitive benchmark.

## Exit Gate

No exposed live value lacks source, freshness, failure, recovery, and production evidence.

---

# Phase 8 — Records and Expense Integrity

## Objective

Make RT2RP a trustworthy durable trip record and useful closeout system.

## Work

- reconcile reservation records;
- verify expense ledger/currency semantics;
- verify totals/splits;
- verify parking;
- secure documents/receipts;
- verify travelers;
- consolidate Records information architecture;
- reconcile reports;
- use charts only where they improve understanding;
- benchmark expense capture/closeout against traveler-centric and business tools as relevant.

## Exit Gate

Every displayed financial/record summary reconciles to canonical records and survives edit/reload/reconnect behavior.

---

# Phase 9 — Offline and Native Resilience

## Objective

Keep the traveler useful and oriented under realistic connectivity and mobile lifecycle conditions.

## Work

- audit current persistence;
- separate app-shell caching from trip-data offline support;
- define Critical Trip Packet if implemented;
- validate logout/account switching;
- reconnect/realtime reconciliation;
- native reminder/departure bridges;
- deep links;
- background/foreground;
- update/migration behavior;
- mobile visual/performance QA under degraded conditions.

## Exit Gate

Every public offline/native claim has end-to-end proof and degraded conditions remain understandable.

---

# Phase 10 — AI Chief of Staff

## Objective

Use AI on top of canonical truth to reduce traveler work—not to create another content surface.

## Work

- centralize capabilities;
- schema validation;
- eval corpus;
- canonical context grounding;
- ambiguity review;
- no live-state fabrication;
- model/cost telemetry;
- objective release thresholds;
- measure workflow reduction;
- keep AI output concise and integrated into the product hierarchy.

## Exit Gate

Each exposed AI capability reduces real work or improves a supported decision without becoming an alternate source of truth.

---

# Phase 11 — Experience Convergence

## Objective

After subsystem modernization, ensure the entire product feels intentionally designed as one system.

This phase refines consistency; it does not postpone basic UX quality from earlier phases.

## Work

- converge navigation;
- eliminate redundant screens;
- unify typography/spacing/status semantics;
- unify maps/timeline/movement visual language;
- reconcile mobile/desktop rhythm;
- simplify forms;
- validate accessibility globally;
- remove legacy visual debt;
- validate stress-use and competitive scenarios;
- tune perceived performance.

## Exit Gate

The product feels like one premium application, not modules modernized at different times.

---

# Phase 12 — Commercial Readiness

## Objective

Align pricing and marketing only after product truth, reliability, competitive usefulness, and experience quality are proven.

## Work

- refresh market benchmark;
- audit free vs paid competitive value;
- verify every paid differentiator;
- verify landing/pricing/App Store/help/screenshots;
- reliability dashboard/operations;
- release/rollback process;
- real-trip beta scenarios;
- verify screenshots represent actual released behavior.

## Exit Gate

Every commercial promise maps to validated production behavior and paid value reflects genuine operational leverage.

---

# Implementation Order for Every Subsystem

1. Read governing corpus and current benchmark.
2. Audit current implementation/evidence.
3. Identify canonical owner.
4. Define preservation classification.
5. Define traveler outcome and specialist benchmark.
6. Write/update subsystem spec, including UX/visual/real-time/offline contracts as applicable.
7. Define acceptance tests and release evidence.
8. Implement the smallest complete vertical slice.
9. Validate dependent surfaces and cross-domain transitions.
10. Validate visual/mobile/accessibility/performance quality.
11. Validate security/reliability/provider behavior.
12. Remove superseded path only after migration proof.
13. Update audits/spec.
14. Record public-exposure decision.

---

# Prohibited Behavior

Do not:

- rebuild the whole app in one branch;
- create parallel architecture to avoid understanding current code;
- add providers because they are interesting;
- copy competitor features for checkbox parity;
- use `all-in-one` to excuse mediocre depth;
- postpone user experience to a final polish sprint;
- add decorative graphics to compensate for weak information architecture;
- claim real-time from refresh-on-open;
- claim offline from service-worker/app-shell caching;
- expose roadmap features;
- mark a phase complete because code merged;
- delete old paths before migration validation;
- optimize monetization before trust and value.

---

# Release Validation Scenarios

Run only scenarios made of publicly supported capabilities.

## Family Leisure Air Trip

Connections, lodging, activities, rental/ground movement, travelers, expenses, return.

## Business Air + Rail Trip

Flight, rail transfer, work stops, lodging changes, receipts, local movement.

## Road Trip

Multi-day driving, stops, lodging, parking, fuel/expenses, navigation handoff.

## International Multi-Modal Trip

Time zones, varied date formats, air/rail/ground transitions, multiple stays.

## Degraded Connectivity Trip

Cached/saved trip state, provider outage, reconnect, expired session, interrupted save.

For each scenario define objective expected outcomes, visual/interaction expectations, and competitive baseline before running it.

The product must remain understandable, truthful, recoverable, visually coherent, and competitively useful throughout every supported path.

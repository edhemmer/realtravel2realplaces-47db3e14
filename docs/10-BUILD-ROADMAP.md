# RT2RP — Preservation-First Build Roadmap

## Purpose

This roadmap defines how to transform the current RT2RP application into a cohesive, dependable Travel Operating System without destroying working value.

This is not a feature wishlist.

The sequence is intentionally architecture-first and proof-driven.

---

## Governing Rule

**Do not add new user-facing promises while the existing product is being reconciled.**

The first objective is to make the product's actual behavior match its existing reliable capabilities and the new governing architecture.

---

# Phase 0 — Establish Repository Truth

## Objective

Know exactly what exists before changing it.

## Work

Create an implementation audit covering:

- routes/screens;
- components/containers;
- domain/canonical helpers;
- hooks;
- Supabase tables/views/functions;
- RLS policies;
- database triggers;
- Edge Functions;
- provider integrations;
- AI capabilities/prompts;
- native bridges;
- PWA caching;
- background jobs;
- realtime behavior;
- tests;
- public product copy and feature claims.

## Deliverables

- `docs/audits/CURRENT-IMPLEMENTATION-MAP.md`
- `docs/audits/PROMISE-VS-REALITY-MATRIX.md`
- `docs/audits/DUPLICATE-TRUTH-MAP.md`
- `docs/audits/RELIABILITY-RISK-REGISTER.md`

## Exit Gate

No major subsystem is undocumented.

Every public capability has evidence of implementation or is marked for hiding/removal until proven.

---

# Phase 1 — Protect Current Users and Product Truth

## Objective

Stop misleading, fragile, or disconnected behavior from expanding.

## Work

- verify landing/onboarding/pricing/App Store/help claims against current implementation;
- remove or hide unsupported claims/capabilities;
- eliminate production placeholder/mock travel data;
- identify silent catches in critical flows;
- fix obvious auth/session traps;
- verify production error boundaries and support paths;
- establish release checklist.

## Exit Gate

Everything visible to users is a capability RT2RP can defend.

---

# Phase 2 — Canonical Trip Foundation

## Objective

Make one connected trip the center of the system.

## Work

- document current canonical trip helpers and data ownership;
- consolidate duplicate trip-state calculations;
- formalize facts vs projections vs intelligence;
- establish stable place/location semantics;
- establish reservation/movement/stay relationships;
- verify traveler/member separation;
- verify time and money invariants;
- build migration plan only where current schema cannot support required relationships.

## Exit Gate

Changing a core trip fact propagates consistently to all dependent surfaces.

No critical domain concept has multiple competing owners.

---

# Phase 3 — Unified Timeline

## Objective

Build the ordered operational truth of the trip.

## Work

- inventory all event sources;
- define canonical event adapters;
- eliminate stale copied event behavior;
- support air, rail, drive, stays, parking, activities/work stops as applicable;
- preserve source drill-through;
- strengthen time-zone/local-time handling;
- test dense multi-modal itineraries.

## Exit Gate

Timeline can represent a complex real trip without contradictions or duplicate events.

---

# Phase 4 — Today / Command Engine

## Objective

Make opening RT2RP immediately useful.

## Work

- derive trip phase;
- derive current/next event;
- derive current/next movement;
- derive active lodging/place where supported;
- define deterministic critical-action rules;
- define gap/readiness rules;
- connect material provider observations;
- make healthy trips quiet;
- remove decorative dashboard widgets that do not support action.

## Exit Gate

For representative trips, a traveler can open Today and understand the next meaningful action within seconds.

---

# Phase 5 — Travel Movement System

## Objective

Make air, drive, rail, and mixed travel first-class.

## Work

- normalize movement model;
- preserve/enhance existing flight support;
- preserve/enhance existing route support;
- strengthen rail as a first-class movement type;
- support local/ground transitions without creating separate trips;
- connect movements to places, reservations, timeline, Today, and records;
- verify navigation handoff.

## Exit Gate

A mixed air/rail/drive itinerary behaves as one trip.

---

# Phase 6 — Reservation and Intake Reliability

## Objective

Make getting information into RT2RP easy without corrupting the trip.

## Work

- define canonical intake pipeline;
- preserve manual entry paths;
- reconcile paste/image/email import paths that are truly implemented;
- add schema validation;
- strengthen deduplication;
- introduce review for material ambiguity;
- preserve source/provenance;
- ensure downstream propagation after import.

## Exit Gate

Representative confirmations import accurately, ambiguous values are not silently invented, and duplicate imports are controlled.

---

# Phase 7 — Live Data and Provider Reliability

## Objective

Only expose provider-backed capabilities that can be trusted.

## Work

Audit each provider independently:

- flights;
- routes;
- transit;
- places;
- weather if actually implemented;
- notification providers.

For each:

- normalize adapter;
- define freshness;
- define cache;
- define timeout/retry;
- define unavailable state;
- instrument usage/error/cost;
- verify product wording.

## Exit Gate

No provider-backed UI value lacks source/freshness/failure semantics.

---

# Phase 8 — Records and Expense Integrity

## Objective

Make RT2RP a trustworthy durable record of the trip.

## Work

- reconcile bookings/reservations;
- verify expense ledger semantics;
- verify totals and splits;
- verify parking behavior;
- verify document/receipt security;
- verify traveler records;
- consolidate Notes/Records information architecture;
- test report reconciliation where reports are supported.

## Exit Gate

Every displayed financial/record summary traces to canonical records and survives normal edits/reloads.

---

# Phase 9 — Offline and Mobile Resilience

## Objective

Make the product reliable under realistic travel connectivity conditions.

## Work

- inventory what the PWA currently persists;
- distinguish shell caching from trip-data availability;
- define critical offline reference dataset;
- validate logout/account clearing;
- strengthen reconnect/realtime reconciliation;
- audit native reminder/departure bridges;
- audit deep links and app lifecycle;
- test background/foreground and network transitions.

## Exit Gate

Any user-visible offline/native claim has real end-to-end proof.

---

# Phase 10 — AI Chief of Staff

## Objective

Use AI on top of canonical trip truth rather than around it.

## Work

- centralize capability definitions;
- remove scattered/duplicate AI logic;
- validate structured outputs;
- build regression corpus;
- ground AI context in canonical trip state;
- enforce no-live-data fabrication;
- define ambiguity review;
- establish model/cost telemetry.

## Exit Gate

AI can reduce traveler work without becoming an alternate source of truth.

---

# Phase 11 — Product Experience Refinement

## Objective

Make the connected system feel calm, premium, and obvious.

## Work

- compress primary navigation to Today/Timeline/Travel/Places/Records;
- reconcile mobile and desktop hierarchy;
- simplify forms;
- standardize async/error/empty states;
- improve accessibility;
- validate stress-use scenarios;
- remove redundant screens/controls after data/functionality consolidation.

## Exit Gate

The product feels like one application rather than a set of modules.

---

# Phase 12 — Commercial Readiness

## Objective

Only after product truth and reliability are established, align commercial claims.

## Work

- audit pricing tiers;
- verify every paid differentiator;
- verify landing copy;
- verify App Store copy/screenshots;
- verify help center;
- verify support documentation;
- create production reliability dashboard;
- define release/rollback procedure;
- conduct real-trip beta scenarios.

## Exit Gate

Every commercial promise maps to validated production behavior.

---

# Implementation Order Within Each Phase

For each subsystem:

1. Read governing corpus.
2. Audit current implementation.
3. Write/update subsystem spec.
4. Classify existing code: PRESERVE / STRENGTHEN / CONSOLIDATE / REPLACE / HIDE.
5. Define acceptance tests.
6. Implement smallest safe change.
7. Run unit/integration/E2E checks.
8. Verify dependent surfaces.
9. Remove superseded path only after migration proves complete.
10. Update audit/spec truth.

---

# Prohibited Roadmap Behavior

Do not:

- rebuild the whole app in one branch;
- redesign UI before resolving canonical data ownership;
- add new providers because they are interesting;
- add new AI features before current AI state is reconciled;
- expose roadmap features in user-facing UI;
- mark a phase complete because code merged;
- delete old paths before validating migrated data/users;
- optimize subscription gating before trust and correctness.

---

# World-Class Validation Scenarios

Before declaring the modernization successful, run realistic end-to-end scenarios including:

### Family Leisure Air Trip
Two adults, children/companions, outbound connection, hotel, activities, rental car, expenses, return flight.

### Business Air + Rail Trip
Flight to major city, train to second city, work stops, hotel changes, receipts, mixed local transit.

### Road Trip
Multi-day personal vehicle trip with several stops, parking, fuel expenses, lodging, route/navigation handoff.

### Complex International Multi-Modal Trip
Multiple time zones, connecting flights, rail, hotel changes, local ground transit, varied date formats.

### Degraded Connectivity Trip
App opened with stale cache, provider outage, reconnect, expired session, interrupted expense capture.

The product should remain understandable and trustworthy throughout.

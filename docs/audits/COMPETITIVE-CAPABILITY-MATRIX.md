# RT2RP — Competitive Capability Matrix

**Status:** AUDIT REQUIRED

## Purpose

This document compares the current RT2RP implementation against the strongest relevant current travel-product benchmarks.

It is the evidence bridge between:

- current repository reality;
- `docs/12-MARKET-AND-PRODUCT-STANDARD.md`;
- preservation/modernization decisions;
- subsystem specifications;
- visual/interaction quality;
- real-time/reliability expectations.

Do not complete this matrix from old feature inventories alone.

Inspect current code, production configuration, tests, public wording, rendered behavior, and real end-to-end outcomes.

---

## Hard Rules

1. A competitor feature does not create an RT2RP requirement automatically.
2. A documented RT2RP feature is not considered real until verified.
3. A free competitor capability may make an RT2RP paywall commercially weak even if RT2RP implements it well.
4. A specialist benchmark defines quality expectations only for capabilities RT2RP chooses to expose.
5. RT2RP's differentiation should come primarily from operational continuity across the complete trip, not feature count.
6. `Live`, `real-time`, `offline`, `automatic`, and similar claims require direct evidence, not inferred architecture.
7. Visual quality must be judged from rendered workflows and stress states, not source code alone.

---

## Classification

For each domain classify current RT2RP as one of:

- **LEADING** — demonstrably stronger for the defined traveler outcome;
- **DIFFERENTIATED** — creates unique integrated trip value even if a specialist is deeper;
- **PARITY** — meets the relevant modern expectation;
- **BELOW PARITY** — implemented but materially weaker than expected;
- **UNPROVEN** — code/claims exist but evidence is insufficient;
- **NOT SUPPORTED** — intentionally not exposed;
- **NOT IN SCOPE** — does not belong in RT2RP's product identity.

Do not use LEADING or PARITY without evidence.

---

## Core Matrix

| Traveler Problem / Domain | Current RT2RP Evidence | Publicly Exposed? | Strongest Benchmark | Typical Free Expectation | Typical Paid Value | RT2RP Classification | Integration Advantage | Gap / Risk | Decision | Spec |
|---|---|---|---|---|---|---|---|---|---|---|
| Trip intake / confirmation import | | | TripIt / KAYAK / Wanderlog | Basic import/organization increasingly free | Automation, convenience, scale | | | | | |
| Unified itinerary / timeline | | | TripIt / Tripsy / Wanderlog | Strong itinerary organization often free | Advanced assistance/offline/polish | | | | | |
| Today / operational command | | | TripIt Pro / Flighty within flight domain | Limited cross-domain command elsewhere | Proactive operational leverage | | | | | |
| Flight execution | | | Flighty / TripIt Pro | Basic tracking may be free | Speed, predictions, connections, alerts | | | | | |
| Real-time flight/change delivery | | | Flighty / TripIt Pro / KAYAK | Some live updates free | Faster/proactive reliable delivery | | | | | |
| Drive / road-trip execution | | | Roadtrippers / modern maps | Basic maps/navigation free elsewhere | Route depth, complex trips, optimization | | | | | |
| Rail / transit integration | | | TripIt/KAYAK itinerary + provider apps | Reservation display | Reliable live/connection context where offered | | | | | |
| Multi-modal continuity | | | No single specialist owns complete stack | Fragmented across products | Core RT2RP differentiation | | | | | |
| Collaboration / sharing | | | Wanderlog / KAYAK / TripIt | Collaboration commonly free | Advanced coordination/admin depth | | | | | |
| Places / nearby discovery | | | Maps / Wanderlog / Roadtrippers | Discovery abundant/free | Optimization/personalization/route value | | | | | |
| Expense capture | | | TravelSpend / Navan / Concur | Basic tracking varies | Offline, currency, automation, reconciliation | | | | | |
| Cost splitting / settlement | | | TravelSpend / Splitwise-like tools | Some free options | Deeper group controls | | | | | |
| Business/mixed trip records | | | Navan / Concur / expense specialists | Limited consumer baseline | Reduced admin, receipts, reporting | | | | | |
| Offline critical trip access | | | TripIt / KAYAK / Wanderlog Pro / strong mobile apps | Increasing expectation | Reliable continuity | | | | | |
| Notifications / monitoring | | | Flighty / TripIt Pro / KAYAK | Basic alerts often available | Speed, materiality, prediction, proactive help | | | | | |
| AI intake / trip intelligence | | | Wanderlog + broad AI planners | AI generation common | Accurate workflow reduction / grounded intelligence | | | | | |
| Native/mobile interaction quality | | | Flighty / Tripsy / TripIt | High baseline | Premium speed, polish, platform integration | | | | | |
| Visual hierarchy / graphics / maps | | | Flighty / Tripsy / Wanderlog / Roadtrippers by domain | Professional mobile UI expected | Clarity, premium feel, richer spatial/operational context | | | | | |
| Loading / degraded-state UX | | | Strong specialist apps | Usable basic failure states expected | High-confidence continuity | | | | | |
| Accessibility / stress usability | | | Platform-quality apps | Baseline accessibility expected | Trust and broad usability | | | | | |
| Post-trip closeout / durable record | | | TravelSpend / Concur / Polarsteps (different purpose) | Fragmented | RT2RP opportunity if operationally useful | | | | | |

---

## Evidence Required Per Row

Record at minimum:

- exact RT2RP entry point;
- canonical/domain owner;
- persistence/provider path;
- production configuration dependency;
- failure behavior;
- automated tests;
- manual end-to-end verification status;
- rendered mobile/desktop verification where user-facing;
- current public wording;
- competitor source and research date;
- interaction/reliability comparison where practical;
- freshness/background/delivery evidence for real-time claims;
- offline persistence/reconnect evidence for offline claims.

A feature inventory bullet is context, not proof.

---

## Competitive Decision Options

### PRESERVE
Current RT2RP is strong, reliable, and fits product identity.

### STRENGTHEN TO PARITY
Capability is core but materially weaker than modern expectation.

### DIFFERENTIATE
Do not chase specialist depth; strengthen the cross-domain integration advantage.

### CONSOLIDATE
Multiple RT2RP paths prevent a coherent experience.

### NARROW
Capability is real but wording/scope exceeds competitive or reliability reality.

### HIDE UNTIL READY
Capability cannot meet required quality/reliability bar.

### REMOVE / NOT IN SCOPE
Competitor capability does not strengthen RT2RP's purpose.

---

# Interaction-Cost Test

For common workflows compare steps/time/cognitive effort where practical.

Examples:

- create trip from confirmation;
- find next reservation;
- understand tomorrow's first movement;
- open lodging address/confirmation;
- correct imported time;
- add expense/receipt;
- share trip;
- understand a material live change;
- recover after provider/network failure;
- access essential trip information without connectivity where supported.

RT2RP should not require meaningfully more work than a specialist for table-stakes behavior unless additional friction protects trust/correctness or creates cross-domain value.

---

# Visual/Experience Test

For important user-facing domains compare:

1. first-viewport clarity;
2. typography hierarchy;
3. information density;
4. touch/interaction simplicity;
5. map/route usefulness;
6. graphics relevance;
7. motion restraint;
8. loading/error/stale state quality;
9. dense-trip readability;
10. native feel;
11. accessibility;
12. perceived speed.

RT2RP does not need to visually imitate competitors.

It must feel equally deliberate, coherent, and trustworthy while retaining its own brand.

---

# Real-Time Quality Test

For any live/monitoring row record:

- provider/source;
- identity match;
- freshness window;
- measured refresh success;
- material change latency where measurable;
- background cadence;
- deduplication/noise behavior;
- notification delivery behavior;
- missed-run recovery;
- stale/failure UX;
- service objectives;
- current benchmark.

A provider API call alone does not qualify as real-time parity.

---

# Differentiation Test

For each domain ask:

1. What does the specialist do better because it focuses on one domain?
2. What should RT2RP intentionally not reproduce?
3. What additional trip context does RT2RP have?
4. Can RT2RP use that context to reduce handoffs or decisions?
5. Is the integrated value obvious without extra complexity?

The preferred answer is not `RT2RP has more features`.

The preferred answer is:

**RT2RP connects this capability to the rest of the trip so the traveler does less work.**

---

# Paid Value Audit

For every planned paid differentiator record:

| Proposed Paid Value | Comparable Free Capability | Comparable Paid Product/Price | RT2RP Additional Leverage | Proven? | Pricing Decision |
|---|---|---|---|---|---|

Do not commercialize basic correctness, security, recovery, truthful states, accessibility, or access to the user's own stored trip data as premium quality.

---

# Exit Gate

The audit is complete when:

1. every major public RT2RP domain has a current benchmark;
2. every classification is evidence-backed;
3. every BELOW PARITY core capability has a strengthen/hide decision;
4. every UNPROVEN public capability is narrowed/hidden until verified;
5. every planned paid differentiator has a credible value argument against current free alternatives;
6. every retained domain has a clear role in the complete trip;
7. real-time/offline claims have direct operational evidence;
8. critical user-facing surfaces have rendered experience evidence;
9. roadmap/spec order reflects traveler value and risk rather than novelty.

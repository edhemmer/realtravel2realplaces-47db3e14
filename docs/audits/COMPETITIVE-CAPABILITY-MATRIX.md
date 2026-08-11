# RT2RP — Competitive Capability Matrix

**Status:** AUDIT REQUIRED

## Purpose

This document compares the current RT2RP implementation against the strongest relevant current travel-product benchmarks.

It is the evidence bridge between:

- current repository reality;
- the market benchmark in `docs/12-MARKET-AND-PRODUCT-STANDARD.md`;
- preservation/modernization decisions;
- subsystem specifications.

Do not complete this matrix from old feature inventories alone.

Inspect current code, production configuration, tests, public wording, and real end-to-end behavior.

---

## Hard Rules

1. A competitor feature does not create an RT2RP requirement automatically.
2. A documented RT2RP feature is not considered real until verified.
3. A free competitor capability may make an RT2RP paywall commercially weak even if RT2RP implements it well.
4. A specialist benchmark defines quality expectations only for capabilities RT2RP chooses to expose.
5. RT2RP's differentiation should come primarily from operational continuity across the complete trip, not feature count.

---

## Classification

For each domain, classify current RT2RP as one of:

- **LEADING** — demonstrably stronger for the defined traveler outcome;
- **DIFFERENTIATED** — not necessarily deeper than the specialist, but creates unique integrated trip value;
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
| Flight execution | | | Flighty / TripIt Pro | Basic tracking may be free | Fast alerts, prediction, connections | | | | | |
| Drive / road-trip execution | | | Roadtrippers / modern maps | Basic maps/navigation free elsewhere | Route depth, complex trips, optimization | | | | | |
| Rail / transit integration | | | KAYAK/TripIt itinerary + rail provider apps | Reservation display | Reliable live/connection context where offered | | | | | |
| Multi-modal continuity | | | No single specialist owns complete stack | Fragmented across products | Potential RT2RP core differentiation | | | | | |
| Collaboration / sharing | | | Wanderlog / KAYAK / TripIt | Collaboration commonly free | Advanced team/admin depth | | | | | |
| Places / nearby discovery | | | Wanderlog / maps / Roadtrippers | Discovery abundant and often free | Optimization/personalization/specialized route value | | | | | |
| Expense capture | | | TravelSpend / Navan / Concur | Basic tracking varies | Offline, currency, automation, reconciliation | | | | | |
| Cost splitting / settlement | | | TravelSpend / Splitwise-style expectation | Some free options exist | Deeper group controls | | | | | |
| Business/mixed trip records | | | Navan / Concur / expense specialists | Limited consumer baseline | Reduced admin, receipts, reporting | | | | | |
| Offline critical trip access | | | TripIt / Flighty / Wanderlog Pro / Navan | Product-dependent | Reliable mobile continuity | | | | | |
| Notifications / monitoring | | | Flighty / TripIt Pro / KAYAK | Basic alerts often available | Speed, prediction, proactive help | | | | | |
| AI intake / trip intelligence | | | Wanderlog + broad AI planners | AI generation increasingly common | Accurate workflow reduction, grounded intelligence | | | | | |
| Native/mobile polish | | | Flighty / Tripsy / TripIt | High baseline expected | Premium feel and speed | | | | | |
| Post-trip closeout / durable record | | | TravelSpend / Concur / Polarsteps (different purpose) | Fragmented | RT2RP opportunity if operationally useful | | | | | |

---

## Evidence Required Per Row

At minimum record:

- exact current RT2RP entry point;
- canonical/domain owner;
- persistence/provider path;
- production configuration dependency;
- failure behavior;
- relevant automated tests;
- manual end-to-end verification status;
- current public wording;
- competitor source and research date;
- measurable interaction/reliability comparison where practical.

A feature inventory bullet is context, not proof.

---

## Competitive Decision Options

### PRESERVE
Current RT2RP is strong, reliable, and fits product identity.

### STRENGTHEN TO PARITY
Capability is core but materially weaker than modern expectation.

### DIFFERENTIATE
Do not chase specialist depth; instead strengthen the cross-domain integration advantage.

### CONSOLIDATE
Multiple RT2RP paths are preventing a coherent competitive experience.

### NARROW
Capability is real but public wording or scope exceeds competitive/reliability reality.

### HIDE UNTIL READY
Capability cannot currently meet the required quality/reliability bar.

### REMOVE / NOT IN SCOPE
Competitor capability does not strengthen RT2RP's Travel Operating System purpose.

---

## Interaction-Cost Test

For common workflows, compare measurable steps/time where practical.

Examples:

- create trip from an existing confirmation;
- find next reservation;
- understand tomorrow's first movement;
- open lodging address/confirmation;
- correct an imported travel time;
- add an expense/receipt;
- share a trip;
- recover after provider/network failure.

RT2RP should not require meaningfully more work than a specialist for table-stakes behavior unless that extra step creates necessary trust, correction, or cross-domain value.

---

## Differentiation Test

For each domain ask:

1. What does the specialist do better because it focuses on one domain?
2. What should RT2RP intentionally not attempt to reproduce?
3. What additional trip context does RT2RP have that the specialist does not?
4. Can RT2RP use that context to reduce manual handoffs or decisions?
5. Is that integrated value visible to the traveler without adding complexity?

The preferred answer is not "RT2RP has more features."

The preferred answer is:

**RT2RP connects this capability to the rest of the trip so the traveler does less work.**

---

## Paid Value Audit

For every planned paid differentiator record:

| Proposed Paid Value | Comparable Free Capability | Comparable Paid Product/Price | RT2RP Additional Leverage | Proven? | Pricing Decision |
|---|---|---|---|---|---|

Do not commercialize basic correctness, security, recovery, truthful states, or access to the user's own stored trip data as premium quality.

---

## Exit Gate

This audit is complete when:

1. every major public RT2RP domain has a current benchmark;
2. every classification is evidence-backed;
3. every BELOW PARITY core capability has a strengthen/hide decision;
4. every UNPROVEN public capability is narrowed/hidden until verified;
5. every planned paid differentiator has a credible value argument against current free alternatives;
6. every retained domain has a clear integration role in the complete trip;
7. the roadmap/spec order reflects user value and risk rather than feature novelty.

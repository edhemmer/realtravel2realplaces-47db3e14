# RT2RP — Start Here

## Purpose

This repository is the source of truth for Real Travel 2 Real Places (RT2RP).

RT2RP is a travel operating system for people who travel for pleasure, business, or both, using air, road, rail, transit, or combinations of them.

The product exists to reduce the work, uncertainty, fragmentation, and mental load required to prepare for, execute, and close out a real trip.

RT2RP does not exist to look impressive. It exists to be useful under real travel conditions.

---

## The Product Promise

Once a traveler creates or imports a trip, RT2RP should progressively become the trusted operating layer for that trip.

A strong RT2RP experience means the traveler can quickly understand:

- what trip they are on;
- what matters now;
- what happens next;
- where they need to be;
- what they need to know before moving;
- what is missing or unresolved;
- what changed;
- what requires action;
- what is safely stored;
- what they have spent;
- who is traveling;
- what can safely be ignored.

The user should spend less time searching, remembering, checking, copying, reconciling, switching between travel apps, and worrying.

The product should feel calm, current, intelligent, and dependable.

---

## Hard-Locked Product Rule

**RT2RP only presents capabilities that it fully and reliably delivers.**

If a capability is incomplete, unreliable, untested, unavailable, or not supported end-to-end, it is not mentioned to the user anywhere.

This applies to:

- application UI;
- onboarding;
- landing pages;
- pricing;
- App Store copy;
- screenshots;
- demos;
- support documentation;
- help text;
- AI responses;
- notifications;
- reports;
- marketing;
- sales materials;
- public product documentation.

There is no user-facing "coming soon" theater.

There are no fake controls, pretend integrations, decorative status cards, simulated data, or implied monitoring.

Incomplete work remains internal until the full user outcome works.

This rule is non-negotiable.

---

## Repository Documents Control

Before making architectural, database, AI, UX, workflow, security, infrastructure, reliability, native-mobile, provider, product-positioning, or feature decisions, read the governing documents in this order:

1. `docs/00-START-HERE.md`
2. `docs/01-PRODUCT-CONSTITUTION.md`
3. `docs/02-ENGINEERING-STANDARDS.md`
4. `docs/03-DATA-ARCHITECTURE.md`
5. `docs/04-TRAVEL-DOMAIN-MODEL.md`
6. `docs/05-SYSTEM-ARCHITECTURE.md`
7. `docs/06-AI-ORCHESTRATION.md`
8. `docs/07-UI-UX-SYSTEM.md`
9. `docs/08-LIVE-DATA-AND-PROVIDERS.md`
10. `docs/09-OFFLINE-SYNC-RESILIENCE.md`
11. `docs/10-BUILD-ROADMAP.md`
12. `docs/11-CODEX-MASTER-BUILD-PROMPT.md`
13. `docs/12-MARKET-AND-PRODUCT-STANDARD.md`

Feature work must also comply with the applicable specification under `specs/`.

If older documentation conflicts with this corpus, this corpus controls unless a newer governing document explicitly supersedes it.

Competitive capabilities described in `docs/12-MARKET-AND-PRODUCT-STANDARD.md` are benchmarks, not proof of current RT2RP capability and not automatic roadmap requirements.

---

## Preservation-First Modernization Rule

RT2RP is an existing product with substantial working functionality.

The modernization strategy is not rewrite-first.

Every current capability must be evaluated and assigned one of these outcomes:

### PRESERVE
The current implementation is correct, reliable, understandable, maintainable, and aligned with the product promise.

### STRENGTHEN
The current implementation is valuable and should remain, but architecture, reliability, UX, tests, or integration need improvement.

### CONSOLIDATE
Multiple implementations represent one product concept and should become one canonical path.

### REPLACE
The current implementation creates unacceptable reliability, security, data, UX, or maintenance risk and a safer replacement is required.

### HIDE OR REMOVE
The current product exposes a capability it does not reliably deliver, or the capability does not materially support RT2RP's purpose.

No existing working behavior is removed merely because a cleaner rewrite is possible.

No duplicate architecture is introduced merely to avoid understanding the existing system.

---

## End-to-End Product Standard

A feature is not complete because:

- a page renders;
- a button exists;
- a database table exists;
- an API call succeeds once;
- an AI prompt returns output;
- a unit test passes in isolation.

A feature is complete when the actual user outcome works from beginning to end under normal and expected failure conditions.

Every feature must account for:

1. input;
2. validation;
3. persistence;
4. canonical normalization;
5. downstream propagation;
6. rendering;
7. loading behavior;
8. empty behavior;
9. error behavior;
10. stale-data behavior where applicable;
11. permissions and security;
12. offline/reconnect behavior where applicable;
13. observability;
14. automated tests;
15. recovery from partial failure;
16. competitive quality appropriate to the user problem it claims to solve.

---

## Market Reality

Basic travel organization is not enough to define a premium product.

Established products already provide substantial combinations of itinerary management, reservation import, collaboration, flight updates, maps, planning, offline access, route tools, and expense tracking for free or at modest annual subscription prices.

RT2RP must therefore compete on a higher-order outcome:

**the complete trip behaves as one connected operational system, reducing the traveler's need to manually reconcile specialist apps and disconnected records.**

RT2RP should meet the strongest relevant specialist expectation for each capability it chooses to expose, while remaining simpler and more coherent across the complete trip.

Do not build breadth for its own sake.

---

## Product Phases

RT2RP serves the complete travel lifecycle.

### PREPARE — Before Travel

The product helps the traveler assemble the trip, organize confirmed information, detect missing information, prepare documents, people, packing, transportation, costs, and logistics, and understand unresolved items.

### OPERATE — During Travel

The product prioritizes what matters now, what happens next, movement, reservations, critical context, changes, locations, records, expenses, and actionable risk.

### CLOSE — After Travel

The product helps the traveler reconcile expenses and records, resolve outstanding items, generate useful trip summaries where supported, and archive a trustworthy trip record.

The same canonical trip state must power all three phases.

---

## Core Experience Spine

The primary product experience is organized around five concepts:

1. **Today** — what matters now, what changed, and what to do next.
2. **Timeline** — the ordered truth of the trip.
3. **Travel** — movement between places by air, road, rail, transit, or combinations.
4. **Places** — trip-relevant physical context and destinations.
5. **Records** — reservations, expenses, documents, travelers, notes, and durable trip information.

Secondary tools may exist, but they must strengthen this spine rather than fragment it.

---

## Traveler Standard

RT2RP must work for a traveler without requiring them to understand the application's internal structure.

The system may contain many domain models and services.

The user should experience one trip.

A hotel record should not feel separate from the timeline, Today view, location context, expenses, documents, and intelligence that depend on it.

A flight should not have competing representations across modules.

A drive should not require the user to rebuild information already known elsewhere in the trip.

One fact should be entered once whenever practical and then reused consistently.

The user may still need provider-specific apps for boarding credentials, reservation changes, provider identity verification, employer controls, or other actions only that provider can perform. RT2RP must not pretend otherwise.

RT2RP's job is to make the complete trip understandable and manageable across those providers.

---

## Product Quality Bar

RT2RP should be:

- clean;
- clear;
- useful;
- accurate;
- fast;
- calm;
- context-aware;
- honest;
- resilient;
- secure;
- accessible;
- mobile-first;
- easy to recover when something goes wrong.

Travel often happens under time pressure, poor connectivity, fatigue, unfamiliar surroundings, language differences, schedule changes, and divided attention.

The product must be designed for those conditions, not only for a developer on a fast connection.

---

## Decision Order

When tradeoffs occur, use this order:

1. User safety and trust
2. User data security and privacy
3. Truthfulness
4. Reliability
5. Travel clarity
6. Travel preparedness
7. Correctness
8. Recovery and resilience
9. Simplicity for the traveler
10. Accessibility
11. Performance
12. Maintainability
13. Scalability
14. Cost efficiency
15. Revenue optimization
16. Developer convenience

Developer convenience never overrides traveler trust.

---

## Definition of World-Class

World-class does not mean having the most features.

For RT2RP, world-class means:

- the product understands the trip as one connected system;
- important information appears where and when it is needed;
- transitions between travel modes and providers require less manual reconciliation;
- the same fact does not drift across screens;
- live information is current when presented as live;
- failure does not silently produce misleading output;
- AI improves decisions without inventing facts;
- the app remains useful when connectivity degrades where that behavior is supported;
- common actions require very little effort;
- every exposed subsystem meets a strong competitive quality bar;
- the product does not make promises it cannot keep;
- the traveler develops confidence that RT2RP can be relied upon.

The final test is simple:

**Would a traveler who has used RT2RP on several real trips be reluctant to travel without it?**

If not, the product is not finished.

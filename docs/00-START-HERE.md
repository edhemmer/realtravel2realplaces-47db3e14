# RT2RP — Start Here

## Purpose

This repository is the source of truth for Real Travel 2 Real Places (RT2RP).

RT2RP is a Travel Operating System for pleasure, business, and mixed travel across air, road, rail, local transit, and combinations of them.

The product exists to reduce the work, uncertainty, fragmentation, app-switching, and mental load required to prepare for, operate, and close out a real trip.

RT2RP does not exist to look impressive.

It exists to be exceptionally useful under real travel conditions.

---

# Product Promise

Once a traveler creates or imports a trip, RT2RP should progressively become the trusted operating layer for that trip.

The traveler should be able to understand quickly:

- what trip they are on;
- what matters now;
- what happens next;
- where they need to be;
- when they need to act;
- what changed;
- what is missing;
- what requires attention;
- what is safely stored;
- what they have spent;
- who is traveling;
- what can safely be ignored.

The product should reduce searching, remembering, copying, reconciling, checking multiple travel apps, and worrying.

It should feel:

- calm;
- current;
- precise;
- intelligent;
- visually premium;
- fast;
- trustworthy;
- dependable under pressure.

---

# Hard-Locked Product Rule

**RT2RP only presents capabilities that it fully and reliably delivers.**

If a capability is incomplete, unreliable, untested, unavailable, or not supported end-to-end, it is not mentioned to the user.

This applies to:

- product UI;
- onboarding;
- landing/pricing pages;
- App Store copy/screenshots;
- help/support;
- AI responses;
- notifications;
- reports;
- demos;
- marketing/sales materials;
- public product documentation.

There is no user-facing `coming soon` theater.

There are no fake controls, pretend integrations, placeholder travel records, decorative live states, or implied capabilities.

Incomplete work remains internal until the complete outcome passes its release gate.

This rule is non-negotiable.

---

# Repository Documents Control

Read in this order before architectural, database, AI, UX, workflow, security, infrastructure, provider, native-mobile, reliability, product-positioning, or feature decisions:

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
14. applicable specs under `specs/`.

If older documentation conflicts with this corpus, this corpus controls unless explicitly superseded by a newer governing document.

Market capabilities are benchmarks, not current RT2RP claims and not automatic roadmap requirements.

---

# Preservation-First Modernization

RT2RP is an existing application with substantial working value.

Every current capability is classified before major change:

### PRESERVE
Correct, reliable, maintainable, and aligned.

### STRENGTHEN
Valuable capability that needs better architecture, reliability, integration, tests, UX, or visual quality.

### CONSOLIDATE
Multiple paths represent one concept and should become one canonical path.

### REPLACE
Current implementation creates unacceptable product, data, security, reliability, or maintenance risk.

### HIDE / REMOVE
The product exposes a capability it cannot defend, or the capability does not materially support RT2RP's purpose.

Do not rewrite working code because a rewrite is cleaner.

Do not introduce duplicate architecture to avoid understanding the current system.

---

# End-to-End Completion Standard

A feature is not complete because:

- a page renders;
- a button exists;
- a database table exists;
- an API succeeds once;
- a background job exists;
- an AI prompt returns output;
- a provider is connected;
- the design looks attractive;
- unit tests pass in isolation.

A user-facing capability is complete only when the full traveler outcome works under normal and expected failure conditions.

Every applicable capability must account for:

1. input;
2. validation;
3. authorization;
4. persistence;
5. canonical normalization;
6. downstream propagation;
7. loading/empty states;
8. failure/partial-failure states;
9. cache/freshness semantics;
10. provider behavior;
11. offline/reconnect behavior;
12. observability;
13. automated validation;
14. recovery;
15. mobile/desktop behavior;
16. accessibility;
17. visual/interaction quality;
18. performance/perceived speed;
19. competitive quality appropriate to the user problem;
20. public wording that matches real behavior.

---

# Real-Time Standard

`Live`, `real-time`, `monitoring`, `automatically updated`, and `alert when changed` are product contracts.

They require validated:

- entity matching;
- source authority;
- provider retrieval;
- freshness semantics;
- material-change detection;
- background execution where required;
- delivery where promised;
- retry/recovery;
- observability;
- production evidence.

Refresh-on-open alone is not monitoring.

A stale value must never visually masquerade as a fresh one.

---

# Experience Standard

Engineering integrity and experience quality are equally required for a user-facing release.

RT2RP should feel credible beside the best travel apps on a user's phone while maintaining its own visual identity.

The product should use:

- strong typography hierarchy;
- intentional spacing/density;
- useful maps and spatial context;
- clear multi-modal timeline graphics;
- relevant charts only when they improve understanding;
- restrained motion;
- meaningful native haptics/feedback where supported;
- real place imagery where useful and truthful;
- explicit live/cached/stale/offline visual semantics.

Graphics do not exist to decorate weak functionality.

Every visual element must improve orientation, recognition, chronology, decision-making, action, or confidence.

---

# Market Reality

Basic itinerary organization is not sufficient premium differentiation.

Established products already provide substantial combinations of:

- itinerary organization;
- reservation import;
- collaboration;
- maps;
- flight updates;
- offline itinerary access;
- route tools;
- expense capture;
- travel planning.

RT2RP must compete on a higher-order outcome:

**the complete trip behaves as one connected operational system and the traveler performs less manual reconciliation between specialist tools.**

When RT2RP chooses to participate in a specialist domain, it must reach a defensible quality level for the consequence of being wrong.

`All-in-one` is never an excuse for mediocre execution.

---

# Travel Lifecycle

## PREPARE

Assemble confirmed trip information, expose unresolved work, organize people/records/movement, and make readiness understandable.

## OPERATE

Prioritize current context, next action, movement, time-sensitive changes, locations, records, expenses, and material risk.

## CLOSE

Reconcile supported expenses/records, resolve remaining tasks, create useful closeout outputs where supported, and preserve a trustworthy trip record.

The same canonical trip state powers all phases.

---

# Core Experience Spine

1. **Today** — what matters now, what changed, what to do next.
2. **Timeline** — ordered operational truth.
3. **Travel** — movement across supported modes.
4. **Places** — physical trip context.
5. **Records** — durable reservations, expenses, travelers, documents, notes, packing, reports where supported.

Secondary tools strengthen this spine; they do not fragment it.

---

# One-Trip Standard

The system may contain many tables, providers, caches, services, and projections.

The traveler experiences one trip.

A flight does not have competing meanings across screens.

A hotel/stay does not live separately from Timeline, Today, Places, Records, expenses, or intelligence that depend on it.

A drive should not require re-entering information the trip already knows.

One material fact is entered or corrected once whenever practical and reused consistently.

Provider-specific apps may still be needed for boarding credentials, reservation modification, identity verification, employer controls, or provider-owned actions.

RT2RP must not pretend otherwise.

Its job is to make the complete trip understandable and manageable across those providers.

---

# Product Quality Bar

RT2RP must be:

- clean;
- clear;
- useful;
- accurate;
- responsive;
- calm;
- context-aware;
- honest;
- resilient;
- secure;
- accessible;
- mobile-first;
- visually intentional;
- easy to recover when something goes wrong.

Travel happens under time pressure, fatigue, poor connectivity, unfamiliar surroundings, schedule changes, language differences, and divided attention.

Design for those conditions—not only a developer on fast Wi-Fi.

---

# Decision Order

When tradeoffs occur:

1. User safety and trust
2. Security/privacy
3. Truthfulness
4. Reliability
5. Correctness/data integrity
6. Travel clarity
7. Travel preparedness
8. Recovery/resilience
9. Traveler simplicity
10. Accessibility
11. Performance
12. Experience quality
13. Maintainability
14. Scalability
15. Cost efficiency
16. Revenue optimization
17. Developer convenience

Visual polish never overrides truth.

Developer convenience never overrides traveler trust.

---

# Definition of World-Class

World-class does not mean having the most features.

For RT2RP it means:

- the trip is one connected operational system;
- important information appears when and where it is needed;
- travel-mode/provider transitions require less manual thought;
- the same fact does not drift across screens;
- live information is truly current when presented as live;
- failures degrade honestly;
- AI improves work without inventing facts;
- critical reference remains useful under degraded connectivity where supported;
- common actions require little effort;
- every exposed subsystem meets a strong competitive quality bar;
- graphics and motion improve understanding rather than decorate complexity;
- the experience feels premium and coherent across web/native/mobile/desktop;
- the product never promises what it cannot deliver;
- repeated real trips increase user trust rather than expose hidden fragility.

The final test:

**Would an experienced RT2RP traveler be reluctant to take a real trip without it?**

If not, the product is not finished.

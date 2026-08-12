# RT2RP — Subsystem Specification Standard

## Purpose

Every meaningful implementation phase must have a bounded specification before code changes begin.

A spec is not a feature wishlist. It is the contract between product intent, current implementation, architecture, market benchmark, user experience, tests, release evidence, and completion.

A spec may describe internal target behavior that is not yet public. That target does not become a user-facing promise until the release gate is satisfied.

---

## Required Sections

Every subsystem spec must contain the following.

### 1. Title and Status

- spec number/name;
- status: DRAFT / AUDITED / APPROVED / IMPLEMENTING / VALIDATED;
- last updated;
- governing roadmap phase.

`VALIDATED` is reserved for behavior supported by required evidence, not merely merged code.

### 2. User Problem

Describe the real traveler problem in plain language.

Do not begin with a technical solution.

### 3. User Outcome

State exactly what the traveler should be able to accomplish when the subsystem is complete.

The outcome should describe reduced work, greater clarity, better execution, or stronger closeout—not simply a screen or data object.

### 4. Product Promise

List only promises the completed implementation is intended to support.

Until validated, these are candidate promises and must remain invisible to users unless already proven by current implementation.

If a capability is not fully planned for delivery in this spec, it is explicitly out of scope and must remain invisible to users.

### 5. Current Implementation Audit

Document:

- current files/modules;
- current database entities;
- current edge functions/providers;
- current tests;
- current production/configuration dependencies;
- known strengths;
- known failures;
- duplicate paths;
- user-facing claims currently attached to the subsystem;
- evidence supporting each material conclusion.

### 6. Competitive Benchmark and Differentiation

Identify the strongest relevant current benchmark from `docs/12-MARKET-AND-PRODUCT-STANDARD.md` or newly researched current product evidence.

Document:

- what users already receive free for this problem;
- what users pay for;
- which product sets the specialist quality bar;
- what RT2RP should match because it is table stakes;
- what RT2RP deliberately will not copy;
- what RT2RP's integration advantage is;
- the competitive quality target for mobile usability, reliability, interaction cost, and visual confidence.

Competitive research does not authorize a feature. It defines the external bar if RT2RP chooses to expose the capability.

If there is no meaningful specialist benchmark, state that and define the evidence used instead.

### 7. Preservation Classification

For each material current path classify:

- PRESERVE;
- STRENGTHEN;
- CONSOLIDATE;
- REPLACE;
- HIDE/REMOVE.

Include reasons and evidence.

### 8. Canonical Domain Model

Define:

- entities;
- identity;
- ownership;
- relationships;
- required/optional fields;
- state transitions;
- invariants;
- source authority/precedence.

### 9. Data Flow

Describe reads and writes end-to-end.

Example:

```text
input -> validation -> command -> persistence -> canonical projection -> cache/realtime -> UI
```

For multi-record or background behavior, identify transaction/idempotency boundaries.

For cross-domain behavior, identify every dependent surface that must update.

### 10. Failure and Truth States

Specify only relevant states, including as applicable:

- loading;
- empty;
- needs input;
- success;
- cached;
- stale;
- offline;
- provider unavailable;
- unknown/unresolved;
- permission denied;
- failed write;
- partial failure;
- recovery.

Define which state is authoritative and what the traveler sees.

### 11. Security / Privacy

Document:

- authorization;
- RLS;
- PII;
- file access;
- secrets;
- logging restrictions;
- account/member boundary;
- abuse controls where relevant;
- local persistence implications where relevant.

### 12. Provider / Real-Time Contract

If external or live data is involved, define:

- provider;
- capability served;
- normalized schema;
- entity matching;
- source authority;
- production configuration dependency;
- timeout;
- retry;
- cache;
- freshness classes/windows;
- rate limit;
- cost;
- fallback/no-fallback;
- observability;
- expected foreground refresh behavior.

If the capability implies monitoring, real-time updates, or alerts, also define:

- scheduler/trigger;
- eligibility window;
- refresh cadence;
- state comparison;
- material-change rules;
- deduplication/suppression;
- delivery path;
- notification permission behavior;
- missed-run recovery;
- measurable service objectives appropriate to provider constraints and traveler risk.

No spec may use the word `real-time`, `monitor`, or `automatic alert` without this chain.

### 13. AI Contract

If AI is involved, define:

- capability;
- inputs;
- schema;
- model policy;
- ambiguity handling;
- validation;
- hallucination controls;
- privacy;
- eval fixtures;
- objective release threshold;
- failure behavior;
- whether AI is advisory, extractive, or state-affecting.

### 14. Offline / Reconnect Contract

Define only if applicable.

Do not assume app-shell caching provides domain offline support.

Specify:

- intentionally persisted data;
- sensitive fields excluded;
- storage/version model;
- last-sync/freshness semantics;
- write behavior;
- idempotency;
- conflicts;
- reconnect reconciliation;
- account switching/logout cleanup;
- platform differences;
- degraded UX.

### 15. UX Contract

Describe:

- entry points;
- primary question the screen answers;
- information hierarchy;
- user actions;
- loading/error/empty/stale behavior;
- mobile/desktop behavior;
- accessibility considerations;
- wording constraints for truth/freshness;
- comparative interaction/cognitive-load target where a market benchmark exists;
- first-viewport priority for critical trip context.

### 16. Visual and Interaction Quality Contract

For every material user-facing surface define the intended production-quality experience.

Include as applicable:

- typography hierarchy;
- spacing/density;
- card/surface hierarchy;
- icons;
- maps/routes;
- charts/data visualization;
- imagery/photo behavior;
- status colors/semantics;
- motion/transition behavior;
- haptics/native feedback;
- responsive behavior;
- degraded-state visuals;
- accessibility alternatives for visual information;
- long-text/international-data behavior.

State what graphics genuinely improve the traveler outcome and what decorative graphics are intentionally excluded.

The spec must not use subjective criteria such as `make it premium` or `stellar graphics` without observable acceptance conditions.

### 17. Performance and Perceived-Speed Contract

For critical user-facing behavior define practical performance expectations appropriate to the subsystem.

Measure where practical:

- time to first useful trip content;
- interaction responsiveness;
- route transition behavior;
- provider refresh latency;
- image/map loading behavior;
- slow-network degradation;
- blocking vs non-blocking dependencies.

Prioritize useful trip context before secondary visual assets.

Do not invent universal latency numbers where provider/platform constraints differ; define evidence-based budgets per subsystem.

### 18. Migration Plan

If existing data/code changes:

- compatibility;
- backfill;
- staged rollout;
- rollback/recovery;
- dual-read/write period if unavoidable;
- removal conditions for old path;
- validation query/test.

### 19. Observability and Operations

Define production evidence required to operate the capability safely:

- logs/metrics/events;
- provider/job health where relevant;
- failure detection;
- stale/fallback rate where relevant;
- cost/usage where relevant;
- support diagnostics;
- alert/escalation threshold for critical failures.

Do not log secrets or unnecessary PII.

### 20. Acceptance Tests

Write objective tests before implementation.

Include as applicable:

- happy path;
- edge cases;
- failure cases;
- stale/provider cases;
- permissions;
- timezone/date boundaries;
- multi-modal scenarios;
- mobile/desktop;
- accessibility-critical interactions;
- reconnect/partial failure;
- regression cases;
- competitive usability/parity checks for table-stakes behavior;
- visual hierarchy/state checks;
- real-time material-change scenarios;
- slow-network/perceived-speed checks.

Acceptance criteria must be binary or evidence-based where practical.

Avoid subjective phrases such as `works well`, `looks good`, `is smart`, `premium`, or `world-class` without observable evidence.

### 21. Release Evidence

List evidence required before the capability can be described publicly, for example:

- test suite results;
- production configuration verified;
- migration/backfill verified;
- provider/background chain verified;
- real-time service objectives measured where applicable;
- manual end-to-end scenario verified;
- degraded/failure/recovery verified;
- visual/cross-device review completed;
- accessibility review completed;
- competitive benchmark scenario verified where relevant;
- public wording reviewed against actual behavior.

### 22. Definition of Done

The subsystem is complete only when:

- acceptance tests pass;
- types/lint/build pass;
- end-to-end propagation is verified;
- no unintended duplicate source of truth remains;
- security boundaries are validated;
- public wording exactly matches behavior;
- real-time semantics are proven where claimed;
- offline semantics are proven where claimed;
- observability exists at level required by risk;
- migration/removal conditions are satisfied;
- user-facing visual/interaction quality meets the defined contract;
- relevant table-stakes behavior is not knowingly inferior without a documented product reason;
- remaining known risks are documented and acceptable for exposed behavior.

### 23. Non-Goals

Explicitly list what this spec does not implement.

Non-goals must not be exposed to users as implied capabilities.

### 24. Public Exposure Decision

At validation, record one decision:

- **EXPOSE** — complete, proven, wording approved;
- **KEEP EXISTING EXPOSURE** — pre-existing capability revalidated;
- **NARROW WORDING** — capability is valid but previous copy overstates it;
- **INTERNAL ONLY** — implementation exists but release proof is incomplete;
- **HIDE/REMOVE** — capability cannot meet the product standard.

---

## Spec Quality Rules

A good spec is:

- bounded;
- testable;
- honest;
- grounded in current repository implementation;
- informed by current market evidence without being feature-led;
- explicit about preservation;
- explicit about failure;
- explicit about data ownership;
- explicit about real-time semantics where relevant;
- explicit about offline semantics where relevant;
- explicit about visual/interaction quality;
- explicit about differentiation;
- explicit about release evidence;
- small enough to implement and review safely.

A bad spec says `improve travel intelligence`, `make it real-time`, `make it premium`, `improve graphics`, or `match competitor X` without defining user outcome, canonical facts, rules, failure states, visual contract, differentiation, evidence, and acceptance criteria.

---

## Mandatory Pre-Implementation Gate

Before Codex implements a subsystem spec, it must be possible to answer:

1. What user problem is being solved?
2. What current code will be preserved?
3. What is the canonical source of truth?
4. What data changes?
5. What can fail?
6. How does the UI tell the truth when it fails?
7. What is the strongest relevant market benchmark?
8. What does RT2RP need to match, deliberately avoid, and do better?
9. If data is live, what proves freshness, material change, delivery, and recovery?
10. If data is offline, what is intentionally persisted and how is it secured/reconciled?
11. What should the experience look and feel like, and what observable criteria prove that quality?
12. How is the behavior tested?
13. What evidence will establish that the capability is release-ready?
14. What public promise, if any, becomes valid after validation?

If these cannot be answered, the spec is not ready.

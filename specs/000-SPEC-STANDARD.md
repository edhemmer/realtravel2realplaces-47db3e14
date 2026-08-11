# RT2RP — Subsystem Specification Standard

## Purpose

Every meaningful implementation phase must have a bounded specification before code changes begin.

A spec is not a feature wishlist. It is the contract between product intent, current implementation, architecture, tests, release evidence, and completion.

A spec may describe internal target behavior that is not yet public. That target does not become a user-facing promise until the release gate is satisfied.

---

## Required Sections

Every subsystem spec must contain the following.

### 1. Title and Status

- spec number/name;
- status: DRAFT / AUDITED / APPROVED / IMPLEMENTING / VALIDATED;
- last updated;
- governing roadmap phase.

`VALIDATED` is reserved for behavior supported by the required evidence, not merely merged code.

### 2. User Problem

Describe the real traveler problem in plain language.

Do not begin with a technical solution.

### 3. User Outcome

State exactly what the traveler should be able to accomplish when the subsystem is complete.

### 4. Product Promise

List only promises the completed implementation is intended to support.

Until validated, these are candidate promises and must remain invisible to users unless already proven by the current implementation.

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

### 6. Preservation Classification

For each material current path classify:

- PRESERVE;
- STRENGTHEN;
- CONSOLIDATE;
- REPLACE;
- HIDE/REMOVE.

Include reasons and evidence.

### 7. Canonical Domain Model

Define:

- entities;
- identity;
- ownership;
- relationships;
- required/optional fields;
- state transitions;
- invariants;
- source authority/precedence.

### 8. Data Flow

Describe reads and writes end-to-end.

Example:

```text
input -> validation -> command -> persistence -> canonical projection -> cache/realtime -> UI
```

For multi-record or background behavior, identify transaction/idempotency boundaries.

### 9. Failure and Truth States

Specify only relevant states, including as applicable:

- loading;
- empty;
- needs input;
- success;
- cached;
- stale;
- offline;
- provider unavailable;
- permission denied;
- failed write;
- partial failure;
- recovery.

Define which state is authoritative and what the traveler sees.

### 10. Security / Privacy

Document:

- authorization;
- RLS;
- PII;
- file access;
- secrets;
- logging restrictions;
- account/member boundary;
- abuse controls where relevant.

### 11. Provider Contract

If external data is involved, define:

- provider;
- capability served;
- normalized schema;
- source authority;
- timeout;
- retry;
- cache;
- freshness;
- rate limit;
- cost;
- fallback/no-fallback;
- observability;
- production configuration dependency.

### 12. AI Contract

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
- objective release threshold.

### 13. Offline / Reconnect

Define only if applicable.

Do not assume app-shell caching provides domain offline support.

Specify read persistence, write behavior, conflicts, reconnect reconciliation, and sensitive-data handling.

### 14. UX Contract

Describe:

- entry points;
- primary question the screen answers;
- information hierarchy;
- user actions;
- loading/error/empty/stale behavior;
- mobile/desktop behavior;
- accessibility considerations;
- wording constraints for truth/freshness.

### 15. Migration Plan

If existing data/code changes:

- compatibility;
- backfill;
- staged rollout;
- rollback/recovery;
- dual-read/write period if unavoidable;
- removal conditions for old path;
- validation query/test.

### 16. Observability and Operations

Define what production evidence is required to operate the capability safely:

- logs/metrics/events;
- provider/job health where relevant;
- failure detection;
- cost/usage where relevant;
- support diagnostics;
- alert/escalation threshold for critical failures.

Do not log secrets or unnecessary PII.

### 17. Acceptance Tests

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
- regression cases.

Acceptance criteria must be binary or evidence-based where practical. Avoid subjective phrases such as "works well," "looks good," or "is smart."

### 18. Release Evidence

List the evidence required before the capability can be described publicly, for example:

- test suite results;
- production configuration verified;
- migration/backfill verified;
- provider/background chain verified;
- manual end-to-end scenario verified;
- failure/recovery verified;
- public wording reviewed against actual behavior.

### 19. Definition of Done

The subsystem is complete only when:

- acceptance tests pass;
- types/lint/build pass;
- end-to-end propagation is verified;
- no unintended duplicate source of truth remains;
- security boundaries are validated;
- public wording exactly matches behavior;
- observability exists at the level required by risk;
- migration/removal conditions are satisfied;
- remaining known risks are documented and acceptable for the exposed behavior.

### 20. Non-Goals

Explicitly list what this spec does not implement.

Non-goals must not be exposed to users as implied capabilities.

### 21. Public Exposure Decision

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
- explicit about preservation;
- explicit about failure;
- explicit about data ownership;
- explicit about release evidence;
- small enough to implement and review safely.

A bad spec says "improve travel intelligence" without defining facts, rules, failure states, evidence, and acceptance criteria.

---

## Mandatory Pre-Implementation Gate

Before Codex implements a subsystem spec, it must be possible to answer:

1. What user problem is being solved?
2. What current code will be preserved?
3. What is the canonical source of truth?
4. What data changes?
5. What can fail?
6. How does the UI tell the truth when it fails?
7. How is the behavior tested?
8. What evidence will establish that the capability is release-ready?
9. What public promise, if any, becomes valid after validation?

If these cannot be answered, the spec is not ready.

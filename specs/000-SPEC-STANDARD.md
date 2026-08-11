# RT2RP — Subsystem Specification Standard

## Purpose

Every meaningful implementation phase must have a bounded specification before code changes begin.

A spec is not a feature wishlist. It is the contract between product intent, current implementation, architecture, tests, and completion.

---

## Required Sections

Every subsystem spec must contain the following.

### 1. Title and Status

- spec number/name;
- status: DRAFT / AUDITED / APPROVED / IMPLEMENTING / VALIDATED;
- last updated;
- governing roadmap phase.

### 2. User Problem

Describe the real traveler problem in plain language.

Do not begin with a technical solution.

### 3. User Outcome

State exactly what the traveler should be able to accomplish when the subsystem is complete.

### 4. Product Promise

List only promises the completed implementation will actually support.

If a capability is not fully planned for delivery in this spec, it is explicitly out of scope and must remain invisible to users.

### 5. Current Implementation Audit

Document:

- current files/modules;
- current database entities;
- current edge functions/providers;
- current tests;
- known strengths;
- known failures;
- duplicate paths;
- user-facing claims currently attached to the subsystem.

### 6. Preservation Classification

For each material current path classify:

- PRESERVE;
- STRENGTHEN;
- CONSOLIDATE;
- REPLACE;
- HIDE/REMOVE.

Include reasons.

### 7. Canonical Domain Model

Define:

- entities;
- identity;
- ownership;
- relationships;
- required/optional fields;
- state transitions;
- invariants;
- source precedence.

### 8. Data Flow

Describe reads and writes end-to-end.

Example:

```text
input -> validation -> command -> persistence -> canonical projection -> cache/realtime -> UI
```

### 9. Failure and Truth States

Specify relevant states:

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
- recovery.

### 10. Security / Privacy

Document:

- authorization;
- RLS;
- PII;
- file access;
- secrets;
- logging restrictions.

### 11. Provider Contract

If external data is involved, define:

- provider;
- normalized schema;
- timeout;
- retry;
- cache;
- freshness;
- rate limit;
- cost;
- fallback;
- observability.

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
- eval fixtures.

### 13. Offline / Reconnect

Define only if applicable.

Do not assume app-shell caching provides domain offline support.

### 14. UX Contract

Describe:

- entry points;
- primary question the screen answers;
- information hierarchy;
- user actions;
- loading/error/empty behavior;
- mobile/desktop behavior;
- accessibility considerations.

### 15. Migration Plan

If existing data/code changes:

- compatibility;
- backfill;
- staged rollout;
- rollback/recovery;
- removal conditions for old path.

### 16. Acceptance Tests

Write objective tests before implementation.

Include:

- happy path;
- edge cases;
- failure cases;
- stale/provider cases;
- permissions;
- timezone/date boundaries where relevant;
- multi-modal scenarios where relevant;
- mobile/desktop;
- regression cases.

### 17. Definition of Done

The feature is complete only when:

- acceptance tests pass;
- types/lint/build pass;
- end-to-end propagation is verified;
- no duplicate source of truth remains;
- public wording exactly matches behavior;
- observability exists;
- remaining known risks are documented.

### 18. Non-Goals

Explicitly list what this spec does not implement.

Non-goals must not be exposed to users as implied capabilities.

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
- small enough to implement safely.

A bad spec says "improve travel intelligence" without defining facts, rules, failure states, and acceptance evidence.

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
8. What public promise becomes valid after completion?

If these cannot be answered, the spec is not ready.

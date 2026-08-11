# RT2RP — Codex Master Build Prompt

## Role

You are working inside the Real Travel 2 Real Places (RT2RP) production repository.

RT2RP is an existing Travel Operating System. Your job is to improve it without fragmenting it, weakening reliability, duplicating architecture, or overstating capability.

You are not building a demo.

You are not free to invent product behavior outside repository truth.

---

## Mandatory Reading Order

Before making architectural, database, AI, UX, workflow, security, infrastructure, provider, native-mobile, reliability, or feature decisions, read:

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
12. the assigned specification under `specs/`.

Also inspect existing implementation and tests relevant to the assigned subsystem.

Repository documents control.

---

## Hard-Locked Rule

**If RT2RP cannot fully and reliably do something, RT2RP does not mention it to the user.**

Never add:

- coming-soon product UI;
- fake/placeholder travel data;
- disabled capability cards suggesting future functionality;
- wording that implies live monitoring without real background monitoring;
- wording that implies offline trip access without real offline trip data;
- AI output that implies provider-backed facts without provider evidence;
- marketing-style capability claims inside the application.

If an assigned implementation is incomplete at the end of the task, keep it internal/hidden.

---

## Preservation-First Directive

Before changing existing code, classify it:

- **PRESERVE** — correct and strong;
- **STRENGTHEN** — good capability, weak implementation boundary/reliability/tests;
- **CONSOLIDATE** — duplicate concept/path;
- **REPLACE** — materially unsafe or incompatible implementation;
- **HIDE/REMOVE** — unsupported or valueless user-facing capability.

Do not rewrite stable code for stylistic preference.

Do not create parallel V2 architecture to avoid understanding current code.

Do not remove a working path until its replacement is proven and all dependencies are migrated.

---

## Required Workflow

### Step 1 — Understand the Assignment

Restate internally:

- user outcome;
- domain entities;
- current implementation paths;
- governing spec;
- acceptance tests;
- explicit non-goals.

### Step 2 — Inspect Current Reality

Search the repository for:

- existing helpers/services;
- hooks;
- database schema/migrations;
- edge functions;
- provider calls;
- tests;
- duplicate implementations;
- feature copy.

Do not assume documentation perfectly matches current code.

### Step 3 — Identify Canonical Ownership

Before adding logic, identify the existing canonical owner or establish one according to the governing architecture.

One concept gets one owner.

### Step 4 — Make the Smallest Coherent Change

Prefer bounded implementation that fully closes one user outcome.

Avoid mixing unrelated refactors, UI redesign, schema changes, new providers, and new AI capabilities in one task.

### Step 5 — Validate End-to-End Propagation

When a canonical fact changes, verify every dependent surface that should change.

Examples may include:

- Today;
- Timeline;
- Travel;
- Records;
- reports;
- AI context;
- notifications;
- realtime peers.

### Step 6 — Test

Run relevant:

- unit tests;
- integration tests;
- RLS/security checks;
- component tests;
- end-to-end tests;
- typecheck;
- lint;
- build.

Add regression tests for bugs and high-risk travel logic.

### Step 7 — Truth Audit

Before completion ask:

- Does the UI say anything the system cannot prove?
- Does stale data look live?
- Does cached data look current?
- Does an estimate look provider-backed?
- Does AI invent missing facts?
- Does the feature fail silently?
- Is any user data at risk?

If yes, the task is not complete.

---

## Architecture Rules

### Domain

- Trip is the operating aggregate root.
- Reservations, movements, stays, places, travelers, events, expenses, tasks, and alerts are related but distinct concepts.
- Air, rail, drive, and mixed-mode travel are first-class.
- Timeline and Today are projections of canonical truth, not separate truth stores.

### Time

- Preserve local wall-time semantics.
- Respect existing canonical time policy.
- Do not introduce casual `Date` parsing that shifts travel dates/times.
- Timezone regressions are blockers.

### Providers

- Provider calls go through adapters/server boundaries.
- Normalize response shapes.
- Preserve freshness metadata.
- Define unavailable state.
- Do not leak provider-specific structures into UI.

### AI

- AI output is untrusted until validated.
- Structured material output requires schemas.
- AI never invents live state.
- Deterministic logic remains deterministic.

### Security

- Server-side authorization controls access.
- Client gating is not security.
- Never expose secrets.
- Preserve/strengthen RLS.
- Validate user-controlled identifiers.

### Offline

- Do not call app-shell caching "offline trip support."
- Offline writes require idempotency/conflict handling.
- Reconnect must reconcile authoritative server state.

---

## UI Rules

- Primary experience: Today, Timeline, Travel, Places, Records.
- Keep the experience calm when healthy.
- Put the next meaningful action before secondary analytics.
- Never use decorative warning/status UI without a real condition.
- Use explicit loading/error/empty/stale states.
- Keep critical mobile interactions large and obvious.
- Avoid complex interaction while actively driving.
- Accessibility is required, not polish.

---

## Database Rules

Before schema changes:

1. inspect current schema/migrations;
2. identify existing production data;
3. define backward compatibility;
4. define backfill;
5. define validation;
6. stage code migration;
7. remove old fields only after readers/writers are migrated.

Never perform a big-bang destructive schema rewrite.

---

## Provider/Background Promise Rule

If a capability uses language like:

- live;
- monitored;
- automatically updated;
- alert when changed;

verify the complete chain exists:

```text
provider
 -> retrieval schedule/trigger
 -> normalization
 -> state comparison
 -> materiality/deduplication
 -> persistence
 -> delivery
 -> client update
 -> retry/recovery
 -> observability
 -> tests
```

If the chain is incomplete, do not expose or describe the capability.

---

## Completion Report

At the end of each task, report:

### Preserved
Existing behavior intentionally retained.

### Changed
Files/modules and behavior changed.

### Consolidated/Removed
Duplicate/superseded paths removed only after verification.

### Data Impact
Migrations/backfills/none.

### Reliability
Failure/retry/stale/offline behavior affected.

### Security
Authorization/RLS/PII implications.

### Tests
Exact checks run and results.

### Remaining Risk
Anything not fully proven.

Never describe incomplete work as complete.

---

## Stop Conditions

Stop and report rather than guessing if:

- the assigned spec conflicts with the constitution;
- production data semantics are unclear and a destructive migration would be required;
- a provider capability cannot be verified;
- security ownership is ambiguous;
- implementing the request would create a second source of truth;
- user-facing wording would exceed actual capability.

The correct result may be to preserve the existing implementation and document why.

---

## Final Standard

RT2RP must become more connected, more dependable, and easier to trust after every change.

If the change adds code but does not improve the traveler outcome, challenge the change.

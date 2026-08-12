# RT2RP — Codex Master Build Prompt

## Role

You are working inside the Real Travel 2 Real Places (RT2RP) production repository.

RT2RP is an existing Travel Operating System. Your job is to improve it without fragmenting it, weakening reliability, duplicating architecture, overstating capability, or shipping competitively weak checkbox features.

You are not building a demo.

You are not free to invent product behavior outside repository truth.

You are not allowed to treat visual quality, accessibility, mobile behavior, or recovery as later polish.

The governing corpus defines standards and target architecture. It does **not** prove that a capability is currently implemented or publicly releasable.

---

## Mandatory Reading Order

Before making architectural, database, AI, UX, workflow, security, infrastructure, provider, native-mobile, reliability, product-positioning, or feature decisions, read:

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
12. `docs/12-MARKET-AND-PRODUCT-STANDARD.md`
13. the assigned specification under `specs/`.

Also inspect existing implementation, production/configuration dependencies, tests, current user-facing copy, and current visual patterns relevant to the assigned subsystem.

Repository documents control architectural/product intent.

Current code, production configuration, and evidence control claims about what exists today.

Competitive examples define an external quality bar. They are never permission to add a feature.

---

# Non-Negotiable Rules

## Hard-Locked Product Rule

**If RT2RP cannot fully and reliably do something, RT2RP does not mention it to the user.**

Never add:

- coming-soon product UI;
- fake/placeholder travel data;
- disabled cards advertising incomplete capability;
- live/monitoring language without the full live-data chain;
- offline language without intentional offline trip data;
- AI statements that imply provider-backed facts without provider evidence;
- marketing claims embedded in product UI that exceed implementation.

If implementation is incomplete or unproven, keep it internal/hidden.

## Preservation-First Rule

Before changing existing code, classify it:

- PRESERVE;
- STRENGTHEN;
- CONSOLIDATE;
- REPLACE;
- HIDE/REMOVE.

Do not rewrite stable code for style preference.

Do not create parallel `V2` architecture to avoid understanding current code.

Do not remove a working path until replacement is proven and dependencies are migrated.

## Experience-Quality Rule

A user-facing change is not complete when logic passes tests but the experience remains generic, confusing, slow, visually inconsistent, inaccessible, or misleading.

For user-facing work, comply with `docs/07-UI-UX-SYSTEM.md`.

Graphics, maps, charts, imagery, animation, and haptics must improve one or more of:

- orientation;
- recognition;
- chronology;
- decision-making;
- action confidence;
- understanding of change;
- emotional confidence in the product.

Do not add decoration simply to make a screen look more designed.

## Real-Time Rule

`Live`, `real-time`, `monitor`, `automatically updated`, and `alert when changed` are release contracts.

They require the applicable chain from `docs/08-LIVE-DATA-AND-PROVIDERS.md`, including identity matching, freshness, material change, background execution when required, delivery, recovery, observability, and release evidence.

A foreground API call is not background monitoring.

---

# Competitive Discipline

Before implementing or materially redesigning a user-facing subsystem:

1. identify the strongest relevant current benchmark;
2. identify what users already receive free;
3. identify what users pay for;
4. identify table-stakes behavior RT2RP must not knowingly underperform;
5. define what RT2RP deliberately will not copy;
6. define RT2RP's integration advantage within the complete trip;
7. define objective quality, visual, interaction, reliability, and performance targets in the assigned spec.

Do not implement competitor features solely for parity.

Do not use `all-in-one` as justification for shallow execution.

If a specialist capability cannot be implemented to a defensible quality level, keep it internal or omit it.

RT2RP's primary differentiation is operational continuity across the complete trip.

---

# Required Workflow

## Step 1 — Understand the Assignment

Restate internally:

- traveler problem;
- exact user outcome;
- domain entities;
- current implementation paths;
- governing spec;
- relevant market benchmark;
- acceptance tests;
- release evidence;
- explicit non-goals.

## Step 2 — Inspect Current Reality

Search the repository for:

- current routes/surfaces;
- components/containers;
- domain helpers/services;
- hooks;
- schema/migrations;
- edge functions;
- provider calls;
- production/configuration dependencies;
- realtime/background paths;
- native bridges;
- local persistence;
- tests;
- duplicate implementations;
- current feature copy;
- current visual/design primitives.

Do not assume documentation perfectly matches current code.

Do not treat file existence as proof that a capability works end-to-end.

## Step 3 — Identify Canonical Ownership

Before adding logic, identify the existing canonical owner or establish one according to the governing architecture.

One concept gets one canonical owner.

Legitimate projections/caches must have explicit derivation, invalidation, and reconciliation rules.

## Step 4 — Define the Competitive and Experience Target

From the assigned spec and benchmark, establish:

- table stakes;
- consequence of being wrong;
- expected mobile interaction quality;
- visual hierarchy;
- graphics/maps/chart behavior if relevant;
- expected loading/degraded behavior;
- performance/perceived-speed target;
- RT2RP integration advantage;
- behavior intentionally out of scope.

Do not broaden scope because a competitor has more features.

## Step 5 — Make the Smallest Coherent Vertical Change

Implement the smallest bounded change that fully closes one user outcome across required layers.

Do not separate `backend complete` from `UX later` for a user-facing milestone unless the partial work remains internal and hidden.

Avoid mixing unrelated refactors, schema changes, new providers, AI work, and unrelated UI redesign in one task.

## Step 6 — Validate End-to-End Propagation

When a canonical fact changes, verify every implemented dependent surface that should change.

Potential surfaces include:

- Today;
- Timeline;
- Travel;
- Places;
- Records;
- reports;
- AI context;
- notifications;
- realtime peers;
- offline packet/cache where applicable.

Also verify cross-domain handoffs affected by the change.

## Step 7 — Validate Truth and Failure Behavior

Explicitly test:

- loading;
- empty;
- missing input;
- error;
- partial failure;
- cached/recent;
- stale;
- provider unavailable;
- offline/reconnect where applicable;
- permission denied;
- interrupted save;
- recovery.

Do not collapse distinct traveler-relevant states into generic fallback UI.

## Step 8 — Validate Experience Quality

For user-facing work, review representative mobile and desktop states.

Verify:

- first viewport answers the primary question;
- important time/place/action information is glanceable;
- density remains understandable on dense trips;
- typography/spacing/cards create clear hierarchy;
- maps/charts/images are truthful and useful;
- long/international data does not break layout;
- motion is restrained and meaningful;
- reduced-motion and accessibility behavior work;
- loading/error/stale/offline states remain visually coherent;
- native shell does not feel like an accidental web wrapper where native behavior is supported.

Do not declare visual quality from source-code inspection alone when the result can be rendered/tested.

## Step 9 — Validate Real-Time Behavior

If live/provider/background behavior is involved, verify:

- entity matching;
- source authority;
- freshness classes;
- invalidation;
- material change;
- background cadence where required;
- deduplication;
- notification delivery path where claimed;
- missed-run recovery;
- observability;
- cost/rate-limit handling;
- defined service objectives.

If this cannot be proven, narrow or hide the live claim.

## Step 10 — Test

Run the relevant combination of:

- unit tests;
- integration tests;
- RLS/security checks;
- component tests;
- end-to-end tests;
- provider contract tests;
- AI eval fixtures;
- visual/cross-device verification;
- accessibility checks;
- competitive usability scenario;
- typecheck;
- lint;
- build.

Add regression tests for high-risk defects.

## Step 11 — Release Evidence Audit

Before completion ask:

- Does the UI say anything the system cannot prove?
- Does stale data look live?
- Does cached data look current?
- Does an estimate look provider-backed?
- Does AI invent missing facts?
- Does the feature fail silently?
- Is any user data at risk?
- Is required production configuration present?
- Has failure/recovery been validated?
- Is a table-stakes workflow knowingly weaker than the relevant benchmark without a documented product reason?
- Does the experience look and behave credibly beside high-quality travel apps?
- Does this reduce manual reconciliation across the trip or merely add another feature surface?

If yes or unknown for a critical item, the task is not release-validated.

## Step 12 — Public Exposure Decision

Record exactly one:

- EXPOSE;
- KEEP EXISTING EXPOSURE;
- NARROW WORDING;
- INTERNAL ONLY;
- HIDE/REMOVE.

Never infer EXPOSE merely because implementation code is complete.

---

# Architecture Rules

## Domain

- Trip is the operating aggregate root.
- Reservations, movements, stays, places, travelers, events, expenses, tasks, and alerts are related but distinct.
- Air, rail, drive, and mixed-mode travel are first-class target domains, but only validated behavior may be exposed.
- Timeline and Today are projections of canonical truth, not separate truth stores.
- Cross-domain transitions are a first-class product concern.

## Time

- Preserve local wall-time semantics.
- Respect existing canonical time policy unless a safer replacement is proven.
- Do not introduce casual date parsing that shifts travel times/dates.
- Timezone regressions are blockers.

## Providers

- Provider calls go through adapters/server boundaries.
- Normalize response shapes.
- Preserve source/freshness metadata.
- Define authority and unavailable state.
- Do not leak provider-specific structures into UI.

## AI

- AI output is untrusted until validated.
- Material structured output requires schemas.
- AI never invents live state.
- Deterministic logic remains deterministic.
- AI must reduce work or improve a supported decision, not merely generate content.

## Security

- Server-side authorization controls access.
- Client gating is not security.
- Never expose secrets.
- Preserve/strengthen RLS.
- Validate user-controlled identifiers.

## Offline

- Do not call app-shell caching `offline trip support`.
- Offline writes require idempotency/conflict behavior.
- Reconnect reconciles authoritative server state.
- Account switching/logout must not leak cached trip data.

---

# UI Rules

- Target primary experience: Today, Timeline, Travel, Places, Records.
- Keep healthy trips calm.
- Put next meaningful action ahead of secondary analytics when timing matters.
- Never use decorative warning/status UI without a real condition.
- Use explicit async/truth states.
- Keep critical mobile interactions large and obvious.
- Avoid complex interaction while actively driving.
- Accessibility is required, not polish.
- Match or beat relevant specialist cognitive/interaction simplicity for table-stakes workflows unless a documented RT2RP need justifies extra friction.
- Premium graphics must never mask weak functionality.

---

# Database Rules

Before schema changes:

1. inspect current schema/migrations;
2. identify existing production data;
3. define backward compatibility;
4. define backfill;
5. define validation;
6. stage code migration;
7. remove old fields only after readers/writers migrate and recovery requirements are satisfied.

Never perform a big-bang destructive schema rewrite.

---

# Completion Report

At the end of each task report:

### Preserved
Existing behavior intentionally retained.

### Changed
Files/modules and behavior changed.

### Consolidated/Removed
Duplicate/superseded paths removed only after verification.

### Competitive Benchmark
Relevant baseline and how RT2RP compares.

### Experience Quality
Mobile/desktop/visual/accessibility/perceived-speed validation performed.

### Data Impact
Migrations/backfills/none.

### Real-Time / Provider Impact
Freshness, background behavior, notifications, service objectives, or none.

### Reliability
Failure/retry/stale/offline behavior affected.

### Security
Authorization/RLS/PII implications.

### Tests
Exact checks run and results.

### Release Evidence
What proves the capability can or cannot be public.

### Public Exposure Decision
EXPOSE / KEEP EXISTING EXPOSURE / NARROW WORDING / INTERNAL ONLY / HIDE-REMOVE.

### Remaining Risk
Anything not fully proven.

Never describe incomplete work as complete.

---

# Stop Conditions

Stop and report rather than guessing if:

- assigned spec conflicts with Constitution;
- production data semantics are unclear and destructive migration would be required;
- provider capability cannot be verified;
- security ownership is ambiguous;
- implementation would create a second source of truth;
- user-facing wording would exceed actual capability;
- live semantics cannot be proven;
- visual design would imply state the data cannot support;
- proposed feature exists only for competitive checkbox parity and lacks a meaningful RT2RP outcome.

The correct result may be to preserve current implementation, keep work internal, narrow wording, omit a feature, or document why no code change is justified.

---

# Final Standard

RT2RP must become more connected, more dependable, more visually credible, more competitive, and easier to trust after every change.

If a change adds code but does not improve a validated traveler outcome or strengthen operational continuity, challenge the change.

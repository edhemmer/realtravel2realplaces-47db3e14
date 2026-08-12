# RT2RP — System Architecture

## Purpose

RT2RP must operate as one system even though it spans web, native mobile, database, providers, background jobs, AI, caches, and many travel domains.

This document defines the target architecture and the boundaries required to preserve reliability while modernizing the existing application.

This target architecture is an internal engineering contract. It is not evidence that every described capability is already implemented or may be exposed to users.

---

## Architectural Shape

```text
Traveler
  ↓
Web / Native UI
  ↓
Experience Containers + Domain Hooks
  ↓
Domain Services / Canonical State
  ↓
Data Access + Command Layer
  ↓
Supabase/PostgreSQL + Edge Functions
  ↓
Provider Adapters / AI Adapters / Background Jobs

Canonical Trip State feeds supported surfaces such as:
  Today
  Timeline
  Travel
  Places
  Records
  Alerts
  Reports
  AI Context
```

The UI is not the integration layer.

The database is not the UX layer.

Providers are not the domain model.

AI is not the source of truth.

---

## Existing Stack Preservation Presumption

The current stack is presumed to remain unless Phase 0 audit evidence identifies a specific reliability, security, product, maintenance, or operational limitation that justifies change.

Current technologies and patterns to audit for preservation include:

- React;
- TypeScript;
- Vite;
- TanStack Query;
- React Router;
- Supabase/PostgreSQL;
- Supabase Edge Functions;
- Tailwind/shadcn-based component system;
- Capacitor native shell;
- Vercel hosting;
- provider-backed server functions;
- canonical domain helpers already present in the repository.

Do not replace mature infrastructure merely to conform to a preferred architecture style. Modernization should first improve ownership, contracts, reliability, and tests.

---

## Layer 1 — Experience Layer

Responsibilities:

- navigation;
- layout;
- presentation;
- input collection;
- accessibility;
- user-visible truth states;
- invoking domain actions.

The experience layer should not contain duplicated travel rules or raw provider interpretation.

Primary target surfaces are organized around:

- Dashboard / trip selection;
- Today;
- Timeline;
- Travel;
- Places;
- Records;
- Account/support/admin surfaces.

Only validated capabilities may appear within those surfaces.

---

## Layer 2 — Experience Containers

Containers connect screens to domain capabilities.

Responsibilities:

- retrieve canonical domain data;
- combine required hooks/services;
- map domain state to view models;
- invoke mutations/commands;
- keep presentational components simple.

Existing container patterns should be strengthened rather than abandoned when audit evidence supports them.

A container must not become a second business-logic layer.

---

## Layer 3 — Domain Services / Canonical State

This is the heart of RT2RP.

Responsibilities may include deterministic logic for implemented domains such as:

- trip state;
- timeline projection;
- event ordering;
- active/next context;
- movement resolution;
- readiness/gap rules;
- expense aggregation;
- traveler relationships;
- provider observation interpretation;
- alert eligibility;
- lifecycle decisions.

Where existing canonical helpers already own these concepts, improve them instead of creating parallel services.

The long-term target is a coherent `domain/` or similarly clear structure, but directory movement is secondary to ownership clarity.

---

## Layer 4 — Data Access / Command Layer

Read and write operations should be explicit.

### Queries

Responsible for:

- fetching canonical records;
- safe permission-aware access;
- normalized return shapes;
- cache keys/freshness;
- appropriate retries.

### Commands

Responsible for:

- validation;
- authorized mutations;
- transactional operations where needed;
- deduplication/idempotency;
- downstream synchronization;
- cache/realtime reconciliation.

Complex writes should not be assembled independently by multiple screens.

---

## Layer 5 — Persistence

PostgreSQL/Supabase owns durable canonical product data.

Responsibilities:

- relational integrity;
- RLS;
- durable user/trip records;
- constraints;
- server-enforced lifecycle behavior;
- transactional consistency;
- auditable timestamps.

Database functions/triggers may enforce invariants, but business behavior must remain documented and testable.

Hidden trigger behavior that developers cannot reason about is architectural risk.

---

## Layer 6 — Server / Edge Boundary

Edge functions form the boundary for operations that must not run directly in the browser.

Use them where applicable for:

- provider secrets;
- AI credentials;
- privileged operations;
- inbound webhooks/email;
- provider normalization;
- server-side file operations;
- background processing;
- secure account operations.

Functions should share common auth, CORS, validation, logging, provider, and AI utilities rather than duplicating them.

---

## Layer 7 — Provider Adapter Layer

All third-party travel data is accessed through adapters.

Examples of possible provider domains include:

- routes;
- transit;
- places;
- flight status;
- weather, if implemented;
- APNS/native notifications.

Adapter responsibility:

```text
provider request
  -> provider response
  -> validation
  -> normalization
  -> RT2RP observation/result
```

No page should understand provider-specific field names.

---

## Layer 8 — AI Adapter / Orchestration Layer

AI usage must be centralized enough to control:

- model selection;
- prompts;
- schemas;
- validation;
- retries;
- fallbacks;
- cost;
- privacy;
- telemetry;
- confidence/ambiguity behavior.

Feature components should request a defined AI capability, not construct arbitrary prompts directly.

---

## Layer 9 — Background Operations

Background jobs may support validated capabilities such as notifications, lifecycle enforcement, provider refreshes, or operational monitoring.

Every job requires:

- clear purpose;
- schedule/trigger;
- idempotency;
- lock/concurrency behavior;
- authentication;
- bounded retries;
- failure telemetry;
- stale-job handling;
- user impact definition.

A background process required for a public product promise is production-critical infrastructure and must be validated accordingly.

---

## Canonical Trip State

Canonical Trip State is the normalized operational interpretation of a trip at a point in time.

It should be derived from authoritative records and observations.

Conceptually it may contain supported domains such as:

```text
trip
travelers
members
reservations
movements
stays
places
timeline
expenses
parking
tasks
alerts
provider freshness
current context
next context
readiness
```

Not all data must be materialized into one giant object.

The architectural requirement is that implemented projections share canonical rules.

---

## Command Center Architecture

Today/Command consumes canonical trip state.

It must not independently query and interpret every domain differently from other screens.

A command decision should ideally be explainable as:

```text
facts + current time/context + deterministic rules + validated observations
= current action/status
```

AI may help explain or prioritize, but deterministic critical travel sequencing should not depend solely on a generative model.

---

## Timeline Architecture

Timeline is a common operational projection.

All supported source entities should map through a canonical event adapter.

Examples:

```text
flight segment -> departure/arrival events
stay -> check-in/check-out events
rental -> pickup/return events
parking -> expiration event
rail movement -> departure/arrival events
user activity -> scheduled event
work stop -> stop event
```

These are modeling examples, not evidence that each mapping is currently implemented.

The mapping rules for exposed capabilities must be centralized and tested.

---

## Cross-Surface Propagation

When a user corrects a material source fact, every implemented dependent surface must update coherently.

Example:

```text
change hotel checkout
 -> canonical stay updates
 -> timeline updates
 -> Today context updates
 -> readiness/conflict checks reevaluate
 -> AI context sees corrected truth
 -> report output uses corrected truth
```

Only applicable implemented dependencies participate in the chain.

A mutation that updates only its local tab while leaving known dependent surfaces stale is incomplete.

---

## Realtime Architecture

Realtime can improve collaboration and multi-device consistency.

Rules:

- realtime events trigger reconciliation, not blind mutation of unknown local state;
- missed realtime messages must be recoverable through normal query refetch;
- reconnection must reestablish authoritative state;
- realtime subscription leaks must be prevented;
- permission changes must take effect promptly.

---

## Native Architecture

Capacitor/native capabilities are adapters around the same product domain.

Native-specific code may handle supported behavior such as:

- push/local notifications;
- haptics;
- deep links;
- native sharing;
- app lifecycle;
- secure device storage where used;
- status/safe-area behavior.

Native code must not create a second product logic implementation.

Web and native should share canonical trip rules.

---

## Dependency Direction

Preferred dependency direction:

```text
UI -> domain -> data/provider abstractions
```

Avoid:

```text
canonical domain -> React component
canonical domain -> provider-specific SDK
provider adapter -> page component
```

Domain code should remain portable and testable.

---

## Configuration

Configuration must be environment-controlled and validated at startup/server invocation where practical.

Categories:

- public client config;
- server secrets;
- provider configuration;
- feature availability flags for internal rollout only;
- environment identifiers;
- build/version metadata.

Do not expose a capability to users merely because a feature flag exists.

---

## Feature Flags

Feature flags may support safe internal rollout, testing, and migration.

Rules:

- default-hidden for incomplete user-facing capabilities;
- not a substitute for authorization;
- not a substitute for tests;
- documented owner and removal condition;
- avoid permanent flag accumulation.

A calendar removal date may be used when appropriate, but a flag must at minimum have a concrete retirement condition.

---

## Reliability Boundaries

Critical product boundaries include, where applicable:

- authentication;
- trip loading;
- trip writes;
- timeline derivation;
- time normalization;
- provider status/freshness;
- notification delivery where promised;
- offline trip access where promised;
- expense persistence;
- document access.

Each exposed boundary must have deliberate failure and recovery behavior.

---

## Architecture Smells to Eliminate

During modernization identify and remove or justify:

- components performing raw provider calls;
- duplicate query keys for the same entity;
- screen-specific total calculations;
- repeated date/time interpretation;
- multiple access-tier resolvers;
- duplicate flight/travel models;
- stale copied timeline records;
- broad catch-and-ignore patterns;
- hidden fallback mock data;
- provider response objects leaking into UI;
- AI prompts embedded across unrelated components;
- migrations that changed semantics without backfill tests.

---

## Architecture Acceptance Test

A subsystem is architecturally healthy when:

1. Its canonical source of truth is obvious.
2. Its business rules have one owner.
3. The UI does not reinterpret provider/database details independently.
4. Errors and stale states are explicit where relevant.
5. Changes propagate across implemented dependent surfaces.
6. Tests can exercise core behavior without mounting the whole app where practical.
7. Provider replacement would not require rewriting unrelated UI.
8. Native and web share product logic where both surfaces implement the capability.
9. Security is enforced server-side.
10. A new developer/agent can determine how the subsystem works from repository truth.

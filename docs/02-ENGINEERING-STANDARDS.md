# RT2RP — Engineering Standards

## Purpose

These standards convert the product constitution into engineering behavior.

They apply to human developers, Codex, other coding agents, migrations, provider integrations, AI services, frontend work, native wrappers, and infrastructure changes.

The goal is not architectural purity. The goal is a dependable travel product.

The governing corpus defines standards and target architecture; current implementation and release evidence determine what may be exposed as a product capability.

---

## Engineering Priorities

In order:

1. Correctness
2. Security and privacy
3. Reliability
4. Data integrity
5. Recoverability
6. Traveler clarity
7. Observability
8. Accessibility
9. Performance
10. Maintainability
11. Scalability
12. Cost efficiency
13. Developer convenience

---

## Preservation-First Rule

RT2RP is an existing application.

Before replacing working code, determine:

- what user outcome it currently supports;
- what data it owns;
- what downstream modules depend on it;
- what tests cover it;
- what production/configuration dependencies it requires;
- whether an existing canonical helper/service already owns the concept;
- whether the perceived problem is architectural, UX, data, provider, state, configuration, or error-handling related.

Prefer strengthening and consolidation over parallel replacement.

Do not create `NewTripState`, `TripStateV2`, alternate data clients, duplicate provider clients, duplicate access resolvers, or duplicate domain helpers without an approved migration plan and explicit removal conditions for the superseded path.

---

## One Concept, One Owner

Every material domain concept must have one canonical owner.

Examples:

- trip identity;
- local travel time representation;
- movement status semantics;
- cost totals;
- membership permissions;
- trip lifecycle;
- provider freshness;
- notification eligibility;
- timeline ordering.

Views may transform canonical data for presentation. Caches/projections may exist when their derivation, invalidation, and reconciliation contracts are explicit. They may not become competing authority.

---

## Domain Logic Placement

Business and travel-domain logic belongs in testable domain modules/services, not scattered through React components.

React components should primarily:

- request data;
- render state;
- gather user input;
- invoke explicit mutations/actions;
- display deterministic outcomes.

Complex trip decisions should be independently testable without rendering the UI.

---

## Data Access Standard

All data access must have an explicit owner and consistent contract.

For each query or mutation define:

- entity/entities involved;
- authorization boundary;
- source of truth;
- expected return type;
- nullability;
- error semantics;
- cache behavior;
- invalidation behavior;
- optimistic behavior, if any;
- retry behavior;
- offline behavior, if any.

Direct ad hoc database access from arbitrary UI components should be reduced over time in favor of domain hooks/services.

---

## Mutation Integrity

A mutation is not complete when the server returns success.

The system must ensure that downstream state becomes correct.

Every important mutation should consider:

1. validation before write;
2. authorization;
3. atomicity requirements;
4. canonical persistence;
5. dependent records/triggers;
6. query/cache invalidation;
7. realtime propagation where applicable;
8. user confirmation state;
9. failure recovery;
10. duplicate submission/idempotency risk.

If a multi-record operation can leave the trip in an invalid intermediate state, use transactional/server-side orchestration where practical.

---

## Error Handling Standard

Never use silent catch behavior for a failure that could leave the traveler with incorrect assumptions.

Errors are classified:

### USER-CORRECTABLE
Missing field, malformed value, permission issue, or action requiring user intervention.

### TRANSIENT
Network, timeout, temporary provider failure, rate limit, temporary backend failure.

### DATA-INTEGRITY
Unexpected missing relationship, conflicting canonical state, invalid persisted data.

### SECURITY
Unauthorized access, invalid token, permission escalation attempt, secret/config problem.

### PROGRAMMING
Unexpected exception, invariant violation, serialization issue, impossible state.

Each class must have defined logging, UX, retry, and escalation behavior appropriate to the user impact.

---

## Truthful UI State Contract

Every async surface must explicitly handle relevant states such as:

- loading;
- success;
- empty;
- needs input;
- cached;
- stale;
- offline;
- provider unavailable;
- permission denied;
- error.

Do not collapse materially different states into a generic spinner or generic `unavailable` message when the distinction matters to the traveler.

Do not display placeholder travel data in production.

---

## Time Standard

Travel time is high risk.

RT2RP must preserve local wall-time semantics and explicit timezone context where needed.

Existing canonical no-math/string-based time policies should be preserved unless a replacement is proven safer through migration and regression testing.

Rules:

- never casually parse local travel times through the runtime timezone;
- never convert a provider local time to a date without preserving source timezone/offset semantics;
- never infer timezone solely from the user's device when the event belongs to another location;
- date-only values remain date-only;
- local time values remain local to the event location unless intentionally converted;
- display transformations must not mutate stored truth.

Timezone regressions are release blockers.

---

## Money Standard

Money must not use floating-point arithmetic for persisted financial calculations where precision matters.

Define and preserve:

- currency;
- amount precision;
- payer/owner responsibility;
- personal/business classification;
- split semantics;
- refunds/credits where supported;
- source relationships.

Reports must reconcile to canonical expense/booking/parking records rather than recomputing with screen-specific logic.

---

## Provider Boundary

External providers never define RT2RP's internal domain model.

Provider-specific payloads are normalized at adapter boundaries.

UI code should not depend directly on provider response shapes.

Provider keys/secrets remain server-side.

Every provider integration must define:

- purpose;
- supported product promise;
- authentication;
- production configuration dependency;
- timeout;
- retry;
- rate-limit handling;
- cache/freshness policy;
- normalized schema;
- source authority;
- provider-specific uncertainty;
- failure behavior;
- cost controls;
- monitoring/observability.

---

## AI Engineering Standard

AI output is untrusted input until validated.

AI may extract, classify, summarize, recommend, or prioritize, but material structured output must be schema-validated before persistence or use in deterministic decision logic.

Do not allow AI to directly:

- bypass authorization;
- write arbitrary database fields;
- fabricate provider status;
- invent confirmation numbers, times, addresses, prices, or reservations;
- silently resolve material ambiguity.

Use confidence/ambiguity handling where appropriate.

---

## Security Standard

Security boundaries are enforced server-side.

Required principles:

- RLS or equivalent server-side authorization for user data;
- least privilege;
- no secrets in client code;
- protected server functions for privileged/provider operations;
- explicit ownership/membership checks;
- safe file access;
- validation of user-controlled IDs;
- secure account deletion and data lifecycle;
- PII minimization;
- no sensitive data in logs unless essential and protected.

A client-side gate is UX, not security.

---

## Offline and Connectivity Standard

Do not claim offline functionality for data or actions that are not actually available offline.

Static app-shell caching alone is not equivalent to offline trip functionality.

For each offline-capable capability specify:

- what data is cached;
- when it is cached;
- encryption/security implications;
- how freshness is communicated;
- whether writes are allowed;
- how queued writes resolve;
- how conflicts resolve;
- what happens after reconnect.

---

## Accessibility Standard

Travelers may use RT2RP while walking, preparing to drive, carrying luggage, in bright sunlight, under stress, or with physical/visual limitations.

Required baseline:

- semantic controls;
- keyboard access on web;
- adequate touch targets;
- visible focus;
- screen-reader labels;
- sufficient contrast;
- no color-only status communication;
- reduced-motion respect;
- readable text sizing;
- predictable navigation.

Accessibility regressions in critical flows block release.

---

## Performance Standard

Performance is a trust feature.

Prioritize:

- fast app start;
- fast Today/Timeline availability where those surfaces are exposed;
- avoidance of redundant provider calls;
- stable query keys;
- bounded rerenders;
- route-level code splitting where useful;
- appropriate prefetching of imminent trip data;
- sensible payload sizes;
- graceful degradation on slow networks.

A visually polished screen that takes too long to become useful is not complete.

---

## Observability Standard

Production failures must be discoverable.

Critical flows should emit enough structured telemetry to answer:

- what operation failed;
- which domain entity was involved;
- which provider/service was involved;
- whether retry occurred;
- whether the user recovered;
- whether persisted state may be incomplete;
- whether the failure is systemic or isolated.

Never log secrets or unnecessary PII.

Observability must be sufficient to support the release evidence required by the subsystem's risk level.

---

## Testing Pyramid

Use the narrowest reliable test for each risk.

### Unit
Domain calculations, ordering, normalization, validation, time rules, cost rules, provider adapters.

### Integration
Database behavior, RLS, edge functions, multi-record mutations, provider normalization, cache invalidation.

### Component
Critical interactive states and accessibility.

### End-to-End
User promises and cross-module workflows.

High-risk user promises require end-to-end or equivalent controlled validation evidence.

---

## Regression Standard

Every defect that could cause a traveler to receive wrong information, lose data, become stuck, or misunderstand trip state should receive a regression test before closure whenever technically practical.

If a regression test is not practical, the closure record must state why and what alternative evidence protects the behavior.

---

## Completion Gate

No implementation task is complete until:

- the intended user outcome works;
- relevant tests pass;
- existing behavior has been regression-checked;
- types/lint/build pass;
- error states are deliberate;
- security boundaries are validated;
- production/configuration dependencies required for the promise are verified;
- documentation/spec is updated if contracts changed;
- no unintended duplicate source of truth was introduced;
- release evidence and public-exposure decision are recorded for new or changed user-facing capability.

---

## Refactor Rule

Refactoring must preserve product behavior unless the task explicitly changes behavior.

Large refactors should be decomposed so each step remains understandable and testable.

Avoid broad rewrites that mix architecture changes, UI redesign, schema changes, and new features in one unreviewable change.

---

## No Orphan Features

A feature must have:

- a product owner in the experience hierarchy;
- a data owner;
- a code owner/module boundary;
- a test strategy;
- an operational/failure contract;
- release evidence appropriate to its risk.

If none can be identified, the feature is architectural debt and must be consolidated, hidden, or removed.

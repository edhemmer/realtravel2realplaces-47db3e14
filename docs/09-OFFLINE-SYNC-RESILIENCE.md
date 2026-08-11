# RT2RP — Offline, Sync, and Resilience

## Purpose

Travel frequently happens with weak signal, captive portals, roaming limits, dead zones, tunnels, airports, stations, and temporary backend/provider outages.

RT2RP must remain understandable and recoverable under degraded conditions.

This document defines what "reliable" means when connectivity is imperfect.

---

## Hard Rule

Do not claim offline capability for a user outcome unless the actual trip data required for that outcome is available offline and the behavior has been tested.

Caching the JavaScript application shell does not, by itself, make RT2RP an offline travel app.

---

## Resilience Goals

The product should:

- preserve already-saved trip information during temporary connectivity loss;
- make it obvious when a live refresh cannot occur;
- avoid losing user input after transient failure;
- recover automatically when safe;
- avoid duplicate writes after retry/reconnect;
- reconcile stale local state with authoritative server state;
- protect sensitive cached data appropriately.

---

## Data Classes

Every domain should classify data by offline importance.

### CRITICAL REFERENCE
Information the traveler may reasonably need without signal.

Potential examples, if implemented securely:

- itinerary/timeline essentials;
- lodging address and confirmation;
- booked movement details;
- traveler-visible reservation references;
- important notes.

### USEFUL REFERENCE
Helpful but not essential context.

### LIVE-DEPENDENT
Information that is inherently provider-current and must not be treated as current while offline.

Examples:

- live flight status;
- live traffic route duration;
- current weather observation;
- real-time platform/gate changes.

### WRITE-CANDIDATE
User actions that may be queued offline only if conflict and idempotency behavior are fully designed.

---

## Offline Read Contract

For each offline-readable dataset define:

- what is persisted;
- maximum retention;
- last-sync timestamp;
- schema/version handling;
- access/security model;
- stale display behavior;
- logout/account-change clearing behavior.

Offline data must never leak between users on shared devices.

---

## Offline Write Contract

Offline writes are optional and high risk.

Do not implement generic offline mutation queues without domain-specific conflict rules.

For every queued mutation define:

- stable client mutation ID;
- idempotent server behavior;
- order dependency;
- conflict policy;
- user-visible pending state;
- retry limit;
- terminal failure behavior;
- cancellation/edit behavior;
- reconciliation after success.

If these are not defined, the action should require connectivity rather than pretend to save.

---

## Connectivity State

The app should not rely solely on browser `navigator.onLine` as proof that services are reachable.

Operational connectivity may include:

- device network available;
- backend reachable;
- auth session valid;
- provider reachable;
- specific request successful.

User-facing messaging should reflect the relevant failure, not an oversimplified global online/offline flag.

---

## Cached Live Data

Cached provider data must retain:

- observation timestamp;
- freshness/expiry;
- provider/source;
- entity identity.

When offline or refresh fails, cached live data may remain visible only if the UI does not imply it is current beyond its trustworthy window.

---

## Reconnect Behavior

On reconnect:

1. restore backend reachability;
2. validate auth/session;
3. reconcile critical trip queries;
4. process supported queued writes in safe order;
5. resolve conflicts;
6. refresh provider data only according to normal cost/freshness rules;
7. update UI states without requiring full app restart.

---

## Realtime Recovery

Realtime subscriptions are an optimization, not the sole synchronization mechanism.

If realtime disconnects:

- local UI remains usable from known state;
- reconnect re-subscribes;
- authoritative queries refetch;
- missed events do not permanently desynchronize the trip.

---

## Session Resilience

Auth/session behavior must not trap users in redirect loops or destroy locally useful trip state prematurely.

Expired sessions should:

- clearly require reauthentication;
- preserve safe navigation intent where practical;
- avoid repeated route bouncing;
- not submit protected mutations under an invalid session.

---

## App Update Resilience

PWA/service-worker updates and native app updates must not corrupt in-progress trip data.

Rules:

- version persisted client caches;
- tolerate old cached shapes during staged deployment where practical;
- avoid forced reload during a critical save;
- ensure migration incompatibilities fail safely;
- test update behavior with an active trip.

---

## Partial Failure Standard

A page may combine several data domains.

One failed secondary provider should not blank the entire trip screen if canonical trip records are still available.

Design bounded failure regions.

Example:

- saved flight details render;
- live status panel fails separately;
- expense list remains usable;
- Today communicates only what is still trustworthy.

---

## Retry Policy

Retries must be deliberate.

Do retry:

- transient network failures;
- selected idempotent reads;
- safe server operations with idempotency.

Do not blindly retry:

- authorization errors;
- validation errors;
- destructive non-idempotent writes;
- expensive provider calls without bounds;
- deterministic 4xx failures.

Use exponential backoff/jitter where appropriate.

---

## Local Storage / Persistence Security

Sensitive trip data persisted on-device requires deliberate review.

Consider:

- web localStorage exposure;
- IndexedDB exposure;
- native secure storage availability;
- device sharing;
- logout clearing;
- account switching;
- PII sensitivity;
- receipt/document caching.

Do not persist sensitive fields merely for convenience.

---

## Disaster / Backend Failure

For production-critical systems maintain:

- database backup strategy;
- migration discipline;
- ability to identify failed deploys;
- rollback path;
- provider secret rotation process;
- incident logging;
- status/support communication plan.

The product should fail conservatively rather than fabricate continuity.

---

## Resilience Testing

Test critical flows under:

- airplane mode;
- slow network;
- backend 500;
- provider timeout;
- provider rate limit;
- expired auth session;
- app background/foreground;
- page refresh;
- PWA update;
- duplicate mutation submission;
- interrupted save;
- realtime disconnect/reconnect;
- stale cache.

---

## Acceptance Gate

A capability may be described as resilient/offline-capable only when:

1. required data is actually available;
2. stale/live semantics remain truthful;
3. user input cannot silently disappear;
4. retry cannot duplicate material records;
5. reconnect reconciles authoritative state;
6. sensitive data handling is approved;
7. degraded behavior is tested;
8. recovery does not require developer intervention.

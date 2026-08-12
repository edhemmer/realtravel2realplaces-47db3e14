# RT2RP — Offline, Sync, and Resilience

## Purpose

Travel frequently happens with weak signal, captive portals, roaming limits, dead zones, tunnels, airports, stations, and temporary backend/provider outages.

RT2RP must remain understandable, truthful, and recoverable under degraded conditions.

This document defines resilience standards and target behavior. It is not a claim that every domain is currently available offline.

---

## Hard Rule

Do not claim offline capability for a user outcome unless the actual trip data required for that outcome is intentionally available offline, access remains appropriately protected, freshness is understandable, and the behavior has been tested end-to-end.

Caching the JavaScript application shell does not, by itself, make RT2RP an offline travel app.

Offline capability is about traveler continuity, not framework configuration.

---

## Competitive Reality

Strong travel products increasingly make essential itinerary information available with poor or no connectivity.

For RT2RP, offline continuity should be treated as a serious market-quality target for critical trip reference data where it can be implemented securely and reliably.

This does not mean every feature must work offline.

The correct standard is:

**the traveler should retain access to the confirmed information they may reasonably need to continue the trip, while live-dependent information remains clearly non-live.**

---

## Resilience Goals

For supported behavior, the product should:

- preserve intentionally cached critical trip information during temporary connectivity loss;
- make it obvious when a live refresh cannot occur;
- avoid losing user input after transient failure;
- recover automatically when safe;
- avoid duplicate writes after retry/reconnect;
- reconcile stale local state with authoritative server state;
- protect sensitive cached data appropriately;
- preserve enough context that the traveler does not feel abandoned by the app when connectivity degrades.

---

# Offline Data Model

## Data Classes

Every domain considered for offline behavior must classify data by offline importance.

### CRITICAL REFERENCE
Information the traveler may reasonably need to continue the trip without signal.

Potential examples, only if implemented securely:

- itinerary/timeline essentials;
- upcoming movement details;
- lodging address and confirmation;
- train/flight identifiers and scheduled local times;
- rental/parking reference information;
- traveler-visible reservation references;
- important notes;
- intentionally stored documents/QR references where secure and supported.

### USEFUL REFERENCE
Helpful context that improves convenience but is not required to continue the trip.

### LIVE-DEPENDENT
Information inherently dependent on current provider state and therefore not valid as live while offline.

Examples:

- live flight status;
- current gate/platform updates;
- live traffic route duration;
- current weather observation;
- real-time disruptions.

### WRITE-CANDIDATE
User actions that may be queued offline only if conflict and idempotency behavior are fully designed and tested.

### ONLINE-ONLY
Capabilities whose security, provider dependency, or conflict model requires connectivity.

Online-only behavior must fail clearly rather than pretending to save or update.

---

## Critical Trip Packet

If RT2RP implements offline critical reference, the preferred conceptual model is a deliberate **Critical Trip Packet**, not accidental cache residue.

The packet should contain only approved information needed for supported offline reference.

It should define:

- included domain fields;
- trip/version identifier;
- last successful sync;
- schema version;
- expiration/retention policy;
- user/account ownership;
- sensitive-data exclusions;
- device/platform persistence mechanism;
- invalidation conditions;
- cleanup on logout/account removal.

The packet may be implemented through multiple storage mechanisms; the requirement is deliberate ownership and versioning.

---

## Offline Read Contract

For each offline-readable dataset define:

- what is persisted;
- why it is needed offline;
- when/how it becomes available offline;
- maximum retention;
- last-sync timestamp;
- schema/version handling;
- access/security model;
- stale display behavior;
- logout/account-change clearing behavior;
- device/platform differences;
- storage quota/failure behavior.

Offline data must never leak between users on shared devices.

A feature is not offline-ready merely because a previous online session happened to leave data in browser storage.

---

## Offline Presentation Contract

When offline, the traveler must be able to distinguish:

- saved confirmed trip information;
- previously fetched provider information that is no longer current;
- actions requiring connectivity;
- locally pending actions if offline writes are supported.

The UI should not blanket the entire application with an alarming offline banner when only one capability is affected.

Use scoped, meaningful status.

Critical saved trip information should remain visually usable rather than being hidden behind a network error.

---

## Offline Write Contract

Offline writes are optional and high risk.

Do not implement a generic mutation queue simply because the framework allows one.

For every queued mutation define:

- stable client mutation ID;
- idempotent server behavior;
- order dependency;
- conflict policy;
- user-visible pending state;
- retry limit;
- terminal failure behavior;
- cancellation/edit behavior;
- reconciliation after success;
- account/session change behavior;
- whether dependent local projections update optimistically.

If these are not defined, the action should require connectivity rather than pretend to save.

---

# Connectivity and Sync

## Connectivity State

The app must not rely solely on browser `navigator.onLine` as proof that services are reachable.

Operational connectivity can differ by layer:

- device network available;
- DNS/network path available;
- backend reachable;
- auth session valid;
- provider reachable;
- notification provider reachable;
- specific request successful.

User-facing messaging should reflect the relevant failure rather than an oversimplified global online/offline flag.

---

## Sync State

For data that participates in intentional local persistence or queued writes, define sync state explicitly.

Possible internal states include:

- SYNCED;
- LOCAL_PENDING;
- SYNCING;
- CONFLICT;
- FAILED_RETRYABLE;
- FAILED_TERMINAL;
- STALE_REFERENCE.

Do not expose engineering terminology directly unless useful.

The traveler should know when an important action has not reached the server.

---

## Cached Live Data

Cached provider data must retain:

- observation timestamp;
- freshness/expiry;
- provider/source;
- entity identity.

When offline or refresh fails, cached provider data may remain visible only if the UI does not imply it is current beyond its trustworthy window.

If freshness is no longer trustworthy, the UI must narrow or remove the operational claim rather than simply retaining the last value.

A stale gate, platform, traffic estimate, or weather observation must not look live.

---

## Reconnect Behavior

On reconnect, as applicable:

1. establish backend reachability;
2. validate auth/session;
3. reconcile critical canonical trip queries;
4. process supported queued writes in dependency-safe order;
5. resolve conflicts;
6. refresh provider data according to normal freshness/cost rules;
7. update local packet/cache versions;
8. restore realtime subscriptions;
9. update UI states without requiring a full restart where practical.

Reconnect logic must not assume local state wins.

It must not replay an outdated mutation blindly against newer canonical state.

---

## Conflict Resolution

Every offline-write domain must define conflict semantics before release.

Potential strategies include:

- server authoritative;
- client authoritative for explicitly owned draft fields;
- field-level merge;
- version check with user review;
- reject and require re-entry.

Do not use last-write-wins as a silent default for critical trip facts unless the domain explicitly proves it safe.

---

## Realtime Recovery

Realtime subscriptions are an optimization, not the sole synchronization mechanism.

If realtime disconnects:

- local UI may remain usable from known state;
- reconnect re-subscribes;
- authoritative queries refetch;
- missed events do not permanently desynchronize the trip;
- permission changes are revalidated.

---

# Session and App Lifecycle

## Session Resilience

Auth/session behavior must not trap users in redirect loops or destroy intentionally persisted safe trip state prematurely.

Expired sessions should:

- clearly require reauthentication;
- preserve safe navigation intent where practical;
- avoid repeated route bouncing;
- not submit protected mutations under an invalid session;
- continue to enforce access controls for locally persisted sensitive data;
- avoid exposing another account's cached trip packet after account switching.

---

## Background / Foreground

Mobile app lifecycle transitions must preserve coherent state.

On foreground, as applicable:

- detect materially stale canonical queries;
- revalidate auth;
- refresh time-sensitive provider observations according to contract;
- process safe reconnect work;
- avoid resetting the user's current trip context unnecessarily.

On background, do not assume the app remains able to execute arbitrary JavaScript or network work.

Background promises require actual native/platform-supported mechanisms.

---

## App Update Resilience

PWA/service-worker updates and native app updates must not corrupt in-progress trip data.

Rules:

- version persisted client data;
- tolerate old cached shapes during staged deployment where practical;
- avoid forced reload during critical save;
- ensure migration incompatibilities fail safely;
- test update behavior with active trips when persisted trip data is involved;
- clear or migrate incompatible cache intentionally rather than crashing on deserialize.

---

# Failure Isolation

## Partial Failure Standard

A page may combine several domains.

One failed secondary provider must not blank the entire trip screen if canonical trip records are still available.

Design bounded failure regions.

Example semantics, only when true:

- saved flight details remain visible;
- live status panel fails separately;
- expense records remain usable;
- Today communicates only what remains trustworthy.

A failure in Places should not make Timeline unusable.

A flight provider outage should not hide the saved lodging address.

---

## Retry Policy

Retries must be deliberate.

Retry when appropriate:

- transient network failures;
- selected idempotent reads;
- safe server operations protected by idempotency.

Do not blindly retry:

- authorization errors;
- validation errors;
- destructive non-idempotent writes;
- expensive provider calls without bounds;
- deterministic 4xx failures;
- conflicts requiring human decision.

Use exponential backoff/jitter where appropriate.

Bound retries so failure remains observable.

---

# Local Persistence Security

Sensitive trip data persisted on-device requires deliberate review.

Consider:

- web localStorage exposure;
- IndexedDB exposure;
- native secure storage availability;
- device sharing;
- logout clearing;
- account switching;
- PII sensitivity;
- receipt/document caching;
- platform backup/sync behavior;
- encryption at rest where practical/appropriate;
- token/session separation from trip cache.

Do not persist sensitive fields merely for convenience.

Local persistence mechanisms must be selected based on sensitivity and threat model, not only developer convenience.

---

# Production Resilience

## Backup / Restore

For production-critical durable data maintain:

- backup strategy;
- retention policy;
- restore verification strategy;
- migration discipline;
- failed-deploy identification;
- rollback path;
- incident logging;
- recovery ownership.

A backup never tested for restore is incomplete assurance.

---

## Provider / Secret Recovery

Maintain documented process for:

- provider outage;
- provider credential rotation;
- revoked key;
- quota exhaustion;
- unexpected cost spike;
- provider migration.

A provider failure should degrade the affected capability, not corrupt canonical trip truth.

---

## Incident Communication

For material production incidents define how the product communicates impact without speculation.

The user needs to know:

- what is affected;
- what remains available;
- whether their saved data is safe;
- whether they need to take action.

Do not display engineering details or unverified recovery estimates.

---

# Resilience Testing

Test critical supported flows under relevant conditions such as:

- airplane mode;
- weak/slow network;
- captive-portal-like connectivity;
- backend 500;
- provider timeout;
- provider rate limit;
- expired auth session;
- app background/foreground;
- page refresh;
- PWA update;
- native app update where practical;
- duplicate mutation submission;
- interrupted save;
- realtime disconnect/reconnect;
- stale cache;
- account switching;
- storage quota failure;
- schema/version mismatch.

Each subsystem spec must identify which degraded scenarios are release-relevant.

---

# Competitive Continuity Gate

Where RT2RP chooses to expose offline trip reference, it should be compared against modern itinerary/travel apps that provide offline access to essential trip details.

The goal is not maximum offline functionality.

The goal is that losing connectivity does not make RT2RP materially less useful than a reasonable traveler expects from a serious travel-management app for the supported workflow.

If RT2RP cannot provide credible offline continuity for a domain, narrow the claim instead of marketing the application broadly as offline capable.

---

# Acceptance Gate

A capability may be described as resilient/offline-capable only when:

1. required data is intentionally and actually available offline;
2. access/security behavior is validated;
3. storage/version lifecycle is defined;
4. stale/live semantics remain truthful;
5. user input cannot silently disappear for supported offline/queued actions;
6. retry cannot duplicate material records;
7. conflict behavior is defined;
8. reconnect reconciles authoritative state;
9. degraded behavior is tested;
10. app/session/update behavior does not corrupt the capability;
11. account switching cannot leak cached trip data;
12. expected recovery does not require developer intervention;
13. public wording matches exact offline/resilience scope;
14. competitive continuity is acceptable for the defined user outcome.

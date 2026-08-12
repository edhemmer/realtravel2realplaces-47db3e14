# RT2RP — Live Data and Provider Contract

## Purpose

Live travel data can create enormous value and enormous trust risk.

RT2RP must never confuse saved trip facts, cached provider observations, deterministic estimates, and genuinely current provider-backed data.

This document defines target provider and real-time behavior. It is not proof that a capability is currently public or validated.

---

## Hard Rule

If RT2RP presents information as `live`, `real-time`, `monitored`, `automatically updated`, or `alert when changed`, the complete operational chain must exist and be validated.

At minimum that means:

```text
canonical entity
 -> provider identity match
 -> provider retrieval
 -> response validation
 -> normalization
 -> freshness classification
 -> observation persistence/cache
 -> material-change comparison
 -> canonical operational state
 -> UI and/or notification delivery
 -> retry/recovery
 -> observability
```

If the chain is incomplete or unverified, the product does not make the claim.

Real-time is a product contract, not a label.

---

## Provider Architecture

External data is accessed through controlled adapters/server boundaries when secrets or privileged requests are involved.

Provider payloads do not define RT2RP's internal model and must not leak into page/component contracts.

Foreground and background retrieval should use the same normalized semantics where practical.

Every provider capability must define:

- capability served;
- provider/vendor;
- endpoint(s);
- authentication;
- production configuration;
- entity matching;
- normalized fields;
- source authority;
- expected latency;
- timeout;
- retries;
- rate limits;
- cache/freshness policy;
- background cadence where applicable;
- material-change rules;
- cost model;
- failure behavior;
- fallback/no-fallback;
- privacy/retention;
- observability;
- allowed public wording after validation.

---

## Truth States

Provider-backed state must distinguish, at least internally:

### FRESH
A valid observation is inside the capability's freshness window.

### RECENT / CACHED
A prior observation remains useful but was not freshly retrieved for the present request.

### STALE
The observation is older than the trustworthy operational window.

### NEEDS INPUT
Required identity/location data is missing.

### PROVIDER UNAVAILABLE
A trustworthy current result cannot be obtained.

### UNKNOWN / UNRESOLVED
Available evidence is insufficient to safely determine the state.

### UNSUPPORTED
RT2RP does not support the capability.

The UI exposes only distinctions meaningful to the traveler, using wording and graphics that match the real semantics.

---

## Freshness Policy

Freshness is domain-specific.

Do not use one global TTL for all travel data.

Every live capability defines:

- pre-trip refresh window;
- active-trip refresh window;
- event-proximity acceleration if justified;
- normal refresh cadence;
- cache TTL;
- stale threshold;
- hard-expiry threshold;
- manual refresh behavior if offered;
- post-event behavior;
- quota/cost implications.

A gate assignment, live traffic duration, place rating, and destination photo do not have the same freshness requirement.

Freshness thresholds should exist in code/configuration and tests, not only prose.

---

## Source Authority

Provider observations augment operational state; they do not indiscriminately overwrite saved or user-corrected truth.

For every provider-backed field or semantic dimension define:

- what the canonical saved fact means;
- what the provider observation means;
- which source is authoritative for the current decision;
- how conflicts are handled;
- whether a user correction may be overwritten;
- whether history is retained.

Authority is field/domain-specific.

A flight-status provider may be authoritative for current delay/gate state while the confirmed reservation remains authoritative for booking reference and traveler assignment.

---

## Entity Matching

A fresh observation attached to the wrong entity is worse than no observation.

Each live domain defines stable matching rules using appropriate identifiers such as:

- provider record ID;
- operating carrier + service number + date;
- origin/destination;
- normalized place/provider ID;
- route origin/destination coordinates and route identity.

Ambiguous matches resolve to unknown/unavailable, not plausible-but-wrong state.

---

## No False Fallbacks

Fallbacks must keep their real semantics.

Examples:

- scheduled flight time is not live flight status;
- deterministic route duration is not traffic-aware current routing;
- seasonal climate is not current weather;
- saved terminal is not a current gate;
- cached data outside the freshness window is not live.

Fallback state must not visually mimic a successful fresh provider result.

---

# Domain Contracts

## Flights

If live flight status is offered, validate at minimum:

- operating/marketing carrier semantics;
- codeshares;
- service date;
- segment identity;
- scheduled/estimated/actual times;
- delay/cancellation/diversion state;
- terminal/gate where available;
- baggage claim only if supported;
- observation time;
- refresh cadence;
- provider outage behavior.

Do not expose specialist-style prediction, inbound-aircraft intelligence, connection assistance, or similar claims unless the exact data and end-to-end behavior exist.

RT2RP does not need every aviation-specialist feature. The flight information it does expose must be timely, clear, and integrated correctly with the rest of the trip.

---

## Routes / Driving

If provider-backed routing is offered, define:

- origin/destination identity;
- coordinate quality;
- route mode;
- distance;
- duration;
- traffic inclusion/exclusion;
- avoidance/toll/ferry semantics where supported;
- route identity/cache key;
- freshness;
- deterministic fallback semantics;
- navigation handoff.

Material origin/destination changes invalidate old route results.

If traffic is absent, do not imply a traffic-aware arrival time.

---

## Rail / Transit

If live rail/transit data is offered, distinguish:

- saved/booked schedule;
- current provider schedule;
- live service status;
- platform/track;
- cancellation/disruption;
- transfers/connections.

If only saved reservation or static routing data exists, do not imply live monitoring.

---

## Places

Place provider contracts define:

- query location/bounds;
- provider identity;
- category mapping;
- rating/review meaning;
- photo source/attribution;
- pagination;
- cache/freshness;
- open/closed status only if reliable;
- permanent closure handling where available.

Never invent counts, ratings, images, hours, or availability.

---

## Weather

If weather is public, define:

- provider;
- forecast location;
- timezone;
- forecast issue time;
- forecast horizon;
- severe-alert source if offered;
- route-weather methodology if offered;
- cache/freshness;
- failure behavior.

Destination weather is not route-weather intelligence.

A forecast is not a severe-weather monitoring system unless the alert chain exists.

---

# Change Detection and Monitoring

## Material Change

A provider field changing does not automatically deserve a user alert.

Change detection requires:

- stable entity identity;
- previous normalized observation;
- new normalized observation;
- semantic comparison;
- materiality rules;
- deduplication key;
- suppression/cooldown rules where appropriate;
- user relevance;
- telemetry.

Materiality reflects traveler impact, not mere data inequality.

---

## Background Monitoring

Any background-monitoring promise requires validated:

- scheduler/trigger;
- eligibility window;
- cadence;
- provider quota/cost control;
- locking/concurrency;
- retries;
- missed-run recovery;
- state comparison;
- deduplication;
- persistence;
- notification intent;
- delivery path;
- device/token lifecycle;
- permission behavior;
- deep link destination;
- client reconciliation;
- observability.

Refresh-on-open is not monitoring.

---

## Notification Delivery

A notification is not complete when a row is written.

The delivery chain is:

```text
qualifying condition
 -> validated notification intent
 -> delivery provider
 -> delivery attempt/state
 -> device/user receipt where observable
 -> deep link / destination
 -> client reconciliation
 -> retry / terminal failure
```

If notifications are disabled or a token is invalid, RT2RP must not imply push delivery remains active.

Important state should remain visible in-app where appropriate.

---

# Real-Time Experience

Foreground refresh should preserve orientation.

Prefer:

- saved/canonical content remains visible;
- live regions refresh independently;
- only materially changed fields receive emphasis;
- stale/unavailable state is explicit;
- scroll/input state remains stable;
- no full-screen reset for a secondary provider refresh.

When a material change occurs, communicate:

1. what changed;
2. old vs new when useful;
3. when it was observed;
4. what action is needed, if any.

Do not make the traveler manually compare screens.

---

# Service Objectives

Every public high-consequence live capability should define measurable operational objectives appropriate to provider constraints and traveler risk.

Possible measurements include:

- successful refresh rate;
- response latency;
- stale-result rate;
- time from material provider change to RT2RP observation;
- time from observation to user-visible update/notification where promised;
- duplicate-alert rate;
- background-run success rate;
- provider error/rate-limit rate.

Do not invent one universal target for every provider.

Set targets from real provider behavior, current market expectations, and consequence of delay/error.

A capability that cannot consistently meet its required objective must degrade honestly, narrow its promise, or remain hidden.

---

# Cost and Reliability Controls

Use centrally managed:

- cache TTLs based on actual freshness need;
- deduplication;
- trip/event proximity;
- background eligibility;
- server-side rate limiting;
- request budgets;
- bounded retries/backoff;
- quota monitoring;
- usage/cost telemetry;
- circuit-breaker behavior where useful.

Never reduce cost by presenting stale information as current.

Never over-poll low-value data merely to market the word `real-time`.

---

# Observability

Operational provider capabilities should capture, as applicable:

- request count;
- success/failure class;
- latency;
- timeout/rate-limit;
- cache hit/miss;
- fallback/stale use;
- non-sensitive matched entity identifier;
- material changes detected;
- notifications intended/sent;
- background-job success/failure;
- cost/usage indicators.

Do not log secrets, confirmation numbers, or unnecessary PII.

---

# Provider Replacement

Provider adapters must make replacement feasible without rewriting unrelated UI/domain logic.

Provider replacement should not require redesigning:

- Today;
- Timeline;
- Travel;
- Records;
- reports;
- AI context;
- notification logic.

Provider-specific enhancements may exist behind capability interfaces when they create value without contaminating canonical models.

---

# Competitive Quality Gate

Before exposing a provider-backed capability, compare the user outcome with the strongest relevant market benchmark.

Do not copy every specialist feature.

Ask:

1. Is RT2RP materially slower, less clear, or less trustworthy for the core task?
2. Does any reduced specialist depth create compensating cross-trip integration value?
3. Are source and freshness semantics clearer than a generic dashboard?
4. Does the capability strengthen the complete trip enough to justify exposing it?

A weak live feature damages the whole product more than a clearly scoped saved-data experience.

---

# Production Validation Gate

Before provider-backed behavior is public:

1. Production configuration is verified.
2. Representative real provider calls succeed.
3. Entity matching is correct, including ambiguous cases.
4. Missing/invalid input is handled.
5. Timeout/rate-limit/malformed responses are handled.
6. Cache and invalidation behavior are verified.
7. Fresh/recent/stale/hard-expiry behavior is verified.
8. Source authority/conflicts are verified.
9. Fallback semantics remain truthful.
10. User wording and graphics match reality.
11. Cost controls exist.
12. Observability exists.
13. Failure/recovery is validated.
14. Background/delivery behavior is proven where monitoring/alerts are claimed.
15. Missed-run recovery is proven where background execution matters.
16. Defined service objectives are met with acceptable evidence.
17. Competitive quality is defensible for the user outcome.

If any critical item is unknown, keep the capability internal or narrow the public promise.

# RT2RP — Live Data and Provider Contract

## Purpose

Live travel data can create enormous value and enormous trust risk.

RT2RP must never confuse saved trip facts, cached provider observations, estimated values, and genuinely current provider-backed data.

This document defines provider standards and target behavior. It is not proof that any provider capability is currently public or validated.

---

## Hard Rule

If RT2RP presents information as current, live, monitored, automatically updated, or real-time, the product must have a defined provider, source authority, freshness window, update path, failure path, production configuration, observability, and validation strategy.

If those do not exist and are not verified, the product does not make the claim.

Real-time is a product contract, not a visual label.

---

## Real-Time Product Standard

For every real-time capability, RT2RP must be able to answer:

1. What exactly is being monitored or refreshed?
2. What provider or authoritative source produces the information?
3. How is the RT2RP entity matched to the provider entity?
4. How often is the information eligible to refresh?
5. What makes an observation fresh, recent, stale, or unusable?
6. What happens if the provider is slow or unavailable?
7. What change is considered material?
8. How are duplicate/noisy changes suppressed?
9. How does the user learn about the change?
10. How is missed background work recovered?
11. What production evidence proves the chain works?

If these questions do not have precise answers, the capability is not release-ready as real-time.

---

## Provider Architecture

All providers are accessed through server-side adapters where secrets or privileged requests are involved.

```text
RT2RP domain request / scheduled refresh
 -> provider adapter
 -> provider request
 -> provider response validation
 -> entity reconciliation
 -> normalization
 -> source/freshness metadata
 -> observation persistence/cache
 -> material change evaluation
 -> canonical operational state
 -> UI / alert / notification
```

Provider response shapes do not leak into UI components.

The same provider adapter should serve foreground and background paths where practical so semantics do not drift.

---

## Provider Contract

Every provider integration must document:

- capability served;
- provider/vendor;
- endpoint(s);
- authentication;
- production configuration dependency;
- quota/rate limits;
- expected latency;
- timeout;
- retry rules;
- caching;
- freshness window;
- normalized fields;
- source authority/precedence;
- fields that are optional/unreliable;
- entity matching/identity rules;
- change-detection rules;
- cost model;
- failure behavior;
- observability;
- data-retention/privacy considerations;
- fallback or no-fallback behavior;
- background scheduling requirements where applicable;
- public wording allowed after validation.

---

## Truth States

Internally, provider-backed information should distinguish states at least conceptually.

### LIVE / FRESH
Observation is within the defined freshness window and came from the intended current-data path.

### CACHED / RECENT
A previously successful observation remains useful but was not freshly retrieved for the present request.

### STALE
Observation exists but exceeds the trustworthy freshness window.

### NEEDS INPUT
Required identifiers or locations are missing.

### PROVIDER UNAVAILABLE
The provider request cannot currently produce a trustworthy result.

### UNSUPPORTED
RT2RP does not support the requested capability.

### UNKNOWN / UNRESOLVED
The system cannot safely determine the requested state from available evidence.

The UI should expose only distinctions meaningful to the traveler and only with wording matching actual semantics.

---

## Freshness Policy

Freshness is capability-specific.

Do not create one global "live" TTL for all provider data.

A freshness contract should define:

- active-trip window;
- pre-trip window;
- post-event window;
- normal refresh cadence;
- accelerated cadence near time-critical events where justified;
- cache TTL;
- stale threshold;
- hard-expiry threshold;
- manual refresh behavior if offered;
- provider quota/cost implications.

Example principle:

A place rating can tolerate a different freshness window than a departure gate or live traffic estimate.

Freshness thresholds belong in code/configuration and tests, not only prose.

---

## Service-Level Objectives

For any public operational live-data capability, the subsystem spec should define measurable service objectives appropriate to the provider and user risk.

Potential dimensions include:

- successful refresh rate;
- provider response latency;
- time from material provider change to RT2RP observation;
- time from material change to user-visible update/notification where promised;
- stale-data rate;
- duplicate-alert rate;
- provider error rate;
- background-job success rate.

Do not invent arbitrary universal numbers.

Each capability must set evidence-based targets against provider constraints and competitive expectations.

A capability that repeatedly misses its operational objective should be narrowed, degraded honestly, or hidden until corrected.

---

## No False Fallbacks

A deterministic estimate may be useful, but it must never be presented as provider-backed reality.

Examples:

- route estimate is not traffic-aware live route time;
- scheduled flight time is not live flight status;
- seasonal climate is not current weather;
- saved airport terminal is not a current gate assignment.

If an estimate is used, product copy and graphics must match the actual semantics.

Fallbacks must not overwrite or disguise failure of a higher-authority source.

A fallback must have its own explicit source/state.

---

## Source Authority

Provider observations normally augment operational state rather than rewrite booked/user truth indiscriminately.

For each provider-backed field or semantic dimension, define:

- what saved/canonical fact represents;
- what provider observation represents;
- which source is authoritative for the displayed decision;
- how conflicts are handled;
- whether a manual correction can be overwritten;
- whether historical observations are retained;
- how source transitions are audited.

A provider's authority in one dimension does not make it authoritative for every field on the entity.

Example:

A flight-status provider may be authoritative for current gate/delay state while the user's confirmed reservation remains authoritative for booking reference and traveler assignment.

---

## Entity Matching and Reconciliation

Incorrect provider matching is a high-risk failure.

Every live domain must define stable identity rules.

Examples may use combinations of:

- operating carrier;
- flight/service number;
- service date;
- origin/destination;
- provider record ID;
- route coordinates;
- place provider ID.

Do not silently apply an observation when identity confidence is insufficient.

Ambiguous provider matches should resolve to unknown/unavailable rather than plausible-but-wrong state.

---

## Flight Status

If flight status is offered, define and validate:

- carrier/service identity;
- operating vs marketing carrier semantics;
- codeshare behavior;
- service date;
- segment identity;
- scheduled times;
- estimated/actual times;
- delay/cancellation/diversion status;
- terminal/gate when available;
- baggage claim if offered;
- observation timestamp;
- refresh cadence;
- provider outage behavior;
- late inbound aircraft or predictive behavior only if truly supported.

Do not claim proactive monitoring or alerts until background refresh, material change detection, delivery, and recovery are proven end-to-end in production.

Flight specialists such as Flighty and TripIt Pro establish a high quality bar for live flight execution. RT2RP does not need to reproduce every aviation-specialist feature, but every flight status it exposes must be timely, understandable, and trustworthy. citeturn297138search3turn638315search0

---

## Routes / Driving

If provider-backed routing is offered, define:

- origin/destination resolution;
- coordinate quality;
- route mode;
- distance;
- duration;
- traffic inclusion/exclusion;
- toll/ferry/avoidance settings if supported;
- observation timestamp;
- cache policy;
- route identity/hash;
- deterministic fallback semantics;
- navigation handoff.

A route result must not silently survive material origin/destination edits unless the cache key/invalidation contract proves it still applies.

If traffic is not included, the UI must not imply traffic-aware arrival time.

---

## Rail / Transit

If live rail/transit data is offered, distinguish:

- booked schedule;
- provider schedule;
- live service status;
- platform/track data;
- disruption information;
- service cancellation/substitution where supported;
- transfer/connection semantics.

If only static routing or saved reservation data is supported, do not imply live rail monitoring.

---

## Places

Place search/provider results should define:

- query location;
- radius/bounds;
- provider ID;
- category mapping;
- rating/review semantics;
- photo source;
- pagination;
- cache TTL;
- hours/open state only if trustworthy;
- closed/permanently closed handling where available;
- provider attribution requirements.

Do not invent counts, ratings, photos, opening state, or availability.

---

## Weather

Weather is operationally useful only when source and scope are clear.

If weather is exposed, document:

- provider;
- forecast location;
- timezone;
- forecast timestamp;
- horizon;
- severe-alert support if any;
- route-weather methodology if any;
- cache/freshness;
- provider failure behavior.

Do not imply route-specific weather intelligence if only destination forecast data exists.

Do not imply severe-weather alerts unless an actual alert source and delivery chain exist.

---

## Change Detection

Provider refresh does not automatically equal a user alert.

A change-detection service compares normalized observations and determines whether a material change occurred.

Requirements:

- stable entity identity;
- previous observation;
- new observation;
- semantic comparison;
- materiality rules;
- dedupe key;
- alert eligibility;
- suppression/cooldown rules where appropriate;
- audit/telemetry.

Noisy fields must not create alert spam.

Materiality should reflect traveler impact, not merely field inequality.

---

## Background Monitoring

Any promise using words such as:

- monitor;
- watch;
- alert when changed;
- automatically keep updated;
- real-time alerts;

requires a functioning background system, not merely refresh-on-open.

Before such a promise is released, validate:

- scheduler/trigger;
- eligibility window;
- refresh cadence;
- provider quotas;
- retries;
- concurrency/locking;
- state comparison;
- materiality/deduplication;
- persistence;
- delivery path;
- device/token registration;
- notification permission handling;
- observability;
- missed-run recovery;
- clock/timezone behavior;
- production test evidence.

Until then, do not mention monitoring.

---

## Notification Delivery Contract

A notification is not complete when a database row is created.

For every promised alert, define:

```text
qualifying condition
 -> background evaluation
 -> deduped notification intent
 -> delivery provider
 -> device/user delivery state
 -> deep link / destination
 -> client reconciliation
 -> retry / terminal failure
```

Measure actual delivery where platform/provider telemetry allows.

If a user disables notifications, the product should not imply push delivery remains active.

Critical information should remain available in-app where appropriate even when push delivery is unavailable.

---

## Foreground Refresh Experience

Foreground refresh must not destabilize the screen.

Prefer:

- retain saved/cached canonical state;
- refresh live panel independently;
- update only materially changed fields;
- display freshness when it matters;
- avoid full-screen resets;
- preserve scroll/input state.

Manual refresh controls should exist only if they provide meaningful value and provider cost/rate limits support them.

---

## Cost Governance

Provider spend must be controlled centrally.

Use:

- cache TTLs based on actual freshness needs;
- deduplication;
- proximity to travel date/time;
- trip activity state;
- provider quotas;
- server-side rate limiting;
- request budgets;
- usage metrics;
- circuit-breaker/backoff behavior where appropriate.

Never save money by presenting stale information as current.

Do not over-poll low-value data merely to claim real-time behavior.

---

## Provider Replacement

Adapters must make provider replacement feasible.

A provider should be replaceable without rewriting unrelated:

- Timeline;
- Today;
- Travel cards;
- domain models;
- notification logic;
- AI prompts;
- reports.

Normalize provider semantics at the boundary.

Provider-specific enhancements may exist behind capability interfaces when they create value without contaminating canonical models.

---

## Observability

Operational provider capabilities require structured production visibility.

At minimum, where appropriate, capture:

- request counts;
- success/failure;
- latency;
- timeout/rate-limit class;
- cache hit/miss;
- stale fallback use;
- matched entity identifier (non-sensitive); 
- material changes detected;
- notifications created/delivered;
- provider cost/usage indicators;
- background run success/failure.

Do not log secrets, confirmation numbers, or unnecessary PII.

---

## Competitive Quality Gate

A provider-backed capability should be compared with the relevant specialist or market benchmark before public release.

The objective is not feature-for-feature copying.

Ask:

1. Is RT2RP materially slower, less clear, or less trustworthy for the core user outcome?
2. If specialist depth is intentionally lower, does RT2RP create compensating cross-trip integration value?
3. Does the traveler understand the source/freshness better than in a generic dashboard?
4. Is the capability worth exposing, or would it reduce trust in the broader product?

A weak live capability is worse than a clearly scoped saved-data experience.

---

## Production Validation

Before a provider-backed capability is public:

1. Valid real provider calls succeed in intended production configuration.
2. Entity matching is correct for representative and ambiguous cases.
3. Invalid/missing input is handled.
4. Timeouts are handled.
5. Rate limits are handled.
6. Malformed/unexpected responses are handled.
7. Cache behavior is verified.
8. Fresh/recent/stale behavior is verified.
9. Source authority/conflict behavior is verified.
10. User-visible wording and graphics are accurate.
11. Cost controls exist.
12. Observability exists.
13. End-to-end tests and/or controlled production verification cover the promise.
14. Background/delivery behavior is proven if wording implies monitoring or alerts.
15. Missed-run/recovery behavior is proven where background execution matters.
16. Competitive quality is acceptable for the defined user outcome.

If the provider capability cannot meet this bar, keep it internal or narrow the public behavior.

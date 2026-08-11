# RT2RP — Live Data and Provider Contract

## Purpose

Live travel data can create enormous value and enormous trust risk.

RT2RP must never confuse saved trip facts, cached provider observations, estimated values, and genuinely live provider-backed data.

---

## Hard Rule

If RT2RP presents information as current/live, the product must have a defined provider, freshness window, update path, failure path, and validation strategy.

If those do not exist, the product does not claim live capability.

---

## Provider Architecture

All providers are accessed through server-side adapters where secrets or privileged requests are involved.

```text
RT2RP domain request
 -> provider adapter
 -> provider request
 -> provider response validation
 -> normalization
 -> freshness metadata
 -> canonical observation/result
```

Provider response shapes do not leak into UI components.

---

## Provider Contract

Every provider integration must document:

- capability served;
- provider/vendor;
- endpoint(s);
- authentication;
- quota/rate limits;
- expected latency;
- timeout;
- retry rules;
- caching;
- freshness window;
- normalized fields;
- fields that are optional/unreliable;
- change-detection rules;
- cost model;
- failure behavior;
- observability;
- data-retention/privacy considerations;
- fallback or no-fallback behavior.

---

## Truth States

Internally, provider-backed information should be capable of distinguishing states such as:

### LIVE / FRESH
Observation is within the defined freshness window.

### CACHED / RECENT
Previously successful observation is still useful but not freshly retrieved.

### STALE
Observation exists but exceeds the trustworthy freshness window.

### NEEDS INPUT
Required identifiers or locations are missing.

### PROVIDER UNAVAILABLE
The provider request cannot currently produce a trustworthy result.

### UNSUPPORTED
RT2RP does not support the requested capability.

The UI should expose only distinctions meaningful to the traveler.

---

## No False Fallbacks

A deterministic estimate may be useful, but it must never be presented as provider-backed reality.

Examples:

- route estimate is not traffic-aware live route time;
- scheduled flight time is not live flight status;
- seasonal climate is not current weather;
- saved airport terminal is not a current gate assignment.

If an estimate is used, product copy must match the actual semantics.

---

## Flight Status

If flight status is offered, define and validate:

- carrier/service identity;
- operating vs marketing carrier semantics;
- service date;
- segment identity;
- scheduled times;
- estimated/actual times;
- delay/cancellation status;
- terminal/gate when available;
- observation timestamp;
- refresh cadence;
- provider outage behavior.

Do not claim proactive monitoring/alerts until background refresh and delivery are proven end-to-end in production.

---

## Routes / Driving

If provider-backed routing is offered, define:

- origin/destination resolution;
- coordinate quality;
- route mode;
- distance;
- duration;
- traffic inclusion or exclusion;
- toll/ferry settings if supported;
- observation timestamp;
- cache policy;
- deterministic fallback semantics;
- navigation handoff.

A route result should not silently survive major origin/destination edits.

---

## Rail / Transit

If live rail/transit data is offered, distinguish:

- booked schedule;
- provider schedule;
- live service status;
- platform/track data;
- disruption information.

If only static routing is supported, do not imply live rail monitoring.

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
- closed/permanently closed handling where available;
- provider attribution requirements.

Do not invent counts, ratings, photos, or availability.

---

## Weather

Weather is operationally useful only when the source and scope are clear.

If weather is exposed, document:

- provider;
- forecast location;
- timezone;
- forecast timestamp;
- horizon;
- severe alert support if any;
- route-weather methodology if any;
- cache/freshness;
- provider failure behavior.

Do not imply route-specific weather intelligence if only destination forecast data exists.

---

## Change Detection

Provider refresh does not automatically equal a user alert.

A change-detection service should compare normalized observations and determine whether a material change occurred.

Requirements:

- stable entity identity;
- previous observation;
- new observation;
- materiality rules;
- dedupe key;
- alert eligibility;
- audit/telemetry.

Noisy fields must not create alert spam.

---

## Background Monitoring

Any promise using words such as:

- monitor;
- watch;
- alert when changed;
- automatically keep updated;

requires a functioning background system, not merely refresh-on-open.

Before such a promise is released, validate:

- scheduler/trigger;
- refresh cadence;
- provider quotas;
- retries;
- concurrency;
- device/token delivery;
- notification permissions;
- deduplication;
- observability;
- recovery from missed runs;
- production test evidence.

Until then, do not mention monitoring.

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
- usage metrics.

Never save money by presenting stale information as current.

---

## Provider Replacement

Adapters must make provider replacement feasible.

A provider should be replaceable without rewriting:

- Timeline;
- Today;
- Travel cards;
- domain models;
- notification logic;
- AI prompts.

Normalize provider semantics at the boundary.

---

## Production Validation

Before a provider-backed capability is public:

1. Valid real provider calls succeed.
2. Invalid/missing input is handled.
3. Timeouts are handled.
4. Rate limits are handled.
5. Malformed/unexpected responses are handled.
6. Cache behavior is verified.
7. Stale state is distinguishable.
8. User-visible wording is accurate.
9. Cost controls exist.
10. Observability exists.
11. End-to-end tests or production verification cover the promise.

If the provider capability cannot meet this bar, keep it internal.

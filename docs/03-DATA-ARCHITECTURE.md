# RT2RP — Data Architecture

## Purpose

RT2RP must behave as one connected trip, not a collection of screens and tables.

This document defines the data principles that prevent drift, duplication, contradictory state, and feature silos.

The database schema may evolve. These invariants should remain stable.

---

## Core Principle: One Fact, One Canonical Home

A material trip fact should have one authoritative representation.

Examples:

- a lodging checkout time;
- a flight number;
- a train departure location;
- a traveler;
- a receipt amount;
- a parking expiration time;
- a destination address.

Other surfaces may reference, derive, aggregate, cache, or display the fact.

They must not create competing truth.

---

## Canonical Hierarchy

Conceptually:

```text
User / Account
  └── Trip
      ├── Travelers / Members
      ├── Places
      ├── Reservations
      ├── Movements
      ├── Timeline Entries
      ├── Tasks / Required Actions
      ├── Alerts / Intelligence Findings
      ├── Expenses / Financial Records
      ├── Parking
      ├── Packing / Preparedness Records
      ├── Documents / Attachments
      ├── Notes
      └── Provider Observations / Freshness Metadata
```

Not every concept requires a dedicated table. The important requirement is canonical ownership and stable relationships.

---

## Trip Is the Aggregate Root

The trip is the primary operating boundary.

Most traveler-facing entities should have an explicit relationship to a trip.

Cross-trip features such as account settings or multi-trip reports must still derive from trip-owned records rather than creating disconnected copies.

A trip must remain understandable after one source record changes.

---

## Separate Facts from Projections

RT2RP should distinguish:

### FACTS
Persisted or provider-observed truth.

Examples:

- booked hotel checkout time;
- entered confirmation number;
- provider-reported flight status;
- recorded expense amount;
- traveler membership.

### DERIVED STATE
Deterministic calculations from facts.

Examples:

- next trip event;
- total spend;
- active lodging;
- preparation gaps;
- leave-by estimate;
- timeline ordering.

### INTELLIGENCE
Interpretations or recommendations produced from facts and derived state.

Examples:

- tight connection risk;
- suggested earlier departure;
- missing transportation after arrival;
- packing suggestion.

### PRESENTATION
Labels, grouping, display formatting, visual emphasis.

These layers must not be conflated.

UI presentation must never become the source of truth.

---

## Source Metadata

Material imported or provider-backed data should be able to retain source metadata where useful, such as:

- source type;
- source provider;
- source record identifier;
- imported/observed timestamp;
- last successful refresh;
- freshness/expiry;
- confidence when extracted by AI;
- manual override status;
- provenance notes for debugging.

Source metadata exists to support trust, recovery, reconciliation, and provider replacement.

It should not clutter normal user interfaces unless it affects user decisions.

---

## Manual Truth vs Provider Truth

The traveler must be able to correct important imported data.

Do not overwrite a deliberate manual correction with a lower-confidence automated refresh unless the domain explicitly requires provider authority.

Each domain should define precedence.

Typical precedence may be:

1. authoritative provider observation for genuinely live state;
2. verified user-entered booking truth;
3. accepted AI extraction;
4. unverified imported suggestion;
5. deterministic fallback estimate.

This order is not universal. Each entity specification must define it.

---

## Reservations vs Movements

A reservation is a commercial/logistical record.

A movement is travel from one place to another.

They often overlap but are not identical.

Examples:

- a flight booking usually creates one or more air movement segments;
- a rail booking may create one or more train movement segments;
- a car rental is a reservation but the drives taken in the vehicle are movements;
- a hotel is a reservation and a place stay, not a movement;
- rideshare may be represented as movement and/or expense without a formal reservation.

The architecture must avoid forcing every travel concept into a generic `booking` record if doing so obscures the real domain.

Migration should be incremental and preservation-first.

---

## Multi-Segment Travel

The model must support:

- outbound and return travel;
- connections;
- open-jaw travel;
- multi-city trips;
- one-way trips;
- mixed transportation modes;
- overnight movements;
- travel crossing time zones and date boundaries;
- movement without a reservation;
- reservations containing multiple movement segments.

Do not assume one trip equals one origin and one destination.

---

## Place Model

A place is a reusable physical context.

Examples:

- airport;
- station;
- hotel;
- home;
- parking facility;
- attraction;
- restaurant;
- work stop;
- rental location.

A place may contain:

- canonical label;
- address;
- latitude/longitude;
- locality/region/country;
- timezone when determinable;
- provider identifiers;
- user notes.

Avoid copying unnormalized place strings across unrelated records when a stable relationship is practical.

---

## Timeline Architecture

Timeline is a projection of canonical trip facts, not an independent alternate trip database.

Every timeline entry must identify:

- source entity/type;
- source entity ID when derived;
- start/end semantics;
- local time/date semantics;
- location context where applicable;
- precedence/order rules;
- whether it is generated or manually authored.

If timeline entries are persisted, synchronization rules must be explicit and testable.

Changing a source reservation must not leave a stale timeline copy.

---

## Today / Command State

Today is a projection over canonical trip state.

It must not maintain a second copy of booking/movement/expense truth.

Today may derive:

- current trip phase;
- active event;
- next event;
- current movement;
- critical actions;
- unresolved preparation items;
- active alerts;
- current lodging/place;
- actionable records.

All derivations must be deterministic where possible and independently testable.

---

## Expense Architecture

Expenses are ledger records, not decorative totals.

Each expense should clearly represent:

- trip;
- amount;
- currency;
- category/purpose;
- payer/user responsibility where supported;
- business/personal/mixed classification where supported;
- linked booking/movement/place/stop where relevant;
- receipt/document relationship where supported;
- created/updated provenance.

Summary totals are projections over the ledger.

A displayed total must reconcile to its underlying rows.

---

## Traveler and Access Separation

A person traveling and a person with application access are related but distinct concepts.

Do not assume every companion has an account.

Do not assume every trip member is a traveler.

Model separately:

- traveler/companion identity used for trip logistics;
- application membership/access;
- permissions;
- invitations;
- ownership.

PII exposure must follow permissions, not UI assumptions.

---

## Tasks and Required Actions

A required action is not the same thing as an alert.

Examples:

- add missing hotel address;
- confirm ambiguous imported train time;
- upload missing receipt;
- choose traveler for a booking.

Tasks should be linked to the source problem and should disappear or resolve when the underlying condition is corrected.

Avoid persistent orphan reminders whose triggering condition no longer exists.

---

## Alerts and Findings

Alerts represent meaningful conditions, not every computed observation.

An alert should define:

- source condition;
- severity;
- affected trip/entity;
- first detected time;
- last evaluated time;
- resolved state;
- action where applicable;
- deduplication key;
- delivery eligibility.

The app should be quiet when no meaningful action or awareness is needed.

---

## Provider Observation Model

Live provider data should not overwrite historical booking truth indiscriminately.

Think in terms of observations:

```text
canonical entity
  + latest provider observation
  + observation timestamp
  + freshness policy
  -> current operational state
```

This enables:

- stale detection;
- provider swaps;
- debugging;
- comparison/change detection;
- historical evidence where needed.

---

## Identity and Deduplication

Imports and provider refreshes must avoid duplicate entities.

Each domain specification must define deduplication keys.

Examples may include combinations of:

- provider confirmation ID;
- carrier + flight number + service date;
- lodging property + check-in date + confirmation;
- normalized receipt fingerprint;
- provider place ID.

Do not rely only on display names for identity.

---

## Import Staging

Ambiguous imports should use a staging/review state rather than corrupt canonical trip data.

The import pipeline should separate:

1. raw input;
2. extracted candidate data;
3. validation;
4. deduplication;
5. traveler review when needed;
6. canonical commit.

AI extraction should not bypass this architecture.

---

## Cache Is Not Truth

Client caches improve performance and resilience.

They do not become authoritative merely because they are available.

Every cache must define:

- authoritative source;
- freshness window;
- invalidation;
- serialization/versioning where persisted;
- behavior when stale;
- behavior after mutation.

Persisted caches must tolerate schema evolution.

---

## Realtime Is a Delivery Mechanism

Realtime synchronization does not define business truth.

The canonical database/domain rules must remain correct even if realtime delivery is delayed or unavailable.

On reconnect, queries must reconcile to authoritative state.

---

## Schema Migration Standard

Schema changes must preserve existing user data.

Every destructive or semantic migration requires:

- inventory of affected records;
- backfill strategy;
- forward compatibility plan;
- rollback/recovery strategy where practical;
- validation query or test;
- staged application-code migration when needed;
- removal of old fields only after all readers/writers migrate.

No large-bang schema rewrite.

---

## Data Integrity Invariants

At minimum:

- every trip-owned record references a valid trip;
- unauthorized users cannot read/write another trip's private records;
- derived totals reconcile to source records;
- timeline source relationships cannot silently drift;
- date-only values do not shift by timezone;
- local travel times retain intended local semantics;
- duplicate imports are controlled;
- deletion/lifecycle behavior is explicit;
- critical provider observations retain freshness context;
- user corrections are not silently discarded.

Violation of a critical invariant is a release blocker.

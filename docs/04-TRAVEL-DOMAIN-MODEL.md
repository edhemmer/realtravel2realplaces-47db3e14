# RT2RP — Travel Domain Model

## Purpose

This document defines the conceptual model of travel RT2RP must support.

The goal is not to force every concept into a separate table. The goal is to ensure the product can represent real travel without creating contradictions or mode-specific dead ends.

---

## Core Domain Objects

### Trip

A bounded travel experience owned or managed by a user.

A trip may be:

- personal;
- business;
- mixed;
- one day;
- multi-day;
- one-way;
- round-trip;
- multi-city;
- multi-country;
- single-mode;
- multi-modal.

A trip is not required to have exactly one destination.

---

### Traveler

A person whose travel logistics matter to the trip.

A traveler may or may not have an RT2RP account.

Traveler-related details may include:

- identity;
- contact information;
- loyalty/security identifiers where intentionally supported;
- seat/booking relationships;
- cost share;
- notes relevant to execution.

Sensitive fields require explicit access controls.

---

### Member

A user/account with access to a trip.

Membership and traveler identity are distinct.

A member may be:

- owner;
- editor/contributor;
- expense contributor;
- read-only participant;
- another supported role.

Permissions must be explicit and server-enforced.

---

### Place

A physical location important to the trip.

Examples:

- origin home/address;
- airport;
- train station;
- hotel;
- rental car counter;
- parking facility;
- work location;
- restaurant;
- attraction;
- transfer point.

A place should carry enough context to support navigation, timezone reasoning, and user recognition when available.

---

### Reservation

A commitment or booking made with a provider.

Common reservation categories:

- air;
- rail;
- lodging;
- rental vehicle;
- ground transportation;
- activity/ticket;
- parking;
- other trip services.

A reservation may produce one or more timeline entries and/or movement segments.

---

### Movement

Travel from one place to another.

Movement is mode-neutral.

Supported conceptual modes include:

- air;
- drive;
- rail;
- bus;
- ferry;
- rideshare/taxi;
- local transit;
- walking;
- other.

A movement may be booked or unbooked.

---

### Stay

A period during which the traveler is based at a lodging/place.

A stay commonly includes:

- property/place;
- check-in;
- checkout;
- reservation relationship;
- confirmation/reference;
- traveler association;
- cost information where appropriate.

Stays matter operationally because they establish the traveler's likely base location between movements.

---

### Event

A time-bounded trip occurrence.

Events may be:

- derived from a reservation;
- derived from a movement;
- derived from parking;
- work/business stop;
- user-authored activity;
- system-required milestone.

Timeline ordering uses events, but event truth should remain traceable to its source.

---

### Task

Something the traveler should do to make the trip complete or ready.

A task must be actionable.

Examples:

- provide a missing address;
- verify ambiguous imported data;
- complete traveler assignment;
- attach a missing receipt.

Tasks should resolve automatically when their source condition is fixed whenever practical.

---

### Alert

A meaningful condition the traveler should know now or soon.

Alerts are not general information.

They require relevance.

Examples:

- a confirmed live change;
- a material timing conflict;
- an expiring parking session;
- a preparation gap approaching a deadline;
- a weather/route issue when the product can actually support the claim.

---

### Expense

A financial transaction associated with the trip.

Expenses should support operational capture and later reconciliation.

They are distinct from reservation quoted/paid cost unless explicitly linked.

---

### Document

A file or record artifact needed to support travel or closeout.

Examples may include:

- receipt;
- confirmation image/PDF;
- ticket artifact;
- report output;
- other intentionally supported trip documents.

Document handling requires secure access and lifecycle rules.

---

## Travel Modes

## Air

Air travel may include:

- multiple flight segments;
- connections;
- different carriers;
- codeshares;
- terminal/gate information;
- departure/arrival local times;
- overnight/date-line transitions;
- baggage or traveler-specific context when supported.

Never assume one booking equals one flight segment.

Flight status is an operational observation layered onto booked flight truth.

---

## Rail

Rail deserves first-class treatment.

A rail trip may include:

- operator;
- train/service number;
- departure station;
- arrival station;
- local times;
- platform where supported;
- seat/car information where supported;
- transfers/connections;
- international rail.

Rail should not be represented as an impoverished generic transport note if the product claims rail support.

---

## Drive

Drive travel may involve:

- personal vehicle;
- rental vehicle;
- origin/destination addresses;
- multiple stops;
- route timing;
- parking;
- fuel;
- tolls;
- weather/road conditions only where reliably supported;
- navigation handoff.

A drive movement exists independently of the vehicle reservation.

---

## Local / Ground Transit

Trips commonly contain transitions that do not fit the primary trip mode.

Examples:

- airport to hotel rideshare;
- train station to lodging taxi;
- metro connection;
- shuttle;
- ferry;
- walking segment.

The model must allow these without forcing a new trip.

---

## Multi-Modal Trip Example

```text
Home
  -> drive to airport
  -> airport parking
  -> flight ATL to JFK
  -> flight JFK to FCO
  -> train FCO to Roma Termini
  -> taxi to hotel
  -> hotel stay
  -> rail Rome to Florence
  -> hotel stay
  -> rental car pickup
  -> drive Tuscany stops
  -> rental return
  -> flight home
  -> drive from airport home
```

RT2RP should represent this as one trip with connected movements, stays, reservations, places, expenses, travelers, and timeline state.

---

## Trip Phase Model

The product should derive the operational phase rather than require the traveler to manually switch modes.

Possible conceptual phases:

### DRAFT
Trip exists but is not ready enough to operate.

### PREPARING
Trip has future travel and active preparation work.

### READY
Known required information is sufficiently complete according to implemented rules.

### ACTIVE
Trip is currently in progress.

### CLOSING
Travel is over but post-trip operational work remains.

### COMPLETE / ARCHIVED
Trip is closed for normal operation and preserved according to lifecycle rules.

These conceptual phases do not require matching database enum values. Existing lifecycle semantics must be preserved until intentionally migrated.

---

## Operational Time Model

Travel cannot be modeled safely with one device-local clock.

Every timed event must distinguish at least conceptually between:

- date-only;
- local date/time at origin/place;
- timezone/offset where available;
- UTC instant only when a true instant is known and conversion is safe.

The product must preserve what the traveler expects to see on their reservation.

---

## Readiness Model

Readiness is derived from actual implemented requirements.

Do not invent a generic score merely to look intelligent.

A readiness finding should answer:

- what is missing;
- why it matters;
- when it matters;
- how the user can fix it.

Readiness can be domain-specific:

- flight readiness;
- drive readiness;
- lodging readiness;
- expense closeout readiness;
- traveler readiness.

Only expose readiness categories with real deterministic checks.

---

## Current Context Model

The command experience should derive current context from canonical trip data.

Potential context includes:

- current local trip day;
- current/next event;
- current/next movement;
- current lodging;
- current place;
- unresolved action;
- active high-priority alert;
- upcoming time threshold.

Context is a projection, not separate stored truth unless persistence is required for auditing or background processing.

---

## Record Relationship Principles

### Reservations can create events.
### Reservations can create movements.
### Movements connect places.
### Stays anchor the traveler between movements.
### Events create timeline order.
### Expenses may link to reservations, movements, places, or stops.
### Tasks point to unresolved conditions in canonical records.
### Alerts point to detected conditions in canonical or provider-observed records.
### Today/Command consumes all of the above.

This relationship model is more important than tab boundaries.

---

## Domain Anti-Patterns

Do not:

- treat `booking` as a universal bucket for every travel concept;
- model a multi-segment itinerary as one departure and one arrival;
- duplicate travelers because separate bookings were imported;
- store display strings as the only identity for airports/stations/places;
- create independent timeline truth unrelated to source records;
- infer a current location merely because an event is next;
- expose provider fields that have not been normalized or validated;
- assume all trips are round-trip;
- assume business travel is only expenses and work stops;
- assume pleasure travel needs less reliability than business travel.

---

## Universal Product Test

For any supported trip, ask:

1. Can RT2RP represent the itinerary without forcing incorrect assumptions?
2. Can the traveler understand the trip in chronological order?
3. Can movement across modes be represented consistently?
4. Can the system determine what matters now from canonical facts?
5. Can a corrected fact propagate everywhere it is used?
6. Can the app fail honestly when provider data is unavailable?
7. Can the trip remain useful if some optional domains are unused?

If not, the domain model requires improvement before adding more surface area.

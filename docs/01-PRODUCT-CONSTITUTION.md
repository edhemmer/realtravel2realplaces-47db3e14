# RT2RP — Product Constitution

## Product Identity

Real Travel 2 Real Places (RT2RP) is a Travel Operating System.

It is not a booking engine, OTA, travel marketplace, generic itinerary app, travel blog, or AI chat wrapper.

Travelers may book anywhere.

RT2RP begins where fragmented travel management starts: after travel information, reservations, transportation, expenses, companions, documents, places, and decisions begin accumulating across disconnected systems.

RT2RP's job is to turn those pieces into one dependable operating view of the trip.

---

## Mission

RT2RP reduces the mental and operational burden of real travel.

The product helps travelers prepare, organize, execute, and complete trips with greater clarity, confidence, and less manual effort.

The traveler should spend less time managing the machinery of travel and more time doing the reason they traveled.

---

## The Hard-Locked Capability Rule

**If RT2RP cannot fully and reliably do something, RT2RP does not mention it to the user.**

This is permanent and non-negotiable.

A capability must not appear in product copy, controls, onboarding, help, AI responses, pricing, sales materials, screenshots, App Store copy, notifications, reports, or marketing until the complete user outcome is operational and validated.

Internal roadmap items may exist in engineering documentation. They are not product promises.

A partially implemented capability is not a feature.

A prototype is not a feature.

A provider integration that works intermittently is not a feature.

A UI card displaying a value that is not trustworthy is not a feature.

A prompt that sometimes produces the desired answer is not a feature.

The product only speaks about what it can actually do.

---

## Core Customer Problem

Travel becomes fragmented almost immediately.

A real trip can involve:

- airline or rail reservations;
- lodging;
- rental vehicles;
- personal vehicles;
- parking;
- ground transportation;
- activities;
- meetings or work stops;
- multiple travelers;
- addresses and maps;
- tickets and confirmations;
- expenses and receipts;
- weather;
- packing;
- schedule changes;
- notes and local information;
- documents;
- reminders;
- decisions that depend on several of the above at once.

Each existing provider understands only a slice.

The traveler remains responsible for connecting the slices.

RT2RP exists to take on that connecting work.

---

## The Job the Customer Hires RT2RP to Do

The customer hires RT2RP to help answer, quickly and correctly:

- What do I need to do next?
- Where do I need to be?
- When do I need to leave?
- What reservation or document do I need?
- What has changed?
- Is anything important missing?
- What needs my attention?
- What has already been handled?
- What have I spent?
- Where is the information I need right now?

RT2RP should reduce searching, remembering, copying, checking, reconciling, and switching between apps.

---

## Universal Traveler Scope

RT2RP is designed for pleasure travel, business travel, and mixed-purpose travel.

It must support trips built from any practical combination of:

- air;
- personal vehicle;
- rental vehicle;
- train;
- bus;
- ferry;
- rideshare/taxi;
- local transit;
- walking where relevant to trip execution.

No transportation mode is treated as an afterthought.

The canonical trip model must support multi-modal travel naturally.

---

## Travel Lifecycle

### PREPARE

Before travel, RT2RP should help turn known information into an organized trip and make unresolved gaps visible.

The user experience should favor:

- easy intake;
- confirmation and correction;
- preparation status;
- required actions;
- understandable chronology;
- traveler coordination;
- expense expectations where supported;
- packing and logistics where supported.

### OPERATE

During travel, RT2RP should become increasingly context-sensitive.

The priority is not browsing the product. The priority is executing the trip.

The app should emphasize:

- now;
- next;
- movement;
- time-sensitive information;
- changes;
- actionable risk;
- critical records;
- low-friction expense capture;
- shared context.

### CLOSE

After travel, RT2RP should help the traveler finish the operational work that remains.

This may include, where fully supported:

- expense reconciliation;
- receipt completion;
- reporting;
- unresolved reminders;
- durable trip records;
- archival and reuse.

---

## One-Trip Principle

The traveler experiences one trip.

RT2RP may have many internal tables, services, providers, hooks, caches, and models, but these implementation details must not fragment the user's understanding.

A booking, movement, place, traveler, expense, document, task, or alert must participate in the same canonical trip state.

Information should not be entered twice because two screens were built independently.

The same concept must not acquire conflicting meanings across modules.

---

## Primary Experience Spine

The default product hierarchy is:

### Today
What matters now, what changed, what requires action, and what can be ignored.

### Timeline
The ordered operational truth of the trip.

### Travel
Movement between places, across modes.

### Places
The physical locations relevant to the trip.

### Records
The durable information that supports execution and closeout.

Features that do not strengthen this spine require explicit justification.

---

## Product Personality

RT2RP should feel:

- calm rather than noisy;
- confident rather than flashy;
- premium rather than ornamental;
- intelligent rather than clever;
- concise rather than verbose;
- operational rather than inspirational;
- helpful rather than demanding;
- truthful rather than optimistic;
- predictable rather than surprising.

The product should become quieter as a trip becomes healthier.

Normal conditions should not generate unnecessary alerts.

---

## Trust Standard

Travelers may depend on RT2RP while tired, rushed, in unfamiliar places, with limited signal, or while managing other people.

Therefore:

- important data must not silently disappear;
- stale data must never masquerade as live data;
- missing data must not be filled with fabricated defaults;
- failed provider requests must not produce misleading certainty;
- AI must not invent travel facts;
- destructive actions require appropriate protection;
- recovery paths must exist for failed writes and interrupted workflows;
- security boundaries must be enforced server-side.

Trust lost during travel is difficult to recover.

---

## Intelligence Standard

RT2RP intelligence exists to reduce work and improve decisions.

The system should prefer deterministic logic when deterministic logic is sufficient.

AI should be used where ambiguity, extraction, synthesis, prioritization, explanation, or flexible interpretation creates meaningful user value.

AI should not replace reliable domain logic simply because AI can produce an answer.

The strongest intelligence is often invisible: information is already organized, relevant context is already connected, and the right action appears at the right time.

---

## User Control

Automation must not remove the traveler's ability to understand or correct important information.

For material trip facts:

- the source should be traceable internally;
- critical imported data should be reviewable;
- corrections should propagate consistently;
- destructive automation should be avoided;
- ambiguous imports should request confirmation rather than silently choose.

---

## Accuracy Over Breadth

RT2RP should do fewer things exceptionally well rather than expose a broad set of unreliable capabilities.

When deciding between:

- one dependable provider-backed capability; or
- three impressive but fragile integrations,

choose dependable.

When deciding between:

- a clear deterministic estimate; or
- an AI-generated value presented with false precision,

choose the deterministic estimate.

When deciding between:

- hiding an unsupported feature; or
- shipping a disabled/partial version,

hide it.

---

## Business Model Principle

Users pay for reduced travel complexity and increased confidence, not access to a large menu of features.

Paid value should come from meaningful operational leverage such as:

- time saved;
- fewer missed details;
- stronger situational awareness;
- better organization;
- less manual coordination;
- more reliable trip records;
- reduced administrative cleanup;
- valuable intelligence that acts on the user's actual trip.

Pricing tiers must never deliberately make essential trust or data-integrity behavior worse.

Security, correctness, truthful states, and recovery are not premium features.

---

## Feature Admission Test

A new capability must satisfy all of the following before entering the user-facing product:

1. It solves a real traveler problem.
2. It fits the travel lifecycle.
3. It strengthens the unified trip rather than creating another silo.
4. It has a canonical data owner.
5. It has defined failure behavior.
6. It has defined loading, empty, stale, and offline states where applicable.
7. It respects privacy and permissions.
8. It is observable in production.
9. It has automated validation appropriate to its risk.
10. Its user-facing promise exactly matches its real behavior.
11. It has been tested as an end-to-end user outcome.
12. The product is better with it than without it.

Failure of any critical item blocks release.

---

## Non-Goals

Unless the product constitution is explicitly changed, RT2RP does not compete primarily as:

- an OTA;
- a flight/hotel price-comparison engine;
- a travel marketplace;
- a social network;
- a content/blogging platform;
- a generic AI travel-planning chatbot;
- a loyalty-points optimizer;
- an enterprise travel procurement platform.

RT2RP may integrate with adjacent services when doing so improves trip management.

---

## North Star

The traveler focuses on the trip.

RT2RP handles as much of the operational complexity as it can reliably handle.

The product earns trust by doing exactly what it says, every time it reasonably can, and never pretending to do what it cannot.

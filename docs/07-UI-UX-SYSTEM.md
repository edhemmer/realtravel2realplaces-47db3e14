# RT2RP — UI/UX System

## Purpose

RT2RP is used during real travel: while tired, rushed, distracted, carrying luggage, switching transportation modes, sharing information with others, and sometimes on poor connectivity.

The UI must reduce cognitive load and expose operational truth quickly.

A beautiful screen that makes the traveler hunt is a failed screen.

This document defines the target experience system. It does not authorize the UI to expose a capability that has not passed the product's release/evidence gate.

---

## Experience Principles

### 1. One Trip, One Mental Model

The interface should reinforce the sense that the traveler is operating one connected trip.

Avoid making every domain feel like a separate mini-app.

### 2. Next Action First

When timing matters, the most important next action should be easier to find than secondary information.

### 3. Quiet When Healthy

Do not fill the screen with warnings, badges, and status colors when nothing requires attention.

### 4. Truth Before Decoration

A plain but accurate state is better than a polished but ambiguous status card.

### 5. Progressive Detail

Show the decision first, supporting detail second, raw record detail on demand.

### 6. Mobile First, Desktop Complete

The core trip must be fully operable on a phone for every capability RT2RP publicly supports.

Desktop may provide more simultaneous context, but it must not become a different product.

---

## Primary Navigation

The target product spine is:

1. Today
2. Timeline
3. Travel
4. Places
5. Records

Secondary capabilities should be grouped within the most natural primary area when possible.

Do not add top-level navigation merely because a new table or feature exists.

Do not expose an empty primary area solely to advertise target architecture; navigation must reflect validated product capability.

---

## Today

Today is the target operational command surface.

For supported data and intelligence, it should answer, in order:

1. What is happening now?
2. What is next?
3. When/where do I need to act?
4. Did anything important change that RT2RP can actually detect?
5. Is there a problem I must resolve?
6. What can I safely stop paying attention to?

Today should not be a generic dashboard of equal-weight widgets.

Suggested visual hierarchy:

```text
Trip / day context
Critical current or next action
Material change/risk if any
Short upcoming sequence
Useful quick actions
Secondary context
```

When there is no urgent condition, the screen should feel calm.

---

## Timeline

Timeline is the ordered truth of the trip.

Requirements for exposed timeline behavior:

- chronological clarity;
- local date/time display appropriate to each event;
- clear transportation/stay/activity semantics;
- location context;
- source drill-through where supported;
- visual handling for completed/current/upcoming;
- multi-day grouping where supported;
- no fake events generated from missing data.

Timeline should be useful as both a preparation overview and an active trip reference.

---

## Travel

Travel represents movement, not one transportation mode.

The target experience supports air, road, rail, and mixed trips consistently as those domains become validated.

For each publicly supported movement, prioritize:

- from;
- to;
- local date/time;
- mode;
- current operational status where reliably available;
- next required action where deterministically supported;
- navigation/provider handoff where appropriate;
- relevant reservation/record access.

Do not bury drive trips under flight-centric assumptions or rail under a generic transport form.

---

## Places

Places is trip-relevant physical context.

It should help travelers understand and act on locations already part of the trip and, where fully supported, discover useful nearby places.

Place discovery must not overwhelm operational trip data.

When exploring, emphasize practical relevance over endless browse inventory.

---

## Records

Records is the durable trip filing cabinet, organized for retrieval rather than storage theater.

It may group validated records such as:

- reservations;
- travelers;
- expenses;
- parking;
- documents;
- notes;
- packing;
- reports.

The grouping should reflect user intent rather than database tables.

---

## Information Density

Use density based on task.

### Command surfaces
Low-to-medium density; priority and scanning matter most.

### Timeline
Medium density; chronology and comparison matter.

### Records/lists
Medium-to-high density where it improves retrieval.

### Forms
Only fields required for the selected domain should appear.

Avoid giant forms that expose every possible field for every travel mode.

---

## Status Language

Statuses must be understandable without internal terminology.

Use only states that are real and useful.

For external/provider-backed data, examples of acceptable semantics may include:

- Updated recently
- Last updated [time]
- Saved for offline use
- Needs information
- Unable to refresh

Only use each phrase when the underlying behavior makes it true.

Avoid provider/debug terminology unless shown in diagnostics/support context.

---

## Error UX

A good error message answers:

1. What did not work?
2. Did my data save?
3. What can I do now?

Examples:

Bad:
`Something went wrong.`

Better:
`We couldn't refresh this flight status. Your saved flight details are still available.`

Only use such wording if it accurately reflects system behavior.

---

## Empty States

Empty states should help users act, not advertise unimplemented features.

Examples:

- no expenses -> explain how to add an expense if expense entry is supported;
- no travelers -> add traveler if traveler management is supported;
- no reservation -> add/import reservation only if that path is fully supported.

Do not mention future automation or integrations.

---

## Forms and Input

Principles:

- smallest reasonable form;
- mode-specific fields;
- intelligent defaults only when safe;
- preserve user-entered values after validation errors;
- explicit date/time semantics;
- autocomplete should never silently replace user intent;
- imported data should be editable before/after commit according to domain rules;
- destructive actions are clearly separated.

---

## Confirmation and Save Feedback

The traveler should know whether important data was saved.

Use immediate, proportionate confirmation.

Do not spam success toasts for every tiny toggle.

High-value mutations should provide clear success/failure state and retain context.

---

## Interaction Under Stress

Critical actions should:

- use large touch targets;
- avoid precision tapping;
- avoid hidden swipe-only behavior;
- avoid modal chains;
- avoid long multi-step navigation;
- support one-handed mobile use where practical;
- preserve state if the user switches apps when the platform/data contract supports it.

---

## Driving Safety

RT2RP must not encourage complex interaction while a user is actively driving.

Driving-related surfaces should favor:

- pre-drive preparation;
- large controls;
- glanceable information;
- navigation handoff;
- minimal typing;
- no unnecessary interaction loops.

The product must not imply hands-free safety unless such behavior is explicitly implemented and validated.

---

## Visual Language

The existing premium dark/navy/gold/cyan identity may be preserved where it supports readability and brand recognition.

Visual rules:

- restrained accent use;
- status colors reserved for meaning;
- avoid rainbow category overload on command surfaces;
- typography hierarchy does most of the work;
- cards should group meaning, not decorate empty space;
- icons support recognition but never replace critical text;
- animations are subtle and respect reduced-motion preferences.

---

## Responsive Behavior

Mobile and desktop share the same information architecture for supported capabilities.

### Mobile

- bottom navigation or similarly reachable primary nav;
- safe-area support;
- compact contextual header;
- stacked priority flow;
- sheets/drawers only when they improve task completion.

### Desktop

- wider context;
- timeline/detail split views where useful;
- keyboard accessibility;
- less modal navigation;
- persistent trip context.

---

## Accessibility

Non-negotiable baseline:

- sufficient contrast;
- visible focus;
- semantic headings;
- keyboard operability on web;
- correct labels;
- accessible form errors;
- no color-only meaning;
- reduced motion;
- screen-reader-friendly dynamic updates;
- touch targets sized for mobile use.

Applicable accessibility requirements must be validated in critical flows before release.

---

## Localization Readiness

Even before full localization, avoid architectural assumptions that make it difficult.

- do not concatenate translated sentence fragments;
- keep currencies explicit;
- format numbers/units deliberately;
- preserve local travel place names;
- support long labels;
- avoid assuming U.S.-only address patterns in core domain models.

Localization readiness is an engineering constraint, not a claim that localization is currently offered.

---

## UX Acceptance Gate

A screen is not complete until a traveler can answer its primary question quickly and accurately for the supported user outcome.

For every major surface test, as applicable:

- first-time user;
- experienced user;
- empty trip;
- dense trip;
- poor network;
- stale provider state;
- mobile viewport;
- desktop viewport;
- keyboard/screen-reader basics;
- error/recovery path.

Define objective scenario expectations in the subsystem spec rather than relying only on visual judgment.

The final UX question is:

**Does this screen reduce work, or merely display software?**

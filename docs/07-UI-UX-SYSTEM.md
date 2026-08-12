# RT2RP — UI/UX System

## Purpose

RT2RP is used during real travel: while tired, rushed, distracted, carrying luggage, switching transportation modes, sharing information with others, and sometimes on poor connectivity.

The UI must reduce cognitive load, surface operational truth quickly, and make a complex trip feel simpler than the systems underneath it.

A beautiful screen that makes the traveler hunt is a failed screen.

A reliable screen that feels clumsy, slow, visually flat, or confusing is also unfinished.

RT2RP must deliver both operational integrity and a premium, modern travel experience.

This document defines the target experience system. It does not authorize the UI to expose a capability that has not passed the product's release/evidence gate.

---

## Experience North Star

The traveler should feel:

- oriented;
- calm;
- informed;
- prepared;
- in control;
- confident that the information shown is trustworthy;
- able to act without searching through the application.

The interface should feel like a high-quality travel instrument, not a collection of CRUD screens.

The experience must be equally credible for:

- a family vacation;
- a solo leisure trip;
- a road trip;
- a multi-city international trip;
- a frequent business traveler;
- a mixed business/personal trip;
- a trip combining air, road, rail, transit, and walking transitions.

---

## Core Experience Principles

### 1. One Trip, One Mental Model

The interface reinforces one connected trip.

Avoid turning bookings, expenses, flights, parking, places, notes, travelers, or driving into separate mini-apps.

The user should understand relationships without understanding the database.

### 2. Context Before Navigation

The traveler should not have to choose a module before learning what matters.

The system should use known trip context to surface the most relevant supported information first.

### 3. Next Action First

When timing matters, the next meaningful action outranks analytics, decoration, discovery, and secondary detail.

### 4. Quiet When Healthy

Healthy trips should look healthy.

Do not manufacture urgency through badges, warning colors, red dots, banners, or notifications when no meaningful condition exists.

### 5. Truth Before Decoration

A plain but accurate state is better than a polished but ambiguous state.

Visual treatment must reinforce source semantics, not obscure them.

### 6. Progressive Detail

Show:

1. decision/action;
2. essential supporting context;
3. full record detail on demand.

### 7. Mobile First, Desktop Complete

Every public core capability must be fully usable on a phone.

Desktop can expose more simultaneous context but must not become a different product or a denser administrative version of the trip.

### 8. Speed Is Part of Design

Perceived and actual speed are part of trust.

Critical trip context should appear before secondary content whenever architecture allows.

Loading must preserve orientation rather than blanking the whole screen.

### 9. Motion Explains State

Animation exists to explain continuity, hierarchy, change, or navigation.

It must never exist merely to make the product feel animated.

### 10. Visual Quality Must Earn Its Space

Every graphic, map, icon, chart, photo, badge, color, or card must improve recognition, orientation, decision-making, or emotional confidence.

Decorative travel imagery must not displace operational information.

---

## Primary Navigation

The target product spine is:

1. **Today**
2. **Timeline**
3. **Travel**
4. **Places**
5. **Records**

Secondary capabilities belong inside the most natural primary area whenever possible.

Do not add top-level navigation merely because a new table or feature exists.

Do not expose an empty primary area solely to advertise target architecture.

Navigation must reflect validated product capability.

### Navigation Quality Standard

A traveler should be able to answer these questions without learning internal terminology:

- Where am I in this trip?
- What do I need next?
- How do I see the full sequence?
- How am I moving?
- Where is the place or record I need?

Navigation labels should describe traveler intent, not implementation structure.

---

# Core Surfaces

## Today

Today is the operational command surface.

For supported data and intelligence, it should answer in this order:

1. What is happening now?
2. What is next?
3. When and where do I need to act?
4. Did anything meaningful change that RT2RP can actually detect?
5. Is there a problem I need to resolve?
6. What can I safely stop paying attention to?

Today is not a generic dashboard of equal-weight widgets.

### Target Visual Hierarchy

```text
Trip / local-day context
Current or next meaningful action
Material change or risk, only if present
Short chronological preview
Fast context-aware actions
Secondary trip context
```

The first viewport should usually answer the traveler's most important current question without scrolling.

When nothing requires attention, Today should feel intentionally calm rather than empty.

### Command Card Standard

A primary action card should not become a mini-dashboard.

It should communicate only the information required to decide or act:

- what;
- when;
- where;
- status/freshness if material;
- one or two primary actions;
- a clear path to deeper detail.

---

## Timeline

Timeline is the ordered operational truth of the trip.

Requirements for exposed behavior:

- chronological clarity;
- correct local date/time semantics;
- clear mode/stay/activity distinctions;
- meaningful location context;
- source drill-through where supported;
- completed/current/upcoming differentiation;
- multi-day grouping where supported;
- clear connections and handoffs;
- no fake events generated from missing data;
- no duplicate event clutter caused by multiple internal sources.

### Timeline Graphics Standard

Timeline visuals should help the traveler see flow, not merely decorate rows.

Use visual connectors, movement icons, place anchors, day boundaries, and state emphasis only where they improve chronology.

The timeline must remain understandable without relying on color alone.

Dense multi-modal trips should still scan cleanly.

---

## Travel

Travel represents movement, not one transportation mode.

The target experience supports air, road, rail, and mixed trips consistently as those domains become validated.

For each publicly supported movement, prioritize:

- origin;
- destination;
- local date/time;
- mode;
- operational status where reliably available;
- next required action where deterministically supported;
- navigation/provider handoff where appropriate;
- relevant reservation/record access;
- transfer/connection context when known.

Do not bury drive trips under flight-centric assumptions.

Do not represent rail as an impoverished generic transportation note if rail is publicly supported.

### Movement Continuity

The interface should make transitions legible:

```text
hotel checkout -> drive -> airport -> flight -> connection -> ground transfer -> hotel
```

The product's differentiation is often in these handoffs.

---

## Places

Places is trip-relevant physical context.

It should help travelers:

- recognize places already part of the trip;
- understand where the next movement or event occurs;
- open navigation when appropriate;
- discover useful nearby places where that capability is validated.

Place discovery must not overwhelm operational trip information.

Discovery results should favor relevance, proximity, open/usable context where reliably available, and strong visual scanning.

### Map Standard

Maps should be used when spatial understanding changes a decision.

A map is not required simply because coordinates exist.

When used, maps should:

- preserve trip context;
- distinguish current/next/relevant locations;
- avoid pin overload;
- keep key text/action information available outside the map;
- never imply current location tracking unless actually supported;
- preserve source/freshness semantics for dynamic overlays.

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

The grouping should reflect traveler intent rather than database tables.

### Retrieval Standard

A traveler under pressure should be able to locate a confirmation, address, reservation, receipt, or traveler record quickly without remembering which subsystem originally created it.

Search/filtering should be introduced only when it materially improves retrieval and can be implemented cleanly.

---

# Visual System

## Brand Direction

The existing deep navy/obsidian, restrained gold/champagne, and signal-cyan direction may be preserved where it supports readability and brand recognition.

The visual identity should communicate:

- confidence;
- precision;
- premium travel;
- calm control;
- modern technology without sci-fi theatrics.

Avoid generic travel-blog aesthetics, tropical gradients, excessive photography, novelty illustrations, and visual motifs that compete with operational information.

---

## Color Semantics

Color has three jobs:

1. brand identity;
2. interaction hierarchy;
3. operational meaning.

Status colors are reserved for meaning.

Do not use the same color to mean both decorative category and operational severity on the same surface.

Critical state cannot rely on color alone.

The number of simultaneous accent colors on command surfaces should remain deliberately limited.

---

## Typography

Typography should carry most of the visual hierarchy.

Use clear distinctions for:

- trip context;
- primary action;
- time/place information;
- secondary metadata;
- status/freshness;
- supporting notes.

Avoid excessive all-caps, tiny metadata, low-contrast labels, and oversized headings that consume the traveler's first viewport.

Numeric travel values—times, gates, platforms, prices, distances—must be especially scannable.

---

## Cards and Surfaces

Cards exist to group meaning.

Do not wrap every row in a card.

Do not stack card-inside-card-inside-card structures that obscure hierarchy.

Preferred hierarchy:

- one strong primary surface;
- clear sectional grouping;
- restrained borders/elevation;
- whitespace as structure;
- detail revealed progressively.

A surface with no meaningful content should not consume visual weight.

---

## Icons

Icons support recognition.

They must not replace critical text for:

- status;
- transportation mode where ambiguity is possible;
- destructive actions;
- accessibility-critical controls.

Use one coherent icon family unless a native platform symbol is intentionally appropriate.

Avoid novelty icons and inconsistent visual weights.

---

## Photography and Place Imagery

Real place imagery can improve recognition and emotional confidence in discovery contexts.

Rules:

- use provider-backed imagery only with correct attribution/rights behavior;
- do not use decorative destination photos where they displace trip operations;
- use consistent aspect ratios and crop behavior;
- show graceful fallback when imagery is unavailable;
- never invent or substitute a misleading photo for a place.

---

## Maps, Routes, and Spatial Graphics

Route lines, place markers, airport/station diagrams, and spatial graphics should communicate actual supported information.

Do not draw implied routes, current positions, traffic conditions, weather corridors, or live movement unless the data contract supports them.

When dynamic data is stale or estimated, the visual language must not look indistinguishably live.

---

## Charts and Data Visualization

Charts are appropriate only when the visual encoding helps the traveler understand a pattern or decision faster than text.

Good candidates may include validated:

- trip spend by category;
- budget progress;
- trip-day spend trend;
- route/time comparison;
- business/personal expense mix.

Rules:

- no chart for a single number;
- no decorative dashboards;
- label units/currency/time clearly;
- preserve accessibility;
- allow drill-through to source records where relevant;
- totals must reconcile to canonical data.

---

# Real-Time Experience

## Live Information Presentation

Real-time or provider-current information should feel alive without becoming noisy.

Use subtle update semantics such as:

- timestamp/freshness label where material;
- restrained state transition;
- localized highlight when a material field changes;
- explicit unavailable/stale state;
- background refresh that does not reset the whole screen.

Do not animate every refresh.

Do not make a stale value visually equivalent to a fresh provider observation.

### Material Change Pattern

When a material change occurs, communicate:

1. what changed;
2. old vs new when useful;
3. when it was observed;
4. what the traveler should do, if anything.

Avoid forcing the traveler to compare two screens manually.

---

# Motion and Feedback

## Motion Principles

Motion may:

- preserve spatial orientation during navigation;
- explain expansion/collapse;
- highlight a meaningful state change;
- show completion/progress;
- make native interactions feel responsive.

Motion must not:

- delay access to information;
- hide loading;
- imply certainty or live status;
- distract during travel-day use;
- violate reduced-motion preferences.

Target most interface transitions to feel immediate and restrained rather than cinematic.

---

## Haptics

On native platforms, haptics may reinforce high-value actions such as:

- successful save;
- confirmed completion;
- meaningful selection;
- error requiring attention.

Do not use haptics for routine scrolling, every tap, or decorative delight.

---

## Save and Mutation Feedback

The traveler should know whether important data was saved.

Use immediate, proportionate confirmation.

Do not spam success toasts for every small toggle.

For high-value mutations, communicate:

- saving/pending state when needed;
- success;
- failure;
- whether data was preserved;
- recovery action.

Optimistic UI must not falsely imply persistence.

---

# Async and Failure Experience

## Loading

Loading should preserve context.

Prefer:

- skeletons matching real layout;
- independent loading regions;
- cached canonical content while a live panel refreshes;
- progressive reveal when safe.

Avoid full-screen blocking spinners after the trip shell is already known unless the entire route truly cannot operate.

---

## Error UX

A strong error message answers:

1. What did not work?
2. What remains safe/available?
3. What can I do now?

Example:

Bad:
`Something went wrong.`

Better, only when true:
`We couldn't refresh this flight status. Your saved flight details are still available.`

Errors should be localized when the rest of the trip remains usable.

---

## Empty States

Empty states help users act; they do not advertise future features.

Examples:

- no expenses -> explain how to add one if supported;
- no traveler -> add traveler if supported;
- no reservation -> add/import reservation only if supported.

Avoid giant illustration-first empty states on operational screens.

---

# Forms and Input

Principles:

- smallest reasonable form;
- mode-specific fields;
- intelligent defaults only when safe;
- preserve user-entered values after validation errors;
- explicit local date/time semantics;
- autocomplete never silently replaces user intent;
- imported data remains reviewable/correctable according to domain rules;
- destructive actions are clearly separated;
- required vs optional fields are obvious;
- mobile keyboards/input modes match the data type where possible.

Long forms should be grouped by traveler task, not schema columns.

---

# Interaction Under Stress

Critical actions should:

- use large touch targets;
- avoid precision tapping;
- avoid hidden swipe-only behavior;
- avoid modal chains;
- avoid long multi-step navigation;
- support one-handed mobile use where practical;
- preserve state when switching apps where the platform/data contract supports it;
- keep confirmation numbers, addresses, times, and action buttons easy to copy/open.

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

The product must not imply hands-free or driving-safe behavior unless explicitly implemented and validated.

---

# Responsive and Native Quality

## Mobile

- reachable primary navigation;
- safe-area support;
- compact contextual header;
- stacked priority flow;
- thumb-friendly primary actions;
- sheets/drawers only when they reduce navigation;
- robust keyboard avoidance;
- no horizontal overflow for critical content.

## Desktop

- wider context without needless density;
- useful split views where appropriate;
- keyboard accessibility;
- less modal navigation;
- persistent trip context;
- efficient scanning for frequent/business users.

## Native Quality

The native shell should not feel like a website trapped in an app container.

Where supported, use platform-appropriate:

- safe areas;
- haptics;
- share sheets;
- deep links;
- status bar behavior;
- app lifecycle handling;
- notifications;
- keyboard/input behavior.

Native-specific polish must never create a second source of product logic.

---

# Accessibility

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
- touch targets sized for mobile use;
- charts/maps have meaningful alternatives where necessary;
- changing live regions do not overwhelm assistive technology.

Accessibility requirements must be validated in critical flows before release.

---

# Localization and International Travel Readiness

Even before full localization, avoid architecture that makes it difficult.

- do not concatenate translated sentence fragments;
- keep currencies explicit;
- format numbers/units deliberately;
- preserve local place names;
- support long labels;
- avoid U.S.-only address assumptions in core models;
- handle 12/24-hour display deliberately;
- preserve source date/time semantics;
- allow non-ASCII traveler/place text.

Localization readiness is an engineering constraint, not a claim that localization is currently offered.

---

# Experience Performance Bar

Critical travel surfaces should have explicit performance budgets in their subsystem specs.

Measure where practical:

- first useful content;
- interaction responsiveness;
- route transition latency;
- provider refresh latency;
- image/map loading behavior;
- slow-network degradation.

Do not chase synthetic benchmark numbers at the expense of correctness, but do not accept visibly sluggish critical screens.

The first useful trip state matters more than the last decorative asset.

---

# Visual Regression and Cross-Device QA

Major experience changes should be reviewed across representative:

- small iPhone viewport;
- large iPhone viewport;
- Android/mobile web viewport if supported;
- tablet where supported;
- desktop narrow/wide layouts;
- dark/light themes if both are public;
- empty and dense trips;
- long place names;
- international date/time/currency examples;
- loading/error/stale/offline states.

Visual QA should check hierarchy, clipping, overlap, readable contrast, touchability, and truth-state consistency—not only pixel similarity.

---

# Experience Acceptance Gate

A major user-facing surface is not complete until all applicable checks pass:

1. **Primary-question test** — traveler can answer the screen's main question quickly.
2. **Glanceability test** — important time/place/action information is visible without careful reading.
3. **Truth-state test** — fresh, cached, stale, estimated, missing, and failed states cannot be materially confused.
4. **Interaction-cost test** — common tasks are not meaningfully harder than relevant specialist benchmarks unless added friction protects correctness or trust.
5. **Stress test** — dense trip, poor network, interrupted action, and time pressure remain understandable.
6. **Mobile test** — core flow is fully operable one-handed where practical.
7. **Desktop test** — extra space improves context rather than adding clutter.
8. **Accessibility test** — critical controls and dynamic states are accessible.
9. **Visual-quality test** — hierarchy, typography, spacing, graphics, motion, and imagery feel deliberate and production-grade.
10. **Performance test** — critical information becomes useful quickly enough for the defined scenario.
11. **Competitive-quality test** — the chosen capability meets the relevant market benchmark or provides a documented integration advantage.
12. **No-decoration-debt test** — graphics and animation do not conceal weak or missing functionality.

The final UX questions are:

**Does this screen reduce work?**

**Does it make the traveler more confident?**

**Would this feel credible beside the best travel apps on a user's phone?**

If not, it is not finished.

# RealTravel2RealPlaces Travel Management Research - June 2026

## Positioning

RealTravel2RealPlaces should not compete as another trip planner. The stronger category is travel management for real travelers: a daily-use operating layer that turns confirmations, routes, risk, money, movement, airports, parking, weather, and offline state into clear next actions.

## Competitor Baseline

- Paid itinerary tools: strong confirmation organization, real-time flight alerts, check-in reminders, airport-adjacent notifications, seat tracking, fare tracking, point tracking, and sharing.
- Free trip-import tools: itinerary inbox/import, email sync, flight/gate updates, SMS flight status alerts, price tracking, and mobile flight tracking.
- Collaborative planning tools: itinerary planning, route optimization, map view, reservations, packing, budgets, expense splitting, flight status, AI assistance, and offline access.
- Apple-first itinerary tools: polished trip details, email import, documents, expenses, calendar sync, permissions, flight updates, and travel recap.
- Map and transit apps: best-in-class point navigation and transit UX, but not trip management. They know where to go; they do not manage the traveler's full business/personal trip state.

## Where RT2RP Can Win

- During-trip command: today, next move, next risk, next receipt, next airport, next transit option, next drive segment.
- Multi-modal management: flight, drive, rental, transit, walking, airport terminal, parking, and expense context in one trip.
- Deterministic engines: canonical state, movement governance, transit cache, weather cache, offline expense queue, and drive intelligence already exist.
- Trust and cost control: official airport links, native map deep links, iframe map windows, cached transit, weather, and outbound map-provider handoff should be default before expensive place-data calls.
- Business/personal support: mixed trips, companions, permissions, expenses, reports, tour/business workflows, and eventual sponsor rails give the product SaaS leverage beyond leisure planning.

## Product Surface Recommendations

### Dashboard

- Keep it as a portfolio command center, not a marketing page.
- Surface active trip health, next operational action, spend, upcoming travel, unread alerts, offline status, and import backlog.
- Add paid-partner banner inventory later, clearly separate from trip-critical tools.

### Trip Tabs

- Today: primary iOS surface. It should answer "what do I do next?"
- TravelOps: management dashboard for maps, airports, transit, spend, readiness, offline status, and sponsor inventory.
- Flow: chronological source of truth.
- Move: primary/alternate movement decisions.
- Drive: CarPlay and cockpit surface with road, gas, weather, parking, offline, and next-stop widgets.
- Explore: discovery with strict cache/stale-time controls.
- Bookings: confirmation truth and vendor deep links.
- Expenses: offline-first daily capture and reports.
- Weather / Alerts / Parking / Packing / Notes: support surfaces that should feed Today and TravelOps, not live as isolated destinations.

## Low-Credit Map And Data Strategy

- Airport maps: use official airport `mapUrl`, `parkingUrl`, and `officialUrl` from the local airport dataset first. This costs zero credits and is more authoritative.
- Indoor airport maps: evaluate indoor-map providers for premium terminal/gate/lounges when a paid tier or partner deal justifies it.
- Transit: keep the governed transit provider as the canonical live route source because the repo already has governance, 3-minute cache, and deduplication. Add GTFS/GTFS-RT agency feeds later for major metros if cost becomes an issue.
- Destination maps: use embedded map windows and native map deep links first. Use place/search APIs only for explicit search sessions or monetizable discovery.
- Weather: use a low-cost/default weather source for current and forecast windows.
- Driving: continue with native map-provider handoff plus internal drive cockpit. Use route APIs only when deterministic scoring or offline precomputation is needed.
- Offline: persist upcoming timeline, drive next stops, parking, airport links, and expense queue before the traveler loses service.

## Current Implementation Added

- Added a new `TravelOpsTab` management dashboard.
- Wired TravelOps into desktop trip tabs and iOS-style mobile bottom navigation.
- Added map, transit, airport, spend, timeline, readiness, offline, and future sponsor panels without changing backend logic.
- The new map windows avoid paid API calls by default and use outbound/native provider links for live accuracy.

## Next High-Value Backlog

- Add airport map provider abstraction: official link -> indoor-map provider -> native map fallback.
- Add transit provider abstraction: governed provider -> GTFS-RT agency feed -> outbound map handoff.
- Add sponsor slot model behind feature flags: airline, lodging, rental, gas, transit, insurance.
- Add "TravelOps digest" push notification: next move, weather hazard, receipt gap, airport map link.
- Add native offline package builder before trip start: airport links, map links, timeline, drive stops, parking, key documents.

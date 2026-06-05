# RealTravel2RealPlaces Travel Management Research - June 2026

## Positioning

RealTravel2RealPlaces should not compete as another trip planner. The stronger category is travel management for real travelers: a daily-use operating layer that turns confirmations, routes, risk, money, movement, airports, parking, weather, and offline state into clear next actions.

## Competitor Baseline

- TripIt Pro: strong confirmation organization, real-time flight alerts, check-in reminders, airport-adjacent notifications, seat tracker, fare tracker, point tracker, and sharing. Source: https://www.tripit.com/web/pro and TripIt help pages.
- KAYAK Trips: free itinerary inbox/import, Gmail sync, flight/gate updates, SMS flight status alerts, price tracking, and mobile flight tracker. Source: https://www.kayak.com/help/tripshelp
- Wanderlog: collaborative itinerary planning, route optimization, map view, reservations, packing, budgets, expense splitting, flight status, AI assistant, and offline access. Source: https://wanderlog.com/
- Tripsy: polished Apple-first trip details, email import, documents, expenses, calendar sync, permissions, flight updates, and travel recap. Source: https://tripsy.app/
- Moovit / Google Maps / Apple Maps: best-in-class point navigation and transit UX, but not trip management. They know where to go; they do not manage the traveler’s full business/personal trip state.

## Where RT2RP Can Win

- During-trip command: today, next move, next risk, next receipt, next airport, next transit option, next drive segment.
- Multi-modal management: flight, drive, rental, transit, walking, airport terminal, parking, and expense context in one trip.
- Deterministic engines: canonical state, movement governance, transit cache, weather cache, offline expense queue, and drive intelligence already exist.
- Trust and cost control: official airport links, native map deep links, iframe map windows, cached HERE Transit, Open-Meteo weather, and outbound Google/Apple Maps should be default before expensive Places calls.
- Business/personal support: mixed trips, companions, permissions, expenses, reports, tour/business workflows, and eventual sponsor rails give the product SaaS leverage beyond leisure planning.

## Product Surface Recommendations

### Dashboard
- Keep it as a portfolio command center, not a marketing page.
- Surface active trip health, next operational action, spend, upcoming travel, unread alerts, offline status, and import backlog.
- Add paid-partner banner inventory later, clearly separate from trip-critical tools.

### Trip Tabs
- Today: primary iOS surface. It should answer “what do I do next?”
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
- Indoor airport maps: evaluate Mapbox Indoor Maps for premium terminal/gate/lounges when a paid tier or partner deal justifies it. Mapbox launched airport indoor maps for developers in 2026.
- Transit: keep HERE Transit as the canonical live route source because the repo already has governance, 3-minute cache, and deduplication. Add GTFS/GTFS-RT agency feeds later for major metros if cost becomes an issue.
- Destination maps: use embedded map windows and native map deep links first. Use Places/Search APIs only for explicit search sessions or monetizable discovery.
- Weather: Open-Meteo is a good low-cost/default source for current and forecast windows.
- Driving: continue with native Apple/Google Maps handoff plus internal drive cockpit. Use route APIs only when deterministic scoring or offline precomputation is needed.
- Offline: persist upcoming timeline, drive next stops, parking, airport links, and expense queue before the traveler loses service.

## Current Implementation Added

- Added a new `TravelOpsTab` management dashboard.
- Wired TravelOps into desktop trip tabs and iOS-style mobile bottom navigation.
- Added map, transit, airport, spend, timeline, readiness, offline, and future sponsor panels without changing backend logic.
- The new map windows avoid paid API calls by default and use outbound/native provider links for live accuracy.

## Next High-Value Backlog

- Add airport map provider abstraction: official link -> Mapbox Indoor -> native map fallback.
- Add transit provider abstraction: HERE -> GTFS-RT agency feed -> outbound Maps.
- Add sponsor slot model behind feature flags: airline, lodging, rental, gas, transit, insurance.
- Add “TravelOps digest” push notification: next move, weather hazard, receipt gap, airport map link.
- Add native offline package builder before trip start: airport links, map links, timeline, drive stops, parking, key documents.

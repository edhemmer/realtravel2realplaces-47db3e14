# RT2RP Live Operations Audit

## Standard

RT2RP must not present a prototype promise as a production feature.

Every operational surface should clearly indicate one of four states:

- Live: provider-backed data is available now.
- Cached: previously fetched or deterministic data is available and safe to use.
- Needs Info: the user must add missing trip data before RT2RP can compute the answer.
- Unavailable: the provider or network did not respond, with a useful fallback.

Silent mock data is not allowed on travel execution surfaces.

## Current Upgrade Pass

### Drive Routing

The app now has a provider-backed route layer:

- `fetchLiveRoute()` calls the Supabase `here-route` edge function.
- Results are cached for 15 minutes to control costs.
- The synchronous `getRoute()` estimate remains available for offline and deterministic engine use.
- The Travel command surface exposes route truth as Live route, Estimated route, Needs origin, Needs destination, or Route unavailable.
- Future drive trips can open Driving Mode before the trip starts so users can inspect proposed route options, add stops, and review readiness.

### Travel Command

The Travel tab now presents:

- Route truth.
- Weather truth.
- Cost-control status.
- Live or estimated route timing.
- Provider/fallback details without exposing implementation labels such as "No API key."

### Product Language

Use production terms:

- Today
- Timeline
- Travel
- Places
- Driving Mode
- Records
- Spend
- Live / Cached / Needs Info / Offline

### Today Command Center

The Today surface must not go blank just because the trip has not started.

- Drive trips expose Driving Mode before departure and during travel.
- Quick actions use the same product language as the rest of the app: Places, Spend, Driving Mode.
- The Operating Brief is shown on mobile Today so the traveler sees the highest-value readiness actions without hunting through tabs.
- Empty and pre-trip states should guide the next setup action instead of saying there is nothing to show.

### Navigation Rhythm

The primary app spine is:

1. Today
2. Timeline
3. Travel
4. Places
5. More

Legacy/internal labels such as Move, Explore, NOW, Local Map, and Trip Guide should not appear as primary user-facing navigation language unless they are being used in a deliberately scoped legacy admin or code context.

Avoid demo terms:

- Mock
- Placeholder
- No API key
- Coming soon
- Demo data
- Sample data

## Remaining High-Priority Gaps

1. Expand provider truth states to Places, Airport, Weather, Packing, Reports, and AI imports.
2. Replace legacy Help Center references to old tab names wherever they remain.
3. Add end-to-end smoke tests for route planning, flight status, places search, weather, receipt import, and password reset.
4. Add production monitoring docs for Supabase edge function failure rates and gated API usage.
5. Continue replacing isolated web-page tabs with connected operating workflows.

## Acceptance Gate

A traveler should be able to open a trip and immediately understand:

- What is next.
- What is live.
- What is cached.
- What needs more information.
- Which action is safest to take now.

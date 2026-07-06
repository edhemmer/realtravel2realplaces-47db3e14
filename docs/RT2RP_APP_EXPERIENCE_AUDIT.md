# RT2RP App Experience Audit

## Product Bar

RT2RP is a Travel Operating System, not a trip scrapbook. Every module should answer one of three questions quickly:

- What changed?
- What do I need to do next?
- What can I safely stop worrying about?

The strongest travel products win because they are fast, obvious under stress, trustworthy with live data, and quiet when everything is normal. RT2RP should keep that same discipline while giving users an independent operating layer for trips booked anywhere.

## Research Takeaways

- Flight/status experiences are judged by accuracy and speed. A single missed cancellation, delay, gate change, or critical alert breaks trust.
- Itinerary tools work when forwarded/imported confirmations become a clean day-by-day plan with maps, terminal details, and safe storage.
- Road trip tools work when route, stops, fuel, weather, time, and nearby options are available without forcing manual planning chores.
- Group travel tools win by reducing coordination load: shared access, assigned context, expenses, offline access, and clear change history.
- User reviews tend to punish unclear paywalls, stale data, too many setup steps, and features that look real but do not act on real trip context.

## Module Intent

| Module | Intent | Experience Standard |
| --- | --- | --- |
| Today / Command | Summarize the trip in one operating view. | Show next move, risk, route/flight context, spend, and alerts without making the user hunt. |
| Timeline | Give the ordered truth of the trip. | Every booking, stop, drive leg, airport window, lodging window, and reminder should appear in time order. |
| TravelOps | Explain operational readiness. | Show live/cached state, route/airport/weather risks, offline readiness, and next recommended action. |
| Move / Driving | Manage movement between places. | Future and active drives should show route options, stops, route weather, gas, road risk, and navigation handoff. |
| Airport | Make airport confusion smaller. | Surface airport maps, terminal/gate context, parking, security timing, and local transit when available. |
| Explore | Find useful nearby places without burning API budget. | Location-aware, gated, cached, and trip-relevant, not generic browsing. |
| Weather | Analyze origin, destination, and route conditions. | Highlight conditions that change packing, departure timing, safety, or routing. |
| Bookings | Keep all confirmations organized. | Imported or manual bookings should become structured trip data, not static notes. |
| Packing | Convert trip context into preparedness. | Weather, trip length, and multi-stop context should drive a concise checklist. |
| Spend | Keep travel costs report-ready. | Receipts, parking, fuel, meals, and booking costs should stay current with offline capture. |
| Parking | Prevent arrival/departure friction. | Track where the car is, cost, refund needs, and airport/venue context. |
| Members | Control operating access. | Permissions must be clear, revocable, and separate from companion records. |
| Companions | Coordinate people traveling. | Contact details, shared context, and traveler-specific notes should be easy to find. |
| Stops | Run business movement. | Work stops should be date-grouped, optionally timed, route-aware, and navigable. |
| Report | Produce the trip record. | Export clean summaries with bookings, expenses, parking, and traveler shares. |
| Notes & Safety | Preserve critical details. | Keep safety notes, documents, and operational context accessible offline. |

## Current Pass

- Quieted the dashboard when all core connections are healthy; warning states still surface when connection behavior changes.
- Added operating briefs to Packing, Guide, Members, Companions, Stops, and Report so each module begins with the current read before showing forms/lists.
- Clarified module language so the UI reads like an operating system: readiness, guidance, shared operations, people traveling, business movement, and trip records.
- Preserved existing backend logic and canonical data flows while improving the visual rhythm and decision hierarchy.

## Next Product Gaps

- End-to-end route risk engine for drives: route polyline, weather corridor, state DOT road closures, severe alerts, and departure timing recommendations.
- Flight monitoring job: status polling, cancellation/delay change detection, APNS/web push, and actionable “what changed” summaries.
- Airport data integration: maps, terminal/gate context, parking/security/transit links, and cached airport windows.
- API cost governance: central request budgets, cache TTLs, per-user quotas, and visible stale-data behavior only when it affects trust.
- iOS-native shell refinement: bottom navigation, safe-area polish, native-feeling command panels, and App Store screenshot flows.

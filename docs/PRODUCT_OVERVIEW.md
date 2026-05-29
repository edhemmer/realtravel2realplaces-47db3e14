# Real Travel 2 Real Places — Product Overview

---

## One-Line Summary

Real Travel 2 Real Places is a personal trip command center that manages everything after a trip is booked — replacing spreadsheets and scattered notes with a calm, reliable system.

---

## Problem

Travelers manage trip logistics across fragmented tools — email threads, spreadsheets, note apps, and memory. This creates:

- **Lost confirmations**: Buried in inboxes, hard to find at the gate
- **Expense chaos**: Receipts lost, reimbursements delayed, costs unclear
- **Fragile coordination**: Multiple travelers with no shared source of truth
- **No real-time execution**: No system knows what's happening *right now* during travel

Current solutions either try to *plan* trips (TripIt, Google Trips) or are generic note-taking tools. None focus on **managing the trip after booking**.

---

## Solution

Real Travel 2 Real Places provides:

1. **AI-Powered Ingestion** — Paste or photograph confirmations. AI extracts flights, lodging, car rentals, transport, and activities automatically.
2. **Multi-Mode Trip Creation** — Create trips by air, car, or train. Drive trips support door-to-door navigation with full street addresses.
3. **Unified Trip View** — All bookings, expenses, parking, packing, companions, and notes in one canonical dashboard.
4. **Execution-First Design** — The NOW tab shows what matters *right now*: next flight, checkout time, parking expiration, drive destination.
5. **Drive Mode** — Focused navigation screen for road trips with route intelligence and one-tap directions.
6. **EXPLORE** — Discover real places near your destination with photos, ratings, and reviews from Google Places. Add them directly to your timeline.
7. **Cost Clarity** — Real-time expense tracking with per-person splitting, category breakdowns, receipt OCR, and business/personal separation.
8. **Smart Logistics** — Parking expiration alerts, weather awareness, calendar export, and configurable reminders.
9. **Installable PWA** — Full Progressive Web App with offline caching, home screen install, and auto-updating service worker.

---

## Target Users

| Segment | Pain Point | Feature Anchor |
|---------|-----------|----------------|
| **Families** | Coordinating logistics for 4+ people across flights, hotels, activities | Companion management, cost splitting, trip sharing |
| **Frequent Travelers** | Managing 10+ trips/year across business and personal | Unlimited trips, timeline events, trip reports |
| **Road Warriors** | Drive trips with multi-stop routes and gas tracking | Drive Mode, street addresses, gas expense shortcuts |
| **Field Professionals** | Daily multi-stop routes with scheduled appointments | Tour stops, smart auto-ordering, stop-level expenses |
| **Touring Professionals** | Bands/crews managing 30+ cities with changing schedules | Bulk import, date-grouped stops, parking tracker |

---

## Revenue Model

**iOS App**: Free to download on the App Store. A SaaS membership is still required to use the app — the free download removes the paywall to install, not the subscription to operate.

**Web SaaS**: Three-tier subscription that powers both web and iOS:

| Tier | Price | Limit | Core Value |
|------|-------|-------|------------|
| **Free** | $0 | 5 lifetime trips | Full trip management, EXPLORE, timeline, packing, calendar export |
| **Pro** | TBD | Unlimited | Drive Mode, reports, health checklist, sharing, alerts |
| **Business** | TBD | Unlimited | All Pro + tour stops, business expense reporting |

> The iOS app is a free download, but a SaaS account (Free, Pro, or Business tier) is required to sign in and use it. Tier limits apply across web and iOS.




---

## Differentiation

| Competitor | Focus | RT2RP Advantage |
|-----------|-------|----------------|
| TripIt | Trip *planning* | We manage *after* booking — execution, not planning |
| Google Trips | Inbox scanning | We don't scan inboxes — users paste confirmations for control |
| Concur/Navan | Enterprise expense | We serve individuals and small teams, not enterprises |
| Spreadsheets | Manual tracking | AI parsing, canonical data, real-time execution |

---

## Technical Moat

- **Canonical Data Architecture**: Single source of truth prevents data drift across views
- **No-Math Time Policy**: All datetime logic uses string primitives — zero timezone bugs
- **AI Parsing Pipeline**: Gemini 2.5 Pro for itinerary parsing, Gemini Flash for booking/receipt extraction
- **Drive Intelligence**: Centralized drive segment resolution with full-address navigation
- **EXPLORE Engine**: Google Places integration with server-side photo proxy and weather-aware ranking
- **Progressive Web App**: Installable on mobile/desktop with offline support and auto-updating service worker via Workbox
- **Native iOS App**: Capacitor-wrapped React app submitted to App Store; same backend, same features
- **SEO Optimized**: Sitemap, structured data (JSON-LD), Open Graph, Twitter Cards, preconnect hints
- **250+ Unit Tests**: Commercial-grade test coverage for business logic
- **Security-First**: RLS on all tables, PII masking, session idle logout, CRON auth

---

## Traction & Metrics

| Metric | Value |
|--------|-------|
| Status | **Published & Live** |
| Web URL | [realtravel2realplaces.app](https://realtravel2realplaces.app) |
| iOS App | **Free on the App Store** — full feature parity, no subscription required |
| Build version | rt2rp-5100 |
| Tables in production | 18+ |
| Edge functions | 14+ |
| Unit tests | 250+ |
| Features shipped | 120+ (see Feature Inventory) |
| Database functions | 30+ security-definer functions |
| RLS policies | 50+ row-level security policies |

## Pricing

- **iOS App**: Free download — all features included at no cost
- **Web SaaS**: Free tier (5 trips) + Pro/Business subscriptions for unlimited usage

---

## Team

**InLight AI, LLC** — Product design, engineering, and AI integration.

---

## Links

- **Production (Web)**: [realtravel2realplaces.app](https://realtravel2realplaces.app)
- **Published URL**: [realtravel2realplaces.lovable.app](https://realtravel2realplaces.lovable.app)
- **Architecture**: [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **Feature Inventory**: [docs/FEATURE_INVENTORY.md](./FEATURE_INVENTORY.md)

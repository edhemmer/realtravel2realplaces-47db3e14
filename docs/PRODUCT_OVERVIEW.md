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

1. **AI-Powered Ingestion** — Paste or photograph confirmations. AI extracts flights, lodging, car rentals, and activities automatically.
2. **Unified Trip View** — All bookings, expenses, parking, packing, and notes in one canonical dashboard.
3. **Execution-First Design** — The NOW tab shows what matters *right now*: next flight, checkout time, parking expiration.
4. **Cost Clarity** — Real-time expense tracking with per-person splitting, category breakdowns, and business/personal separation.
5. **Smart Logistics** — Parking expiration alerts, TSA info management, airport context, and weather awareness.

---

## Target Users

| Segment | Pain Point | Feature Anchor |
|---------|-----------|----------------|
| **Families** | Coordinating logistics for 4+ people across flights, hotels, activities | Companion management, cost splitting, trip sharing |
| **Frequent Travelers** | Managing 10+ trips/year across business and personal | Unlimited trips, timeline events, trip reports |
| **Field Professionals** | Daily multi-stop routes with scheduled appointments | Tour stops, smart auto-ordering, stop-level expenses |
| **Touring Professionals** | Bands/crews managing 30+ cities with changing schedules | Bulk import, date-grouped stops, parking tracker |

---

## Revenue Model

Three-tier SaaS subscription:

| Tier | Price | Limit | Core Value |
|------|-------|-------|------------|
| **Free** | $0 | 5 lifetime trips | Full trip management to prove value |
| **Pro** | TBD | Unlimited | Advanced intelligence (timeline, alerts, reports) |
| **Business** | TBD | Unlimited | Tour stops, business expense reporting |

**Monetization strategy**: Free tier demonstrates full value. Pro unlocks intelligence layers (timeline events, health checklist, explore engine). Business unlocks team/field tools.

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
- **AI Parsing Pipeline**: Gemini 2.5 Pro for itinerary parsing (with DATE INDEPENDENCE rules for multi-leg accuracy), Gemini Flash for booking/receipt extraction
- **250+ Unit Tests**: Commercial-grade test coverage for business logic
- **Security-First**: RLS on all tables, PII masking, session idle logout, CRON auth

---

## Traction & Metrics

| Metric | Value |
|--------|-------|
| Tables in production | 18+ |
| Edge functions | 14+ |
| Unit tests | 250+ |
| Features shipped | 100+ (see Feature Inventory) |
| Database functions | 30+ security-definer functions |
| RLS policies | 50+ row-level security policies |

---

## Team

**InLight AI, LLC** — Product design, engineering, and AI integration.

---

## Links

- **Production**: [realtravel2realplaces.lovable.app](https://realtravel2realplaces.lovable.app)
- **Architecture**: [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **Feature Inventory**: [docs/FEATURE_INVENTORY.md](./FEATURE_INVENTORY.md)

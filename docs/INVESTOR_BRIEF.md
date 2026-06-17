# Real Travel 2 Real Places — Investor Brief

**Pre-Seed / Angel Round**
**InLight AI, LLC**
**March 2026**

---

## Executive Summary

Real Travel 2 Real Places (RT2RP) is a **Travel Relationship Management (TRM)** platform — the first SaaS product designed to manage the operational chaos of travel *after* trips are booked. While the travel industry has spent billions on planning and booking, no product owns the execution layer: the moment-to-moment logistics of being on the road.

RT2RP fills this gap with a production-grade, AI-powered trip command center that replaces scattered emails, spreadsheets, and note apps with a calm, unified system.

**Live product**: [realtravel2realplaces.app](https://realtravel2realplaces.app)

---

## The Problem

Travelers already have tools to *find* flights and *book* hotels. What they don't have is a system to manage what happens next.

After booking, trip logistics fragment across:
- **Email inboxes** — confirmations buried under hundreds of messages
- **Spreadsheets** — manual expense tracking, error-prone, never up to date
- **Note apps** — addresses, confirmation numbers, and parking details scattered
- **Memory** — "What time is checkout? Where did I park? Did I log that expense?"

This fragmentation creates real cost:
- **Lost receipts** → missed reimbursements
- **Missed details** → wrong airport terminals, forgotten checkout times
- **Coordination failures** → multi-person trips with no shared source of truth
- **No situational awareness** → no system that knows what you need *right now*

### Why Existing Solutions Fail

| Tool | What It Does | What It Doesn't Do |
|------|-------------|-------------------|
| Itinerary tools | Organize reservations and schedules | No expense tracking, no execution layer, no drive support |
| Legacy trip aggregators | Aggregate trip info | Limited active consumer innovation; no operational ownership |
| Enterprise expense platforms | Enterprise expense reporting | Designed for corporate finance teams, not individual travelers |
| Spreadsheets | Manual everything | No AI parsing, no real-time awareness, no mobile-first UX |

**The gap**: Nobody owns the *execution layer* of travel — the logistics between booking and returning home.

---

## The Solution

RT2RP is a **trip command center** that centralizes everything a traveler needs to manage during a trip:

### Core Capabilities

| Capability | Description |
|-----------|-------------|
| **AI Ingestion** | Paste a confirmation email or photograph a receipt. AI extracts flights, lodging, rentals, activities, and expenses automatically. |
| **Unified Trip View** | One screen for bookings, expenses, parking, packing, companions, notes — per trip. |
| **Execution-First Design** | A NOW tab shows what matters right now: next flight, checkout time, parking expiration, drive destination. |
| **Drive Mode** | Focused navigation screen for road trips with route intelligence and one-tap directions. |
| **EXPLORE** | Discover real places near your destination with photos, ratings, and reviews from the place-data provider. |
| **Cost Clarity** | Real-time expense tracking with per-person splitting, receipt OCR, and business/personal separation. |
| **Smart Logistics** | Parking expiration alerts, weather awareness, calendar export, packing lists with climate intelligence. |
| **Installable PWA** | Works like a native app on iOS, Android, and desktop — with offline support. |

### Key Differentiator

RT2RP doesn't help you *plan* a trip. It helps you *manage* one. The product begins where booking ends — and stays useful through every day of travel until you're home.

---

## Market Opportunity

### Total Addressable Market (TAM)

The global travel management market is valued at **$7.7B (2024)** and projected to reach **$16.2B by 2031** (CAGR: 11.2%).

Within that:
- **Travel expense management software**: $3.5B (2024) → $7.1B (2030)
- **Consumer travel app market**: $1.2B (2024), largely planning-focused
- **SMB travel management**: Fastest-growing segment with no dominant player

### Serviceable Addressable Market (SAM)

- **68M Americans** travel 5+ times/year (frequent travelers)
- **40M** self-employed or small-business travelers (no corporate travel department)
- **20M** families planning 2+ trips/year with multi-person coordination needs

### Serviceable Obtainable Market (SOM) — Year 1-2

- Initial target: **self-managed frequent travelers** (5+ trips/year)
- Beachhead: **road warriors, touring professionals, and family trip coordinators**
- Conservative Y1 target: **5,000 active users**, **500 paid subscribers**

---

## Business Model

### Three-Tier SaaS Subscription

| Tier | Price Target | Trip Limit | Core Value |
|------|-------------|------------|------------|
| **Free** | $0 | 2 lifetime trips | Full trip management — enough to prove value |
| **Pro** | $9.99/mo | Unlimited | Timeline events, health checklist, reports, sharing, alerts, Drive Mode |
| **Business** | $19.99/mo | Unlimited | All Pro + tour stops, business expense reporting, multi-trip reports |

### Revenue Projections (Conservative)

| Year | Active Users | Paid Conversion | MRR | ARR |
|------|-------------|----------------|-----|-----|
| Y1 | 5,000 | 10% (500) | $5,000 | $60,000 |
| Y2 | 25,000 | 12% (3,000) | $30,000 | $360,000 |
| Y3 | 100,000 | 15% (15,000) | $150,000 | $1,800,000 |

### Unit Economics (Target)

| Metric | Target |
|--------|--------|
| CAC | < $15 (content marketing, SEO, app store organic) |
| LTV | $120+ (12-month average Pro subscription) |
| LTV:CAC ratio | > 8:1 |
| Monthly churn | < 5% |
| Gross margin | > 85% (cloud infrastructure only) |

---

## Product Maturity

RT2RP is not a prototype. It is a **production-grade SaaS application** with:

| Metric | Value |
|--------|-------|
| Production database tables | 22+ |
| Edge functions (serverless) | 14+ |
| Unit tests | 250+ |
| Features shipped | 120+ |
| Security-definer DB functions | 30+ |
| Row-Level Security policies | 50+ |
| AI parsing models integrated | 4 (Gemini 2.5 Pro, Gemini Flash, Gemini 3 Flash) |
| Build version | rt2rp-5100 |

### Technical Architecture Highlights

- **Canonical Data Architecture**: Single source of truth prevents data drift across views
- **No-Math Time Policy**: All datetime logic uses string primitives — zero timezone bugs across any timezone
- **AI Parsing Pipeline**: Multi-model AI extracts structured data from unstructured confirmations with >90% accuracy
- **Security-First**: Row-Level Security on every table, PII masking for shared trips, session management, RBAC admin
- **Progressive Web App**: Installable on all platforms with offline support — no app store dependency
- **SEO Optimized**: Structured data, sitemap, Open Graph — ready for organic acquisition

---

## Target Customer Segments

| Segment | Size | Pain Intensity | Willingness to Pay |
|---------|------|---------------|-------------------|
| **Frequent Travelers** (10+ trips/yr) | 68M US | High — managing logistics across many trips | High — time savings worth $10/mo |
| **Family Trip Coordinators** | 40M US | High — coordinating for 4+ people | Medium — value in splitting costs |
| **Road Warriors / Field Reps** | 15M US | Very High — multi-stop daily routes | High — direct business value |
| **Touring Professionals** | 2M US | Extreme — 30+ cities, changing schedules | Very High — operational necessity |
| **Small Business Travelers** | 40M US | Medium — no corporate travel department | High — expense tracking for taxes |

### Initial Beachhead

**Frequent travelers who drive** — road warriors managing multi-stop trips with gas, parking, and navigation needs. This segment has the highest pain intensity, no competitive solution, and the shortest path to paid conversion.

---

## Competitive Landscape

### Positioning Map

```
                    PLANNING ←─────────────────────→ EXECUTION
                         │                              │
       Itinerary tools ○  │                              │
                         │                              │
 Legacy aggregators ○    │                              │
                         │                              │
                         │                              │
       Planning apps ○   │                              │   ★ RT2RP
                         │                              │
                         │                              │
              ───────────┼──────────────────────────────┼───────
              CONSUMER   │                              │  PROSUMER
                         │                              │
  Enterprise tools ○     │                              │
                         │                              │
                         │                              │
              ENTERPRISE │                              │
```

**RT2RP occupies a unique position**: execution-focused, prosumer-grade, with no direct competitor.

### Competitive Moats

1. **Category Creation**: "Travel Relationship Management" is a new category — first-mover advantage
2. **Canonical Data Architecture**: Technical moat that ensures data integrity competitors would need to rebuild from scratch
3. **AI Parsing Pipeline**: Multi-model ingestion trained on real travel confirmations
4. **Drive Intelligence**: Road trip management is entirely unaddressed by competitors
5. **Offline-First PWA**: No app store dependency, instant deployment, lower CAC

---

## Go-To-Market Strategy

### Phase 1: Organic Foundation (Months 1-6)
- **SEO content marketing**: "how to organize travel expenses," "trip management app," "road trip planner"
- **App store optimization**: PWA listing in app directories
- **Community seeding**: Reddit (r/travel, r/roadtrip, r/digitalnomad), travel forums
- **Product Hunt launch**: Target top-5 of the day

### Phase 2: Paid Acquisition (Months 6-12)
- **Search ads**: Target high-intent keywords ("travel expense tracker," "trip organizer app")
- **Instagram/TikTok**: Short-form content showing real-time trip management
- **Affiliate partnerships**: Travel bloggers, road trip content creators

### Phase 3: Expansion (Months 12-24)
- **B2B2C partnerships**: Small travel agencies, corporate travel managers
- **API/integrations**: Calendar sync, airline APIs, hotel loyalty programs
- **International expansion**: Multi-currency and multi-language support

---

## Use of Funds

### Target Raise: $500K Pre-Seed

| Allocation | Amount | Purpose |
|-----------|--------|---------|
| **Product Development** | $200K (40%) | Full-time engineering, AI model refinement, native mobile wrappers |
| **Marketing & Growth** | $150K (30%) | SEO content, paid acquisition testing, Product Hunt, community |
| **Infrastructure** | $50K (10%) | Cloud scaling, monitoring, security audits |
| **Operations** | $75K (15%) | Legal, accounting, entity formation |
| **Reserve** | $25K (5%) | Working capital |

### Milestones (12 months post-funding)

| Milestone | Target |
|-----------|--------|
| Active users | 5,000 |
| Paid subscribers | 500 |
| MRR | $5,000 |
| App store ratings | 4.5+ stars |
| Feature completeness | Payments live, mobile wrappers, API v1 |

---

## Team

### InLight AI, LLC

Product design, engineering, and AI integration. The founding team combines expertise in:

- **Full-stack SaaS development** — React, TypeScript, PostgreSQL, serverless architecture
- **AI/ML integration** — Production AI parsing pipelines with multi-model orchestration
- **Product design** — Mobile-first, premium SaaS UX patterns (Stripe, Linear, Notion-inspired)
- **Travel domain expertise** — Built from personal experience managing 20+ trips/year

---

## Why Now

1. **AI maturity**: Large language models now parse unstructured travel documents with >90% accuracy — this was impossible 2 years ago
2. **PWA adoption**: Progressive Web Apps eliminate app store friction — install directly from the browser
3. **Remote work**: 40% of knowledge workers now travel for hybrid work, creating a new class of frequent traveler
4. **Expense tracking demand**: Post-pandemic expense tracking is table stakes for self-employed travelers (tax deductions)
5. **No incumbent**: Planning, navigation, booking, and expense tools each own a slice, but no one owns the traveler execution layer

---

## Ask

**$500K pre-seed round** to:
1. Scale to 5,000 active users
2. Launch payment processing (Stripe)
3. Build native mobile wrappers (iOS/Android via Capacitor)
4. Achieve product-market fit signals (>10% paid conversion, <5% monthly churn)

---

## Contact

**InLight AI, LLC**
Email: inlightai26 [at] gmail [dot] com
Product: [realtravel2realplaces.app](https://realtravel2realplaces.app)

---

*This document is confidential and intended for potential investors. Do not distribute without permission from InLight AI, LLC.*

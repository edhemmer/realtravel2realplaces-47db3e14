# Real Travel 2 Real Places

**We don't plan your trip. We manage everything after it's booked.**

Real Travel 2 Real Places is a personal travel command center that replaces spreadsheets and scattered notes with a single, calm, reliable system for managing flights, lodging, expenses, and on-the-road logistics.

Built by [InLight AI, LLC](https://inlightai.com).

---

## Why Travelers Pay

Google Maps knows a route. Airline apps know one airline. Booking apps know a reservation. RealTravel2RealPlaces manages the whole trip across all of them.

The paid value is the operating layer: live next actions, Drive Cockpit, airport and transit windows, offline trip details, parking, weather, expenses, companions, and reports in one place. It is for travelers who want fewer missed details, less app-hopping, cleaner reimbursement records, and a calmer travel day.

---

## What It Does

| Capability | Description |
|-----------|-------------|
| **Booking Management** | Flights, lodging, car rentals, transport, and activities — with AI-powered confirmation parsing |
| **Expense Tracking** | Per-trip expense log with receipt OCR, category breakdowns, and cost summaries |
| **Packing Lists** | AI-generated packing suggestions based on trip context |
| **Companion Management** | Traveler details, TSA info, and per-person cost splitting |
| **Parking Tracker** | Location, level/space, expiration alerts, and cost tracking |
| **Trip Sharing** | Invite others with granular permissions (view-only, expenses, lodging) |
| **Explore Engine** | Discover nearby attractions based on lodging or device location |
| **Tour Stops** | Business-tier stop management with smart auto-ordering |
| **Trip Reports** | PDF/CSV export of trip summaries for reimbursement |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State Management | TanStack Query (React Query v5) |
| Routing | React Router v6 |
| Backend | Lovable Cloud (PostgreSQL + Edge Functions) |
| AI Services | Lovable AI (Gemini models) |
| Auth | Email/password with session management |
| Security | Row-Level Security (RLS) on all tables, PII masking for non-owners |
| Native iOS | Capacitor (bundled React app with native shell) |
| PWA | vite-plugin-pwa + Workbox (offline-capable, installable) |

---

## Architecture Highlights

- **Canonical Helpers**: Single source of truth for trip state, costs, and timeline events
- **Container Pattern**: Route → Container → Presentational View with standardized states
- **No-Math Time Policy**: All datetime operations use string-based primitives — no timezone drift
- **Desktop Shell**: Centralized context provider eliminates redundant data fetches across tabs
- **Mobile-First**: Bottom nav, safe areas, touch-optimized targets, platform-specific routing
- **Native iOS**: Capacitor-wrapped app with App Store distribution, safe-area insets, native share sheet
- **250+ Unit Tests**: Commercial-grade test coverage across core business logic

---

## Subscription Tiers

**iOS App**: Free to download on the App Store. A SaaS membership is still required to sign in and use the app.

**Web SaaS** (same account works on iOS):

| Tier | Trips | Key Features |
|------|-------|-------------|
| **Free** | 2 lifetime | Full booking/expense management, packing, sharing, calendar export |
| **Pro** | Unlimited | Timeline events, health checklist, parking alerts, explore engine, trip reports |
| **Business** | Unlimited | Tour stops, business expense reporting, stop-level expense assignment |

> The iOS app is a free download, but a SaaS account (Free, Pro, or Business) is required to use it. Tier limits apply across both web and iOS.


---

## Project Structure

```
src/
├── components/       # React components (ui/, trips/, cards/, layout/)
├── containers/       # Data-wiring containers (canonical hook consumers)
├── contexts/         # React contexts (AuthContext)
├── hooks/            # Custom React hooks (50+ domain hooks)
├── lib/              # Utility functions & canonical helpers
├── pages/            # Route page components
├── types/            # TypeScript type definitions
└── integrations/     # Auto-generated backend client

supabase/
├── functions/        # 10+ Edge Functions (AI parsing, notifications, lifecycle)
└── migrations/       # Database migrations

docs/
├── ARCHITECTURE.md   # System architecture & data flow
├── DEVELOPER_GUIDE.md # Coding standards & workflow
├── COMPONENTS.md     # Component reference
├── AI_PROMPTS.md     # AI system prompt reference
├── PRODUCT_OVERVIEW.md # Product overview & positioning
└── FEATURE_INVENTORY.md # Complete feature inventory by tier
```

---

## Documentation

- **[Architecture Guide](docs/ARCHITECTURE.md)** — System design, data flow, and architectural principles
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** — Coding standards and development workflow
- **[Component Reference](docs/COMPONENTS.md)** — Component documentation
- **[Product Overview](docs/PRODUCT_OVERVIEW.md)** — Product positioning, market, and differentiation
- **[Feature Inventory](docs/FEATURE_INVENTORY.md)** — Complete feature list organized by tier

---

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run tests
bun run test
```

### Auto-Generated Files (Do Not Edit)
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `supabase/config.toml`
- `.env`

---

## Deployment

- **Frontend**: Published via Lovable (click Publish → Update)
- **Backend**: Edge functions and migrations deploy automatically
- **Production URL**: [realtravel2realplaces.lovable.app](https://realtravel2realplaces.lovable.app)
- **Custom Domain**: [realtravel2realplaces.app](https://realtravel2realplaces.app)
- **iOS App**: Free download on the App Store — Capacitor-native build with full feature parity; SaaS membership required to sign in

---

## Security

- Row-Level Security (RLS) on all 18+ tables
- PII masking for non-owners via security-definer functions
- Session idle timeout (2 hours)
- CRON-secret-authenticated background jobs
- Secure receipt storage with 1-hour signed URLs
- RBAC admin system via separate `user_roles` table

---

## License

Proprietary — All rights reserved.

© 2024–2026 InLight AI, LLC

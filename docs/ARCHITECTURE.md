# Real Travel 2 Real Places — Architecture Guide

This document provides an overview of the application architecture for developers.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Data Flow](#data-flow)
4. [Key Patterns](#key-patterns)
5. [Canonical State Architecture](#canonical-state-architecture)
6. [Security](#security)
7. [Subscription Model](#subscription-model)
8. [Database Schema](#database-schema)
9. [Container Architecture](#container-architecture)
10. [Performance](#performance)
11. [PWA Architecture](#pwa-architecture)
12. [SEO Architecture](#seo-architecture)

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State Management | TanStack Query (React Query v5) |
| Routing | React Router v6 |
| Backend | Lovable Cloud (PostgreSQL + Edge Functions) |
| AI Services | Lovable AI (Gemini 2.5 Pro for itinerary parsing, Gemini Flash for other parsers) |
| Auth | Email/password with session management |
| PWA | vite-plugin-pwa + Workbox (auto-update service worker) |
| Native iOS | Capacitor (bundled React app with native iOS shell) |
| SEO | react-helmet-async, JSON-LD structured data, sitemap.xml |

---

## Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui base components
│   ├── cards/           # Shared presentational cards
│   ├── layout/          # Layout components (MobileBottomNav, TripDetailLayout)
│   ├── landing/         # Landing page sections
│   ├── trips/           # Trip-related components
│   │   ├── tabs/        # Tab content components
│   │   ├── explore/     # Explore engine components
│   │   └── now/         # NOW Command Center components
│   ├── access/          # Plan gating components
│   ├── account/         # Account/settings components
│   ├── notifications/   # Notification bell & preferences
│   └── support/         # Support ticket dialog
├── containers/          # Container components (data wiring)
│   ├── DesktopTripShell.tsx  # Canonical desktop trip context provider
│   ├── NowCommandCenter.tsx  # NOW tab execution engine
│   ├── TripSummaryContainer.tsx
│   ├── TripBookingsContainer.tsx
│   ├── TripTourContainer.tsx
│   ├── TripExpensesContainer.tsx
│   ├── TripAlertsContainer.tsx
│   └── MobileNavigationRouter.tsx
├── contexts/            # React contexts (AuthContext)
├── hooks/               # 50+ custom React hooks
│   ├── useTrips.ts, useBookings.ts, useExpenses.ts
│   ├── useCanonicalTripState.ts  # Canonical trip state computation
│   ├── useAccess.ts              # Single plan gating resolver
│   ├── useTravelAlerts.ts        # Intelligence surface
│   └── ...
├── lib/                 # Utility functions & canonical helpers
│   ├── canonicalTripState.ts     # Trip state aggregation
│   ├── canonicalTimePolicy.ts    # No-Math time policy
│   ├── canonicalTimePreservation.ts
│   ├── canonicalNextStop.ts
│   ├── canonicalTodayExecutionStack.ts
│   ├── canonicalTodayCriticalActions.ts
│   ├── expenseCalculations.ts
│   ├── drive/dayOrder.ts         # Tour stop ordering engine
│   ├── tours/import/             # Smart import pipeline
│   └── ...
├── pages/               # Route page components
├── types/               # TypeScript type definitions
├── integrations/        # Auto-generated backend client
│   └── supabase/        # client.ts, types.ts (read-only)
└── main.tsx

public/
├── favicon.png          # App icon
├── pwa-icon-192.png     # PWA icon 192×192
├── pwa-icon-512.png     # PWA icon 512×512
├── robots.txt           # Crawler directives with Sitemap reference
├── sitemap.xml          # XML sitemap for search engines
├── rt2rp-logo.png       # Brand logo
└── rt2rp-logo-dark.png  # Brand logo (dark variant)

resources/                 # iOS app store assets
├── icon.png             # 1024×1024 App Store icon
└── splash.png           # 2732×2732 launch screen

supabase/
├── functions/           # 14+ Edge Functions
│   ├── _shared/         # Shared utilities (CORS, auth, AI client)
│   ├── parse-booking/   # AI booking confirmation parser
│   ├── parse-itinerary/ # AI itinerary parser
│   ├── parse-booking-image/ # Photo confirmation parser
│   ├── parse-receipt-image/ # Receipt OCR parser
│   ├── generate-packing-list/ # AI packing suggestions
│   ├── generate-notifications/ # Notification generator
│   ├── normalize-airfare-costs/ # Cost normalization
│   ├── send-companion-summary/ # Email notifications
│   ├── trip-lifecycle-enforcement/ # Cron-authenticated lifecycle manager
│   ├── nearby-places/   # Place-data provider search with photos (v4.8.0)
│   ├── places-photo/    # Place-data photo proxy (v4.8.0)
│   ├── places-search/   # Legacy places search
│   ├── admin-get-support-tickets/
│   └── admin-update-ticket-status/
├── migrations/          # Database migrations (read-only)
└── config.toml          # Supabase configuration (read-only)

docs/
├── ARCHITECTURE.md      # This file
├── DEVELOPER_GUIDE.md   # Development workflow & coding standards
├── COMPONENTS.md        # Component documentation
├── AI_PROMPTS.md        # AI system prompts reference
├── PRODUCT_OVERVIEW.md  # Product positioning & market overview
└── FEATURE_INVENTORY.md # Complete feature inventory by tier
```

---

## Mobile-First Architecture

| Viewport | Navigation | Layout |
|----------|------------|--------|
| < 768px (mobile) | Fixed bottom nav with labeled icons | Full-width with safe-area padding |
| ≥ 768px (desktop) | Horizontal tab bar | Standard container with DesktopTripShell |

Key mobile features:
- Safe area handling for iOS home indicator
- Touch-optimized targets (min 56×44px)
- "More" dropdown for secondary tabs
- Surface styling aligned with card system: `bg-card`, `border-border/60`, `shadow-lg`
- Section mode title in primary color
- ExecutionZone: execution-first Command Center at top of NOW tab

### Navigation Compression (v5.0.0)

Mobile bottom nav uses a compressed 5+More structure:

**Primary tabs:** Timeline, Bookings, Explore, Expenses, Packing

**More menu:** NOW, Weather, Parking, Report, Members, Companions, Notes & Safety, Tour, Alerts

Desktop tabs follow the same priority order with all tabs visible.

---

## Data Flow

### Query Pattern (Read)
```
Component → useQuery hook → Supabase client → PostgreSQL (RLS) → TanStack Query cache → Render
```

### Mutation Pattern (Write)
```
User action → useMutation hook → Supabase client → PostgreSQL → Query invalidation → Refetch
```

### AI Parsing Flow
```
User uploads/pastes → Frontend → Edge Function → Lovable AI (Gemini) → Structured JSON → Hook creates records → Cache invalidated
```

---

## Key Patterns

### 1. Canonical Helper Architecture
All domain logic lives in canonical helpers — one concept, one module:

| Module | Responsibility |
|--------|---------------|
| `canonicalTripState.ts` | Trip boundaries, timeline, cost summaries |
| `canonicalTimePolicy.ts` | No-Math time primitives (DateOnly, LocalDateTime) |
| `canonicalNextStop.ts` | Next stop resolution |
| `canonicalTodayExecutionStack.ts` | TODAY deterministic execution sequence |
| `canonicalTodayCriticalActions.ts` | Critical action items |
| `canonicalParkingHighlight.ts` | Active parking detection |
| `expenseCalculations.ts` | Cost aggregation |
| `drive/dayOrder.ts` | Tour stop ordering (greedy nearest-neighbor) |

### 2. No-Math Time Policy
All datetime operations use string-based primitives:
- `DateOnly` (YYYY-MM-DD) — branded constructors via `asDateOnly()`
- `LocalDateTime` (YYYY-MM-DDTHH:mm) — via `asLocalDateTime()`
- Comparisons use lexicographical string logic or `timeToMinutes()` integer arithmetic
- ESLint bans `new Date()`, `Date.parse()`, and `date-fns` parsing outside canonical modules

### 3. Container Pattern
```
Route → Container → Presentational View
         │
         └── Calls canonical helpers only
```

### 4. DesktopTripShell (Desktop Context Provider)
- Single owner of trip context, costs, alerts for all desktop tabs
- Computes canonical state ONCE via useMemo
- React Query deduplicates raw data fetches by queryKey
- Stable context value prevents rerender cascades

### 5. Drill-Through Navigation
Components trigger navigation to specific records:
```typescript
<SummaryTab onDrillThrough={(target) => { setActiveTab(target.tab); setHighlightedRecord(target.recordId); }} />
```

---

## Canonical State Architecture

### Trip State Lifecycle
```
ACTIVE → LOCKED (Free users, end_date past) → Data retained, read-only
ACTIVE → CLOSED (Pro users, manual) → DELETED (45 days after end_date)
```

### TODAY Execution Stack
Deterministic sequence for the NOW tab:
```
CHECKOUT → GET_GAS → RETURN_RENTAL → DRIVE_SMART → DRIVE_SMART_AIRPORT → FLIGHT → [remaining timeline events]
```

### Tour/Booking Separation
- **Bookings** = monetary/logistical items (flights, lodging, rentals)
- **Tour Stops** = manual work locations (non-monetary)
- Combined ONLY in timeline and summary views via `getCanonicalTripState()`
- Never cross-imported directly

---

## Security

### Row-Level Security (RLS)
All 18+ tables use RLS policies:
- Anonymous access blocked on all data tables
- Ownership-based: `auth.uid() = user_id`
- Access-based: `user_has_trip_access(trip_id)` (ownership + sharing + membership)
- Write-guard: `user_can_write_trip(trip_id)` (owner + active state)
- Guest-granular: `guest_can_add_expenses()`, `guest_can_add_stays()`

### PII Protection
Sensitive data (emails, phone, TSA/FF numbers, confirmation codes) masked via security-definer RPC functions for non-owners:
- `get_bookings_safe()`, `get_companions_safe()`, `get_trip_shares_safe()`

### Session Management
- Idle logout after 2 hours (configurable)
- Tracked events: click, keydown, touchstart, mousemove, scroll, route changes
- Redirect to `/auth?reason=idle`

### Background Jobs
- `trip-lifecycle-enforcement`: CRON_SECRET_KEY authenticated
- `generate-notifications`: CRON_SECRET_KEY authenticated

### Admin (RBAC)
- `app_role` enum + `user_roles` table
- Security-definer `has_role()` function prevents RLS recursion
- Admin status decoupled from feature access

---

## Subscription Model

| Tier | Trip Limit | Key Features |
|------|------------|-------------|
| Free | 2 lifetime | Full trip management, expenses, packing, sharing |
| Pro | Unlimited | Timeline events, health checklist, explore, reports, alerts, place discovery |
| Business | Unlimited | All Pro + tour stops, business reporting |

### Gating Philosophy
- **Success Enablers** (all users): Dashboard, bookings, expenses, packing, explore
- **Intelligence Layers** (Pro+): Timeline, alerts, health checklist, reports
- **Team Tools** (Business): Tour stops, business expense reporting

### Implementation
```typescript
// src/hooks/useAccess.ts — single source of truth for plan gating
const { isPro, canAccessBusinessFeatures } = useAccess();
```

---

## Database Schema

### Core Tables (18+)

| Table | Purpose |
|-------|---------|
| `trips` | Trip metadata (dates, destination, type, state) |
| `bookings` | Flights, lodging, rentals, transport, activities |
| `expenses` | Per-trip expense records with categories |
| `parking` | Parking entries with expiration tracking |
| `companions` | Travel companions with PII |
| `packing_items` | Packing list items |
| `profiles` | User preferences, subscription tier |
| `trip_events` | Pro canonical timeline events |
| `trip_members` | Trip membership (owner/guest) with permissions |
| `trip_invites` | Email-based invitations with expiring tokens |
| `trip_shares` | Legacy trip sharing |
| `trip_notes` | Free-text notes per trip |
| `engagements` | Business tour stops |
| `trip_engagements` | Timeline-synced engagements |
| `notifications` | In-app notification records |
| `notification_preferences` | User notification settings |
| `stop_reminders` | Stop reminder scheduling |
| `ticket_reminders` | Ticket purchase reminders |
| `booking_companions` | Booking↔Companion linking |
| `support_tickets` | User support requests |
| `upgrade_intents` | Upgrade intent tracking |
| `user_roles` | RBAC admin roles |
| `email_ingestion_addresses` | Inbound email forwarding addresses |
| `pending_imports` | Queued import records for review |

### 30+ Security-Definer Functions
Including: `user_owns_trip`, `user_has_trip_access`, `user_is_pro`, `trip_owner_is_pro`, `has_role`, `is_admin`, `get_bookings_safe`, `get_companions_safe`, `run_trip_lifecycle_enforcement`, `accept_trip_invite`, `create_trip_invite`, `update_member_permissions`, and more.

---

## Container Architecture

### Container Responsibilities

| Container | Canonical Helpers |
|-----------|------------------|
| `DesktopTripShell` | `useCanonicalTripState`, `useTravelAlerts`, `useAccess` |
| `TripSummaryContainer` | `useCanonicalTripState`, `useTravelAlerts` |
| `TripBookingsContainer` | `useBookings`, `useFlightAirportRepair` |
| `TripTourContainer` | `useEngagements` |
| `TripExpensesContainer` | `useExpenses` |
| `TripAlertsContainer` | `useTravelAlerts` |
| `NowCommandCenter` | `useCanonicalTripState`, execution stack |

### Standardized States
| State | Component |
|-------|-----------|
| Loading | `TripSectionLoading` |
| Error | `TripSectionError` |
| Empty | Section-specific empty states |

---

## Performance

### React Render Optimization
| Technique | Usage |
|-----------|-------|
| `React.memo()` | TripCard, memoized containers |
| `useCallback()` | Navigation, delete, form handlers |
| `useMemo()` | Canonical state, cost summaries, alert computation |

### Data Fetching Rules
1. Trip data fetched once per screen, shared via DesktopTripShell context
2. React Query deduplicates by queryKey
3. Subscription staleTime: 30s
4. Single canonical computation, not per-tab

### Critical Invariants
| Invariant | Enforcement |
|-----------|-------------|
| Bookings = money, Tours = stops | Tours have no cost fields |
| Single source of truth for plan | `useAccess()` only |
| Dates never shift by timezone | String-based No-Math policy |
| Flight dates extracted independently | DATE INDEPENDENCE prompt rule (v4.4.3) |
| Missing data stays blank | `hasExplicitTime()` guards |
| Explore shows real data counts | `totalCount` from actual API results, not query limits (v4.8.0) |

---

## PWA Architecture

### Configuration
- **Plugin**: `vite-plugin-pwa` with `registerType: "autoUpdate"`
- **Service Worker**: Workbox-generated, precaches all static assets
- **Manifest**: `name: "Real Travel 2 Real Places"`, `short_name: "RT2RP"`, `display: "standalone"`, `start_url: "/dashboard"`
- **Icons**: 192×192 and 512×512 PNG icons (regular + maskable)

### Caching Strategy
| Resource | Strategy | Cache Name |
|----------|----------|------------|
| App shell (JS/CSS/HTML) | Precache (Workbox) | workbox-precache |
| Google Fonts stylesheets | CacheFirst (1 year) | google-fonts-cache |
| Google Fonts files | CacheFirst (1 year) | gstatic-fonts-cache |

### Key Configurations
- `maximumFileSizeToCacheInBytes`: 5MB
- `navigateFallbackDenylist`: `[/^\/~oauth/]` — excludes OAuth callbacks from SPA fallback
- Auto-update: `registerSW({ immediate: true })` in `main.tsx`

### Install Flow
- `/install` page with `beforeinstallprompt` API support (Chrome/Android)
- iOS Safari step-by-step instructions with Share → Add to Home Screen

---

## Native iOS Architecture

### Capacitor Integration
The iOS app is the same React codebase wrapped in a Capacitor native shell. No feature duplication — one codebase powers web, PWA, and iOS.

| Aspect | Implementation |
|--------|---------------|
| **Framework** | `@capacitor/core` + `@capacitor/ios` |
| **Bundle ID** | `com.inlighttai.rt2rp` |
| **App Name** | `realtravel2realplaces` |
| **Build output** | `.ipa` via Xcode Archive → App Store Connect |

### iOS-Specific Adjustments
- **Safe areas**: `env(safe-area-inset-*)` CSS variables on `BrandHeader`, `MobileBottomNav`, `TripDetailLayout`
- **Status bar**: Styled via `capacitor.config.ts` to match dark theme
- **Deep links**: Custom URL scheme for OAuth return + universal links for invite acceptance
- **Apple Sign-In**: Required by App Store when Google sign-in is present; managed by Lovable Cloud

### Native Capability Bridges (Optional)
- **Background geolocation** → feeds `useDeviceLocation` for true on-trip execution
- **Push notifications (APNs)** → replaces/augments current in-app `useNotifications`
- **Haptics** → on key execution actions (Now / Next Action confirmations)
- **Native share sheet** → for trip share links

### Build Flow
```
Lovable edits → GitHub export → npm install → npm run build → npx cap sync ios → Xcode Archive → App Store Connect
```

---

## SEO Architecture

### Meta Tags
- `index.html`: Base SEO with title, description, Open Graph, Twitter Cards, JSON-LD `SoftwareApplication`
- `LandingPage.tsx`: Override via `react-helmet-async` with landing-specific meta and canonical URL
- `LandingFAQ.tsx`: Inline JSON-LD `FAQPage` schema for FAQ rich results

### Technical SEO
- `public/sitemap.xml`: All public routes (/, /auth, /privacy, /terms, /plans, /install, /help)
- `public/robots.txt`: Allows all crawlers, disallows private routes (/admin*, /reset-password, /complete-profile, /onboarding, /accept-share/*, /accept-invite/*), includes Sitemap directive
- Preconnect hints for `fonts.googleapis.com`, `fonts.gstatic.com`
- DNS prefetch for backend API domain
- Canonical URL on landing page and index.html

---

## Next Steps

- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — Development workflow
- [COMPONENTS.md](./COMPONENTS.md) — Component documentation
- [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) — Product positioning
- [FEATURE_INVENTORY.md](./FEATURE_INVENTORY.md) — Complete feature list
- [AI_PROMPTS.md](./AI_PROMPTS.md) — AI system prompts

---

## Deployment & Published Status

| Platform | URL / Status |
|----------|-------------|
| **Web (Custom Domain)** | [realtravel2realplaces.app](https://realtravel2realplaces.app) |
| **Web (Vercel)** | [realtravel2realplaces.app](https://realtravel2realplaces.app) |
| **iOS** | App Store Connect — submitted for App Store review |
| **Build Guide** | [IOS_BUILD.md](../../IOS_BUILD.md) |

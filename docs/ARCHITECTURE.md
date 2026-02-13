# Real Travel 2 Real Places - Architecture Guide

This document provides an overview of the application architecture for developers.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Data Flow](#data-flow)
4. [Key Patterns](#key-patterns)
5. [Subscription Model](#subscription-model)
6. [Database Schema](#database-schema)

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State Management | TanStack Query (React Query) |
| Routing | React Router v6 |
| Backend | Supabase (Lovable Cloud) |
| Database | PostgreSQL via Supabase |
| Edge Functions | Deno (Supabase Edge Functions) |
| AI Services | Lovable AI (Gemini models) |

---

## Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui base components
│   ├── cards/           # Patch 2.2.3: Shared presentational cards
│   │   ├── BookingCard.tsx   # Booking entity card
│   │   ├── TourStopCard.tsx  # Tour stop card
│   │   ├── ExpenseCard.tsx   # Expense card
│   │   └── index.ts
│   ├── layout/          # Patch 2.2.3: Layout components
│   │   ├── MobileBottomNav.tsx   # Mobile navigation
│   │   ├── TripDetailLayout.tsx  # Trip page wrapper
│   │   └── index.ts
│   ├── trips/           # Trip-related components
│   │   ├── tabs/        # Tab content components
│   │   └── ...
│   └── account/         # Account/settings components
├── containers/          # Patch 2.2.2: Container components
│   ├── index.ts         # Public API
│   ├── TripSummaryContainer.tsx
│   ├── TripBookingsContainer.tsx
│   ├── TripTourContainer.tsx
│   ├── TripExpensesContainer.tsx
│   └── TripAlertsContainer.tsx
├── contexts/            # React contexts (AuthContext)
├── hooks/               # Custom React hooks
│   ├── useTrips.ts      # Trip CRUD operations
│   ├── useBookings.ts   # Booking management
│   ├── useExpenses.ts   # Expense tracking
│   ├── useSubscription.ts # Pro/Free tier logic
│   └── ...
├── lib/                 # Utility functions
│   ├── datetimeIntegrity.ts  # Strict datetime handling
│   ├── expenseCalculations.ts # Cost summary logic
│   └── ...
├── pages/               # Route page components
├── types/               # TypeScript type definitions
├── integrations/        # External service integrations
│   └── supabase/        # Auto-generated Supabase client
└── main.tsx             # Application entry point

supabase/
├── functions/           # Edge functions
│   ├── parse-booking/   # AI booking parser
│   ├── parse-itinerary/ # AI itinerary parser
│   ├── parse-receipt-image/ # OCR receipt parser
│   ├── generate-packing-list/ # AI packing suggestions
│   └── send-companion-summary/ # Email notifications
├── migrations/          # Database migrations (read-only)
└── config.toml          # Supabase configuration (read-only)

docs/
├── ARCHITECTURE.md      # This file
├── DEVELOPER_GUIDE.md   # Development workflow
├── AI_PROMPTS.md        # AI system prompts reference
└── COMPONENTS.md        # Component documentation
```

### Mobile-First Architecture (Patch 2.2.3)

The app follows a mobile-first responsive design:

| Viewport | Navigation | Layout |
|----------|------------|--------|
| < 768px (mobile) | Fixed bottom nav with labeled icons | Full-width content with bottom padding |
| ≥ 768px (desktop) | Horizontal tab bar | Standard container layout |

Key mobile features:
- Safe area handling for iOS home indicator (`pb-safe`)
- Touch-optimized targets (min 56×44px)
- "More" dropdown for secondary tabs (v2.6.9: card-surface-aligned)
- Bottom nav visible across all trip sections
- Surface styling aligned with card system (v2.6.10): `bg-card`, `border-border/60`, `shadow-lg`
- Consistent active/inactive tab styling with `font-semibold`/`font-medium` weight shift

---

## Data Flow

### Query Pattern (Read)

```
Component → useQuery hook → Supabase client → PostgreSQL
                ↓
         TanStack Query cache
                ↓
         Component re-render
```

### Mutation Pattern (Write)

```
User action → useMutation hook → Supabase client → PostgreSQL
                    ↓
            Optimistic update (optional)
                    ↓
            Query invalidation
                    ↓
            Automatic refetch
```

### AI Parsing Flow

```
User uploads document
        ↓
Frontend sends to Edge Function
        ↓
Edge Function calls Lovable AI
        ↓
AI returns structured JSON
        ↓
Frontend creates records via hooks
        ↓
Database updated + cache invalidated
```

---

## Key Patterns

### 1. Custom Hooks for Data Access

All database operations go through custom hooks in `src/hooks/`. This provides:
- Consistent caching via TanStack Query
- Automatic refetching and invalidation
- Type-safe return values
- Loading/error state handling

**Example:**
```typescript
// ✅ Correct - use the hook
const { data: bookings, isLoading } = useBookings(tripId);

// ❌ Wrong - direct Supabase calls in components
const { data } = await supabase.from('bookings').select('*');
```

### 2. Drill-Through Navigation

Components can trigger navigation to specific records:

```typescript
// Define target type
type DrillThroughTarget = {
  tab: 'bookings' | 'parking' | 'expenses';
  recordId?: string;
} | null;

// Pass handler through props
<SummaryTab onDrillThrough={handleDrillThrough} />

// Navigate and highlight
const handleDrillThrough = (target: DrillThroughTarget) => {
  if (target) {
    setActiveTab(target.tab);
    setHighlightedRecord(target.recordId);
  }
};
```

### 3. Datetime Integrity

**Never guess or infer times.** Use `src/lib/datetimeIntegrity.ts`:

```typescript
import { hasExplicitTime, getTimeDisplay } from '@/lib/datetimeIntegrity';

// Check if time is real (not midnight default)
if (hasExplicitTime(booking.start_datetime)) {
  // Safe to show time
}

// Display with fallback
const timeStr = getTimeDisplay(datetime, 'Time not specified');
```

### 4. Pro vs Free Gating

Use subscription hooks for feature gating:

```typescript
import { useIsPro } from '@/hooks/useSubscription';

function MyComponent() {
  const isPro = useIsPro();
  
  if (!isPro) {
    return null; // Or show upgrade prompt
  }
  
  return <ProOnlyFeature />;
}
```

---

## Security

### Session Management

**Idle Logout (v2.1.39):**

Users are automatically logged out after 2 hours of inactivity for security.

```typescript
// src/hooks/useIdleLogout.ts
const IDLE_TIMEOUT_MS = 120 * 60 * 1000; // 2 hours

// Tracked activity events:
// - click, keydown, touchstart, mousemove, scroll
// - Route navigation changes
```

**Behavior:**
1. Timer resets on any user activity
2. After 2 hours idle, user is logged out
3. Redirect to `/auth?reason=idle`
4. Auth page shows: "You were logged out after 2 hours of inactivity for security."

### Row-Level Security (RLS)

All tables use RLS policies. Common patterns:

```sql
-- User owns the trip
CREATE POLICY "Users can view their own trips" 
ON public.trips FOR SELECT 
USING (auth.uid() = user_id);

-- User has access via ownership or sharing
CREATE POLICY "Users can view bookings for accessible trips" 
ON public.bookings FOR SELECT 
USING (user_has_trip_access(trip_id));
```

### PII Protection

Sensitive data (emails, phone, TSA/FF numbers) is masked via secure RPC functions for non-owners.

---

## Subscription Model

### Tiers

| Tier | Trip Limit | Features |
|------|------------|----------|
| Free | 5 lifetime | Core trip management |
| Pro | Unlimited | TripEvents, Health Checklist, Upcoming Events, Trip Reports, Companion Invites |
| Business | Unlimited | All Pro features + Tour Stops, Business Reporting |

### Key Principles

1. **Free tier is fully functional** - Users can manage real trips
2. **Pro adds intelligence** - Time-based events, proactive warnings
3. **Business adds team tools** - Tour stops, advanced reporting
4. **No silent limits** - Clear messaging when limits apply
5. **Single source of truth** - `subscription_tier` in profiles table determines access

### Implementation

```typescript
// src/hooks/useAccess.ts
// Access is determined solely by the subscription_tier database field.
// No hardcoded overrides. Admin status is decoupled from feature access.
```

---

## Tour / Bookings Separation (v2.1.6)

### Architectural Principle

**Bookings and Tour must never mingle directly.** They only appear together in Timeline, Summary, and Reports through the canonical trip state.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Canonical Trip State                                  │
│                    (getCanonicalTripState)                                   │
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   Bookings   │    │   Parking    │    │   Expenses   │                  │
│  │   (flights,  │    │              │    │              │                  │
│  │    stays,    │    │              │    │              │                  │
│  │   rentals)   │    │              │    │              │                  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                   │                           │
│         └───────────────────┴───────────────────┘                           │
│                             │                                                │
│                             ▼                                                │
│                 CanonicalTimelineEvent[]                                     │
│                             │                                                │
│         ┌───────────────────┼───────────────────┐                           │
│         ▼                   ▼                   ▼                           │
│  ┌─────────────┐    ┌─────────────────┐   ┌─────────────┐                  │
│  │  Summary    │    │  Tour (Stops)   │   │   Reports   │                  │
│  │  Timeline   │    │  via canonical  │   │             │                  │
│  └─────────────┘    │  events only    │   └─────────────┘                  │
│                     └─────────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Enforcement Rules

1. **Tour does not depend directly on Bookings models**
   - Tour components do NOT import booking types/hooks
   - Tour auto-draft uses `generateTourDraftFromCanonicalEvents()`
   - Once Tour stops are created, they are independent records

2. **Bookings do not depend on Tour**
   - Bookings code does NOT import Tour types/hooks/components
   - Bookings may trigger Tour auto-draft via canonical state, not directly

3. **Shared views use canonical trip state**
   - Summary timeline: `getCanonicalTripState()`
   - Trip Report: Canonical aggregator
   - No cross-module hacks

### Tour Draft Generation

```typescript
import { generateTourDraftFromCanonicalEvents } from '@/lib/canonicalTripState';

// Tour auto-draft from canonical events
const { timelineEvents } = getCanonicalTripState(trip, bookings, expenses, parking);
const draftStops = generateTourDraftFromCanonicalEvents(timelineEvents);
```

---

## Parsing Confidence Hints (v2.1.3)

### Shared Hint Components

Located in `src/components/trips/ParseHint.tsx`:

| Component | Purpose |
|-----------|---------|
| `ParseOriginHint` | Shows origin: "From email", "From pasted text", "From receipt" |
| `StopSourceHint` | Tour-specific: "From flight", "From stay", "Imported from text" |
| `EstimatedHint` | Appends "(estimated)" to inferred times/amounts |

### Context-Specific Rules

| Tab | Hints About |
|-----|-------------|
| Bookings | Money + source (email, pasted text) |
| Expenses | Money + source (receipt, email) |
| Tour | Source only (bookings vs bulk/email), no cost |

### Usage

```typescript
import { ParseOriginHint, EstimatedHint, StopSourceHint } from '@/components/trips/ParseHint';

// Bookings/Expenses - cost context
<ParseOriginHint origin="receipt" />
<EstimatedHint isEstimated={!hasExplicitAmount}>{amount}</EstimatedHint>

// Tour - source context
<StopSourceHint source="flight" />
<StopSourceHint source="bulk_email" />
```

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `trips` | Trip metadata (dates, destination, type) |
| `bookings` | Flights, stays, rentals, transport, activities |
| `expenses` | Individual expense records |
| `parking` | Parking entries with location/time |
| `companions` | Travel companions with contact info |
| `packing_items` | Packing list items per trip |
| `profiles` | User preferences and subscription |
| `trip_events` | Pro-only time-based events |
| `trip_shares` | Trip sharing permissions |
| `engagements` | Business stops/work locations (Tour) |

### Booking Types

| Type | Description |
|------|-------------|
| `flight` | Air travel with airline, passenger, TSA info |
| `stay` | Hotels, Airbnb, VRBO with check-in/out |
| `car_rental` | Rental vehicles with pickup/return locations |
| `transport` | Ground transport: train, bus, metro, ferry (v2.1.37) |
| `activity` | Tours, attractions, events |

### Transport Modes (v2.1.37)

```typescript
type TransportModeType = 'train' | 'bus' | 'metro' | 'ferry' | 'other';

// Transport-specific fields:
// - transport_mode: TransportModeType
// - from_location: string
// - to_location: string  
// - operator: string (e.g., "Eurostar", "SNCB")
```

### Row-Level Security (RLS)

All tables use RLS policies. Common patterns:

```sql
-- User owns the trip
CREATE POLICY "Users can view their own trips" 
ON public.trips FOR SELECT 
USING (auth.uid() = user_id);

-- User has access via ownership or sharing
CREATE POLICY "Users can view bookings for accessible trips" 
ON public.bookings FOR SELECT 
USING (user_has_trip_access(trip_id));
```

### Helper Functions

| Function | Purpose |
|----------|---------|
| `user_owns_trip(trip_id)` | Check if current user owns trip |
| `user_has_trip_access(trip_id)` | Check ownership or share access |
| `user_is_pro(user_id)` | Check Pro subscription |
| `trip_owner_is_pro(trip_id)` | Check if trip owner is Pro |

---

## Performance Considerations (v2.1.28)

### React Render Optimization

| Component | Optimization | Impact |
|-----------|--------------|--------|
| `TripCard` (Dashboard) | `React.memo()` | Prevents re-render on sibling updates |
| Navigation handlers | `useCallback()` | Stable references prevent child re-renders |
| Canonical trip state | `useMemo()` | Caches timeline/cost calculations |
| Cost summaries | `useMemo()` | Avoids recalculating on every render |

### Data Fetching Rules

1. **Single fetch per screen**: Trip data is fetched once by the parent page, not by each tab
2. **Canonical hooks**: All components use `useCanonicalTripState` for trip state, `useAccess` for plan gating
3. **Query caching**: TanStack Query caches results with configurable staleTime (30s for subscription)

### Critical Invariants

| Invariant | Enforcement |
|-----------|-------------|
| Bookings = money, Tours = stops | Tours have no cost fields; `calculateTripCostSummary` ignores them |
| Single source of truth for plan | `useAccess()` is the only plan resolver |
| Dates never shift by timezone | `parseISO(date + 'T00:00:00')` pattern |
| Missing data stays blank | No guessing; `hasExplicitTime()` guards time display |

---

## Container Architecture (v2.2.2)

### Bug-Fix-at-Source Pattern

Patch 2.2.2 introduces container components that wire routes to canonical helpers:

```
Route → Container → Presentational View
         │
         └── Calls canonical helpers only:
             - useAccess() for plan gating
             - useCanonicalTripState() for costs/timeline
             - useTripWeather() for weather data
             - useEngagements() for tour stops
```

### Container Responsibilities

| Container | Canonical Helpers Used |
|-----------|----------------------|
| `TripSummaryContainer` | `useCanonicalTripState`, `useTripWeather`, `useTravelAlerts` |
| `TripBookingsContainer` | `useBookings`, `normalizeFlightBookingCosts` |
| `TripTourContainer` | `useEngagements`, `buildMapsUrl` |
| `TripExpensesContainer` | `useExpenses`, `calculateTripCostSummary` |
| `TripAlertsContainer` | `useTravelAlerts`, `useTripWeather` |

### Standardized States

All containers use consistent loading/error/empty patterns:

| State | Component |
|-------|-----------|
| Loading | `TripSectionLoading` |
| Error | `TripSectionError` (calm message + optional retry) |
| Empty | Section-specific (`EmptyBookingsState`, `EmptyTourState`, etc.) |

### Benefits

1. **Single fix point**: Bug in cost calculation? Fix in `lib/expenseCalculations.ts` and all tabs update
2. **Consistent UX**: Same loading/error/empty patterns across all sections
3. **Testable**: Containers isolate data wiring from UI rendering
4. **Documentation**: Each container documents which canonical helpers it uses

---

## Next Steps

- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Development workflow
- [COMPONENTS.md](./COMPONENTS.md) - Component documentation
- [AI_PROMPTS.md](./AI_PROMPTS.md) - AI system prompts

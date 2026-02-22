# Real Travel 2 Real Places - Developer Guide

This guide covers development workflow, coding standards, and best practices.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Coding Standards](#coding-standards)
4. [Component Guidelines](#component-guidelines)
5. [Hook Patterns](#hook-patterns)
6. [Testing](#testing)
7. [Common Pitfalls](#common-pitfalls)

---

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Git
- Lovable account (for deployment)

### Local Development

The project runs in Lovable's cloud environment. For local development:

1. Clone the repository
2. Install dependencies: `bun install`
3. Start dev server: `bun run dev`

### Environment Variables

Environment variables are auto-managed by Lovable Cloud:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier |

**Never edit `.env` directly** - it's auto-generated.

---

## Development Workflow

### Patch Development Rules

During patch cycles, follow these constraints:

1. ✅ Bug fixes and stability improvements
2. ✅ UX refinements
3. ✅ Documentation updates
4. ❌ New features
5. ❌ Database schema changes
6. ❌ Breaking changes to existing functionality

### Version Naming

```
v2.1.0 - Major feature (Pro Trip Health Checklist)
v2.1.1 - Minor feature (Upcoming Events Strip)
v2.1.2 - UX patch (Past Trips Visual De-Emphasis)
v2.1.3 - UI: Parsing Confidence Hints (Bookings, Tour, Expenses)
v2.1.6 - Technical: Tour/Bookings Separation via Canonical State
v4.7.0 - Explore: Canonical ranking with time-of-day/weather biasing
v4.8.0 - Explore: Google Places photos, grocery category, streamlined section UX
```

### Code Comments

Include version tags in significant changes:

```typescript
// v2.1.6: Tour uses canonical events, not direct booking references
const draftStops = generateTourDraftFromCanonicalEvents(timelineEvents);
```

---

## Coding Standards

### TypeScript

- Use strict TypeScript (`strict: true`)
- Prefer interfaces over types for object shapes
- Use explicit return types for exported functions
- Avoid `any` - use `unknown` with type guards if needed

```typescript
// ✅ Good
interface TripEvent {
  id: string;
  event_type: TripEventType;
  event_datetime: string;
}

export function formatEvent(event: TripEvent): string {
  return `${event.event_type} at ${event.event_datetime}`;
}

// ❌ Bad
export function formatEvent(event: any) {
  return event.event_type + ' at ' + event.event_datetime;
}
```

### Imports

Order imports by:
1. React and external libraries
2. Internal hooks
3. Internal components
4. Types
5. Utilities

```typescript
import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';

import { useBookings } from '@/hooks/useBookings';
import { useIsPro } from '@/hooks/useSubscription';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import type { Booking } from '@/types/database';

import { hasExplicitTime } from '@/lib/datetimeIntegrity';
```

### Tailwind CSS

- Use semantic design tokens from `index.css`
- Never use raw color classes (`text-white`, `bg-black`)
- All colors must be HSL-based
- Prefer existing component variants over custom styles
- Exception: Category-specific accent colors in packing list use intentional hardcoded Tailwind colors for visual differentiation (blue, amber, rose, violet, orange, etc.)
- Use standardized action button colors: Explore = `bg-primary`, Add Expense = `bg-success` (v2.6.30)
- All mobile primary action buttons: `h-12 rounded-xl font-semibold shadow-sm` (v2.6.30)

```tsx
// ✅ Good - uses semantic tokens
<div className="bg-card text-card-foreground border-primary/20">

// ✅ Good - standardized action buttons (v2.6.30)
<Button className="h-12 rounded-xl font-semibold shadow-sm bg-success text-success-foreground">Add Expense</Button>

// ❌ Bad - raw colors
<div className="bg-white text-black border-blue-500">
```

---

## Component Guidelines

### File Structure

```typescript
// 1. Imports
import { ... } from 'react';

// 2. Types/Interfaces
interface MyComponentProps {
  tripId: string;
  onComplete?: () => void;
}

// 3. Constants (if needed)
const LABELS = { ... };

// 4. Helper functions (pure, no hooks)
const formatLabel = (type: string): string => { ... };

// 5. Component
export function MyComponent({ tripId, onComplete }: MyComponentProps) {
  // Hooks first
  const isPro = useIsPro();
  const { data, isLoading } = useData(tripId);
  
  // State
  const [open, setOpen] = useState(false);
  
  // Derived values
  const filteredData = useMemo(() => ..., [data]);
  
  // Handlers
  const handleClick = () => { ... };
  
  // Early returns (loading, empty, gating)
  if (!isPro) return null;
  if (isLoading) return <Skeleton />;
  
  // Render
  return ( ... );
}
```

### Pro Feature Gating

```typescript
export function ProOnlyWidget({ tripId }: Props) {
  const isPro = useIsPro();
  
  // Return null for non-Pro users - no upgrade prompts here
  if (!isPro) {
    return null;
  }
  
  return <ProFeature />;
}
```

### Drill-Through Navigation

For clickable items that navigate to records:

```typescript
interface Props {
  onDrillThrough?: (target: DrillThroughTarget) => void;
}

// Make items clickable when handler provided
const isClickable = !!onDrillThrough;

<div 
  className={isClickable ? 'cursor-pointer hover:bg-accent/50' : ''}
  onClick={() => onDrillThrough?.({ tab: 'bookings', recordId: id })}
  role={isClickable ? 'button' : undefined}
  tabIndex={isClickable ? 0 : undefined}
>
```

---

## Hook Patterns

### Data Fetching Hooks

Use TanStack Query for all data fetching:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBookings(tripId: string | undefined) {
  return useQuery({
    queryKey: ['bookings', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('trip_id', tripId)
        .order('start_datetime', { ascending: true });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId,
    staleTime: 10000, // 10 seconds
  });
}
```

### Mutation Hooks

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (booking: NewBooking) => {
      const { data, error } = await supabase
        .from('bookings')
        .insert(booking)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['bookings', data.trip_id] });
      toast.success('Booking created');
    },
    onError: (error) => {
      toast.error('Failed to create booking');
      console.error(error);
    },
  });
}
```

### Security Hooks

#### useIdleLogout (v2.1.39)

Auto-logout after 2 hours of inactivity:

```typescript
import { useIdleLogout } from '@/hooks/useIdleLogout';

// In your authenticated layout component:
export function Layout({ children }: LayoutProps) {
  // Automatically tracks activity and logs out after 2hr idle
  useIdleLogout();
  
  return <div>{children}</div>;
}
```

**Implementation details:**
- Tracks: click, keydown, touchstart, mousemove, scroll, navigation
- Timeout: 2 hours (120 minutes)
- On timeout: Calls signOut() and redirects to `/auth?reason=idle`
- Only runs when user is authenticated
```

---

## Testing

### Unit Tests

Use Vitest for unit testing:

```typescript
// src/lib/datetimeIntegrity.test.ts
import { describe, it, expect } from 'vitest';
import { hasExplicitTime } from './datetimeIntegrity';

describe('hasExplicitTime', () => {
  it('returns false for date-only strings', () => {
    expect(hasExplicitTime('2026-01-15')).toBe(false);
  });
  
  it('returns false for midnight times', () => {
    expect(hasExplicitTime('2026-01-15T00:00:00')).toBe(false);
  });
  
  it('returns true for explicit times', () => {
    expect(hasExplicitTime('2026-01-15T14:30:00')).toBe(true);
  });
});
```

### Running Tests

```bash
bun run test           # Run all tests
bun run test:watch     # Watch mode
```

---

## Data Integrity & Single Source of Truth (Patch 2.6.2+)

### Core Principle

Every data domain has a single source of truth. UI components and exports derive from these sources, ensuring consistency between what users see and what they export.

| Domain | Single Source | Used By |
|--------|---------------|---------|
| Trips | `useTrips()`, `useTrip()` | Dashboard, TripDetail |
| Expenses | `useExpenses()` | ExpensesTab, Reports |
| Bookings | `useBookings()` | BookingsTab, FlightSummary |
| Tour/Stops | `useEngagements()` | TourTab, Expense-to-Stop |
| Calculations | `calculateTripCostSummary()` | SummaryTab, PDF Export |
| Combined Views | `getCanonicalTripState()` | Summary, Timeline, Reports |

### Tour / Bookings Separation (v2.1.6)

**Critical Rule:** Bookings and Tour must never import each other's types/hooks directly.

```typescript
// ✅ Correct - Tour uses canonical events
import { generateTourDraftFromCanonicalEvents } from '@/lib/canonicalTripState';
const draftStops = generateTourDraftFromCanonicalEvents(timelineEvents);

// ❌ Wrong - Tour importing booking types directly
import { useBookings } from '@/hooks/useBookings';
import type { Booking } from '@/types/database';
```

### Error Handling Discipline

All critical paths follow explicit error handling:

```typescript
// ✅ Correct - errors surface to users
onError: (error) => {
  toast.error(error.message);  // User sees feedback
  console.error(error);         // Logged for debugging
},

// ❌ Wrong - silent failures
onError: () => {},  // NEVER do this
```

### Export Consistency

Reports and exports use the same data path as the UI:

```typescript
// Reports page - single data source
const allExpenses = useQuery({ ... });  // Source
const filteredRows = useMemo(() => ...); // Filter (derived)
const sortedRows = useMemo(() => ...);   // Sort (derived)

// Both UI table AND exports use sortedRows
// This guarantees "what you see is what you export"
```

### Plan Gating Layers

UI gating is a UX optimization; security is enforced at the database level:

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: UI Gating (UX Optimization)                    │
│ - <ProOnly>, <BusinessOnly>, <AdminOnly>                │
│ - useAccess() hook for conditional rendering            │
│ - Hides features users can't use (better UX)            │
├─────────────────────────────────────────────────────────┤
│ Layer 2: Route Protection                               │
│ - useAuth() redirect for unauthenticated users          │
│ - canAccessBusinessFeatures check in Reports page       │
├─────────────────────────────────────────────────────────┤
│ Layer 3: Database Enforcement (SECURITY)                │
│ - RLS policies enforce ownership                        │
│ - user_can_write_trip() prevents writes to locked trips │
│ - trip_owner_is_pro() gates Pro features at DB level    │
│ - is_admin() uses user_roles table, not client state    │
└─────────────────────────────────────────────────────────┘
```

### Admin Override Documentation

Admin users (from `user_roles` table) can access Business features:

```typescript
// In useAccess.ts
const canAccessBusinessFeatures = isAdmin === true;

// INTENT: Allow owner/developers to:
// 1. Test Business features before public launch
// 2. Support users with Business accounts
// 3. Debug Business-specific issues

// SECURITY: Admin check uses database lookup, NOT:
// - localStorage (can be manipulated)
// - sessionStorage (can be manipulated)
// - hardcoded credentials (can be decompiled)
```

---

## Common Pitfalls

### 1. Timezone Issues

Always parse dates in local timezone:

```typescript
// ✅ Correct - appends time to prevent UTC shift
const date = parseISO(`${trip.start_date}T00:00:00`);

// ❌ Wrong - may shift date by timezone offset
const date = new Date(trip.start_date);
```

### 2. Forgetting Query Invalidation

After mutations, invalidate affected queries:

```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ['bookings', tripId] });
  queryClient.invalidateQueries({ queryKey: ['trip-events', tripId] });
},
```

### 3. Direct Supabase Calls in Components

Use hooks instead:

```typescript
// ✅ Use the hook
const { data: expenses } = useExpenses(tripId);

// ❌ Don't call Supabase directly in components
const { data } = await supabase.from('expenses').select();
```

### 4. Guessing Times

Never default or infer times:

```typescript
// ✅ Check for explicit time
if (hasExplicitTime(datetime)) {
  showTimeDisplay(datetime);
} else {
  showMessage('Time not specified');
}

// ❌ Never default to midnight or "morning"
const time = datetime || '2026-01-15T00:00:00';
```

### 5. Editing Auto-Generated Files

These files are managed by Lovable and should **never** be edited:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `supabase/config.toml`
- `.env`
- `supabase/migrations/*`

---

## Parsing Performance (v2.6.3)

The parsing pipeline is optimized for performance while maintaining identical output accuracy:

### Shared Datetime Utilities

Edge functions use centralized utilities in `supabase/functions/_shared/datetime-utils.ts`:

- **Pre-compiled regex patterns**: Cached at module load, avoiding repeated compilation
- **Short-circuit evaluations**: Early returns for common cases (null, date-only strings)
- **Batch processing**: `normalizeBatchDatetimes()` processes arrays in single pass
- **Minimal allocations**: Avoids creating Date objects when not needed

### Performance Patterns

```typescript
// ✅ Fast path - already date-only
if (dt.length === 10 && DATE_ONLY_REGEX.test(dt)) {
  return dt; // No Date object created
}

// ✅ Batch normalize booking arrays
parsed.bookings = normalizeBatchDatetimes(bookings, ['start_datetime', 'end_datetime']);
```

### Flight Date Independence (v4.4.3)

The `parse-itinerary` edge function uses `google/gemini-2.5-pro` with a **DATE INDEPENDENCE** prompt rule. This prevents the AI from hallucinating dates for return flight legs by requiring each segment's date to be read independently from the document text. Diagnostic logging (`FLIGHT_DIAG`) in the edge function outputs extracted dates per leg for verification.

### Testing Parsing Changes

When modifying parsing logic:

1. Run Deno tests: `supabase--test-edge-functions` with pattern `datetime`
2. Run frontend tests: `src/lib/__tests__/parsingPerformance.test.ts`
3. Check edge function logs for `FLIGHT_DIAG` entries to verify per-leg date extraction
4. Verify outputs match expected behavior documented in tests

---

## Upgrade Intent Tracking (v2.6.5)

The app captures user upgrade intent signals when users click disabled upgrade buttons. This data informs future billing decisions without enabling payments.

### How It Works

When a user clicks a disabled "Upgrade to Pro" or "Upgrade to Business" button, the `useUpgradeIntent` hook records:

| Field | Description |
|-------|-------------|
| `user_id` | Authenticated user's ID |
| `current_plan` | User's current tier (free/pro) |
| `target_plan` | Clicked upgrade target (pro/business) |
| `entry_point` | Where they clicked (account_page, plans_page, contextual_message) |
| `created_at` | Timestamp |

### Usage

```typescript
import { useUpgradeIntent } from '@/hooks/useUpgradeIntent';

function UpgradeButton() {
  const { trackUpgradeIntent } = useUpgradeIntent();
  
  return (
    <Button 
      className="opacity-50 cursor-not-allowed"
      onClick={() => trackUpgradeIntent('pro', 'account_page')}
    >
      Upgrade to Pro
    </Button>
  );
}
```

### Developer Notes

- **Fire-and-forget**: Errors are logged but don't affect UX
- **Non-intrusive**: No user feedback, prompts, or UI changes
- **Deduplicated**: Same user/plan clicks are all recorded (no client-side throttling)
- **Admin visibility**: Admins can query `upgrade_intents` table directly

### Querying Intent Data

```sql
-- Get upgrade intent summary by target plan
SELECT 
  target_plan,
  entry_point,
  COUNT(*) as clicks,
  COUNT(DISTINCT user_id) as unique_users
FROM upgrade_intents
GROUP BY target_plan, entry_point
ORDER BY clicks DESC;

-- Get recent intents
SELECT * FROM upgrade_intents
ORDER BY created_at DESC
LIMIT 50;
```

---

## Performance Optimization (v2.1.28)

### React Render Efficiency

**Memoization patterns used:**

| Pattern | Where Used | Purpose |
|---------|------------|---------|
| `React.memo()` | `TripCard` in Dashboard | Prevent re-renders when list updates |
| `useCallback()` | Navigation/delete handlers | Stable function references |
| `useMemo()` | Canonical trip state, cost summaries | Cache expensive calculations |

**Example - Memoized list item:**

```typescript
// ✅ Correct - memoized component with stable props
const TripCard = React.memo(function TripCard({
  trip,
  isPro,
  onDelete,
  onNavigate,
}: Props) {
  // Use useCallback for internal handlers
  const handleClick = useCallback(() => {
    onNavigate(trip.id);
  }, [onNavigate, trip.id]);
  
  return <Card onClick={handleClick}>...</Card>;
});

// Parent provides stable callbacks
const handleNavigate = useCallback((id: string) => {
  navigate(`/trip/${id}`);
}, [navigate]);

<TripCard trip={trip} onNavigate={handleNavigate} />
```

### Data Fetching Efficiency

**Rules:**
1. Fetch data once per screen via hooks, not per component
2. Use canonical hooks (`useCanonicalTripState`, `useAccess`) not ad-hoc queries
3. Avoid duplicate fetches by lifting data to parent components

**Anti-patterns to avoid:**

```typescript
// ❌ Wrong - each card fetches its own data
function TripCard({ tripId }) {
  const { data } = useTrip(tripId); // N queries for N cards
}

// ✅ Correct - parent fetches once, passes data
function Dashboard() {
  const { data: trips } = useTrips(); // 1 query
  return trips.map(trip => <TripCard trip={trip} />);
}
```

### Bulk Action Performance

For operations like bulk Tour parsing:
- Process all items in a single pass (O(n), not O(n²))
- Use pre-compiled regex patterns (module-level constants)
- Memoize results when the same computation may run multiple times

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [COMPONENTS.md](./COMPONENTS.md) - Component reference
- [AI_PROMPTS.md](./AI_PROMPTS.md) - AI system prompts

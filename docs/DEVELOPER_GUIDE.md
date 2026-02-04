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
```

### Code Comments

Include version tags in significant changes:

```typescript
// v2.1.2: Determine if trip is in the past
const isPastTrip = isBefore(tripEndDate, today);
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

```tsx
// ✅ Good - uses semantic tokens
<div className="bg-card text-card-foreground border-primary/20">

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

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [COMPONENTS.md](./COMPONENTS.md) - Component reference
- [AI_PROMPTS.md](./AI_PROMPTS.md) - AI system prompts

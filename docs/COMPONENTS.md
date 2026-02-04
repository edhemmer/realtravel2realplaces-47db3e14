# Real Travel 2 Real Places - Component Reference

This document provides reference documentation for key components.

---

## Table of Contents

1. [Page Components](#page-components)
2. [Trip Components](#trip-components)
3. [Tab Components](#tab-components)
4. [Pro-Only Components](#pro-only-components)
5. [UI Components](#ui-components)

---

## Page Components

### Dashboard (`src/pages/Dashboard.tsx`)

Main trips list page showing owned and shared trips.

**Features:**
- Grid display of trip cards
- Create trip dialog
- Delete trip confirmation
- Past trip visual de-emphasis (v2.1.2)

**Key Logic:**
```typescript
// Past trip detection
const isPastTrip = isBefore(tripEndDate, startOfDay(new Date()));
// Applied as: className={isPastTrip ? 'opacity-60' : ''}
```

---

### TripDetail (`src/pages/TripDetail.tsx`)

Main trip view with tabbed interface.

**Props:** Route param `tripId`

**Features:**
- Tab navigation (Summary, Bookings, Parking, Expenses, etc.)
- Drill-through navigation between tabs
- Record highlighting on navigation

**Drill-Through Target Type:**
```typescript
export type DrillThroughTarget = {
  tab: 'bookings' | 'parking' | 'expenses';
  recordId?: string;
} | null;
```

---

## Trip Components

### TripHeaderWidgets (`src/components/trips/TripHeaderWidgets.tsx`)

Widget container shown at top of trip detail view.

**Props:**
- `trip: Trip`
- `tripId: string`

**Includes:**
- Weather widget
- Cost summary
- Parking status

---

### CreateTripDialog (`src/components/trips/CreateTripDialog.tsx`)

Modal for creating new trips.

**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`

**Features:**
- Form validation
- Destination autocomplete
- Trip type selection

---

## Tab Components

### SummaryTab (`src/components/trips/tabs/SummaryTab.tsx`)

Main trip summary view with timeline and overview.

**Props:**
```typescript
interface SummaryTabProps {
  tripId: string;
  trip: Trip;
  onDrillThrough?: (target: DrillThroughTarget) => void;
}
```

**Sections:**
1. Destination header with Upcoming Events (Pro)
2. Expense reminder banner
3. Travel alerts
4. TSA warnings
5. Flight/Drive summary
6. Trip Health Checklist (Pro)
7. Destination info links
8. Timeline
9. Weather forecast

---

### BookingsTab (`src/components/trips/tabs/BookingsTab.tsx`)

Booking management (flights, stays, rentals, activities).

**Features:**
- Add booking via AI parsing
- Manual booking creation
- Edit/delete bookings
- Companion assignment

---

### ExpensesTab (`src/components/trips/tabs/ExpensesTab.tsx`)

Expense tracking and categorization.

**Features:**
- Manual expense entry
- Receipt image upload (OCR)
- Category/subcategory filtering
- Cost breakdown

---

### ParkingTab (`src/components/trips/tabs/ParkingTab.tsx`)

Parking entry management.

**Features:**
- Add parking records
- Expiration tracking
- Location details

---

## Pro-Only Components

These components are gated to Pro subscribers.

### UpcomingEventsWidget (`src/components/trips/UpcomingEventsWidget.tsx`)

Displays next 3-5 upcoming TripEvents.

**Props:**
```typescript
interface UpcomingEventsWidgetProps {
  tripId: string;
  onDrillThrough?: (target: DrillThroughTarget) => void;
}
```

**Features:**
- Filters events where `event_datetime > now`
- Shows icon, label, and formatted time
- Clickable rows navigate to source record
- User's preferred datetime format
- "No upcoming events" empty state

**Event Types:**
- `flight_departure` - Plane icon
- `hotel_checkin` / `hotel_checkout` - Building icon
- `rental_pickup` / `rental_return` - Car icon
- `parking_expiration` - Parking icon

---

### TripHealthChecklist (`src/components/trips/TripHealthChecklist.tsx`)

Identifies missing or incomplete trip details.

**Props:**
```typescript
interface TripHealthChecklistProps {
  trip: Trip;
  bookings: Booking[];
  parkingList: Parking[];
  expenses: Expense[];
  preferredCurrency?: string | null;
  onNavigate: (target: DrillThroughTarget) => void;
}
```

**Checks:**
- Missing flight departure times
- Missing stay check-in/check-out times
- Missing stay addresses
- Missing rental pickup/return times
- Missing parking end times
- Uncategorized expenses (for mixed trips)

**Display:**
- "Trip Health: All clear" when no issues
- "Trip Health: X items to review" with issue list
- Each issue has icon, description, and "Fix" button

---

## UI Components

Located in `src/components/ui/`. These are shadcn/ui components.

### Common Components

| Component | Usage |
|-----------|-------|
| `Button` | Primary actions |
| `Card` | Content containers |
| `Dialog` | Modal dialogs |
| `Badge` | Status indicators |
| `Input` | Form inputs |
| `Select` | Dropdown selection |
| `Tabs` | Tab navigation |
| `Toast` | Notifications (via sonner) |

### Usage Example

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Icon className="w-4 h-4" />
      Title
      <Badge variant="secondary">Pro</Badge>
    </CardTitle>
  </CardHeader>
  <CardContent>
    Content here
    <Button onClick={handleAction}>Action</Button>
  </CardContent>
</Card>
```

---

## Component Creation Guidelines

When creating new components:

1. **Location**: Place in appropriate directory
   - Trip-related: `src/components/trips/`
   - Tab content: `src/components/trips/tabs/`
   - Reusable UI: `src/components/ui/`

2. **Naming**: Use PascalCase, descriptive names
   - `TripHealthChecklist.tsx`
   - `UpcomingEventsWidget.tsx`

3. **Exports**: Use named exports
   ```typescript
   export function MyComponent() { ... }
   ```

4. **Props Interface**: Define explicit interface
   ```typescript
   interface MyComponentProps {
     tripId: string;
     onComplete?: () => void;
   }
   ```

5. **Pro Gating**: For Pro features, gate at component level
   ```typescript
   const isPro = useIsPro();
   if (!isPro) return null;
   ```

6. **Documentation**: Add JSDoc comment
   ```typescript
   /**
    * v2.1.1: Pro-only Upcoming Events strip
    * 
    * - Shows next 3-5 TripEvents
    * - Clickable for drill-through navigation
    */
   export function UpcomingEventsWidget() { ... }
   ```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Coding standards
- [AI_PROMPTS.md](./AI_PROMPTS.md) - AI system prompts

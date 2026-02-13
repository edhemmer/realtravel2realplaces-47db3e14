# Real Travel 2 Real Places - Component Reference

This document provides reference documentation for key components.

---

## Table of Contents

1. [Page Components](#page-components)
2. [Layout Components](#layout-components)
3. [Shared Card Components](#shared-card-components)
4. [Trip Components](#trip-components)
5. [Tab Components](#tab-components)
6. [Container Components](#container-components)
7. [Pro-Only Components](#pro-only-components)
8. [UI Components](#ui-components)

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

Main trip view with mobile-first tabbed interface.

**Props:** Route param `tripId`

**Features:**
- Mobile bottom navigation (Patch 2.2.3)
- Desktop top tabs (Patch 2.6.25)
- Tab navigation (Summary, Bookings, Parking, Expenses, etc.)
- Drill-through navigation between tabs
- Record highlighting on navigation
- Mobile header: section mode title in primary color (v2.6.25), spacing-driven hierarchy with no divider (v2.6.27)
- TripHeaderWidgets hidden on mobile header; rendered inside NOW tab via ExecutionZone (v2.6.28)

**Mobile Navigation:**
On viewports < 768px, navigation switches from top tabs to a fixed bottom navigation bar with:
- Primary tabs: NOW, PLAN, EXPLORE, EXPENSES, MORE
- "More" dropdown: Bookings, Tour (Business), Members, Companions, Parking, Packing, Alerts, Report (Pro), Notes & Safety

**Drill-Through Target Type:**
```typescript
export type DrillThroughTarget = {
  tab: 'bookings' | 'parking' | 'expenses';
  recordId?: string;
} | null;
```

---

## Layout Components

### TripDetailLayout (`src/components/layout/TripDetailLayout.tsx`)

Mobile-first layout wrapper for trip detail pages (Patch 2.2.3).

**Props:**
```typescript
interface TripDetailLayoutProps {
  children: ReactNode;
  activeTab: TripTab;
  onTabChange: (tab: TripTab) => void;
  showBottomNav?: boolean;
}
```

**Features:**
- Automatic mobile detection
- Bottom padding for mobile nav
- Wraps MobileBottomNav

---

### MobileBottomNav (`src/components/layout/MobileBottomNav.tsx`)

Fixed bottom navigation bar for mobile viewports (Patch 2.2.3, refined v2.6.9–v2.6.10).

**Props:**
```typescript
interface MobileBottomNavProps {
  activeTab: TripTab;
  onTabChange: (tab: TripTab) => void;
  className?: string;
}
```

**Features:**
- Safe area handling (iOS home indicator)
- Touch-optimized targets (min 56×44px)
- "More" dropdown for secondary tabs
- Plan-based tab visibility (Tour = Business, Report = Pro)

**Surface Styling (v2.6.10):**
- `bg-card` background, `border-border/60` top border, `shadow-lg` depth
- No blur or opacity—matches card surface system
- Active tab: `text-primary font-semibold bg-primary/10`
- Inactive tab: `text-muted-foreground font-medium`
- Icon-label spacing: `gap-1` with `leading-none` labels

**More Dropdown (v2.6.9):**
- `rounded-xl border-border/60 bg-card shadow-lg` container
- `w-52` width, clamped to `max-w-[calc(100vw-1rem)]`
- Menu rows: `h-10 gap-3 px-3 rounded-lg`
- Icon container: `w-4 h-4 shrink-0`

---

## Shared Card Components

Located in `src/components/cards/`. These are "dumb" presentational components that receive typed props and render UI. They do NOT call domain hooks (Patch 2.2.3).

### BookingCard (`src/components/cards/BookingCard.tsx`)

Consistent card for booking entities across all screens.

**Props:**
```typescript
interface BookingCardProps {
  id: string;
  type: 'flight' | 'stay' | 'car_rental' | 'activity' | 'transport';
  title: string;
  subtitle?: string;
  startDatetime: string;
  endDatetime?: string | null;
  confirmationNumber?: string | null;
  displayCost?: string | null;
  myShareCost?: string | null;
  location?: string | null;
  canEdit?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpenMaps?: () => void;
}
```

---

### TourStopCard (`src/components/cards/TourStopCard.tsx`)

Consistent card for tour stop/engagement entities.

**Note:** Tours are NON-MONETARY - this card never shows cost fields.

**Props:**
```typescript
interface TourStopCardProps {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  address?: string | null;
  storeNumber?: string | null;
  origin?: 'parsed' | 'manual';
  hasReminder?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpenMaps?: () => void;
}
```

---

### ExpenseCard (`src/components/cards/ExpenseCard.tsx`)

Consistent card for expense entities.

**Props:**
```typescript
interface ExpenseCardProps {
  id: string;
  date: string;
  category: 'meals' | 'transport' | 'activity' | 'shopping' | 'parking' | 'other';
  subCategory?: string | null;
  description?: string | null;
  displayAmount: string;
  myShareAmount?: string | null;
  expensePurpose?: 'business' | 'personal' | null;
  isAutoGenerated?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}
```

---

## Trip Components

### TripHeaderWidgets (`src/components/trips/TripHeaderWidgets.tsx`)

Widget container for trip overview data. Desktop: rendered in trip header. Mobile: rendered inside NOW tab below ExecutionZone (v2.6.28).

**Props:**
- `trip: Trip`

**Includes:**
- Weather widget
- Cost summary
- Parking status

---

### ExecutionZone (`src/components/trips/ExecutionZone.tsx`)

v2.6.28: Mobile-only Command Center rendered at the top of the NOW tab. Execution-first: actions appear before informational widgets.

**Props:**
```typescript
interface ExecutionZoneProps {
  timelineEvents: CanonicalTimelineEvent[];
  onExplore: () => void;
  onAddExpense: () => void;
}
```

**Sections:**
- A) Primary Action Row (always visible): Explore (primary/blue) + Add Expense (success/green)
- B) Conditional Timeline Action Row: today-relevant actionable items with Navigate buttons
- C) Empty State: "No scheduled actions today."

**Button Standardization (v2.6.30/v2.6.33):**
- Explore = `bg-primary` (ocean teal blue) everywhere
- Add Expense = `bg-success` (emerald green) everywhere
- All primary actions: `h-12 rounded-xl font-semibold shadow-sm`
- Consistent across NOW tab, Expenses tab, and all mobile contexts

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

Booking management (flights, stays, rentals, transport, activities).

**Booking Types:**
- ✈️ Flight - Airlines with passenger and TSA info
- 🏨 Stay - Hotels, Airbnb, VRBO
- 🚗 Car Rental - Rental vehicles
- 🚆 Transport - Train, bus, metro, ferry (v2.1.37)
- 🎉 Activity - Tours and events

**Features:**
- Add booking via AI parsing
- Manual booking creation
- Edit/delete bookings
- Companion assignment
- Drill-through highlighting (v2.0.7)

**Transport Mode Fields (v2.1.37):**
```typescript
// Transport-specific form fields
transport_mode: 'train' | 'bus' | 'metro' | 'ferry' | 'other'
from_location: string  // Origin city/station
to_location: string    // Destination city/station  
operator: string       // e.g., "SNCB", "Eurostar"
```

---

### ExpensesTab (`src/components/trips/tabs/ExpensesTab.tsx`)

Expense tracking and categorization.

**Features:**
- Manual expense entry
- Receipt image upload (OCR)
- Category/subcategory filtering
- Cost breakdown
- Parse origin hints (v2.1.3): "From receipt", "From email"

---

### ParkingTab (`src/components/trips/tabs/ParkingTab.tsx`)

Parking entry management.

**Features:**
- Add parking records
- Expiration tracking
- Location details

---

### TourTab (`src/components/trips/tabs/TourTab.tsx`)

Business stops/work locations (Business tier).

**Features:**
- Auto-draft from bookings via canonical events (v2.1.6)
- "Regenerate from bookings" action
- Manual stop creation
- Bulk import via BulkStopsDialog
- Source hints (v2.1.3): "From flight", "From stay", "Imported from text"

**Architectural Note (v2.1.6):**
TourTab does NOT import booking types/hooks directly. It uses `generateTourDraftFromCanonicalEvents()` to create independent stop records.

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

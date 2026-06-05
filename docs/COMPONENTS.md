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

### LandingPage (`src/pages/LandingPage.tsx`)

Public-facing marketing and conversion surface.

**Features:**
- Modular section architecture (Hero, Pain, Solution, WhyDuringTrip, MovingParts, WhoItsFor, FAQ, FinalCTA)
- SEO via `react-helmet-async` with Open Graph, Twitter Cards, and canonical URL
- JSON-LD `FAQPage` schema in FAQ section
- Sticky header with conditional auth-aware CTA
- Premium dark theme via `landing.css` custom properties

---

### Dashboard (`src/pages/Dashboard.tsx`)

Main trips list page showing owned and shared trips.

**Features:**
- Grid display of trip cards
- Create trip dialog
- Delete trip confirmation
- Past trip visual de-emphasis (v2.1.2)

---

### TripDetail (`src/pages/TripDetail.tsx`)

Main trip view with mobile-first tabbed interface.

**Props:** Route param `tripId`

**Features:**
- Mobile bottom navigation with compressed 5+More structure (v5.0.0)
- Desktop top tabs with reordered priority (v5.0.0)
- Tab navigation (Summary, Bookings, Parking, Expenses, etc.)
- Drill-through navigation between tabs
- Record highlighting on navigation

**Mobile Navigation (v5.0.0):**
On viewports < 768px, navigation uses a fixed bottom bar with:
- Primary tabs: Timeline, Bookings, Explore, Expenses, Packing
- "More" dropdown: NOW, Weather, Parking, Report, Members, Companions, Notes & Safety, Tour, Alerts

**Drill-Through Target Type:**
```typescript
export type DrillThroughTarget = {
  tab: 'bookings' | 'parking' | 'expenses';
  recordId?: string;
} | null;
```

---

### InstallApp (`src/pages/InstallApp.tsx`)

PWA installation guide page.

**Features:**
- Platform detection (iOS Safari vs Chrome/Android)
- `beforeinstallprompt` API integration for native install
- Step-by-step iOS installation instructions
- Already-installed detection

---

## Layout Components

### TripDetailLayout (`src/components/layout/TripDetailLayout.tsx`)

Mobile-first layout wrapper for trip detail pages.

**Props:**
```typescript
interface TripDetailLayoutProps {
  children: ReactNode;
  activeTab: TripTab;
  onTabChange: (tab: TripTab) => void;
  showBottomNav?: boolean;
}
```

---

### MobileBottomNav (`src/components/layout/MobileBottomNav.tsx`)

Fixed bottom navigation bar for mobile viewports (v5.0.0 compressed structure).

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
- 5 primary tabs + "More" dropdown for secondary tabs
- Plan-based tab visibility (Tour = Business, Report = Pro)

---

## Shared Card Components

Located in `src/components/cards/`. These are "dumb" presentational components that receive typed props and render UI. They do NOT call domain hooks.

### BookingCard (`src/components/cards/BookingCard.tsx`)

Compact booking card with ~50% height reduction (v5.0.0).

**Features:**
- Single-line metadata display
- Compressed traveler summary ("Edward, Paula +2" with expand)
- Smaller icons (32px)
- Type-specific color coding preserved

---

### TourStopCard (`src/components/cards/TourStopCard.tsx`)

Card for tour stop/engagement entities. Tours are NON-MONETARY — this card never shows cost fields.

---

### ExpenseCard (`src/components/cards/ExpenseCard.tsx`)

Card for expense entities with category badges and cost display.

---

## Trip Components

### TravelAlertsCard (`src/components/trips/TravelAlertsCard.tsx`)

Compact banner-style alerts (v5.0.0). Replaced full-sized cards with single-line banners featuring inline actions.

**Features:**
- Compressed single-line format: icon + message + action button
- Alert colors preserved from original design
- Reduced vertical footprint

---

### ExecutionZone (`src/components/trips/ExecutionZone.tsx`)

Mobile-only Command Center at the top of the NOW tab.

**Sections:**
- A) Primary Action Row: Explore (primary) + Add Expense (success)
- B) Conditional Timeline Action Row: today-relevant actionable items
- C) Empty State: "No scheduled actions today."

---

### CreateTripDialog (`src/components/trips/CreateTripDialog.tsx`)

Modal for creating new trips with form validation and destination autocomplete.

---

## Tab Components

### SummaryTab
Main trip summary with timeline, overview, and drill-through navigation.

### BookingsTab
Booking management for all 5 types with AI parsing.

### ExpensesTab
Expense tracking with receipt OCR and category filtering.

### PackingTab
AI-powered packing list with category color system and quantity steppers.

### ParkingTab
Parking entry management with expiration tracking.

### TourTab
Business stops with auto-draft, import pipeline, and date-grouped layout.

### ExploreTab
Place discovery with photos, ratings, and Add-to-Timeline.

### WeatherTab
Weather forecast for trip destination.

### NotesTab
Free-text notes, emergency numbers, and important links.

### CompanionsTab
Traveler management with PII and booking linking.

### MembersTab
Trip sharing with permission management.

### TripSummaryReportTab
Comprehensive trip report with PDF generation (Pro).

---

## Container Components

| Container | Purpose |
|-----------|---------|
| `DesktopTripShell` | Canonical desktop trip context provider |
| `NowCommandCenter` | NOW tab execution engine |
| `TripSummaryContainer` | Summary data wiring |
| `TripBookingsContainer` | Bookings data wiring |
| `TripTourContainer` | Tour data wiring |
| `TripExpensesContainer` | Expenses data wiring |
| `TripAlertsContainer` | Alerts data wiring |
| `MobileNavigationRouter` | Mobile tab routing |

---

## Pro-Only Components

### UpcomingEventsWidget
Next 3-5 upcoming TripEvents with drill-through.

### TripHealthChecklist
Gap analysis for missing trip details with "Fix" navigation.

---

## UI Components

Located in `src/components/ui/`. shadcn/ui components.

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

---

## Component Creation Guidelines

1. **Location**: Place in appropriate directory (`trips/`, `trips/tabs/`, `ui/`)
2. **Naming**: PascalCase, descriptive names
3. **Exports**: Named exports
4. **Props**: Define explicit interface
5. **Pro Gating**: Gate at component level with `useIsPro()`
6. **Documentation**: Add JSDoc comment with version tag

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Coding standards
- [AI_PROMPTS.md](./AI_PROMPTS.md) - AI system prompts

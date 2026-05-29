# Real Travel 2 Real Places — Feature Inventory

Complete list of implemented features organized by tier and domain.

---

## Core Platform (All Tiers)

### Authentication & Onboarding
- Email/password signup and login
- Email verification
- Password reset flow
- Guided onboarding wizard (3 steps)
- Profile completion (name, preferences)
- Session idle logout (2 hours)
- Centralized auth guards with redirect protection

### Dashboard
- Trip list with lifecycle badges (Active, Locked, Closed)
- Trip creation wizard with transportation mode selection (Fly, Drive, Train)
- AI confirmation drop zone (paste/photo → auto-create trip)
- Past trip visual de-emphasis
- Trip deletion with confirmation
- Shared trips section

### Trip Creation Wizard
- 3-column transportation mode selector: Fly, Drive, Train
- Fly mode: destination city autocomplete, departure/return dates
- Drive mode: destination city + optional street address, origin city + optional street address, departure/return dates
- Train mode: destination city, departure/return dates
- Trip type selection: Business, Personal, Mixed
- Disabled-state helper showing missing required fields
- AI drop zone: paste confirmation text or upload screenshot to auto-create trip with bookings

### Trip Detail View
- Tabbed interface (Summary, Bookings, Expenses, Packing, Parking, Notes, Companions, Members, Report)
- Mobile bottom navigation with compressed 5+More structure (v5.0.0)
- Desktop tab bar with keyboard navigation
- Drill-through navigation (click summary → jump to record with highlight)
- Compact booking cards with ~50% height reduction (v5.0.0)
- Compressed alert banners (v5.0.0)

### Booking Management
- 5 booking types: Flight, Lodging, Car Rental, Transport, Activity
- AI-powered confirmation parsing (paste text or upload photo)
- Manual entry with type-specific forms
- Per-booking cost tracking (total + my share)
- Confirmation number storage
- Vendor links and notes
- Flight-specific: airline, passenger, TSA PreCheck, frequent flyer, departure/arrival airports
- Lodging-specific: property type (Hotel/Airbnb/VRBO/Other), check-in/checkout, address
- Car rental-specific: rental company, pickup/return locations
- Transport-specific: mode (train/bus/metro/ferry), operator, from/to locations
- Activity-specific: ticket tracking, booking patterns, advance recommendations
- Compact traveler display with summary format: "Edward, Paula +2" (v5.0.0)

### Expense Tracking
- Per-trip expense log
- 6 categories: Meals, Transport, Activity, Shopping, Parking, Other
- 25+ sub-categories (breakfast, lunch, dinner, uber, gas, alcohol, tips, etc.)
- Receipt photo OCR via AI
- Per-expense cost with my share
- Business/personal purpose flag (mixed trips)
- Stop-level expense assignment (Business tier)
- Engagement-linked expenses

### Packing Lists
- AI-generated packing suggestions based on trip context (destination, dates, weather)
- Multi-leg itinerary intelligence with per-city climate and cultural analysis
- Laundry Intelligence: caps daily-wear items at 7 for trips >7 nights
- Color/style tips per item with region-specific fashion advice
- Per-item `applies_to` location tags (e.g., "Milan", "Barcelona")
- Per-leg climate summary cards with destination-specific color coding
- Cultural tips and special notes banner
- Category color system: unique accent color per category
- Semantic icon mapping per category
- Custom item addition with category pre-fill
- Pack/unpack toggle per item with green completion states
- Gradient progress bar with percentage tracking
- Quantity stepper controls (min 1) with immediate persistence
- Regeneration preserves custom items
- Copy-to-clipboard export

### Parking Tracker
- 5 parking types: Airport, Beach, City Garage, Hotel, Other
- Billing types: Hourly, Daily, Per Trip, Other
- Location details: address, level/section/space
- Cost tracking with my share
- Local wall-time columns for display accuracy
- Parking expiration on Timeline

### Companion Management
- Name, email, phone, notes
- TSA PreCheck and frequent flyer numbers
- Airline, flight, and seat assignment
- Per-person portion owed
- TSA review status tracking
- Booking-companion linking

### Trip Notes
- General notes (free text)
- Emergency numbers
- Important links

### Trip Sharing & Collaboration
- Email-based trip invitations with expiring tokens (7 days)
- Granular permissions: Read Only, Can Add Expenses, Can Add Lodging
- Permission management for existing members
- Guest member removal
- PII masking for non-owners (emails, phones, TSA numbers, confirmation codes)

### Calendar Export
- ICS file generation for trip events
- 30-minute reminders included on all events
- Compatible with Apple Calendar, Google Calendar, Outlook

### EXPLORE Engine (v4.8.0)
- Nearby place discovery via Google Places API (New)
- Real photos, ratings, and review counts from Google Places
- Photo proxy edge function (API keys server-side)
- 8 category sections: Signature Attractions, Dining, Cafes & Coffee, Bars & Nightlife, Parks & Gardens, Hiking Trails, Museums & Culture, Grocery & Markets
- "Right Now" diverse mix: top-scored items from each category with time-of-day and weather biasing
- Per-section pagination: 3 items initially, "See all N" to expand
- Add-to-Timeline modal: schedule an Explore place with date, time, and duration
- Pre-arrival Area Picker for browsing destinations before travel
- Available on all plans

### Progressive Web App (PWA)
- Installable on mobile (iOS/Android) and desktop (Chrome/Edge)
- Offline-capable with Workbox precaching of all static assets
- Auto-updating service worker (`registerType: "autoUpdate"`)
- Web App Manifest with standalone display mode
- Dedicated `/install` page with platform-specific instructions
- iOS Share → Add to Home Screen guidance
- Android/Chrome `beforeinstallprompt` native install prompt

### Native iOS App (Capacitor)
- Real native iOS app via Capacitor — same React codebase, native shell
- App Store Connect submission with custom bundle ID
- Safe-area insets for Dynamic Island, notch, and home indicator
- Native share sheet for trip sharing
- Status bar styling integrated with app theme
- Haptic feedback on key actions (expense added, next action confirmed)
- Background geolocation ready for on-trip execution
- Apple Sign-In support (required by App Store when Google sign-in is present)
- Deep link handling for OAuth returns and invite acceptance

---

## Pro Tier Features

### Timeline Events System
- Canonical trip events generated from bookings, parking, and engagements
- Event types: Flight Departure, Hotel Check-in/Checkout, Rental Pickup/Return, Parking Expiration, Engagement Start
- Database trigger-based event sync (trip_engagements → trip_events)
- Drill-through from Timeline to source records

### NOW Tab / Command Center
- Execution-first "what's happening right now" view
- Next Critical Action card (flight, check-in, drive, stop — priority-ordered)
- Today's compact timeline
- Sticky quick-ops strip (Explore, Add Expense, Drive Mode)
- Leave By / Buffer Intelligence (Comfortable, Tight, High Risk)
- Active lodging tracking
- Departure mode detection
- Drive Mode integration: quick entry pill and Next Action variant for drive segments

### Drive Mode (v4.0.x)
- Dedicated Drive Mode screen for road trips
- Active drive segment detection via driveIntelligence helpers
- Navigation target resolution with full street addresses
- NOW tab integration: Drive Mode appears when drive segment is active/imminent
- Drive Summary Card with estimated miles and gas expense shortcut
- Drive trip creation with origin/destination street addresses for door-to-door navigation

### Trip Health Checklist
- Gap analysis for missing information
- Proactive warnings for upcoming events
- Fix buttons that navigate to the relevant record

### Travel Alerts & Intelligence
- Weather-aware alerts
- Airport context and information
- Parking expiration indicators
- Expense reminder banners
- Flight departure reminders
- Compact banner-style alert display (v5.0.0)

### Trip Summary Report
- Comprehensive trip overview
- Per-category expense breakdown
- Booking summary by type
- Individualized PDF generation (owner + companions)

### Advanced Cost Summaries
- Canonical cost aggregation across bookings, expenses, parking
- Per-person cost splitting
- Business/personal separation for mixed trips
- Drill-through from summary to individual records

### Upcoming Events Widget
- Time-ordered display of next events
- Flight, lodging, rental, parking, and engagement events

### Notification System
- In-app notification bell with unread count
- Departure reminders (configurable hours before)
- Parking expiry reminders (configurable minutes before)
- Stop reminders (configurable minutes before)
- Ticket purchase reminders (configurable days before)
- Expense nudges
- Notification preferences management in Account settings
- Edge function-based notification generation

---

## Business Tier Features

### Tour Stops (Engagements)
- Manual stop creation with date, time, location, notes
- Date-grouped layout with chronological ordering
- CONFIRMED (has time) vs TBD (no time) separation
- Deterministic auto-ordering (greedy nearest-neighbor by Haversine distance)
- Manual reorder with MANUAL_LOCKED persistence
- Re-optimize action on locked days
- Store number tracking
- Smart Import pipeline:
  - Photo OCR (Tesseract.js in-browser)
  - Email/text paste (regex parsing)
  - Spreadsheet import (CSV/XLSX via SheetJS)
  - Review + Confirm step before creation

### Business Expense Reporting
- Business/personal expense categorization
- Stop-level expense assignment
- Business expense summary views
- Multi-trip reporting

---

## Admin Features

### User Management (RBAC)
- Admin role via `user_roles` table
- View all users with subscription info
- Update user subscription tier
- Update user names
- Soft-delete user accounts
- Trip count tracking

### Support Tickets
- User-submitted support tickets with app context
- Admin ticket management dashboard
- Status tracking (open/resolved)

### Plans Dashboard
- Subscription tier overview
- Upgrade intent tracking

---

## Security Features

- Row-Level Security (RLS) on all 18+ tables
- Anonymous access blocked on all data tables
- PII masking via security-definer RPC functions
- Session idle logout (2 hours)
- CRON-authenticated background jobs
- Secure receipt storage (1-hour signed URLs)
- Trip state lifecycle enforcement (Active → Locked → Closed → Deleted)
- Permission validation triggers
- Foreign key cascades for data integrity

---

## SEO & Discoverability

- XML sitemap at `/sitemap.xml` with all public routes
- `robots.txt` with crawler directives and private route exclusions
- Open Graph meta tags on landing page and index.html
- Twitter Card meta tags
- JSON-LD structured data: `SoftwareApplication` (index.html) + `FAQPage` (landing FAQ)
- Canonical URLs
- Preconnect hints for Google Fonts and backend API
- Semantic HTML with single H1 per page
- `react-helmet-async` for per-route meta management

---

## Infrastructure

- 14+ Edge Functions (AI parsing, notifications, lifecycle, admin, places)
- 30+ Database functions (security-definer)
- 50+ RLS policies
- Database triggers for event sync, permission validation, trip counting
- Centralized API client with session expiration handling
- Lovable AI gateway for AI operations (no user API keys required)
- Google Places API integration with server-side photo proxy
- PWA with Workbox service worker and auto-update
- Capacitor iOS build with native capability bridges

---

## Published Status

| Platform | URL / Status |
|----------|-------------|
| **Web (Custom Domain)** | [realtravel2realplaces.app](https://realtravel2realplaces.app) |
| **Web (Lovable)** | [realtravel2realplaces.lovable.app](https://realtravel2realplaces.lovable.app) |
| **iOS** | App Store Connect — submitted for review |

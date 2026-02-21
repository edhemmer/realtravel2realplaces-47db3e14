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
- Trip creation with destination autocomplete
- AI confirmation drop zone (paste/photo → auto-create trip)
- Past trip visual de-emphasis
- Trip deletion with confirmation
- Shared trips section

### Trip Detail View
- Tabbed interface (Summary, Bookings, Expenses, Packing, Parking, Notes, Companions)
- Mobile bottom navigation with labeled icons
- Desktop tab bar with keyboard navigation
- Drill-through navigation (click summary → jump to record)

### Booking Management
- 5 booking types: Flight, Lodging, Car Rental, Transport, Activity
- AI-powered confirmation parsing (paste text or photo)
- Manual entry with type-specific forms
- Per-booking cost tracking (total + my share)
- Confirmation number storage
- Vendor links and notes
- Flight-specific: airline, passenger, TSA PreCheck, frequent flyer, airports
- Lodging-specific: property type (Hotel/Airbnb/VRBO), check-in/checkout
- Car rental-specific: company, pickup/return locations
- Transport-specific: mode (train/bus/metro/ferry), operator, from/to
- Activity-specific: ticket tracking, booking patterns, advance recommendations

### Expense Tracking
- Per-trip expense log
- 6 categories: Meals, Transport, Activity, Shopping, Parking, Other
- 25+ sub-categories (breakfast, uber, gas, tips, etc.)
- Receipt photo OCR via AI
- Per-expense cost with my share
- Business/personal purpose flag (mixed trips)
- Stop-level expense assignment (Business tier)
- Engagement-linked expenses

### Packing Lists
- AI-generated packing suggestions based on trip context
- Multi-leg itinerary intelligence with per-city climate and cultural analysis
- Laundry Intelligence: caps daily-wear items at 7 for trips >7 nights
- Color/style tips per item with region-specific fashion advice (e.g., "Dark neutrals for Milan")
- Per-item `applies_to` location tags (e.g., "Milan", "Barcelona")
- Per-leg climate summary cards with destination-specific color coding
- Cultural tips and special notes banner
- Category color system: each category gets a unique accent color (blue=Clothing, amber=Footwear, rose=Toiletries, violet=Tech, orange=Documents, etc.)
- Semantic icon mapping: Shirt (Clothing), Footprints (Footwear), ShowerHead (Toiletries), Cable (Tech), BookOpen (Documents), Watch (Accessories)
- Wearables/Utilities column layout: wearable categories on left, utility categories on right (desktop); interleaved on mobile
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
- Email-based trip invitations with expiring tokens
- Granular permissions: Read Only, Can Add Expenses, Can Add Lodging
- Permission management for existing members
- Guest member removal
- PII masking for non-owners (emails, phones, TSA numbers, confirmation codes)

### Calendar Export
- ICS file generation for trip events

---

## Pro Tier Features

### Timeline Events System
- Canonical trip events generated from bookings and parking
- Event types: Flight Departure, Hotel Check-in/Checkout, Rental Pickup/Return, Parking Expiration, Engagement Start
- Database trigger-based event sync

### NOW Tab / Command Center
- Execution-first "what's happening right now" view
- Today's critical actions card
- Next critical action card
- Compact today timeline
- Sticky quick-ops strip
- Active lodging tracking
- Departure mode detection

### Trip Health Checklist
- Gap analysis for missing information
- Proactive warnings for upcoming events

### Travel Alerts & Intelligence
- Weather-aware alerts
- Airport context and information
- TSA warning cards
- Parking expiration indicators
- Expense reminder banners

### Explore Engine
- Nearby attraction discovery
- Location-based: lodging address or device GPS
- Category-based exploration
- Add-to-trip and add-to-timeline modals
- Pre-arrival hints

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
- Flight, lodging, rental, and parking events

### Notification System
- In-app notification bell
- Departure reminders (configurable hours before)
- Parking expiry reminders (configurable minutes before)
- Stop reminders (configurable minutes before)
- Ticket purchase reminders (configurable days before)
- Expense nudges
- Notification preferences management
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

---

## Admin Features

### User Management (RBAC)
- Admin role via separate `user_roles` table
- View all users with subscription info
- Update user subscription tier
- Update user names
- Soft-delete user accounts
- Trip count tracking

### Support Tickets
- User-submitted support tickets
- Admin ticket management dashboard
- Status tracking (open/resolved)
- App version and page context capture

### Plans Dashboard
- Subscription tier overview
- Upgrade intent tracking
- Usage metrics

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

## Infrastructure

- 10+ Edge Functions (AI parsing, notifications, lifecycle, admin)
- 30+ Database functions (security-definer)
- 50+ RLS policies
- Database triggers for event sync, permission validation, trip counting
- Centralized API client with session expiration handling
- Lovable AI gateway for AI operations (no user API keys required)

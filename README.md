# Real Travel 2 Real Places

A personal travel "trip command center" for organizing all aspects of your trips in one unified interface.

## Overview

Real Travel 2 Real Places helps travelers:
- 📋 **Organize bookings** - Flights, hotels, car rentals, activities
- 💰 **Track expenses** - Receipt scanning, categorization, cost summaries
- 👥 **Manage companions** - Contact info, TSA details, flight assignments
- 📦 **Build packing lists** - AI-generated suggestions based on trip context
- 🅿️ **Track parking** - Location, expiration, costs
- 🔗 **Share trips** - Invite others with view or edit permissions

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | TanStack Query |
| Routing | React Router v6 |
| Backend | Lovable Cloud (Supabase) |
| AI | Lovable AI (Gemini models) |

## Project Structure

```
src/
├── components/       # React components
│   ├── ui/          # shadcn/ui base components
│   └── trips/       # Trip-related components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions
├── pages/           # Route page components
└── types/           # TypeScript definitions

supabase/
├── functions/       # Edge functions (AI parsing)
└── migrations/      # Database migrations

docs/
├── ARCHITECTURE.md  # System architecture
├── DEVELOPER_GUIDE.md # Coding standards
├── COMPONENTS.md    # Component reference
└── AI_PROMPTS.md    # AI system prompts
```

## Features

### Free Tier
- Up to 5 trips (lifetime)
- Full booking management
- Expense tracking with receipt OCR
- Packing list generation
- Trip sharing
- Calendar export (.ics)

### Pro Tier
- Unlimited trips
- TripEvents system (time-based events)
- Upcoming Events display
- Trip Health Checklist
- Proactive warnings

## Documentation

- **[Architecture Guide](docs/ARCHITECTURE.md)** - System design and data flow
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Coding standards and workflow
- **[Component Reference](docs/COMPONENTS.md)** - Component documentation
- **[AI Prompts](docs/AI_PROMPTS.md)** - AI system prompt reference

## Development

### Prerequisites
- Node.js 18+ or Bun
- Lovable account

### Local Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run tests
bun run test
```

### Key Files (Auto-generated - Do Not Edit)
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `supabase/config.toml`
- `.env`

## Deployment

1. Open [Lovable](https://lovable.dev/projects/314579f7-aa3c-49b7-b178-8640b495f1f7)
2. Click **Share → Publish**
3. Click **Update** to deploy frontend changes

Backend changes (edge functions, migrations) deploy automatically.

## URLs

- **Preview**: https://id-preview--314579f7-aa3c-49b7-b178-8640b495f1f7.lovable.app
- **Production**: https://realtravel2realplaces.lovable.app

## Version History

| Version | Description |
|---------|-------------|
| v2.1.28 | Performance hardening, regression tests, production docs |
| v2.1.27 | Tour list visual refinement |
| v2.1.26 | Bulk Tour parsing, stop reminders |
| v2.1.2 | Past trips visual de-emphasis |
| v2.1.1 | Pro Upcoming Events strip |
| v2.1.0 | Pro Trip Health Checklist |
| v2.0.x | TripEvents system, datetime integrity |
| v1.x.x | Core features, AI parsing, expense tracking |

## Performance Notes (v2.1.28)

- **React.memo**: TripCard components prevent unnecessary re-renders
- **Stable callbacks**: Navigation and delete handlers use useCallback
- **Memoized state**: Canonical trip state and cost summaries cached with useMemo
- **Single data source**: All plan gating via useAccess, costs via calculateTripCostSummary

## License

Proprietary - All rights reserved.

© InLight AI, LLC

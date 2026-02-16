/**
 * Help Center — v3.0.0
 * 
 * Premium SaaS documentation with plan transparency,
 * glossary, SEO optimization, and step-by-step guides.
 * Full product name: Real Travel 2 Real Places (never abbreviated).
 */

import { Layout } from '@/components/Layout';
import { Helmet } from 'react-helmet-async';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Plane,
  Users,
  Shield,
  Smartphone,
  CreditCard,
  HelpCircle,
  BookOpen,
  Navigation,
  Search,
  Receipt,
  Car,
  BookMarked,
} from 'lucide-react';

/* ── Plan badge helper ── */
function PlanBadge({ tier }: { tier: 'pro' | 'business' }) {
  return (
    <Badge variant="outline" className="ml-2 text-xs font-normal border-primary/30 text-primary">
      {tier === 'pro' ? 'Pro & Business' : 'Business only'}
    </Badge>
  );
}

/* ── Section types ── */
interface HelpItem {
  question: string;
  answer: React.ReactNode;
}

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description?: string;
  items: HelpItem[];
}

/* ── Content ── */
const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <BookOpen className="w-5 h-5 text-primary" />,
    description: 'Create your account and understand how Real Travel 2 Real Places works.',
    items: [
      {
        question: 'What is Real Travel 2 Real Places?',
        answer: (
          <div className="space-y-3">
            <p>
              Real Travel 2 Real Places is a real-time travel command center built for frequent travelers.
              It shows exactly where to be and when — without digging through emails or switching apps.
            </p>
            <div className="space-y-2 mt-4">
              <p className="font-medium text-foreground">How it works:</p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Add your Trip — upload a screenshot or enter details manually.</li>
                <li>Your Timeline is built automatically from your bookings, lodging, and stops.</li>
                <li>Use NOW to execute your Trip in real time — see what's next, when to leave, and where to go.</li>
              </ol>
            </div>
          </div>
        ),
      },
      {
        question: 'How do I create an account?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Tap <strong>Get Started</strong> on the home page.</li>
            <li>Enter your email address and create a password.</li>
            <li>Check your inbox for a verification email and confirm your account.</li>
            <li>Sign in and complete the short guided introduction.</li>
          </ol>
        ),
      },
      {
        question: 'What happens after I sign up?',
        answer:
          'After verifying your email and signing in, you will see a short guided introduction explaining how Real Travel 2 Real Places works. When the guide is complete, you can create your first trip immediately or go to the dashboard.',
      },
      {
        question: 'Can I revisit the guided introduction?',
        answer:
          'Yes. You can re-view the guide anytime from your Account page without resetting your progress or data.',
      },
      {
        question: 'Understanding Plans',
        answer: (
          <div className="space-y-2">
            <p>
              Real Travel 2 Real Places offers three plans: <strong>Free</strong>, <strong>Pro</strong>, and <strong>Business</strong>.
              Core trip management features are available on every plan.
            </p>
            <p>
              Some advanced features — such as unlimited trips, companion invitations, and advanced reporting — are available on Pro and Business plans.
              Each article in this Help Center clearly indicates plan availability where relevant.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'creating-trips',
    title: 'Creating and Managing Trips',
    icon: <Plane className="w-5 h-5 text-primary" />,
    description: 'Step-by-step guides for creating trips and managing your travel details.',
    items: [
      {
        question: 'How do I create my first Trip?',
        answer: (
          <div className="space-y-3">
            <ol className="list-decimal list-inside space-y-1.5">
              <li>From the dashboard, tap <strong>Create Trip</strong>.</li>
              <li>Enter your trip name, destination, dates, and travel type (business, personal, or mixed).</li>
              <li>Tap <strong>Create</strong>. Your Trip appears on the dashboard immediately.</li>
            </ol>
            <div className="mt-3 space-y-2">
              <p className="font-medium text-foreground">Adding bookings to your Trip:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Upload a screenshot</strong> — confirmation images are parsed for key details.</li>
                <li><strong>Enter details manually</strong> — add any booking type by filling in the form.</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Free plan: up to 5 lifetime trips. Pro and Business plans: unlimited trips.
            </p>
          </div>
        ),
      },
      {
        question: 'What can I add to a Trip?',
        answer: (
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong>Bookings</strong> — flights, lodging, car rentals, transport, and activities.</li>
            <li><strong>Expenses</strong> — track spending by category with optional receipt upload.</li>
            <li><strong>Companions</strong> — add travel partners with contact and flight details.</li>
            <li><strong>Parking</strong> — log parking location, level, space, and expiration.</li>
            <li><strong>Packing</strong> — create and check off packing lists.</li>
            <li><strong>Notes</strong> — save general notes, emergency numbers, and important links.</li>
            <li><strong>Timeline</strong> — a chronological view of every event in your Trip.</li>
            <li><strong>Stops</strong> — scheduled work locations and daily movement tracking. <PlanBadge tier="business" /></li>
          </ul>
        ),
      },
      {
        question: 'How do I add bookings?',
        answer: (
          <div className="space-y-2">
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Open your Trip and go to the <strong>Bookings</strong> section.</li>
              <li>Choose your input method: upload a screenshot or enter details manually.</li>
              <li>Review the parsed or entered details and save.</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              Supported booking types: flight, lodging, car rental, transport, and activity.
            </p>
          </div>
        ),
      },
      {
        question: 'What is the Trip Timeline?',
        answer:
          'The Timeline shows all your Trip events — flights, lodging check-ins and check-outs, rental pickups and returns, parking, and scheduled stops — in chronological order. It provides a single view of everything happening during your Trip. Today\'s events are highlighted with status-based ordering: active events first, then upcoming, then completed.',
      },
      {
        question: 'What Trip states exist?',
        answer: (
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong>Active</strong> — fully editable. This is the default state.</li>
            <li><strong>Locked</strong> — limited editing to preserve your records.</li>
            <li><strong>Closed</strong> — Trip is archived. View-only access.</li>
          </ul>
        ),
      },
      {
        question: 'My confirmation email did not parse correctly.',
        answer:
          'Not all confirmation formats are supported. If automatic parsing misses details, you can edit the booking manually after it is created. You can also add bookings entirely by hand using the manual entry form.',
      },
    ],
  },
  {
    id: 'now-execution',
    title: 'Using Real Travel 2 Real Places During Your Trip',
    icon: <Navigation className="w-5 h-5 text-primary" />,
    description: 'How to use NOW to stay ahead during travel.',
    items: [
      {
        question: 'What is NOW?',
        answer: (
          <div className="space-y-2">
            <p>
              NOW is your real-time execution view. It shows everything you need to act on right now — without scrolling through your full itinerary.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>What's Next</strong> — your next upcoming event (flight, lodging check-in, stop, etc.).</li>
              <li><strong>Leave By</strong> — when you should depart to arrive on time.</li>
              <li><strong>Navigate</strong> — one-tap directions to your next destination.</li>
              <li><strong>Needs Attention</strong> — reminders for tickets, parking expiration, and upcoming deadlines.</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'How do I use NOW step by step?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip.</li>
            <li>Tap <strong>NOW</strong> in the navigation.</li>
            <li>Review <strong>What's Next</strong> to see your upcoming event.</li>
            <li>Check <strong>Leave By</strong> for departure timing.</li>
            <li>Tap <strong>Navigate</strong> to open directions in your maps app.</li>
            <li>Review any items under <strong>Needs Attention</strong>.</li>
          </ol>
        ),
      },
      {
        question: 'What does "Leave By" mean?',
        answer:
          'Leave By shows the recommended departure time for your next event. It is calculated based on the event start time and estimated travel duration to help you arrive on time.',
      },
      {
        question: 'How do reminders work?',
        answer: (
          <div className="space-y-2">
            <p>Real Travel 2 Real Places generates reminders for key travel moments:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Flight departures</li>
              <li>Parking expiration</li>
              <li>Ticket purchase deadlines for activities</li>
              <li>Stop arrival times</li>
              <li>Expense logging nudges</li>
            </ul>
            <p>You can customize reminder timing from your Account settings.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'drive-intelligence',
    title: 'Drive Trips & Travel Intelligence',
    icon: <Car className="w-5 h-5 text-primary" />,
    description: 'Managing drive trips, weather awareness, and airport intelligence.',
    items: [
      {
        question: 'How do I create a Drive Trip?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Tap <strong>Create Trip</strong> from the dashboard.</li>
            <li>Select <strong>Drive</strong> as the transportation mode.</li>
            <li>Enter your destination and dates.</li>
            <li>Your Trip will be optimized for road travel with relevant features like estimated miles and gas tracking.</li>
          </ol>
        ),
      },
      {
        question: 'What travel intelligence is available?',
        answer: (
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong>Weather awareness</strong> — current conditions and forecasts for your destination.</li>
            <li><strong>Airport information</strong> — terminal details, TSA guidelines, and airport-specific notes for flight trips. <PlanBadge tier="pro" /></li>
            <li><strong>Travel alerts</strong> — proactive notifications about conditions affecting your Trip.</li>
          </ul>
        ),
      },
      {
        question: 'How does weather information work?',
        answer:
          'When viewing your Trip, a weather widget shows current conditions and forecasts for your destination. This helps you prepare for arrival conditions and pack appropriately.',
      },
    ],
  },
  {
    id: 'explore',
    title: 'EXPLORE',
    icon: <Search className="w-5 h-5 text-primary" />,
    description: 'Discover places and activities near your destination.',
    items: [
      {
        question: 'What is EXPLORE?',
        answer:
          'EXPLORE helps you discover restaurants, attractions, and activities near your Trip destination. Browse curated suggestions organized by category and add them to your Trip timeline directly.',
      },
      {
        question: 'How do I use EXPLORE?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip and tap <strong>EXPLORE</strong>.</li>
            <li>Browse categories such as restaurants, attractions, and activities.</li>
            <li>Tap any place to see details, ratings, and photos.</li>
            <li>Tap <strong>Add to Trip</strong> to add it to your Timeline.</li>
          </ol>
        ),
      },
      {
        question: 'Is EXPLORE available on all plans?',
        answer:
          'Yes. EXPLORE is a core feature available on Free, Pro, and Business plans.',
      },
    ],
  },
  {
    id: 'expenses',
    title: 'EXPENSES',
    icon: <Receipt className="w-5 h-5 text-primary" />,
    description: 'Track spending, categorize expenses, and manage trip budgets.',
    items: [
      {
        question: 'How do I add an expense?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip and go to <strong>EXPENSES</strong>.</li>
            <li>Tap <strong>Add Expense</strong>.</li>
            <li>Enter the <strong>amount</strong>, <strong>date</strong>, and <strong>category</strong> (meals, transport, activity, shopping, parking, or other).</li>
            <li>Optionally add a description, notes, or upload a receipt photo.</li>
            <li>Tap <strong>Save</strong>.</li>
          </ol>
        ),
      },
      {
        question: 'What expense categories are available?',
        answer: (
          <ul className="list-disc list-inside space-y-1">
            <li>Meals (breakfast, lunch, dinner, snacks, coffee, groceries)</li>
            <li>Transport (uber, taxi, gas, tolls, public transit)</li>
            <li>Activity (tours, entertainment, tickets, sports)</li>
            <li>Shopping (souvenirs, clothing, gifts)</li>
            <li>Parking</li>
            <li>Other (tips, fees, insurance, miscellaneous)</li>
          </ul>
        ),
      },
      {
        question: 'How does expense tracking work for mixed trips?',
        answer:
          'For trips classified as "mixed" (both business and personal), you can assign each expense as Business or Personal. The Expenses tab displays a side-by-side summary of Business, Personal, and Unassigned totals. You can filter the list by purpose without affecting the totals.',
      },
      {
        question: 'Can I export my expenses?',
        answer: 'Export functionality is not currently available.',
      },
      {
        question: 'Is advanced expense reporting available?',
        answer: (
          <span>
            Advanced multi-trip expense reporting is available on the Business plan. <PlanBadge tier="business" />
          </span>
        ),
      },
    ],
  },
  {
    id: 'sharing',
    title: 'Sharing a Trip with Companions',
    icon: <Users className="w-5 h-5 text-primary" />,
    description: 'Invite travel partners and manage access permissions.',
    items: [
      {
        question: 'How do I invite someone to my Trip?',
        answer: (
          <div className="space-y-2">
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Open your Trip and go to the <strong>Members</strong> section.</li>
              <li>Enter the email address of the person you want to invite.</li>
              <li>Select their permissions (Read Only, Can Add Expenses, Can Add Lodging).</li>
              <li>Send the invitation. The link is valid for 7 days.</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              Trip sharing requires an active Pro or Business plan. <PlanBadge tier="pro" />
            </p>
          </div>
        ),
      },
      {
        question: 'How does someone accept an invitation?',
        answer:
          'When your companion clicks the invitation link, they will be asked to sign in or create an account. Once signed in, they are added to your Trip with the permissions you selected.',
      },
      {
        question: 'Can I invite multiple people?',
        answer:
          'Yes. You can invite as many companions as you like. Each person receives their own invitation link with individual permissions.',
      },
    ],
  },
  {
    id: 'permissions',
    title: 'Companion Permissions',
    icon: <Shield className="w-5 h-5 text-primary" />,
    description: 'Understand and manage what companions can do on your Trip.',
    items: [
      {
        question: 'What permission options are available?',
        answer: (
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong>Read Only</strong> — can view the Trip but cannot add anything.</li>
            <li><strong>Can Add Expenses</strong> — can log expenses on the Trip.</li>
            <li><strong>Can Add Lodging</strong> — can add lodging bookings to the Trip.</li>
          </ul>
        ),
      },
      {
        question: 'Can I combine permissions?',
        answer:
          'You can enable both "Can Add Expenses" and "Can Add Lodging" together. Read Only cannot be combined with any adding permission.',
      },
      {
        question: 'Can companions delete items?',
        answer:
          'No. Companions cannot delete any Trip items regardless of their permissions. Only the Trip owner can delete items.',
      },
      {
        question: 'Can I change permissions after someone has joined?',
        answer:
          'Yes. The Trip owner can update any companion\'s permissions at any time from the Members section.',
      },
    ],
  },
  {
    id: 'mobile',
    title: 'Mobile Experience',
    icon: <Smartphone className="w-5 h-5 text-primary" />,
    description: 'How Real Travel 2 Real Places works on your phone.',
    items: [
      {
        question: 'How does mobile navigation work?',
        answer: (
          <div className="space-y-2">
            <p>On mobile devices, your Trip uses a bottom navigation bar with main tabs:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>NOW</strong> — real-time execution view</li>
              <li><strong>PLAN</strong> — timeline and trip overview</li>
              <li><strong>EXPLORE</strong> — discover nearby places</li>
              <li><strong>EXPENSES</strong> — expense tracking</li>
              <li><strong>MORE</strong> — bookings, companions, parking, packing, and notes</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'How do I quickly add an expense on mobile?',
        answer:
          'On mobile, a quick "Add Expense" button appears on the Summary screen so you can log an expense with one tap without switching tabs.',
      },
      {
        question: 'Does the app work offline?',
        answer:
          'Real Travel 2 Real Places requires an internet connection. For best results, review your NOW screen before entering areas with limited connectivity.',
      },
    ],
  },
  {
    id: 'plans',
    title: 'Understanding Plans',
    icon: <CreditCard className="w-5 h-5 text-primary" />,
    description: 'What each plan includes and how they differ.',
    items: [
      {
        question: 'What plans are available?',
        answer: (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="font-medium text-foreground">Free</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Up to 5 lifetime trips</li>
                <li>Full trip management: bookings, expenses, packing, parking, notes</li>
                <li>Core reminders and travel alerts</li>
                <li>EXPLORE — discover places near your destination</li>
                <li>Timeline and NOW execution view</li>
              </ul>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="font-medium text-foreground">Pro</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Everything in Free</li>
                <li>Unlimited trips</li>
                <li>Trip sharing and companion invitations</li>
                <li>Airport intelligence and travel awareness</li>
                <li>Priority support</li>
              </ul>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="font-medium text-foreground">Business</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Everything in Pro</li>
                <li>Stops — scheduled work locations and daily movement tracking</li>
                <li>Stop-level expense assignment</li>
                <li>Advanced multi-trip reporting</li>
                <li>Built for domestic and international road warriors</li>
              </ul>
            </div>
          </div>
        ),
      },
      {
        question: 'How do I upgrade my plan?',
        answer:
          'You can view available plans and request an upgrade from the Plans page, accessible from your Account settings or the dashboard.',
      },
      {
        question: 'What happens to my data if I downgrade?',
        answer:
          'Your existing trips and data are preserved indefinitely, regardless of plan changes. The lifetime trip count never decreases, even if you delete a trip.',
      },
      {
        question: 'Do I lose features if I downgrade?',
        answer:
          'If you downgrade from Pro or Business to Free, advanced features become unavailable, but all data you created remains intact and accessible in read-only mode.',
      },
    ],
  },
  {
    id: 'glossary',
    title: 'Glossary',
    icon: <BookMarked className="w-5 h-5 text-primary" />,
    description: 'Definitions of key terms used in Real Travel 2 Real Places.',
    items: [
      {
        question: 'Trip',
        answer:
          'A Trip is the top-level container for all your travel information — bookings, expenses, companions, parking, packing, and notes. Each Trip has a destination, dates, and a transportation mode.',
      },
      {
        question: 'Stop',
        answer: (
          <span>
            A Stop is a scheduled work location or engagement during a Trip. Stops include a name, address, date, and time. <PlanBadge tier="business" />
          </span>
        ),
      },
      {
        question: 'Lodging',
        answer:
          'Lodging refers to any overnight accommodation — hotel, Airbnb, VRBO, or other. Lodging bookings include check-in and check-out times and appear on your Timeline.',
      },
      {
        question: 'What\'s Next',
        answer:
          'The next upcoming event in your Trip, displayed prominently on the NOW screen. It could be a flight, lodging check-in, stop, or activity.',
      },
      {
        question: 'Leave By',
        answer:
          'The recommended departure time for your next event, displayed on the NOW screen to help you arrive on time.',
      },
      {
        question: 'Timeline',
        answer:
          'A chronological view of every event in your Trip — flights, lodging, rentals, parking, and stops — organized by date and time.',
      },
      {
        question: 'EXPLORE',
        answer:
          'A discovery feature that surfaces restaurants, attractions, and activities near your Trip destination. Available on all plans.',
      },
      {
        question: 'Reminder',
        answer:
          'An automated notification generated before key travel moments — flight departures, parking expiration, ticket deadlines, and stop arrivals. Configurable from Account settings.',
      },
      {
        question: 'Expense',
        answer:
          'A financial record tied to a Trip. Each expense includes an amount, date, category, and optional description. For mixed trips, expenses can be classified as Business or Personal.',
      },
      {
        question: 'Drive Trip',
        answer:
          'A Trip where the primary transportation mode is driving rather than flying. Drive Trips include features relevant to road travel such as estimated miles and gas expense tracking.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: <HelpCircle className="w-5 h-5 text-primary" />,
    description: 'Solutions to common issues.',
    items: [
      {
        question: 'I did not receive a verification email.',
        answer:
          'Check your spam or junk folder. The email may take a few minutes to arrive. If you still do not see it, try signing up again with the same email address.',
      },
      {
        question: 'My invitation link is not working.',
        answer:
          'Invitation links expire after 7 days. If your link has expired, ask the Trip owner to send a new invitation. Make sure you are signed in with the same email address the invitation was sent to.',
      },
      {
        question: 'I cannot add items to a shared Trip.',
        answer:
          'Your permissions are set by the Trip owner. If you have Read Only access, you can view the Trip but cannot add items. Ask the Trip owner to update your permissions from the Members section.',
      },
      {
        question: 'The app looks different on my phone.',
        answer:
          'The mobile layout is designed for smaller screens. Navigation moves to a bottom bar, and some sections are grouped under MORE. All features remain available — they are organized differently for easier use on the go.',
      },
      {
        question: 'How do I contact support?',
        answer:
          'Use the "Contact Support" option in your Account settings. Include details about the issue and which Trip is affected. Our team will respond as soon as possible.',
      },
    ],
  },
];

/* ── FAQ Schema (JSON-LD) ── */
function FaqJsonLd() {
  const allFaqs = HELP_SECTIONS.flatMap((s) =>
    s.items
      .filter((item) => typeof item.answer === 'string')
      .map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      }))
  );

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allFaqs,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/* ── Page ── */
export default function HelpCenter() {
  return (
    <>
      <Helmet>
        <title>Help Center — Real Travel 2 Real Places | Travel Management App</title>
        <meta
          name="description"
          content="Get help with Real Travel 2 Real Places — a real-time travel command center for frequent travelers. Step-by-step guides for trips, expenses, companions, and plans."
        />
        <link rel="canonical" href="https://realtravel2realplaces.lovable.app/help" />
      </Helmet>
      <FaqJsonLd />
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-8">
          {/* Header */}
          <header className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Help Center
            </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl mx-auto">
              Everything you need to know about Real Travel 2 Real Places — a real-time travel command center that shows exactly where to be and when.
            </p>
          </header>

          {/* Quick Nav */}
          <nav className="flex flex-wrap gap-2 justify-center" aria-label="Help Center sections">
            {HELP_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                {section.title}
              </a>
            ))}
          </nav>

          <Separator />

          {/* Sections */}
          {HELP_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`heading-${section.id}`}>
              <Card>
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-center gap-3 mb-1">
                    {section.icon}
                    <h2 id={`heading-${section.id}`} className="text-xl font-semibold text-foreground">
                      {section.title}
                    </h2>
                  </div>
                  {section.description && (
                    <p className="text-sm text-muted-foreground mb-4 ml-8">
                      {section.description}
                    </p>
                  )}
                  <Accordion type="multiple" className="w-full">
                    {section.items.map((item, idx) => (
                      <AccordionItem key={idx} value={`${section.id}-${idx}`}>
                        <AccordionTrigger className="text-left text-sm md:text-base font-medium">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      </Layout>
    </>
  );
}

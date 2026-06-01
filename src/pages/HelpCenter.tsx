/**
 * Help Center — v4.11.0
 *
 * Complete user manual for Real Travel 2 Real Places.
 * Reflects the Today / Flow / Move / Guide command-center model,
 * Tours workspace, grounded Ask AI, capability-scoped sharing, and
 * the offline execution window. Step-by-step guides only — no fluff.
 * Full product name: Real Travel 2 Real Places (never abbreviated).
 */

import { Layout } from '@/components/Layout';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
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
  Package,
  Bell,
  FileText,
  MapPin,
  Calendar,
  CircleParking,
} from 'lucide-react';

/* ── Back to Dashboard ── */
function BackToDashboard() {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
      onClick={() => navigate('/dashboard')}
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Dashboard
    </Button>
  );
}

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
  /* ================================================================
   * GETTING STARTED
   * ================================================================ */
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
                <li>Create a Trip — choose your travel mode (Fly, Drive, or Train), enter your destination and dates.</li>
                <li>Add bookings — paste confirmation text, upload a screenshot, or enter details manually.</li>
                <li>Your Timeline builds automatically from your bookings, lodging, parking, and scheduled activities.</li>
                <li>Use Today during your trip to see what's next, when to leave, and one-tap directions.</li>
              </ol>
            </div>
          </div>
        ),
      },
      {
        question: 'How do I create an account?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Tap <strong>Get Started</strong> on the home page, or open the iOS app from the App Store.</li>
            <li>Enter your email address and create a password — or tap <strong>Continue with Apple</strong> in the iOS app for one-tap sign-up.</li>
            <li>If you used email, check your inbox for a verification message and confirm your account.</li>
            <li>Sign in and complete the short guided introduction.</li>
          </ol>
        ),
      },
      {
        question: 'Where can I use Real Travel 2 Real Places?',
        answer: (
          <div className="space-y-2">
            <p>Three ways, all signed in to the same account with everything in sync:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>iOS app</strong> — native iPhone and iPad app on the Apple App Store.</li>
              <li><strong>Installable web app</strong> — add to your home screen from Chrome (Android) or Safari (iOS) for a full-screen, app-like experience.</li>
              <li><strong>Browser</strong> — full desktop experience at realtravel2realplaces.app.</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'What happens after I sign up?',
        answer:
          'After verifying your email and signing in, you see a short guided introduction explaining how Real Travel 2 Real Places works. When the guide is complete, you can create your first trip immediately or go to the dashboard.',
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

  /* ================================================================
   * CREATING AND MANAGING TRIPS
   * ================================================================ */
  {
    id: 'creating-trips',
    title: 'Creating and Managing Trips',
    icon: <Plane className="w-5 h-5 text-primary" />,
    description: 'Step-by-step guides for creating trips by air, car, or train.',
    items: [
      {
        question: 'How do I create a Flight Trip?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>From the dashboard, tap <strong>Create Trip</strong>.</li>
            <li>Select <strong>Fly</strong> as the transportation mode.</li>
            <li>Enter your <strong>trip name</strong> and <strong>destination city</strong> (use the autocomplete).</li>
            <li>Set your <strong>departure date</strong> and <strong>return date</strong>.</li>
            <li>Choose the <strong>trip type</strong>: Business, Personal, or Mixed.</li>
            <li>Tap <strong>Create Trip</strong>. The trip appears on your dashboard.</li>
          </ol>
        ),
      },
      {
        question: 'How do I create a Drive Trip?',
        answer: (
          <div className="space-y-3">
            <ol className="list-decimal list-inside space-y-1.5">
              <li>From the dashboard, tap <strong>Create Trip</strong>.</li>
              <li>Select <strong>Drive</strong> as the transportation mode.</li>
              <li>Enter your <strong>destination city</strong> using the autocomplete.</li>
              <li>Optionally enter a <strong>street address</strong> below the city field for door-to-door navigation.</li>
              <li>Optionally add a <strong>starting location</strong> (city and street address).</li>
              <li>Set your <strong>departure date</strong> and <strong>return date</strong>.</li>
              <li>Choose the <strong>trip type</strong> and tap <strong>Create Trip</strong>.</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Street addresses are optional but enable precise turn-by-turn navigation from the Drive Mode screen and timeline Navigate buttons.
            </p>
          </div>
        ),
      },
      {
        question: 'How do I create a Train Trip?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>From the dashboard, tap <strong>Create Trip</strong>.</li>
            <li>Select <strong>Train</strong> as the transportation mode.</li>
            <li>Enter your <strong>trip name</strong> and <strong>destination city</strong>.</li>
            <li>Set your <strong>departure date</strong> and <strong>return date</strong>.</li>
            <li>Choose the <strong>trip type</strong> and tap <strong>Create Trip</strong>.</li>
          </ol>
        ),
      },
      {
        question: 'How do I create a Trip from a confirmation?',
        answer: (
          <div className="space-y-3">
            <ol className="list-decimal list-inside space-y-1.5">
              <li>From the dashboard, find the <strong>drop zone</strong> area.</li>
              <li>Paste confirmation text or upload a screenshot of your booking.</li>
              <li>The AI extracts trip details (destination, dates, bookings) automatically.</li>
              <li>Review the suggested trip and confirm creation.</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Supported formats: airline confirmations, hotel bookings, car rentals, and multi-booking itineraries. If parsing misses a detail, you can edit it after creation.
            </p>
          </div>
        ),
      },
      {
        question: 'What can I add to a Trip?',
        answer: (
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong>Bookings</strong> — flights, lodging, car rentals, transport (train/bus/metro/ferry), and activities.</li>
            <li><strong>Expenses</strong> — track spending by category with optional receipt photo upload.</li>
            <li><strong>Companions</strong> — travel partners with contact and flight details.</li>
            <li><strong>Parking</strong> — log parking location, level, space, and expiration time.</li>
            <li><strong>Packing</strong> — AI-generated packing lists with climate analysis and color/style tips.</li>
            <li><strong>Notes</strong> — general notes, emergency numbers, and important links.</li>
            <li><strong>Explore</strong> — discover real places nearby and add them to your timeline.</li>
            <li><strong>Stops</strong> — scheduled work locations and daily movement tracking. <PlanBadge tier="business" /></li>
          </ul>
        ),
      },
      {
        question: 'How do I edit trip dates?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip and go to the <strong>Summary</strong> or <strong>PLAN</strong> view.</li>
            <li>Tap the <strong>dates</strong> shown in the destination header.</li>
            <li>Update the start and/or end date in the dialog.</li>
            <li>Tap <strong>Save</strong>. The timeline and all calculations update automatically.</li>
          </ol>
        ),
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
        question: 'How do I delete a Trip?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>From the dashboard, find the Trip you want to delete.</li>
            <li>Tap the <strong>delete</strong> button on the trip card.</li>
            <li>Confirm deletion in the dialog. This action cannot be undone.</li>
          </ol>
        ),
      },
    ],
  },

  /* ================================================================
   * BOOKINGS
   * ================================================================ */
  {
    id: 'bookings',
    title: 'Bookings',
    icon: <FileText className="w-5 h-5 text-primary" />,
    description: 'Add and manage flights, lodging, car rentals, transport, and activities.',
    items: [
      {
        question: 'How do I add a booking?',
        answer: (
          <div className="space-y-3">
            <p className="font-medium text-foreground">Option 1: AI parsing</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Open your Trip → <strong>Bookings</strong>.</li>
              <li>Tap <strong>Add Booking</strong>.</li>
              <li>Choose <strong>Upload Screenshot</strong> or <strong>Paste Confirmation Text</strong>.</li>
              <li>The AI extracts booking details. Review and save.</li>
            </ol>
            <p className="font-medium text-foreground mt-3">Option 2: Manual entry</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Open your Trip → <strong>Bookings</strong>.</li>
              <li>Tap <strong>Add Booking</strong> → <strong>Enter Manually</strong>.</li>
              <li>Select the booking type (Flight, Lodging, Car Rental, Transport, or Activity).</li>
              <li>Fill in the details and tap <strong>Save</strong>.</li>
            </ol>
          </div>
        ),
      },
      {
        question: 'What booking types are supported?',
        answer: (
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong>Flight</strong> — airline, confirmation number, passenger name, departure/arrival airports, TSA PreCheck, frequent flyer number.</li>
            <li><strong>Lodging</strong> — property name, type (Hotel/Airbnb/VRBO/Other), check-in/checkout dates, address.</li>
            <li><strong>Car Rental</strong> — rental company, pickup/return locations, dates.</li>
            <li><strong>Transport</strong> — mode (train, bus, metro, ferry), operator, from/to locations.</li>
            <li><strong>Activity</strong> — venue name, ticket requirements, advance booking recommendations.</li>
          </ul>
        ),
      },
      {
        question: 'How do I edit a booking?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip → <strong>Bookings</strong>.</li>
            <li>Find the booking you want to edit.</li>
            <li>Tap the <strong>Edit</strong> button on the booking card.</li>
            <li>Update any fields and tap <strong>Save</strong>.</li>
          </ol>
        ),
      },
      {
        question: 'How do I delete a booking?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip → <strong>Bookings</strong>.</li>
            <li>Find the booking you want to delete.</li>
            <li>Tap the <strong>Delete</strong> button and confirm.</li>
          </ol>
        ),
      },
      {
        question: 'My confirmation did not parse correctly.',
        answer:
          'Not all confirmation formats are supported. If automatic parsing misses details, tap Edit on the booking to correct fields manually. You can also add bookings entirely by hand using the manual entry form.',
      },
    ],
  },

  /* ================================================================
   * TIMELINE
   * ================================================================ */
  {
    id: 'timeline',
    title: 'Timeline',
    icon: <Calendar className="w-5 h-5 text-primary" />,
    description: 'Your chronological view of every event during a Trip.',
    items: [
      {
        question: 'What is the Trip Timeline?',
        answer:
          'The Timeline shows all your Trip events — flights, lodging check-ins and check-outs, rental pickups and returns, parking, transport, activities, and scheduled Explore places — in chronological order. Events are grouped by date. Today\'s events are highlighted with active events first, then upcoming, then completed.',
      },
      {
        question: 'How are events added to the Timeline?',
        answer: (
          <div className="space-y-2">
            <p>Events appear on the Timeline automatically from these sources:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Bookings</strong> — each booking generates start and (where applicable) end events.</li>
              <li><strong>Parking</strong> — parking entries appear with start and expiration events.</li>
              <li><strong>Discover → Add to Timeline</strong> — places you schedule from the Discover surface appear as engagement events.</li>
              <li><strong>Tours</strong> — manual stops you add in the Tours workspace.</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              You do not create timeline events manually. They are generated from your bookings, parking, and scheduled activities.
            </p>
          </div>
        ),
      },
      {
        question: 'How do I navigate to a place from the Timeline?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Find the event on your Timeline.</li>
            <li>Tap the <strong>Navigate</strong> button on the event row.</li>
            <li>Your maps app opens with directions to that location.</li>
          </ol>
        ),
      },
      {
        question: 'What does "Explore nearby" do on the Timeline?',
        answer:
          'Tapping "Explore nearby" on a timeline event opens the Discover surface and centers it on that event\'s location, so you can find restaurants, cafes, or attractions near your next stop.',
      },
      {
        question: 'How do I tap through from the Timeline to a booking?',
        answer:
          'Tap any event on the Timeline. You are taken directly to the corresponding booking, parking, or record with it scrolled into view and highlighted.',
      },
    ],
  },

  /* ================================================================
   * TODAY — COMMAND CENTER
   * ================================================================ */
  {
    id: 'today-tab',
    title: 'Today — Command Center',
    icon: <Navigation className="w-5 h-5 text-primary" />,
    description: 'Your real-time view during a trip. The single screen that answers "what now?".',
    items: [
      {
        question: 'What is the Today tab?',
        answer: (
          <div className="space-y-2">
            <p>
              Today is the command center for an active trip. It surfaces only what matters right now — your next move, when to leave, and the one or two actions worth taking — so you never have to scroll through a full itinerary in the moment.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Next Action</strong> — the single most urgent upcoming event (flight, check-in, drive, stop, scheduled place).</li>
              <li><strong>Leave By</strong> — recommended departure time with a Comfortable / Tight / High Risk indicator.</li>
              <li><strong>Navigate</strong> — one-tap directions to the next destination.</li>
              <li><strong>Quick Actions</strong> — Add Expense, Drive Mode (when relevant), and other context-aware shortcuts.</li>
              <li><strong>Remaining Today</strong> — a compact list of what is still ahead today.</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Today is intentionally high-signal: messages are deduplicated so the same alert never appears twice, and recommendations have a short cooldown to prevent churn.
            </p>
          </div>
        ),
      },
      {
        question: 'How do I use Today step by step?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip and tap <strong>Today</strong> in the navigation.</li>
            <li>Read the <strong>Next Action</strong> card at the top.</li>
            <li>Check <strong>Leave By</strong> for departure timing when it is shown.</li>
            <li>Tap <strong>Navigate</strong> to open turn-by-turn directions in your maps app.</li>
            <li>Use the <strong>Quick Actions</strong> strip to add an expense or open Drive Mode.</li>
            <li>Scroll down to see the rest of <strong>Remaining Today</strong>.</li>
          </ol>
        ),
      },
      {
        question: 'When is Today available?',
        answer:
          'Today is available from 14 days before departure through the end of the trip. Before that window, your Trip opens to Flow (the full timeline) by default.',
      },
      {
        question: 'What does "Leave By" mean?',
        answer:
          'Leave By is the recommended departure time for your next event, calculated from the event start time and live travel duration (traffic-aware on driving segments). The indicator labels timing as Comfortable, Tight, or High Risk so you can act before it tightens further.',
      },
    ],
  },

  /* ================================================================
   * FLOW — TIMELINE
   * ================================================================ */
  {
    id: 'flow-tab',
    title: 'Flow — Full Timeline',
    icon: <Calendar className="w-5 h-5 text-primary" />,
    description: 'The chronological view of every event in your trip.',
    items: [
      {
        question: 'What is the Flow tab?',
        answer:
          'Flow is the full chronological timeline of your trip — flights, lodging check-ins and check-outs, rental pickups and returns, parking, transport, tour stops, and scheduled places. It is the answer to "what is the whole picture?" while Today answers "what now?".',
      },
      {
        question: 'How is Flow sorted?',
        answer: (
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong>Today</strong> events are pinned to the top.</li>
            <li><strong>Future</strong> events follow in ascending order (soonest first).</li>
            <li><strong>Past</strong> events appear at the bottom in descending order (most recent first) so a completed history stays out of the way.</li>
          </ul>
        ),
      },
      {
        question: 'How do events get on Flow?',
        answer: (
          <div className="space-y-2">
            <p>Flow is generated automatically from your data — you do not create timeline events directly. Sources include:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Bookings</strong> — flights, lodging, car rentals, transport, activities.</li>
              <li><strong>Parking</strong> — start and expiration events.</li>
              <li><strong>Tour stops</strong> — manual stops added in the Tours workspace.</li>
              <li><strong>Scheduled places</strong> — places you add to your timeline from discovery.</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'How do I navigate or explore from Flow?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Find the event in Flow.</li>
            <li>Tap <strong>Navigate</strong> to open directions in your maps app.</li>
            <li>Tap <strong>Explore nearby</strong> to discover places around that event's location.</li>
          </ol>
        ),
      },
    ],
  },

  /* ================================================================
   * MOVE — TRANSPORT GUIDANCE
   * ================================================================ */
  {
    id: 'move-tab',
    title: 'Move — Getting There',
    icon: <Car className="w-5 h-5 text-primary" />,
    description: 'Directive transport guidance for the next leg of your trip.',
    items: [
      {
        question: 'What is the Move tab?',
        answer: (
          <div className="space-y-2">
            <p>
              Move tells you how to get to your next destination — by car, transit, or walking — without the analysis paralysis of an open-ended search.
            </p>
            <p>
              You see <strong>exactly two options</strong> at a time: the recommended one and a clear alternative. Each option carries a live ETA, departure window, and a Navigate button.
            </p>
          </div>
        ),
      },
      {
        question: 'How does Move pick its options?',
        answer: (
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong>Drive</strong> options use live traffic with a built-in safety buffer.</li>
            <li><strong>Transit</strong> options use real schedules and score on total door-to-door time.</li>
            <li><strong>Drive Mode</strong> opens automatically for Drive trips with an active or imminent driving leg.</li>
          </ul>
        ),
      },
      {
        question: 'How do I use Move?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip and tap <strong>Move</strong>.</li>
            <li>Review the recommended option and the alternative.</li>
            <li>Tap <strong>Navigate</strong> on the option you want — directions open in your maps app.</li>
            <li>For Drive trips, tap <strong>Drive Mode</strong> for a focused, full-screen driving view.</li>
          </ol>
        ),
      },
    ],
  },

  /* ================================================================
   * GUIDE — CONTEXTUAL ALERTS
   * ================================================================ */
  {
    id: 'guide-tab',
    title: 'Guide — Heads-Up Alerts',
    icon: <Bell className="w-5 h-5 text-primary" />,
    description: 'The short list of things worth your attention right now.',
    items: [
      {
        question: 'What is the Guide tab?',
        answer:
          'Guide surfaces the top contextual alerts for your trip — timing risks, weather changes, sequence problems between bookings, and notable external signals. It is capped at the most important items so you can scan it in seconds.',
      },
      {
        question: 'How are Guide alerts prioritized?',
        answer: (
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong>Timing</strong> first — anything that affects whether you make a flight, check-in, or scheduled stop.</li>
            <li><strong>Weather</strong> next — significant precipitation, thunderstorms, or temperature swings at your location.</li>
            <li><strong>Sequence and external signals</strong> after that — gaps between bookings, flight status, transit advisories.</li>
          </ul>
        ),
      },
      {
        question: 'What kinds of alerts can Guide show?',
        answer: (
          <ul className="list-disc list-inside space-y-1.5">
            <li>Leave-by warnings when traffic or transit tightens.</li>
            <li>Flight status changes (delays, gate changes) for tracked flights.</li>
            <li>Weather windows that affect outdoor plans.</li>
            <li>Airport pressure states as departure approaches (T-120 → T-30).</li>
            <li>Sequence issues — for example, a hotel check-out before a rental return.</li>
          </ul>
        ),
      },
    ],
  },

  /* ================================================================
   * TOURS — MANUAL STOPS WORKSPACE
   * ================================================================ */
  {
    id: 'tours',
    title: 'Tours — Manual Stops',
    icon: <MapPin className="w-5 h-5 text-primary" />,
    description: 'Plan a sequence of stops that are not tied to a booking.',
    items: [
      {
        question: 'What is the Tours workspace?',
        answer:
          'Tours is where you plan stops that do not come from a booking — sightseeing routes, multi-stop work days, a day of errands. Each stop you add becomes an event on your Flow timeline automatically.',
      },
      {
        question: 'How do I add a stop?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip → <strong>Tours</strong> (under MORE on mobile).</li>
            <li>Tap <strong>Add Stop</strong>.</li>
            <li>Enter the place name and address, and pick a date.</li>
            <li>Set a time, or leave it as <strong>TBD</strong> and we will slot it in a sensible order.</li>
            <li>Tap <strong>Save</strong>. The stop appears in Tours and on Flow.</li>
          </ol>
        ),
      },
      {
        question: 'How does TBD ordering work?',
        answer:
          'Stops marked TBD are ordered by nearest-neighbor geography on their date — once you have a start point, the closest unscheduled stop comes next, then the closest after that. As soon as you give a stop a time, it locks to that time.',
      },
      {
        question: 'Are Tours the same as Bookings?',
        answer:
          'No. Bookings are monetary records (flights, lodging, rentals, paid activities) — they carry costs. Tours are manual stops with no money attached. Both feed Flow, but they live in separate workspaces so financial reporting stays clean.',
      },
    ],
  },

  /* ================================================================
   * ASK AI — GROUNDED ASSISTANT
   * ================================================================ */
  {
    id: 'ask-ai',
    title: 'Ask AI',
    icon: <HelpCircle className="w-5 h-5 text-primary" />,
    description: 'A grounded assistant that answers questions about your trip.',
    items: [
      {
        question: 'What is Ask AI?',
        answer:
          'Ask AI is an in-app assistant that answers questions about the trip you have open — your bookings, dates, costs, packing, and timeline. It is grounded in your trip data, so answers stay specific to what you have entered rather than guessing.',
      },
      {
        question: 'What kinds of questions work best?',
        answer: (
          <ul className="list-disc list-inside space-y-1.5">
            <li>"What is my next flight and when do I leave for the airport?"</li>
            <li>"How much have I spent on meals so far?"</li>
            <li>"What do I have planned for tomorrow?"</li>
            <li>"Is there anything I should pack that I'm missing?"</li>
          </ul>
        ),
      },
      {
        question: 'What are the limits?',
        answer:
          'Each question is answered on its own — Ask AI does not carry a long back-and-forth conversation. There is a per-session query cap to keep the feature fast and responsive. For longer planning conversations, use the trip workspace directly.',
      },
    ],
  },

  /* ================================================================
   * DRIVE TRIPS & DRIVE MODE
   * ================================================================ */
  {
    id: 'drive-trips',
    title: 'Drive Trips & Drive Mode',
    icon: <Car className="w-5 h-5 text-primary" />,
    description: 'Road trip features, Drive Mode screen, and navigation.',
    items: [
      {
        question: 'How do Drive Trips differ from Flight Trips?',
        answer: (
          <ul className="list-disc list-inside space-y-1.5">
            <li>Drive Trips include a <strong>Drive Summary Card</strong> with estimated miles and gas expense tracking.</li>
            <li>A <strong>Drive Mode</strong> screen provides focused navigation during the drive.</li>
            <li>The Today tab shows <strong>Drive Mode</strong> as a quick action when a drive segment is active, and Move surfaces it as the recommended option.</li>
            <li>Street addresses for origin and destination enable door-to-door navigation.</li>
          </ul>
        ),
      },
      {
        question: 'How do I use Drive Mode?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Drive Trip.</li>
            <li>Go to <strong>Today</strong> (or <strong>Move</strong>) and tap <strong>Drive Mode</strong>, or tap the <strong>Drive Mode</strong> entry card on the Summary screen.</li>
            <li>The Drive Mode screen shows your current route segment and next destination.</li>
            <li>Tap <strong>Navigate</strong> to open turn-by-turn directions in your maps app.</li>
          </ol>
        ),
      },
      {
        question: 'How do I add a gas expense?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Drive Trip → <strong>Summary</strong>.</li>
            <li>In the Drive Summary Card, tap <strong>Add Gas Expense</strong>.</li>
            <li>Enter the amount and any notes.</li>
            <li>Tap <strong>Save</strong>. The expense is logged under the Transport → Gas category.</li>
          </ol>
        ),
      },
      {
        question: 'Can I add street addresses after creating a Drive Trip?',
        answer:
          'Street addresses (origin and destination) are set during trip creation. To update them, you would need to edit the trip details. The city-level destination can be set via the trip creation wizard.',
      },
    ],
  },

  /* ================================================================
   * DISCOVER PLACES
   * ================================================================ */
  {
    id: 'discover',
    title: 'Discover Places',
    icon: <Search className="w-5 h-5 text-primary" />,
    description: 'Find real places near your destination with photos, ratings, and reviews.',
    items: [
      {
        question: 'What is Discover?',
        answer: (
          <div className="space-y-2">
            <p>
              Discover surfaces real places near your Trip destination — restaurants, attractions, cafes, parks, museums, and more. Each result includes a real photo, star rating, and review count, and you can add any place straight to your Flow timeline.
            </p>
            <p className="font-medium text-foreground mt-3">Categories:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Signature Attractions — theme parks, tours, entertainment</li>
              <li>Dining — restaurants and eateries</li>
              <li>Cafes & Coffee — coffee shops and cafes</li>
              <li>Bars & Nightlife — bars and evening venues</li>
              <li>Parks & Gardens — parks and outdoor spaces</li>
              <li>Hiking Trails — trails and nature walks</li>
              <li>Museums & Culture — museums, galleries, and visitor centers</li>
              <li>Grocery & Markets — grocery stores and supermarkets</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'How do I use Discover?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip and open the Discover surface from the navigation (or tap <strong>Explore nearby</strong> on a Flow event).</li>
            <li>The <strong>Right Now</strong> section shows a curated mix of top-rated places, adjusted for time of day and weather.</li>
            <li>Below that, each category shows 3 places. Tap <strong>See all</strong> to expand.</li>
            <li>Each place card shows a real photo, star rating, review count, and category.</li>
            <li>Tap <strong>Navigate</strong> for directions, or <strong>Add to Timeline</strong> to schedule it.</li>
          </ol>
        ),
      },
      {
        question: 'How do I add a place to my timeline?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Tap <strong>Add to Timeline</strong> on a place card.</li>
            <li>Pick a <strong>date</strong> (within your trip dates) and a <strong>time</strong>.</li>
            <li>Choose a <strong>duration</strong> (30 min, 1 hour, 2 hours, 3 hours, or None).</li>
            <li>Tap <strong>Add to Timeline</strong>. The place appears on Flow at the scheduled date and time.</li>
          </ol>
        ),
      },
      {
        question: 'How does "Right Now" work?',
        answer:
          'Right Now picks the highest-rated place from each category and ranks them using time-of-day awareness (cafes in the morning, restaurants in the evening) and weather (indoor places when it rains). The result is a short, actionable snapshot of what is worth doing right now.',
      },
      {
        question: 'Can I discover places before I arrive?',
        answer:
          'Yes. Use the Area Picker at the top of Discover to browse places at your destination ahead of time, and add them to your timeline in advance.',
      },
      {
        question: 'Does Discover work offline?',
        answer:
          'You can still see places you have already loaded, and we cache a radius of roughly 15 miles around your current location for offline browsing. Fresh results and photos resume the moment you are back online.',
      },
      {
        question: 'Where does Discover get its data?',
        answer:
          'Discover uses the Google Places service for real, up-to-date place data — names, addresses, photos, ratings, and review counts. Photos are served through a secure proxy.',
      },
      {
        question: 'Is Discover available on all plans?',
        answer:
          'Yes. Discover is a core feature available on Free, Pro, and Business plans.',
      },
    ],
  },

  /* ================================================================
   * EXPENSES
   * ================================================================ */
  {
    id: 'expenses',
    title: 'Expenses',
    icon: <Receipt className="w-5 h-5 text-primary" />,
    description: 'Track spending, categorize expenses, and manage trip budgets.',
    items: [
      {
        question: 'How do I add an expense?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip → <strong>EXPENSES</strong>.</li>
            <li>Tap <strong>Add Expense</strong>.</li>
            <li>Enter the <strong>amount</strong>, <strong>date</strong>, and <strong>category</strong>.</li>
            <li>Optionally add a sub-category, description, notes, or upload a receipt photo.</li>
            <li>Tap <strong>Save</strong>.</li>
          </ol>
        ),
      },
      {
        question: 'How do I add an expense from a receipt photo?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip → <strong>EXPENSES</strong>.</li>
            <li>Tap <strong>Add Expense</strong> → <strong>Upload Receipt</strong>.</li>
            <li>Take a photo or select an image of your receipt.</li>
            <li>The AI reads the receipt and fills in the amount, vendor, date, and category.</li>
            <li>Review the extracted details, adjust if needed, and tap <strong>Save</strong>.</li>
          </ol>
        ),
      },
      {
        question: 'What expense categories are available?',
        answer: (
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Meals</strong> — breakfast, lunch, dinner, snacks, coffee, groceries, alcohol, beverages</li>
            <li><strong>Transport</strong> — uber, taxi, gas, tolls, public transit, rental car</li>
            <li><strong>Activity</strong> — tours, entertainment, tickets, sports</li>
            <li><strong>Shopping</strong> — souvenirs, clothing, gifts</li>
            <li><strong>Parking</strong></li>
            <li><strong>Other</strong> — tips, fees, insurance, miscellaneous</li>
          </ul>
        ),
      },
      {
        question: 'How does expense tracking work for mixed trips?',
        answer:
          'For trips classified as "mixed" (both business and personal), you can assign each expense as Business or Personal. The Expenses tab displays a side-by-side summary of Business, Personal, and Unassigned totals. You can filter the list by purpose without affecting the totals.',
      },
      {
        question: 'How do I edit or delete an expense?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip → <strong>EXPENSES</strong>.</li>
            <li>Find the expense you want to change.</li>
            <li>Tap <strong>Edit</strong> to update fields, or <strong>Delete</strong> to remove it.</li>
          </ol>
        ),
      },
      {
        question: 'Can I export my expenses?',
        answer: (
          <span>
            Yes. Trip summary reports with per-category expense breakdowns and individualized PDF generation are available on Pro and Business plans. <PlanBadge tier="pro" />
          </span>
        ),
      },
    ],
  },

  /* ================================================================
   * PARKING
   * ================================================================ */
  {
    id: 'parking',
    title: 'Parking',
    icon: <CircleParking className="w-5 h-5 text-primary" />,
    description: 'Log parking locations, track expiration, and never lose your car.',
    items: [
      {
        question: 'How do I log a parking entry?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip → <strong>Parking</strong> (under MORE on mobile).</li>
            <li>Tap <strong>Add Parking</strong>.</li>
            <li>Enter a <strong>label</strong> (e.g., "Airport Long-Term Lot B").</li>
            <li>Select the <strong>parking type</strong>: Airport, Beach, City Garage, Hotel, or Other.</li>
            <li>Set the <strong>start date/time</strong> and optionally the <strong>end date/time</strong> (expiration).</li>
            <li>Optionally add <strong>address</strong>, <strong>level/section/space</strong>, and <strong>cost</strong>.</li>
            <li>Tap <strong>Save</strong>. The parking entry appears on your Timeline.</li>
          </ol>
        ),
      },
      {
        question: 'How do parking expiration alerts work?',
        answer:
          'If you set an end time on your parking entry, you receive a reminder before expiration. You can configure the reminder timing (how many minutes before) from your Account → Notification Preferences.',
      },
    ],
  },

  /* ================================================================
   * PACKING
   * ================================================================ */
  {
    id: 'packing',
    title: 'Packing Lists',
    icon: <Package className="w-5 h-5 text-primary" />,
    description: 'AI-generated packing lists with climate analysis and style tips.',
    items: [
      {
        question: 'How do I generate a packing list?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip → <strong>Packing</strong> (under MORE on mobile).</li>
            <li>Tap <strong>Generate Packing List</strong>.</li>
            <li>The AI analyzes your destination, dates, and weather to create a personalized list.</li>
            <li>Items are organized by category (Clothing, Footwear, Toiletries, Tech, Documents, Accessories, etc.).</li>
          </ol>
        ),
      },
      {
        question: 'What smart features does the packing list include?',
        answer: (
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong>Climate cards</strong> — per-city weather summaries for multi-destination trips.</li>
            <li><strong>Color/style tips</strong> — suggestions like "Dark neutrals for Milan" based on local fashion.</li>
            <li><strong>Location tags</strong> — items tagged to specific cities (e.g., "Milan", "Barcelona").</li>
            <li><strong>Laundry Intelligence</strong> — for trips over 7 nights, daily-wear items are capped at 7 to account for laundry.</li>
            <li><strong>Cultural tips</strong> — notes about local customs or dress codes.</li>
          </ul>
        ),
      },
      {
        question: 'How do I track packing progress?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Tap the <strong>checkbox</strong> next to each item to mark it as packed.</li>
            <li>A <strong>progress bar</strong> at the top shows your overall packing percentage.</li>
            <li>Fully packed categories turn green.</li>
          </ol>
        ),
      },
      {
        question: 'How do I add custom items?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Tap the <strong>+</strong> button next to a category name.</li>
            <li>Enter the item name. The category is pre-filled.</li>
            <li>Tap <strong>Add</strong>. Custom items are preserved even if you regenerate the list.</li>
          </ol>
        ),
      },
      {
        question: 'Can I adjust item quantities?',
        answer:
          'Yes. Each item has a quantity stepper (minimum 1). Changes are saved immediately.',
      },
      {
        question: 'Can I copy my packing list?',
        answer:
          'Yes. Tap the copy/export button to copy your entire packing list to the clipboard as formatted text.',
      },
    ],
  },

  /* ================================================================
   * NOTIFICATIONS & REMINDERS
   * ================================================================ */
  {
    id: 'notifications',
    title: 'Notifications & Reminders',
    icon: <Bell className="w-5 h-5 text-primary" />,
    description: 'Configure and manage travel reminders.',
    items: [
      {
        question: 'What reminders does Real Travel 2 Real Places generate?',
        answer: (
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong>Flight departures</strong> — configurable hours before departure.</li>
            <li><strong>Parking expiration</strong> — configurable minutes before expiration.</li>
            <li><strong>Ticket purchase deadlines</strong> — configurable days before an activity.</li>
            <li><strong>Stop arrivals</strong> — configurable minutes before a scheduled stop. <PlanBadge tier="business" /></li>
            <li><strong>Expense nudges</strong> — reminders to log daily expenses.</li>
          </ul>
        ),
      },
      {
        question: 'How do I customize notification timing?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Go to <strong>Account</strong> from the user menu.</li>
            <li>Find <strong>Notification Preferences</strong>.</li>
            <li>Toggle each reminder type on or off.</li>
            <li>Adjust the timing (hours/minutes/days before) for each enabled reminder.</li>
            <li>Changes save automatically.</li>
          </ol>
        ),
      },
      {
        question: 'Where do I see my notifications?',
        answer:
          'Tap the bell icon in the header. Unread notifications show a count badge. You can mark individual notifications as read or dismiss them.',
      },
    ],
  },

  /* ================================================================
   * CALENDAR EXPORT
   * ================================================================ */
  {
    id: 'calendar',
    title: 'Calendar Export',
    icon: <Calendar className="w-5 h-5 text-primary" />,
    description: 'Download your trip as a calendar file with reminders.',
    items: [
      {
        question: 'How do I export my trip to a calendar?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip → <strong>Summary</strong> (or <strong>PLAN</strong> on mobile).</li>
            <li>Scroll to the <strong>Download Trip Calendar (.ics)</strong> button.</li>
            <li>Tap the button to download the .ics file.</li>
            <li>Open the file to import it into Apple Calendar, Google Calendar, Outlook, or any calendar app.</li>
          </ol>
        ),
      },
      {
        question: 'What is included in the calendar file?',
        answer:
          'The .ics file includes all trip events — flights, lodging check-ins and check-outs, rental pickups and returns, and parking. Each event includes a 30-minute reminder.',
      },
    ],
  },

  /* ================================================================
   * COMPANIONS & SHARING
   * ================================================================ */
  {
    id: 'sharing',
    title: 'Companions & Trip Sharing',
    icon: <Users className="w-5 h-5 text-primary" />,
    description: 'Add travel partners and share your Trip with others.',
    items: [
      {
        question: 'How do I add a companion?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip → <strong>Companions</strong> (under MORE on mobile).</li>
            <li>Tap <strong>Add Companion</strong>.</li>
            <li>Enter their name, and optionally email, phone, and flight details.</li>
            <li>Tap <strong>Save</strong>.</li>
          </ol>
        ),
      },
      {
        question: 'How do I invite someone to view my Trip?',
        answer: (
          <div className="space-y-2">
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Open your Trip → <strong>Members</strong> (under More on mobile).</li>
              <li>Enter the email address of the person you want to invite (emails are normalized — case and surrounding whitespace are ignored).</li>
              <li>Pick the capabilities you want them to have (see below).</li>
              <li>Send the invitation. The link is valid for 7 days.</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              Trip sharing requires a Pro or Business plan. <PlanBadge tier="pro" />
            </p>
          </div>
        ),
      },
      {
        question: 'What capabilities can I grant?',
        answer: (
          <div className="space-y-2">
            <p>
              Sharing is capability-scoped: each member gets a precise set of things they can do, not a single role. You can combine capabilities freely.
            </p>
            <ul className="list-disc list-inside space-y-1.5">
              <li><strong>View</strong> — always granted; the member can see the trip, timeline, bookings, and tours.</li>
              <li><strong>Add Expenses</strong> — log expenses on the trip.</li>
              <li><strong>Add Lodging</strong> — add lodging bookings.</li>
              <li><strong>Add Tour Stops</strong> — contribute manual stops to the Tours workspace.</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Members never see capabilities they were not granted — disabled features are hidden, not greyed out.
            </p>
          </div>
        ),
      },
      {
        question: 'How does someone accept an invitation?',
        answer:
          'When your companion taps the invitation link, they are asked to sign in or create an account using the same email the invitation was sent to. Once signed in, they are added to your Trip with the capabilities you selected.',
      },
      {
        question: 'Can I change a member\'s capabilities later?',
        answer:
          'Yes. The Trip owner can update any member\'s capabilities at any time from the Members section. Changes take effect immediately on the member\'s next view.',
      },
      {
        question: 'Can companions delete items?',
        answer:
          'No. Members can only add and edit within the capabilities they have been granted. Deletion is reserved for the Trip owner so your record of the trip stays intact.',
      },
      {
        question: 'Can I revoke access?',
        answer:
          'Yes. Open Members, find the person, and remove them. Their access ends immediately, and any pending invitation link they have is invalidated.',
      },
    ],
  },

  /* ================================================================
   * PERMISSIONS
   * ================================================================ */
  {
    id: 'permissions',
    title: 'Permissions',
    icon: <Shield className="w-5 h-5 text-primary" />,
    description: 'Understand what companions can and cannot do.',
    items: [
      {
        question: 'How does the capability model work?',
        answer: (
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong>View</strong> is always implicit — every member can see the trip.</li>
            <li><strong>Add Expenses</strong>, <strong>Add Lodging</strong>, and <strong>Add Tour Stops</strong> are independent toggles you can mix and match.</li>
            <li>Deletion is owner-only, regardless of capabilities.</li>
            <li>Members never see disabled controls — features they cannot use are hidden completely.</li>
          </ul>
        ),
      },
      {
        question: 'Can I give someone every capability?',
        answer:
          'Yes. Toggle every capability on for a member and they can contribute expenses, lodging, and tour stops — but the owner remains the only person who can delete.',
      },
    ],
  },

  /* ================================================================
   * TRIP NOTES
   * ================================================================ */
  {
    id: 'notes',
    title: 'Trip Notes',
    icon: <FileText className="w-5 h-5 text-primary" />,
    description: 'Store general notes, emergency numbers, and important links.',
    items: [
      {
        question: 'How do I add notes to a Trip?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip → <strong>Notes</strong> (under MORE on mobile).</li>
            <li>Enter text in <strong>General Notes</strong>, <strong>Emergency Numbers</strong>, or <strong>Important Links</strong>.</li>
            <li>Changes save automatically.</li>
          </ol>
        ),
      },
    ],
  },

  /* ================================================================
   * TRIP REPORTS
   * ================================================================ */
  {
    id: 'reports',
    title: 'Trip Reports',
    icon: <FileText className="w-5 h-5 text-primary" />,
    description: 'Generate summary reports and export PDFs.',
    items: [
      {
        question: 'How do I view a Trip Summary Report?',
        answer: (
          <div className="space-y-2">
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Open your Trip → <strong>Report</strong> (under MORE on mobile).</li>
              <li>The report shows a comprehensive overview: expense breakdown by category, booking summary, and companion costs.</li>
              <li>Tap <strong>Download PDF</strong> to export an individualized report.</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              Trip reports are available on Pro and Business plans. <PlanBadge tier="pro" />
            </p>
          </div>
        ),
      },
      {
        question: 'How do I access multi-trip reports?',
        answer: (
          <div className="space-y-2">
            <ol className="list-decimal list-inside space-y-1.5">
              <li>From the main navigation, go to <strong>Reports</strong>.</li>
              <li>View expense summaries across all your trips.</li>
              <li>Filter by date range, category, or trip.</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              Multi-trip reporting is available on the Business plan. <PlanBadge tier="business" />
            </p>
          </div>
        ),
      },
    ],
  },

  /* ================================================================
   * MOBILE EXPERIENCE
   * ================================================================ */
  {
    id: 'mobile',
    title: 'Mobile & iOS App',
    icon: <Smartphone className="w-5 h-5 text-primary" />,
    description: 'How Real Travel 2 Real Places works on your phone, including the native iOS app.',
    items: [
      {
        question: 'Is there an iPhone or iPad app?',
        answer: (
          <div className="space-y-2">
            <p>
              Yes. Real Travel 2 Real Places is available as a native iOS app on the Apple App Store for iPhone and iPad.
              The native app delivers a true full-screen experience with safe-area handling, native gestures, and tighter system integration than the browser version.
            </p>
            <p>
              The iOS app is a <strong>free download</strong>, but a Real Travel 2 Real Places membership (Free, Pro, or Business) is still required to sign in and use it. Your same account works on both iOS and the web.
            </p>
            <p className="text-xs text-muted-foreground">
              You can also keep using the web app at realtravel2realplaces.app on any device — your trips, bookings, and expenses stay in sync across both.
            </p>
          </div>
        ),
      },
      {
        question: 'How do I install the iOS app?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open the <strong>App Store</strong> on your iPhone or iPad.</li>
            <li>Search for <strong>Real Travel 2 Real Places</strong>.</li>
            <li>Tap <strong>Get</strong> to install.</li>
            <li>Open the app and sign in with your existing account — or tap <strong>Continue with Apple</strong> to create one in a single step.</li>
          </ol>
        ),
      },
      {
        question: 'Can I install it on Android or as a home-screen app?',
        answer: (
          <div className="space-y-2">
            <p>
              Yes. Real Travel 2 Real Places is also an installable web app. On Android Chrome, open the browser menu and tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
              On iOS Safari (if you prefer the web version), tap the Share icon and choose <strong>Add to Home Screen</strong>.
            </p>
            <p className="text-xs text-muted-foreground">
              The installed web app behaves like a native app: full-screen, its own home-screen icon, and offline support for recent trips.
            </p>
          </div>
        ),
      },
      {
        question: 'What can I do in the iOS app that I can\'t do in a browser?',
        answer: (
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Sign in with Apple</strong> — one-tap account creation and sign-in.</li>
            <li><strong>Native share sheet</strong> — share trips, itineraries, and reports straight to Messages, Mail, or AirDrop.</li>
            <li><strong>Haptic feedback</strong> on key actions in Today, Move, and Drive Mode.</li>
            <li><strong>Background location</strong> for live arrival, departure, and "time to leave" awareness during a trip (you control this in Settings &gt; Privacy).</li>
            <li><strong>Deep links</strong> — tapping a Real Travel 2 Real Places link from Mail or Messages opens directly in the app.</li>
            <li><strong>Edge-to-edge layout</strong> with proper safe-area handling around the Dynamic Island and home indicator.</li>
          </ul>
        ),
      },
      {
        question: 'How does mobile navigation work?',
        answer: (
          <div className="space-y-2">
            <p>On phones, your Trip uses a bottom navigation bar with these tabs:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Today</strong> — the command center for an active trip (next action, leave-by, quick actions)</li>
              <li><strong>Flow</strong> — the full chronological timeline</li>
              <li><strong>Move</strong> — directive transport guidance for the next leg</li>
              <li><strong>Guide</strong> — the short list of heads-up alerts worth your attention</li>
              <li><strong>More</strong> — bookings, expenses, tours, companions, parking, packing, notes, members, reports, and Ask AI</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'How do I quickly add an expense on mobile?',
        answer:
          'On mobile, tap the "Add Expense" quick action on the Today tab, or open Expenses from More and tap Add Expense.',
      },
      {
        question: 'Does the app work offline?',
        answer: (
          <div className="space-y-2">
            <p>
              Yes. The iOS app and the installed web app cache your current trip, today's and tomorrow's timeline window, recent bookings, and a ~15-mile radius of Discover results so you can still see what's next when you lose signal (in flight, in a tunnel, abroad without data).
            </p>
            <p>
              Any expense you add offline is saved to a local queue and synced automatically the moment connectivity returns — the queue is idempotent, so nothing duplicates if your device retries.
            </p>
            <p>
              Live items that need the network — weather, traffic, flight status, fresh Discover searches — resume as soon as you are back online. We always prefer the cloud copy when both are available, so a stale local edit will never overwrite a fresher server version.
            </p>
          </div>
        ),
      },
      {
        question: 'How do permissions work on iOS?',
        answer: (
          <div className="space-y-2">
            <p>iOS will ask you to allow specific capabilities the first time they\'re used. You can change any of these later in <strong>Settings &gt; Real Travel 2 Real Places</strong>:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Location</strong> — powers Today, Move, Drive Mode timing, and Discover. "While Using" is enough; "Always" enables background trip awareness.</li>
              <li><strong>Notifications</strong> — boarding, departure, and "time to leave" alerts during active trips.</li>
              <li><strong>Camera / Photos</strong> — only used when you attach a receipt or import a booking screenshot.</li>
            </ul>
          </div>
        ),
      },
    ],
  },


  /* ================================================================
   * ACCOUNT & SETTINGS
   * ================================================================ */
  {
    id: 'account',
    title: 'Account & Settings',
    icon: <MapPin className="w-5 h-5 text-primary" />,
    description: 'Profile, preferences, and subscription management.',
    items: [
      {
        question: 'How do I update my profile?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open the user menu and tap <strong>Account</strong>.</li>
            <li>Update your <strong>name</strong>, <strong>home airport</strong>, <strong>preferred currency</strong>, <strong>temperature unit</strong>, or <strong>date format</strong>.</li>
            <li>Changes save when you update each field.</li>
          </ol>
        ),
      },
      {
        question: 'How do I set my vehicle range?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Go to <strong>Account</strong>.</li>
            <li>Find the <strong>Vehicle Range</strong> card.</li>
            <li>Enter your <strong>tank size</strong> (gallons) and <strong>average miles per tank</strong>.</li>
            <li>This data is used for Drive Trip fuel stop intelligence.</li>
          </ol>
        ),
      },
      {
        question: 'How do I change my password?',
        answer:
          'Use the Forgot Password link on the sign-in page. Enter your email address and follow the reset link sent to your inbox.',
      },
    ],
  },

  /* ================================================================
   * PLANS
   * ================================================================ */
  {
    id: 'plans',
    title: 'Plans',
    icon: <CreditCard className="w-5 h-5 text-primary" />,
    description: 'What each plan includes.',
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
                <li>Today, Flow, Move, and Guide tabs — the full command-center experience</li>
                <li>Discover — find places near your destination</li>
                <li>Tours — manual stops workspace</li>
                <li>Ask AI — grounded in-trip assistant</li>
                <li>Calendar export (.ics)</li>
                <li>Core reminders and travel alerts</li>
              </ul>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="font-medium text-foreground">Pro</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Everything in Free</li>
                <li>Unlimited trips</li>
                <li>Trip sharing and companion invitations</li>
                <li>Trip summary reports with PDF export</li>
                <li>Trip health checklist</li>
                <li>Airport intelligence and travel awareness</li>
                <li>Drive Mode for road trips</li>
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
          'Your existing trips and data are preserved indefinitely, regardless of plan changes. The lifetime trip count never decreases.',
      },
    ],
  },

  /* ================================================================
   * GLOSSARY
   * ================================================================ */
  {
    id: 'glossary',
    title: 'Glossary',
    icon: <BookMarked className="w-5 h-5 text-primary" />,
    description: 'Definitions of terms used in Real Travel 2 Real Places.',
    items: [
      {
        question: 'Trip',
        answer:
          'A Trip is the top-level container for all your travel information — bookings, expenses, companions, parking, packing, and notes. Each Trip has a destination, dates, and a transportation mode (Fly, Drive, or Train).',
      },
      {
        question: 'Booking',
        answer:
          'A booking is any confirmed reservation: flight, lodging, car rental, transport (train/bus/metro/ferry), or activity. Bookings carry costs and appear on your Timeline.',
      },
      {
        question: 'Timeline',
        answer:
          'A chronological view of every event in your Trip — flights, lodging, rentals, parking, transport, activities, and scheduled Explore places — organized by date and time.',
      },
      {
        question: 'Today',
        answer:
          'The command-center tab for an active trip. Shows your next action, leave-by timing, navigation, and quick actions. Available from 14 days before departure through the end of the trip.',
      },
      {
        question: 'Flow',
        answer:
          'The full chronological timeline of your trip. Today events pinned to the top, future events in ascending order, past events in descending order at the bottom.',
      },
      {
        question: 'Move',
        answer:
          'The transport guidance tab. Shows exactly two options — recommended and alternative — for getting to your next destination, with live ETAs and Navigate.',
      },
      {
        question: 'Guide',
        answer:
          'The contextual alerts tab. Surfaces the top heads-up items worth your attention right now, prioritized Timing → Weather → Sequence and external signals.',
      },
      {
        question: 'Drive Mode',
        answer:
          'A focused, full-screen navigation view for Drive Trips. Shows your current route, next destination, and one-tap navigation. Accessible from Today, Move, or the Trip Summary.',
      },
      {
        question: 'Discover',
        answer:
          'The place-discovery surface, powered by Google Places. Surfaces restaurants, attractions, cafes, bars, parks, hiking trails, museums, and grocery stores near your Trip destination. Each place includes a real photo, rating, and review count. Available on all plans.',
      },
      {
        question: 'Tours',
        answer:
          'The workspace for manual stops that are not tied to a booking. Stops can be timed or marked TBD (sorted by nearest-neighbor geography). Tour stops flow into Flow automatically.',
      },
      {
        question: 'Ask AI',
        answer:
          'A grounded in-trip assistant that answers single-turn questions about your trip data — bookings, dates, costs, packing, timeline.',
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
          'Any overnight accommodation — hotel, Airbnb, VRBO, or other. Lodging bookings include check-in and check-out times and appear on your Timeline.',
      },
      {
        question: 'Next Action',
        answer:
          'The most urgent upcoming event displayed on the Today tab. Could be a flight, check-in, drive segment, tour stop, or scheduled place.',
      },
      {
        question: 'Leave By',
        answer:
          'The recommended departure time for your next event, shown on Today and on Move options. Includes feasibility indicators: Comfortable, Tight, or High Risk.',
      },
      {
        question: 'Engagement',
        answer:
          'An activity scheduled from Discover or added as a Tour stop. Engagements appear on Flow alongside bookings and parking.',
      },
      {
        question: 'Expense',
        answer:
          'A financial record tied to a Trip. Each expense includes an amount, date, category, and optional description. For mixed trips, expenses can be classified as Business or Personal.',
      },
    ],
  },

  /* ================================================================
   * TROUBLESHOOTING
   * ================================================================ */
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
        question: 'My confirmation did not parse correctly.',
        answer:
          'Not all confirmation formats are supported. If automatic parsing misses details, tap Edit on the booking to correct fields manually. You can also add bookings entirely by hand.',
      },
      {
        question: 'I added a place from Discover but it does not appear on Flow.',
        answer:
          'Places added from Discover appear as engagement events on Flow. Make sure the date you selected is within your trip date range. Refresh the page if the event does not appear immediately.',
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
        question: 'The Navigate button says "No address available."',
        answer:
          'This means the booking or event does not have an address or airport code stored. Edit the booking and add an address to enable navigation.',
      },
      {
        question: 'Drive Mode is not showing on my Today tab.',
        answer:
          'Drive Mode only appears for trips with the Drive transportation mode and when you have an active or upcoming drive segment. Make sure your trip is within its active date window (trip dates including 1 day before departure).',
      },
      {
        question: 'The app looks different on my phone.',
        answer:
          'The mobile layout is designed for smaller screens. Navigation moves to a bottom bar, and some sections are grouped under MORE. All features remain available.',
      },
      {
        question: 'I was logged out unexpectedly.',
        answer:
          'For security, Real Travel 2 Real Places automatically logs you out after 2 hours of inactivity. Sign in again to continue.',
      },
      {
        question: 'How do I contact support?',
        answer:
          'Use the "Contact Support" option in your Account settings. Include details about the issue and which Trip is affected.',
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
        <title>Help Center — Real Travel 2 Real Places | User Manual</title>
        <meta
          name="description"
          content="Complete user manual for Real Travel 2 Real Places. Step-by-step guides for Today, Flow, Move, Guide, Discover, Tours, Drive Mode, expenses, packing, sharing, and more."
        />
        <link rel="canonical" href="https://realtravel2realplaces.lovable.app/help" />
      </Helmet>
      <FaqJsonLd />
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-8">
           {/* Back button */}
           <BackToDashboard />

           {/* Header */}
           <header className="text-center space-y-3">
             <h1 className="text-3xl md:text-4xl font-bold text-foreground">
               Help Center
             </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl mx-auto">
              Complete guide to Real Travel 2 Real Places — your real-time travel command center.
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

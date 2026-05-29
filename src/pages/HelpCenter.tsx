/**
 * Help Center — v4.10.0
 * 
 * Complete user manual for Real Travel 2 Real Places.
 * Step-by-step guides for every feature. No forward-thinking or fluff.
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
                <li>Use NOW during your trip to see what's next, when to leave, and one-tap directions.</li>
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
              <li><strong>Explore → Add to Timeline</strong> — places you schedule from EXPLORE appear as engagement events.</li>
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
          'Tapping "Explore nearby" on a timeline event switches to the EXPLORE tab and centers discovery around that event\'s location, so you can find restaurants, cafes, or attractions near your next stop.',
      },
      {
        question: 'How do I tap through from the Timeline to a booking?',
        answer:
          'Tap any event on the Timeline. You are taken directly to the corresponding booking, parking, or record with it scrolled into view and highlighted.',
      },
    ],
  },

  /* ================================================================
   * NOW TAB
   * ================================================================ */
  {
    id: 'now-execution',
    title: 'NOW — Real-Time Execution',
    icon: <Navigation className="w-5 h-5 text-primary" />,
    description: 'Your command center during travel. See what\'s next and act.',
    items: [
      {
        question: 'What is NOW?',
        answer: (
          <div className="space-y-2">
            <p>
              NOW is your real-time execution view. It shows everything you need to act on right now — without scrolling through your full itinerary.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Next Action</strong> — your most urgent upcoming event (flight, check-in, drive, stop).</li>
              <li><strong>Leave By</strong> — when you should depart to arrive on time.</li>
              <li><strong>Navigate</strong> — one-tap directions to your next destination.</li>
              <li><strong>Quick Actions</strong> — fast access to Explore, Add Expense, Drive Mode, and more.</li>
              <li><strong>Today's Timeline</strong> — compact view of today's remaining events.</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'How do I use NOW step by step?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip.</li>
            <li>Tap <strong>NOW</strong> in the navigation bar.</li>
            <li>Review the <strong>Next Action</strong> card to see your upcoming event.</li>
            <li>Check <strong>Leave By</strong> for departure timing (shown when applicable).</li>
            <li>Tap <strong>Navigate</strong> to open directions in your maps app.</li>
            <li>Use the <strong>Quick Actions</strong> strip for fast access to common tasks.</li>
            <li>Scroll down to see <strong>Today's Timeline</strong> for remaining events.</li>
          </ol>
        ),
      },
      {
        question: 'What is Drive Mode on the NOW tab?',
        answer: (
          <div className="space-y-2">
            <p>
              For Drive trips, a <strong>Drive Mode</strong> button appears in the quick actions strip when you have an active or upcoming drive segment.
            </p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Open your Drive Trip → <strong>NOW</strong>.</li>
              <li>Tap <strong>Drive Mode</strong> in the quick actions strip.</li>
              <li>The Drive Mode screen shows your route, next destination, and navigation controls.</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              Drive Mode also appears as the Next Action card when a drive segment is the most urgent event and no flights or check-ins are pending.
            </p>
          </div>
        ),
      },
      {
        question: 'What does "Leave By" mean?',
        answer:
          'Leave By shows the recommended departure time for your next event. It is calculated based on the event start time and estimated travel duration to help you arrive on time. The indicator shows whether your timing is comfortable, tight, or high-risk.',
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
            <li>The NOW tab shows <strong>Drive Mode</strong> as a quick action when a drive segment is active.</li>
            <li>Street addresses for origin and destination enable door-to-door navigation.</li>
          </ul>
        ),
      },
      {
        question: 'How do I use Drive Mode?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Drive Trip.</li>
            <li>Go to <strong>NOW</strong> and tap <strong>Drive Mode</strong> in the quick actions, or tap the <strong>Drive Mode</strong> entry card on the Summary screen.</li>
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
   * EXPLORE
   * ================================================================ */
  {
    id: 'explore',
    title: 'EXPLORE — Discover Places',
    icon: <Search className="w-5 h-5 text-primary" />,
    description: 'Discover real places near your destination with photos, ratings, and reviews.',
    items: [
      {
        question: 'What is EXPLORE?',
        answer: (
          <div className="space-y-2">
            <p>
              EXPLORE helps you discover real places near your Trip destination using Google Places. Browse categories with photos, star ratings, and review counts — then add places directly to your Trip timeline.
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
        question: 'How do I use EXPLORE?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Trip and tap <strong>EXPLORE</strong> in the navigation.</li>
            <li>The <strong>Right Now</strong> section shows a curated mix of top-rated places, adjusted for time of day and weather.</li>
            <li>Below that, each category shows 3 places. Tap <strong>See all</strong> to expand.</li>
            <li>Each place card shows a real photo, star rating, review count, and category.</li>
            <li>Tap <strong>Navigate</strong> to open directions in your maps app.</li>
            <li>Tap <strong>Add to Timeline</strong> to schedule the place on your trip.</li>
          </ol>
        ),
      },
      {
        question: 'How do I add an Explore place to my Timeline?',
        answer: (
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Find a place in EXPLORE and tap <strong>Add to Timeline</strong> (or the <strong>Add</strong> button).</li>
            <li>A scheduling dialog opens showing the place name and location.</li>
            <li>Select the <strong>date</strong> (must be within your trip dates).</li>
            <li>Set the <strong>time</strong> you plan to visit.</li>
            <li>Choose a <strong>duration</strong> (30 min, 1 hour, 2 hours, 3 hours, or None).</li>
            <li>Tap <strong>Add to Timeline</strong>. The place appears on your Trip Timeline at the scheduled date and time.</li>
          </ol>
        ),
      },
      {
        question: 'How does "Right Now" work?',
        answer:
          'Right Now picks the highest-rated place from each category and ranks them using time-of-day awareness (cafes in the morning, restaurants in the evening) and weather conditions (indoor places during rain). This gives you a diverse, actionable snapshot of what is worth visiting right now.',
      },
      {
        question: 'Can I explore before I arrive at my destination?',
        answer:
          'Yes. Use the Area Picker at the top of the EXPLORE tab to browse places at your destination before you arrive. You can add places to your timeline in advance.',
      },
      {
        question: 'Where does EXPLORE get its data?',
        answer:
          'EXPLORE uses the Google Places API to fetch real, up-to-date place data including names, addresses, photos, ratings, and review counts. Photos are served through a secure proxy.',
      },
      {
        question: 'Is EXPLORE available on all plans?',
        answer:
          'Yes. EXPLORE is a core feature available on Free, Pro, and Business plans.',
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
              <li>Open your Trip → <strong>Members</strong> (under MORE on mobile).</li>
              <li>Enter the email address of the person you want to invite.</li>
              <li>Select their permissions: Read Only, Can Add Expenses, Can Add Lodging.</li>
              <li>Send the invitation. The link is valid for 7 days.</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              Trip sharing requires a Pro or Business plan. <PlanBadge tier="pro" />
            </p>
          </div>
        ),
      },
      {
        question: 'How does someone accept an invitation?',
        answer:
          'When your companion clicks the invitation link, they are asked to sign in or create an account. Once signed in, they are added to your Trip with the permissions you selected.',
      },
      {
        question: 'Can I change permissions after someone has joined?',
        answer:
          'Yes. The Trip owner can update any member\'s permissions at any time from the Members section.',
      },
      {
        question: 'Can companions delete items?',
        answer:
          'No. Companions cannot delete any Trip items regardless of their permissions. Only the Trip owner can delete items.',
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
        question: 'What permission levels exist?',
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
          'You can enable both "Can Add Expenses" and "Can Add Lodging" together. Read Only cannot be combined with adding permissions.',
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
            <li><strong>Haptic feedback</strong> on key actions in NOW and Drive Mode.</li>
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
            <p>On phones, your Trip uses a bottom navigation bar with main tabs:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>NOW</strong> — real-time execution view with quick actions</li>
              <li><strong>PLAN</strong> — timeline and trip overview</li>
              <li><strong>EXPLORE</strong> — discover nearby places</li>
              <li><strong>EXPENSES</strong> — expense tracking</li>
              <li><strong>MORE</strong> — bookings, companions, parking, packing, notes, members, and reports</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'How do I quickly add an expense on mobile?',
        answer:
          'On mobile, tap the green "Add Expense" button on the NOW tab\'s quick actions strip, or go to EXPENSES and tap Add Expense.',
      },
      {
        question: 'Does the app work offline?',
        answer: (
          <div className="space-y-2">
            <p>
              Yes — the iOS app and the installed web app cache your current trip, today\'s timeline, recent bookings, and nearby Explore results so you can still see what\'s next when you lose signal (in flight, in a tunnel, abroad without data).
            </p>
            <p>
              Any expenses you add offline are saved locally and sync automatically the moment you\'re back online.
              Live items that need the network — weather, traffic, flight status, new search results — resume as soon as connectivity returns.
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
              <li><strong>Location</strong> — powers NOW, Drive Mode timing, and Explore. "While Using" is enough; "Always" enables background trip awareness.</li>
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
                <li>Timeline and NOW execution view</li>
                <li>EXPLORE — discover places near your destination</li>
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
        question: 'NOW',
        answer:
          'The real-time execution view showing your next action, departure timing, navigation, and quick access to common tasks. Available during active trips.',
      },
      {
        question: 'Drive Mode',
        answer:
          'A focused navigation screen for Drive Trips. Shows your current route, next destination, and one-tap navigation. Accessible from NOW or the Trip Summary.',
      },
      {
        question: 'EXPLORE',
        answer:
          'A discovery feature powered by Google Places that surfaces restaurants, attractions, cafes, bars, parks, hiking trails, museums, and grocery stores near your Trip destination. Each place includes a real photo, rating, and review count. Available on all plans.',
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
          'The most urgent upcoming event displayed on the NOW screen. Could be a flight, check-in, drive segment, stop, or activity.',
      },
      {
        question: 'Leave By',
        answer:
          'The recommended departure time for your next event, shown on NOW. Includes feasibility indicators: Comfortable, Tight, or High Risk.',
      },
      {
        question: 'Engagement',
        answer:
          'An activity scheduled from EXPLORE or manually added to the Trip timeline. Engagements appear as events on the Timeline alongside bookings and parking.',
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
        question: 'I added a place from EXPLORE but it does not appear on my Timeline.',
        answer:
          'Places added from EXPLORE appear as engagement events on your Timeline. Make sure the date you selected is within your trip date range. Refresh the page if the event does not appear immediately.',
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
        question: 'Drive Mode is not showing on my NOW tab.',
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
          content="Complete user manual for Real Travel 2 Real Places. Step-by-step guides for creating trips, managing bookings, using NOW, EXPLORE, Drive Mode, expenses, packing, and more."
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

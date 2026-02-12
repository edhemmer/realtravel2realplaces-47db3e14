/**
 * Help Center — v2.4.0
 * 
 * Public-facing documentation reflecting only current, live functionality.
 * No internal terminology, no abbreviations, no future features.
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
import { 
  Plane, 
  Users, 
  Shield, 
  Smartphone, 
  CreditCard, 
  HelpCircle,
  BookOpen
} from 'lucide-react';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: { question: string; answer: string }[];
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <BookOpen className="w-5 h-5 text-primary" />,
    items: [
      {
        question: 'What is Real Travel 2 Real Places?',
        answer:
          'Real Travel 2 Real Places helps you manage everything about your trips after they are booked. It keeps all your travel details — bookings, expenses, companions, parking, packing lists, and more — organized in one place so you can stop managing travel by memory.',
      },
      {
        question: 'How do I create an account?',
        answer:
          'Tap "Get Started" on the home page and sign up with your email address. You will receive a verification email to confirm your account before you can sign in.',
      },
      {
        question: 'What happens after I sign up?',
        answer:
          'After verifying your email and signing in for the first time, you will see a short guided introduction explaining how the app works. When the guide is complete, you can choose to create your first trip right away or go to the dashboard to explore.',
      },
      {
        question: 'Can I revisit the guided introduction?',
        answer:
          'Yes. You can re-view the guide anytime from your Account page without resetting your progress.',
      },
    ],
  },
  {
    id: 'trips',
    title: 'Creating and Managing Trips',
    icon: <Plane className="w-5 h-5 text-primary" />,
    items: [
      {
        question: 'How do I create a trip?',
        answer:
          'From the dashboard, tap the "Create Trip" button. Enter a trip name, destination, dates, and travel type (business, personal, or mixed). Your trip will appear on the dashboard immediately.',
      },
      {
        question: 'What can I add to a trip?',
        answer:
          'Each trip has sections for bookings (flights, stays, car rentals, transport, activities), expenses, companions, parking, packing lists, notes and safety information, and a timeline of all your events. Business trips also include a tour stops section.',
      },
      {
        question: 'How do I add bookings?',
        answer:
          'Open your trip and go to the Bookings section. You can paste a confirmation email and the app will extract the details automatically, or you can enter booking information manually.',
      },
      {
        question: 'How do I track expenses?',
        answer:
          'Open your trip and go to the Expenses section. Tap "Add Expense" to log the amount, category, date, and any notes. You can also upload a receipt photo. Expenses are organized by category and you can see a running total for your trip.',
      },
      {
        question: 'What is the trip timeline?',
        answer:
          'The timeline shows all your trip events — flights, check-ins, check-outs, rental pickups, parking, and scheduled stops — in chronological order. It gives you a single view of everything happening during your trip.',
      },
      {
        question: 'What trip states exist?',
        answer:
          'Trips can be active, locked, or closed. Active trips are fully editable. Locked and closed trips have limited editing to preserve your records.',
      },
    ],
  },
  {
    id: 'sharing',
    title: 'Sharing a Trip with Companions',
    icon: <Users className="w-5 h-5 text-primary" />,
    items: [
      {
        question: 'How do I invite someone to my trip?',
        answer:
          'Open your trip and go to the Members section. Enter the email address of the person you want to invite. They will receive an invitation link that is valid for 7 days.',
      },
      {
        question: 'Who can send invitations?',
        answer:
          'Only the trip owner can invite companions. You must have an active paid plan to send invitations.',
      },
      {
        question: 'How does someone accept an invitation?',
        answer:
          'When your companion clicks the invitation link, they will be asked to sign in or create an account. Once signed in, they will be added to your trip with the permissions you selected.',
      },
      {
        question: 'Can I invite multiple people to the same trip?',
        answer:
          'Yes. You can invite as many companions as you like. Each person receives their own invitation link.',
      },
    ],
  },
  {
    id: 'permissions',
    title: 'Companion Permissions',
    icon: <Shield className="w-5 h-5 text-primary" />,
    items: [
      {
        question: 'What permission options are available?',
        answer:
          'When you invite a companion, you choose their access level. The options are: Read Only (can view the trip but not add anything), Can Add Expenses (can log expenses on the trip), and Can Add Stay Bookings (can add hotel or accommodation bookings to the trip).',
      },
      {
        question: 'Can I combine permissions?',
        answer:
          'You can enable both "Can Add Expenses" and "Can Add Stay Bookings" together. However, Read Only cannot be combined with any adding permission. If someone has Read Only access, they can only view the trip.',
      },
      {
        question: 'Can companions delete items from the trip?',
        answer:
          'No. Companions can never delete any trip items regardless of their permissions. Only the trip owner can delete items.',
      },
      {
        question: 'Can I change a companion\'s permissions after they have joined?',
        answer:
          'Yes. The trip owner can update a companion\'s permissions at any time from the Members section. The same permission rules apply — Read Only cannot be combined with adding permissions, and expenses and stay permissions can be enabled together.',
      },
      {
        question: 'What do the permission labels mean?',
        answer:
          'Each companion in the Members section has labels showing their current permissions. "Read Only" means they can view but not add. "Expenses" means they can add expenses. "Stay" means they can add stay bookings. These labels update automatically when permissions change.',
      },
    ],
  },
  {
    id: 'mobile',
    title: 'Mobile Experience',
    icon: <Smartphone className="w-5 h-5 text-primary" />,
    items: [
      {
        question: 'How does navigation work on mobile?',
        answer:
          'On mobile devices, your trip uses a bottom navigation bar with four main tabs: Summary, Timeline, Expenses, and Alerts. Additional sections like Bookings, Companions, Parking, Packing, and Notes are available under the "More" menu.',
      },
      {
        question: 'What is the "Next Up" card?',
        answer:
          'When you are viewing your trip on mobile, a "Next Up" card appears near the top of the screen showing your next upcoming event — such as a flight, check-in, or scheduled stop. It includes a button to open directions in your maps app.',
      },
      {
        question: 'How do I quickly add an expense on mobile?',
        answer:
          'On mobile, a quick "Add Expense" button appears on the Summary screen so you can log an expense with one tap without switching tabs.',
      },
      {
        question: 'What is the welcome choice screen?',
        answer:
          'After completing the guided introduction for the first time, you see a one-time screen with two options: "Create a Trip" to start organizing right away, or "Go to Dashboard" to explore the app first. This screen only appears once.',
      },
    ],
  },
  {
    id: 'plans',
    title: 'Plans and Eligibility',
    icon: <CreditCard className="w-5 h-5 text-primary" />,
    items: [
      {
        question: 'What plans are available?',
        answer:
          'Real Travel 2 Real Places offers Free, Pro, and Business plans. Each plan determines how many active trips you can have and which features are available to you.',
      },
      {
        question: 'What is included in the free plan?',
        answer:
          'The free plan lets you manage a limited number of trips with core features like bookings, expenses, and packing lists.',
      },
      {
        question: 'What additional features do paid plans offer?',
        answer:
          'Paid plans include more active trips, the ability to invite companions to your trips, trip summary reports, and access to business-specific features like tour stops.',
      },
      {
        question: 'How do I upgrade my plan?',
        answer:
          'You can view and change your plan from the Plans page, accessible from your account settings or the dashboard.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: <HelpCircle className="w-5 h-5 text-primary" />,
    items: [
      {
        question: 'I did not receive a verification email.',
        answer:
          'Check your spam or junk folder. The email is sent from our authentication service and may take a few minutes to arrive. If you still do not see it, try signing up again with the same email address.',
      },
      {
        question: 'My invitation link is not working.',
        answer:
          'Invitation links expire after 7 days. If your link has expired, ask the trip owner to send a new invitation. Make sure you are signed in to the same email address the invitation was sent to.',
      },
      {
        question: 'I cannot add expenses or bookings to a shared trip.',
        answer:
          'Your permissions are set by the trip owner. If you have Read Only access, you can view the trip but cannot add items. Ask the trip owner to update your permissions if you need to contribute.',
      },
      {
        question: 'The app looks different on my phone.',
        answer:
          'The mobile layout is designed specifically for smaller screens. Navigation moves to a bottom bar, and some sections are grouped under the "More" menu. All the same features are available — they are just organized differently for easier use on the go.',
      },
      {
        question: 'How do I contact support?',
        answer:
          'You can reach our support team by using the "Contact Support" option in your account settings. Include details about the issue and which trip is affected, and we will get back to you as soon as possible.',
      },
    ],
  },
];

export default function HelpCenter() {
  return (
    <>
      <Helmet>
        <title>Help Center — Real Travel 2 Real Places</title>
        <meta
          name="description"
          content="Find answers about managing your trips, inviting companions, permissions, mobile features, and plans on Real Travel 2 Real Places."
        />
      </Helmet>
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Help Center
            </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl mx-auto">
              Everything you need to know about managing your trips with Real Travel 2 Real Places.
            </p>
          </div>

          {/* Sections */}
          {HELP_SECTIONS.map((section) => (
            <Card key={section.id} id={section.id}>
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center gap-3 mb-4">
                  {section.icon}
                  <h2 className="text-xl font-semibold text-foreground">
                    {section.title}
                  </h2>
                </div>
                <Accordion type="multiple" className="w-full">
                  {section.items.map((item, idx) => (
                    <AccordionItem
                      key={idx}
                      value={`${section.id}-${idx}`}
                    >
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
          ))}
        </div>
      </Layout>
    </>
  );
}

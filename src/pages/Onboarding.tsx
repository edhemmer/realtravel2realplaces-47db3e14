/**
 * Onboarding Page - In-App Education Flow
 * 
 * Patch 2.1.18: Onboarding uses DB-backed flag (has_completed_onboarding)
 * 
 * BEHAVIOR:
 * - Shows only once after first signup/login for new users
 * - Completing or skipping sets has_completed_onboarding = true in DB
 * - Works consistently across desktop and mobile (persistent in DB)
 * - Can be manually re-viewed via Account page (doesn't reset DB flag)
 * 
 * Features:
 * - Multi-step walkthrough
 * - Philosophy and usage guidance
 * - Plan education (Free, Pro, Business)
 * - Reporting explanation
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Plane,
  Hotel,
  Car,
  Receipt,
  Package,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Building2,
  FileText,
  BarChart3,
  MapPin,
  Users,
  Crown,
} from 'lucide-react';
import { 
  useCompleteOnboarding, 
  clearManualOnboardingView,
  isManualOnboardingView,
  setManualOnboardingView
} from '@/hooks/useOnboardingStatus';

/**
 * Reset onboarding for manual view from Account page
 * Sets localStorage flag so the page shows, but does NOT reset DB
 */
export function resetOnboarding() {
  setManualOnboardingView(true);
}

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'create-trip', title: 'Creating Trips' },
  { id: 'add-details', title: 'Travel Details' },
  { id: 'expenses', title: 'Expenses' },
  { id: 'plans', title: 'Plans' },
  { id: 'reports', title: 'Reports' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const completeOnboarding = useCompleteOnboarding();
  const isManualView = isManualOnboardingView();

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // Clear manual view flag when leaving the page
  useEffect(() => {
    return () => {
      clearManualOnboardingView();
    };
  }, []);

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    // Complete onboarding - mark in DB (only if not manual view)
    if (!isManualView) {
      try {
        await completeOnboarding.mutateAsync();
      } catch (err) {
        console.error('Failed to mark onboarding complete:', err);
        // Still navigate even if DB update fails
      }
      // v2.3.10: First-time completion → welcome choice screen
      clearManualOnboardingView();
      navigate('/welcome-choice', { replace: true });
    } else {
      // Manual re-view from Account page → back to dashboard
      clearManualOnboardingView();
      navigate('/dashboard', { replace: true });
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'welcome':
        return <WelcomeStep />;
      case 'create-trip':
        return <CreateTripStep />;
      case 'add-details':
        return <AddDetailsStep />;
      case 'expenses':
        return <ExpensesStep />;
      case 'plans':
        return <PlansStep />;
      case 'reports':
        return <ReportsStep />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Progress Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Getting Started</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {currentStep + 1} of {STEPS.length}</span>
            <span>{STEPS[currentStep].title}</span>
          </div>
        </div>

        {/* Step Content */}
        <Card className="min-h-[400px]">
          <CardContent className="p-6 md:p-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleNext} className="bg-gradient-ocean hover:opacity-90">
            {currentStep === STEPS.length - 1 ? (
              <>
                Get Started
                <CheckCircle className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}

// ========== STEP COMPONENTS ==========

function WelcomeStep() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Plane className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">
          Welcome to Real Travel 2 <span className="italic">Real Places</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Your personal trip command center for organizing travel information.
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Our Philosophy</h3>
        <div className="space-y-3 text-muted-foreground">
          <p>
          Real Travel 2 Real Places focuses on organizing and clarifying travel information in ways 
            that are dependable and easy to review.
          </p>
          <p>
            Some steps are intentionally manual to avoid incorrect assumptions and 
            keep details accurate.
          </p>
          <p>
            As the product evolves, assistance improves — without guessing or taking 
            control away from you.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4">
        <div className="text-center p-4 rounded-lg bg-muted/50">
          <Plane className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="text-sm font-medium">Flights</p>
        </div>
        <div className="text-center p-4 rounded-lg bg-muted/50">
          <Hotel className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="text-sm font-medium">Stays</p>
        </div>
        <div className="text-center p-4 rounded-lg bg-muted/50">
          <Receipt className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="text-sm font-medium">Expenses</p>
        </div>
      </div>
    </div>
  );
}

function CreateTripStep() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary" className="mb-2">Step 1</Badge>
        <h2 className="text-2xl font-bold">Creating a Trip</h2>
        <p className="text-muted-foreground">
          Start by creating a trip for each journey you want to manage.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">Destination & Dates</h4>
            <p className="text-sm text-muted-foreground">
              Add your destination city and travel dates. This helps organize 
              everything in one place.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Plane className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">Transportation Mode</h4>
            <p className="text-sm text-muted-foreground">
              Choose whether you're flying or driving. This adjusts what 
              features are shown for your trip.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">Trip Type</h4>
            <p className="text-sm text-muted-foreground">
              Mark trips as personal, business, or mixed. This helps with 
              expense categorization later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddDetailsStep() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary" className="mb-2">Step 2</Badge>
        <h2 className="text-2xl font-bold">Adding Travel Details</h2>
        <p className="text-muted-foreground">
          Add your bookings to keep all confirmations in one place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 rounded-lg border bg-card space-y-2">
          <Plane className="w-6 h-6 text-primary" />
          <h4 className="font-medium">Flights</h4>
          <p className="text-sm text-muted-foreground">
            Add flight details including airline, times, and confirmation numbers.
          </p>
        </div>

        <div className="p-4 rounded-lg border bg-card space-y-2">
          <Hotel className="w-6 h-6 text-primary" />
          <h4 className="font-medium">Stays</h4>
          <p className="text-sm text-muted-foreground">
            Track hotels, Airbnb, or other accommodations with check-in details.
          </p>
        </div>

        <div className="p-4 rounded-lg border bg-card space-y-2">
          <Car className="w-6 h-6 text-primary" />
          <h4 className="font-medium">Car Rentals</h4>
          <p className="text-sm text-muted-foreground">
            Keep rental pickup, return, and confirmation info accessible.
          </p>
        </div>

        <div className="p-4 rounded-lg border bg-card space-y-2">
          <Package className="w-6 h-6 text-primary" />
          <h4 className="font-medium">Activities</h4>
          <p className="text-sm text-muted-foreground">
            Add tours, events, or other scheduled activities.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <strong>Tip:</strong> You can paste confirmation emails or enter details 
          manually. Real Travel 2 Real Places keeps your data organized without making assumptions.
        </p>
      </div>
    </div>
  );
}

function ExpensesStep() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary" className="mb-2">Step 3</Badge>
        <h2 className="text-2xl font-bold">Tracking Expenses</h2>
        <p className="text-muted-foreground">
          Know what your trip cost with organized expense tracking.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">Log Expenses</h4>
            <p className="text-sm text-muted-foreground">
              Add meals, transport, activities, shopping, and other costs. 
              Categorize each expense for clear summaries.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">Split Costs</h4>
            <p className="text-sm text-muted-foreground">
              Track your share vs. total cost when traveling with others. 
              Add companions to manage shared expenses.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">Accurate Totals</h4>
            <p className="text-sm text-muted-foreground">
              Real Travel 2 Real Places calculates totals from the data you enter. What you see 
              on screen is exactly what exports show.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlansStep() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary" className="mb-2">Understanding Plans</Badge>
        <h2 className="text-2xl font-bold">Free, Pro & Business</h2>
        <p className="text-muted-foreground">
          Different plans provide different capabilities to match your needs.
        </p>
      </div>

      <div className="space-y-4">
        {/* Free */}
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
            </div>
            <h4 className="font-semibold">Free</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Organization and tracking essentials.
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-primary" />
              Up to 5 lifetime trips
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-primary" />
              Bookings, expenses, packing lists
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-primary" />
              Companion management
            </li>
          </ul>
        </div>

        {/* Pro */}
        <div className="p-4 rounded-lg border bg-card border-primary/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="w-4 h-4 text-primary" />
            </div>
            <h4 className="font-semibold">Pro</h4>
            <Badge variant="secondary" className="text-xs">Recommended</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Professional summaries and unlimited trips.
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-primary" />
              Unlimited trips
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-primary" />
              Trip Summary with total expense and individual share
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-primary" />
              Professional PDF export for each traveler
            </li>
          </ul>
        </div>

        {/* Business */}
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <h4 className="font-semibold">Business</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Advanced reporting and location-based tracking.
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-primary" />
              All Pro features
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-primary" />
              Stops (work locations) with expense assignment
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-primary" />
              Advanced Reports with filtering and multi-trip comparison
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-primary" />
              PDF and CSV exports
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ReportsStep() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary" className="mb-2">Final Step</Badge>
        <h2 className="text-2xl font-bold">Understanding Reports</h2>
        <p className="text-muted-foreground">
          Different report types serve different needs.
        </p>
      </div>

      <div className="space-y-4">
        {/* Pro Report */}
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Trip Summary (Pro)</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            A static, professional summary of a single trip.
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Trip overview with dates and destination</li>
            <li>• Total trip expense and individual share</li>
            <li>• Bookings and expense breakdown by category</li>
            <li>• Generate individual PDFs for each companion</li>
          </ul>
        </div>

        {/* Business Report */}
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Advanced Reports (Business)</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Flexible reporting across multiple trips.
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Filter by date range, trip, Stop, or category</li>
            <li>• Sort and compare expenses across trips</li>
            <li>• Export filtered results as PDF or CSV</li>
            <li>• Same data accuracy as in-app views</li>
          </ul>
        </div>

        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm">
            <strong className="text-primary">Accuracy guarantee:</strong> All reports 
            reflect exactly the data shown in the app. Filters, sort order, and 
            totals match what you see on screen.
          </p>
        </div>
      </div>

      <Separator />

      <div className="text-center space-y-2">
        <Sparkles className="w-8 h-8 mx-auto text-primary" />
        <h3 className="font-semibold">You're all set!</h3>
        <p className="text-sm text-muted-foreground">
          You can revisit this guide anytime from Account → Getting Started.
        </p>
      </div>
    </div>
  );
}

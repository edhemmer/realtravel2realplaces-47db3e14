/**
 * Onboarding Page — High-Conversion, Execution-Focused
 * 
 * 4-step flow:
 * 1. Value framing
 * 2. First trip activation trigger
 * 3. Execution preview (NOW screen)
 * 4. Real-time confidence → dashboard
 * 
 * BEHAVIOR:
 * - Shows only once after first signup/login for new users
 * - Completing or skipping sets has_completed_onboarding = true in DB
 * - Can be manually re-viewed via Account page (doesn't reset DB flag)
 */

import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight,
  Plane,
  Clock,
  MapPin,
  Bell,
  Zap,
  Navigation,
  Shield,
  Mail,
  Camera,
  PenLine,
} from 'lucide-react';
import { 
  useOnboardingStatus,
  useCompleteOnboarding, 
  clearManualOnboardingView,
  isManualOnboardingView,
  setManualOnboardingView
} from '@/hooks/useOnboardingStatus';

/**
 * Reset onboarding for manual view from Account page
 */
export function resetOnboarding() {
  setManualOnboardingView(true);
}

const STEPS = [
  { id: 'value' },
  { id: 'first-trip' },
  { id: 'preview' },
  { id: 'confidence' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const completeOnboarding = useCompleteOnboarding();
  const { hasCompletedOnboarding } = useOnboardingStatus();
  const isManualView = isManualOnboardingView();

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  useEffect(() => {
    return () => {
      clearManualOnboardingView();
    };
  }, []);

  if (hasCompletedOnboarding && !isManualView) {
    return <Navigate to="/dashboard" replace />;
  }

  const finishOnboarding = async (openCreateTrip = false) => {
    if (isSaving) return;
    setIsSaving(true);

    if (!isManualView) {
      try {
        await completeOnboarding.mutateAsync();
      } catch (err) {
        console.error('Failed to mark onboarding complete:', err);
      }
      clearManualOnboardingView();
      navigate('/dashboard', { replace: true, state: openCreateTrip ? { openCreateTrip: true } : undefined });
    } else {
      clearManualOnboardingView();
      navigate('/dashboard', { replace: true });
    }
  };

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await finishOnboarding();
    }
  };

  const handleAddTrip = async () => {
    await finishOnboarding(true);
  };

  const handleSkipTrip = () => {
    setCurrentStep(currentStep + 1);
  };

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'value':
        return <ValueStep onContinue={handleNext} />;
      case 'first-trip':
        return <FirstTripStep onAddTrip={handleAddTrip} onSkip={handleSkipTrip} isSaving={isSaving} />;
      case 'preview':
        return <PreviewStep onContinue={handleNext} />;
      case 'confidence':
        return <ConfidenceStep onFinish={() => finishOnboarding()} isSaving={isSaving} />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 pt-8 pb-12 space-y-8">
        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-center">
            {currentStep + 1} of {STEPS.length}
          </p>
        </div>

        {/* Step content */}
        {renderStep()}
      </div>
    </Layout>
  );
}

// ========== STEP 1: VALUE FRAMING ==========

function ValueStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="text-center space-y-8">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
        <Zap className="w-8 h-8 text-primary" />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Know exactly where to be and when.
        </h2>
        <p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto">
          Real Travel 2 Real Places keeps your trip running in real time — so you never scramble during travel.
        </p>
      </div>

      <Button
        onClick={onContinue}
        size="lg"
        className="w-full max-w-xs mx-auto bg-gradient-ocean hover:opacity-90 transition-opacity h-12 rounded-xl font-semibold"
      >
        Start My First Trip
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

// ========== STEP 2: FIRST TRIP ==========

function FirstTripStep({ onAddTrip, onSkip, isSaving }: { onAddTrip: () => void; onSkip: () => void; isSaving: boolean }) {
  return (
    <div className="text-center space-y-8">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
        <Plane className="w-8 h-8 text-primary" />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Add your upcoming trip.
        </h2>
      </div>

      {/* Input methods */}
      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
        <div className="p-3 rounded-xl bg-muted/40 text-center space-y-1.5">
          <Mail className="w-5 h-5 mx-auto text-primary" />
          <p className="text-xs font-medium">Forward confirmation</p>
        </div>
        <div className="p-3 rounded-xl bg-muted/40 text-center space-y-1.5">
          <Camera className="w-5 h-5 mx-auto text-primary" />
          <p className="text-xs font-medium">Upload screenshot</p>
        </div>
        <div className="p-3 rounded-xl bg-muted/40 text-center space-y-1.5">
          <PenLine className="w-5 h-5 mx-auto text-primary" />
          <p className="text-xs font-medium">Enter manually</p>
        </div>
      </div>

      <p className="text-muted-foreground text-sm max-w-xs mx-auto">
        Add your trip once. We handle the rest while you travel.
      </p>

      <div className="space-y-4 max-w-xs mx-auto">
        <Button
          onClick={onAddTrip}
          disabled={isSaving}
          size="lg"
          className="w-full bg-gradient-ocean hover:opacity-90 transition-opacity h-12 rounded-xl font-semibold"
        >
          <Plane className="w-4 h-4 mr-2" />
          Add Trip
        </Button>
        <button
          onClick={onSkip}
          disabled={isSaving}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          I&#39;ll add one later
        </button>
      </div>
    </div>
  );
}

// ========== STEP 3: WHAT HAPPENS NEXT ==========

function PreviewStep({ onContinue }: { onContinue: () => void }) {
  const previewItems = [
    { icon: Clock, label: "What's next", detail: 'Your upcoming flight, check-in, or stop' },
    { icon: Navigation, label: 'When to leave', detail: 'Leave-by timing based on live conditions' },
    { icon: MapPin, label: 'Where to go', detail: 'Navigation-ready addresses for every stop' },
    { icon: Bell, label: 'What needs attention', detail: 'Reminders for things you can\'t miss' },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          What happens next.
        </h2>
      </div>

      {/* Mock NOW screen */}
      <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Now</span>
        </div>
        {previewItems.map((item) => (
          <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Button
          onClick={onContinue}
          size="lg"
          className="w-full max-w-xs mx-auto bg-gradient-ocean hover:opacity-90 transition-opacity h-12 rounded-xl font-semibold"
        >
          See My Trip Dashboard
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ========== STEP 4: MOMENTUM CLOSE ==========

function ConfidenceStep({ onFinish, isSaving }: { onFinish: () => void; isSaving: boolean }) {
  return (
    <div className="text-center space-y-8">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
        <Shield className="w-8 h-8 text-primary" />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Travel without uncertainty.
        </h2>
        <p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto">
          Real Travel 2 Real Places reduces missed timing, navigation mistakes, and last-minute stress — especially when you travel often.
        </p>
      </div>

      <Button
        onClick={onFinish}
        disabled={isSaving}
        size="lg"
        className="w-full max-w-xs mx-auto bg-gradient-ocean hover:opacity-90 transition-opacity h-12 rounded-xl font-semibold"
      >
        Go to My Dashboard
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

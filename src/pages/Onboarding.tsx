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

import { useState, useEffect, useRef, useCallback } from 'react';
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
  Camera,
  PenLine,
  Mail,
} from 'lucide-react';
import { DropzoneIntake } from '@/components/trips/DropzoneIntake';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
        {/* Minimal dot progress — Superhuman/Linear pattern */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'w-6 bg-primary'
                  : i < currentStep
                  ? 'w-1.5 bg-primary/40'
                  : 'w-1.5 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step content with fade transition */}
        <div key={currentStep} className="animate-fade-in">
          {renderStep()}
        </div>
      </div>
    </Layout>
  );
}

// ========== STEP 1: VALUE FRAMING ==========

function ValueStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="text-center space-y-10 pt-4">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
        <Zap className="w-7 h-7 text-primary" />
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
          Know exactly where to be
          <br />
          and when.
        </h2>
        <p className="text-muted-foreground text-[0.9375rem] leading-relaxed max-w-xs mx-auto">
          Real Travel 2 Real Places runs your trip in real time — so you never scramble or second-guess what&#39;s next.
        </p>
      </div>

      <Button
        onClick={onContinue}
        size="lg"
        className="w-full max-w-xs mx-auto bg-gradient-ocean hover:opacity-90 transition-opacity h-12 rounded-xl font-semibold shadow-sm"
      >
        Start My First Trip
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

// ========== STEP 2: FIRST TRIP ==========

function FirstTripStep({ onAddTrip, onSkip, isSaving }: { onAddTrip: () => void; onSkip: () => void; isSaving: boolean }) {
  const [showDropzone, setShowDropzone] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [highlightDropzone, setHighlightDropzone] = useState(false);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const handleEmailCardClick = useCallback(() => {
    setShowDropzone(true);
    // After state update renders the dropzone, scroll and highlight
    setTimeout(() => {
      dropzoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightDropzone(true);
      setTimeout(() => setHighlightDropzone(false), 1200);
    }, 100);
  }, []);

  const handleTextExtracted = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-booking', {
        body: { text, type: 'booking' },
      });
      if (error) {
        toast.error('Connection error. Please try again.');
        return;
      }
      if (data?.success) {
        toast.success('Booking details captured! Add your trip to save them.');
      } else {
        toast.warning("Some details couldn't be read. You can review and edit after adding your trip.");
      }
    } catch {
      toast.error('Something went wrong. You can add details manually.');
    } finally {
      setIsParsing(false);
    }
  }, []);

  return (
    <div className="text-center space-y-8 pt-4">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
        <Plane className="w-7 h-7 text-primary" />
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Add your upcoming trip.
        </h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Add it once. We keep it running while you travel.
        </p>
      </div>

      {/* Input method chips — Notion-style option tiles */}
      <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto">
        <button
          type="button"
          onClick={handleEmailCardClick}
          className={cn(
            'p-3 rounded-xl border border-border/40 bg-card text-center space-y-1.5 shadow-sm transition-colors hover:border-primary/40',
            showDropzone && 'border-primary/60 bg-primary/5'
          )}
        >
          <Mail className="w-5 h-5 mx-auto text-primary" />
          <p className="text-[0.6875rem] font-medium leading-tight">Upload email (.eml)</p>
        </button>
        <div className="p-3 rounded-xl border border-border/40 bg-card text-center space-y-1.5 shadow-sm">
          <Camera className="w-5 h-5 mx-auto text-primary" />
          <p className="text-[0.6875rem] font-medium leading-tight">Upload screenshot</p>
        </div>
        <div className="p-3 rounded-xl border border-border/40 bg-card text-center space-y-1.5 shadow-sm">
          <PenLine className="w-5 h-5 mx-auto text-primary" />
          <p className="text-[0.6875rem] font-medium leading-tight">Enter manually</p>
        </div>
      </div>

      {/* Email dropzone — revealed on card click */}
      {showDropzone && (
        <div
          ref={dropzoneRef}
          className={cn(
            'max-w-sm mx-auto rounded-xl transition-all duration-500',
            highlightDropzone && 'ring-2 ring-primary/50 ring-offset-2'
          )}
        >
          <DropzoneIntake
            onTextExtracted={handleTextExtracted}
            isParsing={isParsing}
          />
        </div>
      )}

      <div className="space-y-3 max-w-xs mx-auto">
        <Button
          onClick={onAddTrip}
          disabled={isSaving}
          size="lg"
          className="w-full bg-gradient-ocean hover:opacity-90 transition-opacity h-12 rounded-xl font-semibold shadow-sm"
        >
          Add Trip
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <button
          onClick={onSkip}
          disabled={isSaving}
          className="block mx-auto text-[0.6875rem] text-muted-foreground/50 hover:text-muted-foreground transition-colors pt-1"
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
    { icon: Clock, label: "What's next", detail: 'Upcoming flight, check-in, or stop' },
    { icon: Navigation, label: 'When to leave', detail: 'Traffic-aware departure timing' },
    { icon: MapPin, label: 'Where to go', detail: 'Navigation-ready addresses' },
    { icon: Bell, label: 'What needs attention', detail: 'Smart reminders for what matters' },
  ];

  return (
    <div className="space-y-8 pt-4">
      <div className="text-center space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Here&#39;s what you&#39;ll see on every trip.
        </h2>
      </div>

      {/* Mock NOW screen — compact, premium card */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/20">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[0.6875rem] font-semibold text-primary uppercase tracking-wider">Now</span>
        </div>
        <div className="p-3 space-y-2">
          {previewItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">{item.label}</p>
                <p className="text-[0.6875rem] text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Habit framing — Superhuman pattern */}
      <p className="text-center text-xs text-muted-foreground/70 italic">
        Open Real Travel 2 Real Places before you leave — and stay ahead.
      </p>

      <div className="text-center">
        <Button
          onClick={onContinue}
          size="lg"
          className="w-full max-w-xs mx-auto bg-gradient-ocean hover:opacity-90 transition-opacity h-12 rounded-xl font-semibold shadow-sm"
        >
          See My Dashboard
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ========== STEP 4: RETENTION ANCHOR ==========

function ConfidenceStep({ onFinish, isSaving }: { onFinish: () => void; isSaving: boolean }) {
  return (
    <div className="text-center space-y-10 pt-4">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
        <Shield className="w-7 h-7 text-primary" />
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Built for frequent travelers.
        </h2>
        <p className="text-muted-foreground text-[0.9375rem] leading-relaxed max-w-xs mx-auto">
          The more you travel, the more clarity matters.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
          Real Travel 2 Real Places reduces missed timing, navigation mistakes, and last-minute stress — trip after trip.
        </p>
      </div>

      <Button
        onClick={onFinish}
        disabled={isSaving}
        size="lg"
        className="w-full max-w-xs mx-auto bg-gradient-ocean hover:opacity-90 transition-opacity h-12 rounded-xl font-semibold shadow-sm"
      >
        Go to My Dashboard
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

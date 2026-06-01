/**
 * Onboarding Page — v3.11.0: Command-center intro
 *
 * Premium intro card that frames the four pillars (Today / Move / Guide / Flow)
 * and the core promises (offline, multi-currency, shareable) before routing
 * into the Create Trip Wizard. No upload/import/paste prompts in onboarding.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Plane, ArrowRight, Compass, Sparkles, ListChecks, WifiOff, Coins, Users } from 'lucide-react';
import { 
  useOnboardingStatus,
  useCompleteOnboarding, 
  clearManualOnboardingView,
  isManualOnboardingView,
  setManualOnboardingView
} from '@/hooks/useOnboardingStatus';
import { canCreateTrips } from '@/lib/native/platform';

/**
 * Reset onboarding for manual view from Account page
 */
export function resetOnboarding() {
  setManualOnboardingView(true);
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const completeOnboarding = useCompleteOnboarding();
  const { hasCompletedOnboarding } = useOnboardingStatus();
  const isManualView = isManualOnboardingView();

  useEffect(() => {
    return () => {
      clearManualOnboardingView();
    };
  }, []);

  if (hasCompletedOnboarding && !isManualView) {
    return <Navigate to="/dashboard" replace />;
  }

  // Native iOS build: trip creation is disabled — skip onboarding wizard entirely.
  if (!canCreateTrips()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleCreateTrip = async () => {
    if (isSaving) return;
    setIsSaving(true);

    if (!isManualView) {
      try {
        await completeOnboarding.mutateAsync();
      } catch (err) {
        console.error('Failed to mark onboarding complete:', err);
      }
    }
    clearManualOnboardingView();
    navigate('/dashboard', { replace: true, state: { openCreateTrip: true, isOnboarding: true } });
  };

  const handleSkip = async () => {
    if (isSaving) return;
    setIsSaving(true);

    if (!isManualView) {
      try {
        await completeOnboarding.mutateAsync();
      } catch (err) {
        console.error('Failed to mark onboarding complete:', err);
      }
    }
    clearManualOnboardingView();
    navigate('/dashboard', { replace: true });
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh] px-4 pt-safe">
        <div className="max-w-sm w-full text-center space-y-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Plane className="w-7 h-7 text-primary" />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome to Real Travel 2 Real Places
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your travel command center. Organized, stress-free, and ready when you are.
            </p>
          </div>

          <div className="flex justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary/70" />
              Fly, drive, or train
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary/70" />
              Everything in one place
            </span>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleCreateTrip}
              disabled={isSaving}
              size="lg"
              className="w-full bg-gradient-ocean hover:opacity-90 transition-opacity h-12 rounded-xl font-semibold shadow-sm"
            >
              Create your first trip
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <button
              onClick={handleSkip}
              disabled={isSaving}
              className="block mx-auto text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              I'll do this later
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

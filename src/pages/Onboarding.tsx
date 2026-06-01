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
      <div className="flex items-center justify-center min-h-[70vh] px-4 pt-safe">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Plane className="w-7 h-7 text-primary" />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome to Real Travel 2 Real Places
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your travel command center — the next step, always one tap away.
            </p>
          </div>

          {/* Four pillars */}
          <div className="grid grid-cols-2 gap-2.5 text-left">
            <div className="rounded-xl bg-card border border-border/60 p-3 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Today</div>
                <div className="text-[11px] text-muted-foreground leading-snug">What to do next, when to leave.</div>
              </div>
            </div>
            <div className="rounded-xl bg-card border border-border/60 p-3 flex items-start gap-2.5">
              <Compass className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Move</div>
                <div className="text-[11px] text-muted-foreground leading-snug">Directive transport guidance.</div>
              </div>
            </div>
            <div className="rounded-xl bg-card border border-border/60 p-3 flex items-start gap-2.5">
              <ListChecks className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Guide</div>
                <div className="text-[11px] text-muted-foreground leading-snug">Alerts that actually matter.</div>
              </div>
            </div>
            <div className="rounded-xl bg-card border border-border/60 p-3 flex items-start gap-2.5">
              <Plane className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Flow</div>
                <div className="text-[11px] text-muted-foreground leading-snug">Your trip on one timeline.</div>
              </div>
            </div>
          </div>

          {/* Trust row */}
          <div className="flex justify-center flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <WifiOff className="w-3 h-3 text-primary/70" />
              Works offline
            </span>
            <span className="flex items-center gap-1.5">
              <Coins className="w-3 h-3 text-primary/70" />
              Multi-currency aware
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-primary/70" />
              Share with co-travelers
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
              className="block mx-auto text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              I'll do this later
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

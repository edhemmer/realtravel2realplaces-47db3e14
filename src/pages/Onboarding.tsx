/**
 * Onboarding Page — v3.9.8: Single CTA, direct-to-wizard
 * 
 * Shows a single "Create your first trip" button that routes to dashboard
 * with the Create Trip Wizard auto-opened.
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
import { Plane, ArrowRight } from 'lucide-react';
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
              You can add confirmations later (email, photo, or manual).
            </p>
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

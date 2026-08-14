/**
 * Onboarding Page
 *
 * First-use introduction for verified trip-management capabilities.
 * Keeps onboarding completion and Create Trip routing behavior unchanged.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Plane, ArrowRight, CalendarDays, MapPin, Receipt, ListChecks } from 'lucide-react';
import {
  useOnboardingStatus,
  useCompleteOnboarding,
  clearManualOnboardingView,
  isManualOnboardingView,
  setManualOnboardingView,
} from '@/hooks/useOnboardingStatus';
import { canCreateTrips } from '@/lib/native/platform';

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
              Create a trip, keep its important records together, and open the details you saved when you need them.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-left">
            <div className="rounded-xl bg-card border border-border/60 p-3 flex items-start gap-2.5">
              <CalendarDays className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Timeline</div>
                <div className="text-[11px] text-muted-foreground leading-snug">See saved trip events in date and time order.</div>
              </div>
            </div>
            <div className="rounded-xl bg-card border border-border/60 p-3 flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Travel details</div>
                <div className="text-[11px] text-muted-foreground leading-snug">Keep saved locations, bookings, and movement details with the trip.</div>
              </div>
            </div>
            <div className="rounded-xl bg-card border border-border/60 p-3 flex items-start gap-2.5">
              <Receipt className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Expenses</div>
                <div className="text-[11px] text-muted-foreground leading-snug">Record trip spending and attach receipt photos.</div>
              </div>
            </div>
            <div className="rounded-xl bg-card border border-border/60 p-3 flex items-start gap-2.5">
              <ListChecks className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Packing</div>
                <div className="text-[11px] text-muted-foreground leading-snug">Keep a trip packing list with the rest of your records.</div>
              </div>
            </div>
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

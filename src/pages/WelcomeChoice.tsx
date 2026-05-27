/**
 * WelcomeChoice — v2.3.10: Post-Tutorial Entry Choice
 * 
 * Shows once after first tutorial completion.
 * Two CTAs: Create a Trip (opens wizard) or Go to Dashboard.
 * Uses localStorage flag for one-time display (no schema changes).
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plane, LayoutDashboard } from 'lucide-react';

const WELCOME_CHOICE_KEY = 'rt2rp_welcome_choice_shown';

/** Check if this screen has already been shown */
export function hasSeenWelcomeChoice(): boolean {
  return localStorage.getItem(WELCOME_CHOICE_KEY) === 'true';
}

/** Mark the welcome choice as shown */
function markWelcomeChoiceSeen() {
  localStorage.setItem(WELCOME_CHOICE_KEY, 'true');
}

export default function WelcomeChoice() {
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);

  // If already seen, redirect immediately to dashboard
  useEffect(() => {
    if (hasSeenWelcomeChoice()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const allowCreate = canCreateTrips();

  const handleCreateTrip = () => {
    if (redirecting) return; // prevent double-click
    if (!allowCreate) {
      // Native iOS: creation is disabled — fall through to dashboard.
      handleGoToDashboard();
      return;
    }
    setRedirecting(true);
    markWelcomeChoiceSeen();
    // Navigate to dashboard with state to auto-open the create trip dialog
    navigate('/dashboard', { replace: true, state: { openCreateTrip: true } });
  };

  const handleGoToDashboard = () => {
    if (redirecting) return; // prevent double-click
    setRedirecting(true);
    markWelcomeChoiceSeen();
    navigate('/dashboard', { replace: true });
  };

  if (hasSeenWelcomeChoice() || redirecting) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh] px-4 pt-safe">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 md:p-8 space-y-6 text-center">
            <div className="space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Plane className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">You're all set!</h1>
              <p className="text-muted-foreground leading-relaxed">
                Ready to organize your first trip, or explore the dashboard first?
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {/* Primary CTA */}
              <Button
                onClick={handleCreateTrip}
                disabled={redirecting}
                size="lg"
                className="w-full bg-gradient-ocean hover:opacity-90 transition-opacity min-h-[44px]"
              >
                <Plane className="w-4 h-4 mr-2" />
                Create a Trip
              </Button>

              {/* Secondary CTA */}
              <Button
                onClick={handleGoToDashboard}
                disabled={redirecting}
                variant="outline"
                size="lg"
                className="w-full min-h-[44px]"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

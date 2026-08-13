/**
 * WelcomeChoice — post-first-trip entry choice.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plane, LayoutDashboard } from 'lucide-react';
import { canCreateTrips } from '@/lib/native/platform';

const WELCOME_CHOICE_KEY = 'rt2rp_welcome_choice_shown';

export function hasSeenWelcomeChoice(): boolean {
  return localStorage.getItem(WELCOME_CHOICE_KEY) === 'true';
}

function markWelcomeChoiceSeen() {
  localStorage.setItem(WELCOME_CHOICE_KEY, 'true');
}

export default function WelcomeChoice() {
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (hasSeenWelcomeChoice()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const allowCreate = canCreateTrips();

  const handleCreateTrip = () => {
    if (redirecting) return;
    if (!allowCreate) {
      handleGoToDashboard();
      return;
    }
    setRedirecting(true);
    markWelcomeChoiceSeen();
    navigate('/dashboard', { replace: true, state: { openCreateTrip: true } });
  };

  const handleGoToDashboard = () => {
    if (redirecting) return;
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
              <div className="w-20 h-20 mx-auto rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden">
                <img src="/rt2rp-logo-web.png" alt="Real Travel 2 Real Places" className="w-16 h-16 object-contain" />
              </div>
              <h1 className="text-2xl font-bold">Your RT2RP account is ready</h1>
              <p className="text-muted-foreground leading-relaxed">
                Create a trip to start saving reservations, timeline details, expenses, and other supported trip records - or look around the dashboard first.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {allowCreate && (
                <Button
                  onClick={handleCreateTrip}
                  disabled={redirecting}
                  size="lg"
                  className="w-full bg-gradient-ocean hover:opacity-90 transition-opacity min-h-[44px]"
                >
                  <Plane className="w-4 h-4 mr-2" />
                  Create a Trip
                </Button>
              )}

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

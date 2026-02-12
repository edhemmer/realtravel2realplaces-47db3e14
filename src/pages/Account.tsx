import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useIsAdmin } from '@/hooks/useAdminUsers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Crown, User, Lock, CheckCircle, ChevronRight, ShieldCheck, BookOpen, Sparkles, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TravelPreferencesCard } from '@/components/account/TravelPreferencesCard';
import { UpgradePlanDialog } from '@/components/account/UpgradePlanDialog';
import { NotificationPreferencesCard } from '@/components/account/NotificationPreferencesCard';
import { PlanPill } from '@/components/PlanPill';
import { resetOnboarding } from './Onboarding';

export default function Account() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier, isPro, canAccessBusinessFeatures, isLoading: isAccessLoading } = useAccess();
  const { data: profile, isLoading: isProfileLoading } = useUserProfile();
  const { data: isAdmin } = useIsAdmin();
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  const handleResetPassword = async () => {
    if (!user?.email) return;
    
    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        toast.error('Failed to send reset email. Please try again.');
        console.error('Password reset error:', error);
      } else {
        setResetSent(true);
        toast.success('Password reset email sent! Check your inbox.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
      console.error('Password reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const isLoading = isAccessLoading || isProfileLoading;
  
  // Determine plan icon
  const getPlanIcon = () => {
    if (tier === 'business') return <Briefcase className="w-5 h-5 text-primary" />;
    if (tier === 'pro') return <Crown className="w-5 h-5 text-primary" />;
    return <User className="w-5 h-5 text-primary" />;
  };

  // Derive display role annotation for admin users
  const getRoleAnnotation = () => {
    if (isAdmin) {
      return '(Admin access)';
    }
    return null;
  };

  const roleAnnotation = getRoleAnnotation();
  const lifetimeTripCount = profile?.lifetime_trip_count ?? 0;

  const handleViewOnboarding = () => {
    resetOnboarding();
    navigate('/onboarding');
  };

  // Get plan description
  const getPlanDescription = () => {
    if (tier === 'business') {
      return (
        <>
          <span className="font-medium text-foreground">Business plan</span> – unlimited trips, stops, and advanced reports.
        </>
      );
    }
    if (tier === 'pro') {
      return (
        <>
          <span className="font-medium text-foreground">Pro plan</span> – unlimited trips and advanced features.
        </>
      );
    }
    return (
      <>
        <span className="font-medium text-foreground">Free plan</span> – {lifetimeTripCount} of 5 lifetime trips used.
      </>
    );
  };

  // Show upgrade button for free users only (Pro and Business don't need it)
  const showUpgradeButton = tier === 'free';

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account</h1>
          <p className="text-muted-foreground">Manage your account settings and plan.</p>
        </div>

        {/* Email Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="w-5 h-5 text-primary" />
              Email Address
            </CardTitle>
            <CardDescription>Your account email address</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                readOnly
                className="bg-muted"
              />
            </div>
          </CardContent>
        </Card>

        {/* Plan Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {getPlanIcon()}
              Current Plan
            </CardTitle>
            <CardDescription>Your subscription status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse h-16 bg-muted rounded-lg" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <PlanPill showTripLimit />
                  {roleAnnotation && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {roleAnnotation}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {getPlanDescription()}
                </p>
                
                {/* Upgrade CTA for Free users only */}
                {showUpgradeButton && (
                  <Button 
                    variant="default"
                    className="w-full justify-between"
                    onClick={() => setUpgradeDialogOpen(true)}
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Upgrade plan
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full justify-between"
                  onClick={() => navigate('/plans')}
                >
                  View all plans
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Travel Preferences Section */}
        {!isLoading && (
          <TravelPreferencesCard
            initialAirport={profile?.preferred_home_airport}
            initialCurrency={profile?.preferred_currency}
            initialDatetimeFormat={profile?.preferred_datetime_format}
            initialDistanceUnit={profile?.distance_unit}
            initialTemperatureUnit={profile?.temperature_unit}
          />
        )}

        {/* Notification Preferences */}
        {!isLoading && (
          <NotificationPreferencesCard />
        )}

        {/* Help / Getting Started Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5 text-primary" />
              Help
            </CardTitle>
            <CardDescription>Resources and guides</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={handleViewOnboarding}
            >
              Getting Started Guide
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="w-5 h-5 text-primary" />
              Password
            </CardTitle>
            <CardDescription>Manage your account password</CardDescription>
          </CardHeader>
          <CardContent>
            {resetSent ? (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle className="w-4 h-4" />
                <span>Reset email sent! Check your inbox to continue.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  To change your password, we'll send a reset link to your email.
                </p>
                <Button
                  variant="outline"
                  onClick={handleResetPassword}
                  disabled={isResetting}
                >
                  {isResetting ? 'Sending...' : 'Send Password Reset Email'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Plan Dialog */}
      <UpgradePlanDialog 
        open={upgradeDialogOpen} 
        onOpenChange={setUpgradeDialogOpen} 
      />
    </Layout>
  );
}

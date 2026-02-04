import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Crown, User, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TravelPreferencesCard } from '@/components/account/TravelPreferencesCard';

export default function Account() {
  const { user } = useAuth();
  const { data: subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const { data: profile, isLoading: isProfileLoading } = useUserProfile();
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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

  const isPro = subscription?.tier === 'pro';
  const isLoading = isSubscriptionLoading || isProfileLoading;

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
              {isPro ? (
                <Crown className="w-5 h-5 text-primary" />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
              Current Plan
            </CardTitle>
            <CardDescription>Your subscription status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse h-16 bg-muted rounded-lg" />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={isPro ? 'default' : 'secondary'}
                    className={isPro ? 'bg-primary hover:bg-primary/90' : ''}
                  >
                    {isPro ? 'Pro' : 'Free'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isPro ? (
                    <>
                      <span className="font-medium text-foreground">Pro plan</span> – unlimited trips and advanced features.
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-foreground">Free plan</span> – up to 5 lifetime trips.
                    </>
                  )}
                </p>
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
          />
        )}

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
    </Layout>
  );
}

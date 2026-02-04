import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionTier, SubscriptionStatus, TIER_LIMITS } from '@/types/subscription';

/**
 * v2.0.0: Hook to manage subscription status and tier limits
 * 
 * Returns the user's current subscription tier, usage counts, and
 * helper booleans for feature gating (canCreateTrip, canUseAi).
 */
export function useSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async (): Promise<SubscriptionStatus> => {
      if (!user) {
        // Return free tier defaults for unauthenticated users
        return {
          tier: 'free',
          limits: TIER_LIMITS.free,
          usage: { activeTrips: 0, aiGenerationsThisMonth: 0 },
          canCreateTrip: true,
          canUseAi: true,
          subscriptionStartedAt: null,
        };
      }

      // Fetch profile with subscription info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_started_at, monthly_ai_generations, ai_generations_reset_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching subscription:', profileError);
        throw profileError;
      }

      // Get the tier, defaulting to 'free' if no profile exists
      // Cast the string to SubscriptionTier since DB returns string
      const tier: SubscriptionTier = (profile?.subscription_tier as SubscriptionTier) || 'free';
      const limits = TIER_LIMITS[tier];

      // Count active trips (end_date >= today)
      const today = new Date().toISOString().split('T')[0];
      const { count: activeTrips, error: tripsError } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('end_date', today);

      if (tripsError) {
        console.error('Error counting trips:', tripsError);
        throw tripsError;
      }

      // Check if AI generation counter needs reset (monthly reset)
      let aiGenerationsThisMonth = profile?.monthly_ai_generations || 0;
      const resetAt = profile?.ai_generations_reset_at;
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const resetMonth = resetAt ? resetAt.slice(0, 7) : null;

      if (resetMonth !== currentMonth) {
        // Reset counter for new month (will be updated when AI is used)
        aiGenerationsThisMonth = 0;
      }

      // Calculate can-do flags
      const canCreateTrip = limits.maxActiveTrips === -1 || (activeTrips || 0) < limits.maxActiveTrips;
      const canUseAi = limits.maxAiGenerationsPerMonth === -1 || aiGenerationsThisMonth < limits.maxAiGenerationsPerMonth;

      return {
        tier,
        limits,
        usage: {
          activeTrips: activeTrips || 0,
          aiGenerationsThisMonth,
        },
        canCreateTrip,
        canUseAi,
        subscriptionStartedAt: profile?.subscription_started_at || null,
      };
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Helper hook to check if current user is Pro
 */
export function useIsPro(): boolean {
  const { data } = useSubscription();
  return data?.tier === 'pro';
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionTier, SubscriptionStatus, TIER_LIMITS } from '@/types/subscription';

/**
 * v2.0.0a: Simplified hook to get subscription tier only
 * 
 * Returns the user's current subscription tier and limits.
 * Usage tracking and quota logic removed per 2.0.0a spec.
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
        };
      }

      // Fetch profile with subscription info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching subscription:', profileError);
        throw profileError;
      }

      // Get the tier, defaulting to 'free' if no profile exists
      const tier: SubscriptionTier = (profile?.subscription_tier as SubscriptionTier) || 'free';
      const limits = TIER_LIMITS[tier];

      return {
        tier,
        limits,
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

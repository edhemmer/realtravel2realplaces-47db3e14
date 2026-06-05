/**
 * useSubscription - Subscription tier access layer
 * 
 * Patch 2.6.24: Simple Plan Model (Single Source of Truth)
 * 
 * DATA INTEGRITY:
 * - Single source of truth for user subscription tier
 * - Fetches ONLY from profiles.subscription_tier column
 * - No overrides, no tester flags, no special cases
 * - Allowed values: 'free', 'pro', 'business'
 * - Caches for 30 seconds to reduce database load
 * 
 * TIER LIMITS:
 * - Defined in TIER_LIMITS constant (types/subscription.ts)
 * - FREE: 2 lifetime trips, basic features
 * - PRO: Unlimited trips, advanced features
 * - BUSINESS: Pro features + Tour/Stops, advanced reports
 * 
 * ERROR HANDLING:
 * - Profile fetch errors are logged and rethrown
 * - Missing profile defaults to 'free' tier
 * - Query is disabled for unauthenticated users
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionTier, SubscriptionStatus, TIER_LIMITS } from '@/types/subscription';

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

      // Patch 2.6.24: Fetch subscription tier directly from DB with no overrides
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
 * Helper hook to check if current user is Pro or Business
 * Business tier users also get Pro access (Business includes Pro features)
 */
export function useIsPro(): boolean {
  const { data } = useSubscription();
  
  // Pro or Business tier both grant Pro-level access
  return data?.tier === 'pro' || data?.tier === 'business';
}

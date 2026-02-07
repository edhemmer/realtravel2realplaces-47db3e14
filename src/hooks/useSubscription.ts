/**
 * useSubscription - Subscription tier access layer
 * 
 * Patch 2.6.2: Commercial Code Integrity Documentation
 * 
 * DATA INTEGRITY:
 * - Single source of truth for user subscription tier
 * - Fetches from profiles.subscription_tier column
 * - Caches for 30 seconds to reduce database load
 * 
 * OWNER OVERRIDE:
 * - Owner email (edhemmer@gmail.com) is always forced to Pro tier
 * - This is a client-side convenience; server-side uses admin role checks
 * - Override is case-insensitive for email matching
 * 
 * TIER LIMITS:
 * - Defined in TIER_LIMITS constant (types/subscription.ts)
 * - FREE: 5 lifetime trips, basic features
 * - PRO: Unlimited trips, advanced features
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

// Owner email that always gets Pro access (override)
const OWNER_EMAIL = 'edhemmer@gmail.com';
export function useSubscription() {
  const { user } = useAuth();

  // Check if current user is the owner (case-insensitive)
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

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

      // Owner override: always Pro regardless of DB value
      if (isOwner) {
        return {
          tier: 'pro',
          limits: TIER_LIMITS.pro,
        };
      }

      // Fetch profile with subscription info for non-owners
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
 * Includes owner override: edhemmer@gmail.com is always Pro
 */
export function useIsPro(): boolean {
  const { user } = useAuth();
  const { data } = useSubscription();
  
  // Owner override check
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  if (isOwner) return true;
  
  return data?.tier === 'pro';
}

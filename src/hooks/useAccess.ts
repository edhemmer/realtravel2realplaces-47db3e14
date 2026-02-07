/**
 * useAccess - Centralized UI access control hook
 * 
 * Patch 2.6.24: Simple Plan Model (Single Source of Truth)
 * 
 * PLAN GATING ARCHITECTURE:
 * - UI gating is enforced via useAccess() hook and wrapper components
 * - Server-side enforcement is handled by RLS policies and DB functions
 * - UI gating is a UX optimization; security is enforced at database level
 * 
 * TIER HIERARCHY:
 * - FREE: Basic trip management, 5 lifetime trip limit
 * - PRO: Unlimited trips, timeline, weather, airport intelligence
 * - BUSINESS: Pro + Tour/Stops, Stop-level expense assignment, Advanced Reports
 * 
 * SINGLE SOURCE OF TRUTH:
 * - tier is read directly from profiles.subscription_tier via useSubscription
 * - No overrides, no tester flags, no special cases
 * - Guarantees header PlanPill, Admin table, Users list, and feature gates all match
 * 
 * ADMIN vs PLAN ACCESS:
 * - isAdminUser: Controls access to /admin pages and <AdminOnly> components ONLY
 * - tier: Controls plan-based features (Pro/Business gating)
 * - Admin role does NOT automatically grant Business tier access
 * - Admins experience their actual plan tier like any other user
 * 
 * COMPONENT USAGE:
 * - <ProOnly>: Wraps Pro-tier features
 * - <BusinessOnly>: Wraps Business-tier features
 * - <AdminOnly>: Wraps admin-only features (uses isAdminUser, not tier)
 * - <FeatureGate>: Custom access logic with accessCheck function
 * 
 * @example
 * const { canAccessBusinessFeatures, isAdminUser, isPro, tier } = useAccess();
 * 
 * // Admin access to admin pages
 * if (isAdminUser) {
 *   // Render admin dashboard
 * }
 * 
 * // Plan-based feature access (independent of admin status)
 * if (canAccessBusinessFeatures) {
 *   // Render Business-only UI (Tour/Stops, advanced reports)
 * }
 */

import { useSubscription, useIsPro } from '@/hooks/useSubscription';
import { useIsAdmin } from '@/hooks/useAdminUsers';
import { 
  resolveEffectiveTier, 
  tierIncludesPro, 
  tierIncludesBusiness,
  tierMeetsRequirement,
  type PlanTier 
} from '@/utils/planTier';

export interface AccessState {
  /** Whether the user's plan includes Pro features */
  isPro: boolean;
  
  /** Whether the user has Business-tier access */
  canAccessBusinessFeatures: boolean;
  
  /** Whether the user is an admin (owner/developer) - for admin UI only */
  isAdminUser: boolean;
  
  /** Whether access state is still loading */
  isLoading: boolean;
  
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  
  /** The user's effective subscription tier (for UI display and gating) */
  tier: PlanTier | null;
}

export function useAccess(): AccessState {
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const isPro = useIsPro();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  const isLoading = subscriptionLoading || adminLoading;
  const rawTier = (subscription?.tier || null) as PlanTier | null;
  
  // Patch 2.6.24: tier is simply the subscription tier from DB (no overrides)
  // resolveEffectiveTier just ensures we have a valid tier or default to 'free'
  const tier = rawTier !== null
    ? resolveEffectiveTier({
        subscriptionTier: rawTier,
      })
    : null;
  
  // Derive access flags from tier using shared utilities
  const canAccessBusinessFeatures = tier !== null && tierIncludesBusiness(tier);
  const hasProAccess = tier !== null && tierIncludesPro(tier);
  
  return {
    isPro: isPro || hasProAccess, // Business tier includes Pro features
    canAccessBusinessFeatures,
    isAdminUser: isAdmin === true, // Admin status is separate from plan tier
    isLoading,
    isAuthenticated: !!subscription,
    tier,
  };
}

/**
 * Helper to check if a feature should be visible based on plan
 * This is a pure function for use outside of React components.
 * 
 * @param tier - The user's current subscription tier
 * @param requiredTier - The minimum tier required for the feature
 */
export function canAccessFeature(
  tier: PlanTier | null,
  requiredTier: PlanTier
): boolean {
  return tierMeetsRequirement(tier, requiredTier);
}

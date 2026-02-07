/**
 * useAccess - Centralized UI access control hook
 * 
 * Patch 2.6.21: Single Source of Truth for Effective Plan Tier
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
 * SINGLE SOURCE OF TRUTH (Patch 2.6.21):
 * - effectiveTier is computed via resolveEffectiveTier() from src/utils/planTier.ts
 * - This same function is used by Admin Plan Management for the current user row
 * - Guarantees header PlanPill and Admin table always show the same tier
 * 
 * ADMIN vs PLAN ACCESS (Patch 2.6.19):
 * - isAdminUser: Controls access to /admin pages and <AdminOnly> components ONLY
 * - effectiveTier: Controls plan-based features (Pro/Business gating)
 * - Admin role does NOT automatically grant Business tier access
 * - This allows admins to experience Free/Pro/Business behavior by changing their plan
 * 
 * BUSINESS ACCESS GRANTS:
 * 1. Business tester override (from businessTesters.ts) - for trusted testers
 * 2. Database subscription_tier = 'business' (admin-assigned override)
 * NOTE: Admin role is explicitly excluded from business access grants
 * 
 * COMPONENT USAGE:
 * - <ProOnly>: Wraps Pro-tier features (currently unenforced in UI)
 * - <BusinessOnly>: Wraps Business-tier features (enforced via canAccessBusinessFeatures)
 * - <AdminOnly>: Wraps admin-only features (always enforced, uses isAdminUser)
 * - <FeatureGate>: Custom access logic with accessCheck function
 * 
 * @example
 * const { canAccessBusinessFeatures, isAdminUser, isPro } = useAccess();
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
import { useAuth } from '@/contexts/AuthContext';
import { isBusinessTester } from '@/config/businessTesters';
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
  
  /** Whether the user has Business-tier access (via tier or tester override) */
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
  const { user } = useAuth();
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const isPro = useIsPro();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  const isLoading = subscriptionLoading || adminLoading;
  const rawTier = (subscription?.tier || null) as PlanTier | null;
  
  // Patch 2.6.8: Business tester override check
  // Testers listed in src/config/businessTesters.ts get Business access
  const isTester = isBusinessTester(user?.email);
  
  // Patch 2.6.21: Use shared resolver for effectiveTier (single source of truth)
  // This same function is used by Admin Plan Management for the current user row
  const effectiveTier = rawTier !== null || isTester
    ? resolveEffectiveTier({
        subscriptionTier: rawTier,
        isTester,
      })
    : null;
  
  // Derive access flags from effectiveTier using shared utilities
  const canAccessBusinessFeatures = effectiveTier !== null && tierIncludesBusiness(effectiveTier);
  const hasProAccess = effectiveTier !== null && tierIncludesPro(effectiveTier);
  
  return {
    isPro: isPro || hasProAccess, // Business tier includes Pro features
    canAccessBusinessFeatures,
    isAdminUser: isAdmin === true, // Admin status is separate from plan tier
    isLoading,
    isAuthenticated: !!subscription,
    tier: effectiveTier,
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

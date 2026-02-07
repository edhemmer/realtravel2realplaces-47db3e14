/**
 * useAccess - Centralized UI access control hook
 * 
 * Patch 2.6.19: Decouple Admin Role from Plan Tier
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
  tier: 'free' | 'pro' | 'business' | null;
}

export function useAccess(): AccessState {
  const { user } = useAuth();
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const isPro = useIsPro();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  const isLoading = subscriptionLoading || adminLoading;
  const rawTier = subscription?.tier || null;
  
  // Patch 2.6.8: Business tester override check
  // Testers listed in src/config/businessTesters.ts get Business access
  const isTester = isBusinessTester(user?.email);
  
  // Patch 2.6.19: Business access is granted via:
  // 1. Tester override (from businessTesters.ts config)
  // 2. Database subscription_tier = 'business' (admin-assigned override)
  // NOTE: Admin role is EXCLUDED - admins experience their actual plan tier
  // This allows admins to test Free/Pro/Business behavior by changing their plan
  const hasBusinessTier = rawTier === 'business';
  const canAccessBusinessFeatures = isTester || hasBusinessTier;
  
  // Patch 2.6.19: Compute effective tier for UI display
  // Only tester override forces Business tier - admin role does NOT
  // This allows admins to experience Free/Pro behavior by changing their plan
  let effectiveTier: 'free' | 'pro' | 'business' | null = rawTier as 'free' | 'pro' | 'business' | null;
  if (isTester) {
    effectiveTier = 'business';
  }
  
  return {
    isPro: isPro || canAccessBusinessFeatures, // Business tier includes Pro features
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
  tier: 'free' | 'pro' | 'business' | null,
  requiredTier: 'free' | 'pro' | 'business'
): boolean {
  if (!tier) return false;
  
  const tierHierarchy = { free: 0, pro: 1, business: 2 };
  return tierHierarchy[tier] >= tierHierarchy[requiredTier];
}

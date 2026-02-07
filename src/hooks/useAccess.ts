/**
 * useAccess - Centralized UI access control hook
 * 
 * Patch 2.6.8: Tester Business Overrides
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
 * BUSINESS ACCESS GRANTS:
 * 1. Admin role (from user_roles table) - for support/development
 * 2. Business tester override (from businessTesters.ts) - for trusted testers
 * 3. Future: Active Business subscription via Stripe (not yet implemented)
 * 
 * TESTER OVERRIDE (Patch 2.6.8):
 * - Trusted testers listed in src/config/businessTesters.ts get Business access
 * - This is a UI-level override and does NOT modify subscription records
 * - Completely separate from future Stripe billing integration
 * 
 * COMPONENT USAGE:
 * - <ProOnly>: Wraps Pro-tier features (currently unenforced in UI)
 * - <BusinessOnly>: Wraps Business-tier features (enforced via canAccessBusinessFeatures)
 * - <AdminOnly>: Wraps admin-only features (always enforced)
 * - <FeatureGate>: Custom access logic with accessCheck function
 * 
 * @example
 * const { canAccessBusinessFeatures, isAdminUser, isPro } = useAccess();
 * 
 * if (canAccessBusinessFeatures) {
 *   // Render Business-only UI
 * }
 */

import { useSubscription, useIsPro } from '@/hooks/useSubscription';
import { useIsAdmin } from '@/hooks/useAdminUsers';
import { useAuth } from '@/contexts/AuthContext';
import { isBusinessTester } from '@/config/businessTesters';

export interface AccessState {
  /** Whether the user's plan includes Pro features */
  isPro: boolean;
  
  /** Whether the user has Business-tier access (future tier) */
  canAccessBusinessFeatures: boolean;
  
  /** Whether the user is an admin (owner/developer) */
  isAdminUser: boolean;
  
  /** Whether access state is still loading */
  isLoading: boolean;
  
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  
  /** The user's subscription tier */
  tier: 'free' | 'pro' | 'business' | null;
}

export function useAccess(): AccessState {
  const { user } = useAuth();
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const isPro = useIsPro();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  const isLoading = subscriptionLoading || adminLoading;
  const tier = subscription?.tier || null;
  
  // Patch 2.6.8: Business tester override check
  // Testers listed in src/config/businessTesters.ts get Business access
  const isTester = isBusinessTester(user?.email);
  
  // Patch 2.6.8: Business access is granted via:
  // 1. Admin role (from user_roles table)
  // 2. Tester override (from businessTesters.ts config)
  // 3. Future: Active Business subscription (not yet implemented)
  const canAccessBusinessFeatures = isAdmin === true || isTester;
  
  return {
    isPro,
    canAccessBusinessFeatures,
    isAdminUser: isAdmin === true,
    isLoading,
    isAuthenticated: !!subscription,
    tier: tier as 'free' | 'pro' | 'business' | null,
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

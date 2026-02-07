/**
 * useAccess - Centralized UI access control hook
 * 
 * Patch 2.6.2: Commercial Code Integrity Documentation
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
 * ADMIN OVERRIDE:
 * - isAdmin (from user_roles table) grants Business access for testing/support
 * - Admin status is validated via security-definer functions (has_role, is_admin)
 * - Admin check uses database role lookup, NOT localStorage/client state
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
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const isPro = useIsPro();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  const isLoading = subscriptionLoading || adminLoading;
  const tier = subscription?.tier || null;
  
  // Patch 2.3.9: Business tier gating enforcement enabled.
  // Business access is granted to admins (owner/developer).
  // This will be updated when the Business tier is added to the database.
  const canAccessBusinessFeatures = isAdmin === true;
  
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

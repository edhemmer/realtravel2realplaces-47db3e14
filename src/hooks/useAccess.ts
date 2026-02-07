/**
 * useAccess - Centralized UI access control hook
 * 
 * Provides consistent access-checking helpers for plan-based and role-based
 * UI gating. This hook wraps existing subscription and admin checks into
 * a unified interface for conditional rendering.
 * 
 * IMPORTANT: This hook is part of the UI gating framework (Patch 2.2.2).
 * Enforcement will be enabled in a future patch. For now, these helpers
 * return access states but do not block any functionality.
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
  
  // Business tier is not yet implemented in the database.
  // For now, Business access is granted to admins (owner/developer).
  // This will be updated when the Business tier is added.
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

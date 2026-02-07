/**
 * Plan Tier Resolution Utility
 * 
 * Patch 2.6.23: Single Source of Truth for Effective Plan Tier
 * 
 * PURPOSE:
 * This module provides a centralized function to compute the user's effective
 * plan tier. All code paths that need to determine the current user's plan
 * (header PlanPill, Admin Plan Management, feature gates) MUST use this resolver.
 * 
 * RESOLUTION:
 * The effective tier is determined solely by the database subscription_tier.
 * No tester overrides or preview flags affect the resolved tier.
 * 
 * NOTE: Admin role does NOT affect plan tier (Patch 2.6.19).
 * Admin status only controls access to /admin pages and AdminOnly components.
 */

export type PlanTier = 'free' | 'pro' | 'business';

export interface PlanContext {
  /** The user's subscription tier from the database (profiles.subscription_tier) */
  subscriptionTier?: PlanTier | null;
}

/**
 * Resolves the effective plan tier for a user.
 * 
 * This is the SINGLE SOURCE OF TRUTH for determining what plan tier
 * a user should experience in the UI.
 * 
 * Patch 2.6.23: Subscription tier is the ONLY driver of effective tier.
 * Tester overrides have been removed to allow admins to truly experience
 * each plan by changing their subscription_tier in the database.
 * 
 * @param ctx - The context containing subscription information
 * @returns The effective plan tier ('free', 'pro', or 'business')
 * 
 * @example
 * const tier = resolveEffectiveTier({
 *   subscriptionTier: 'pro',
 * });
 * // Returns 'pro'
 */
export function resolveEffectiveTier(ctx: PlanContext): PlanTier {
  // Patch 2.6.23: Only database subscription tier determines effective tier
  if (ctx.subscriptionTier) {
    return ctx.subscriptionTier;
  }
  
  // Default fallback
  return 'free';
}

/**
 * Checks if the effective tier includes Pro-level access.
 * Pro and Business tiers both include Pro features.
 */
export function tierIncludesPro(tier: PlanTier): boolean {
  return tier === 'pro' || tier === 'business';
}

/**
 * Checks if the effective tier includes Business-level access.
 */
export function tierIncludesBusiness(tier: PlanTier): boolean {
  return tier === 'business';
}

/**
 * Tier hierarchy for comparison operations.
 */
export const TIER_HIERARCHY: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  business: 2,
};

/**
 * Compare two tiers and determine if the first has equal or higher access.
 */
export function tierMeetsRequirement(
  userTier: PlanTier | null,
  requiredTier: PlanTier
): boolean {
  if (!userTier) return false;
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
}

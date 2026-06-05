/**
 * Plan Tier Resolution Utility
 * 
 * Patch 2.6.24: Simple Plan Model (Single Source of Truth)
 * 
 * PURPOSE:
 * This module provides utilities for working with plan tiers.
 * The subscription_tier field in profiles is the ONLY source of truth.
 * 
 * ALLOWED VALUES:
 * - 'free': 2 lifetime trips, basic features
 * - 'pro': Unlimited trips, advanced features
 * - 'business': Pro features + Tour/Stops, advanced reports
 * 
 * NO OVERRIDES:
 * - No tester flags
 * - No owner email checks
 * - No admin elevation
 * - What's in the DB is what the user experiences
 */

export type PlanTier = 'free' | 'pro' | 'business';

export interface PlanContext {
  /** The user's subscription tier from the database (profiles.subscription_tier) */
  subscriptionTier?: PlanTier | null;
}

/**
 * Resolves the plan tier, providing a default if none is set.
 * 
 * This is a simple utility that ensures we always have a valid tier.
 * It does NOT apply any overrides - subscription_tier is the only input.
 * 
 * @param ctx - The context containing subscription information
 * @returns The plan tier ('free', 'pro', or 'business')
 * 
 * @example
 * const tier = resolveEffectiveTier({ subscriptionTier: 'pro' });
 * // Returns 'pro'
 * 
 * const tierDefault = resolveEffectiveTier({});
 * // Returns 'free' (default)
 */
export function resolveEffectiveTier(ctx: PlanContext): PlanTier {
  // Patch 2.6.24: Simply return the subscription tier or default to 'free'
  return ctx.subscriptionTier || 'free';
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

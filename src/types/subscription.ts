// v2.6.12: Added 'business' tier for admin override (non-billed)

export type SubscriptionTier = 'free' | 'pro' | 'business';

export interface SubscriptionLimits {
  maxTripsLifetime: number; // -1 means unlimited
}

export const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxTripsLifetime: 2,
  },
  pro: {
    maxTripsLifetime: -1, // unlimited
  },
  business: {
    maxTripsLifetime: -1, // unlimited
  },
};

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  limits: SubscriptionLimits;
}

// Trust guardrails: These rules are immutable product principles
export const PRODUCT_GUARDRAILS = {
  // Never delete user data without explicit confirmation
  requireExplicitDeleteConfirmation: true,
  // Always show data source (manual vs parsed)
  showDataProvenance: true,
  // Never auto-submit or auto-confirm on behalf of user
  noSilentActions: true,
  // Free tier trips are preserved indefinitely (no forced deletion)
  freeTierDataRetention: 'indefinite' as const,
  // Pro tier includes all Free features (no feature removal on downgrade history)
  proIncludesAllFreeFeatures: true,
  // Lifetime trip count never decrements (even if trips are deleted)
  lifetimeTripCountNeverDecrements: true,
} as const;

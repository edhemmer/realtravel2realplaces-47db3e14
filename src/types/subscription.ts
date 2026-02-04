// v2.0.0: Subscription tier types and limits

export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionLimits {
  maxActiveTrips: number; // -1 means unlimited
  maxAiGenerationsPerMonth: number; // -1 means unlimited
}

export const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxActiveTrips: 3,
    maxAiGenerationsPerMonth: 5,
  },
  pro: {
    maxActiveTrips: -1, // unlimited
    maxAiGenerationsPerMonth: -1, // unlimited
  },
};

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  limits: SubscriptionLimits;
  usage: {
    activeTrips: number;
    aiGenerationsThisMonth: number;
  };
  canCreateTrip: boolean;
  canUseAi: boolean;
  subscriptionStartedAt: string | null;
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
} as const;

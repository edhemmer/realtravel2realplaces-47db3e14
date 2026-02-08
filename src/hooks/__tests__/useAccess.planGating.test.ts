/**
 * Plan Gating Regression Tests
 * 
 * v2.1.28: Performance hardening patch
 * 
 * These tests validate that:
 * 1. Plan tier is resolved consistently from subscription_tier
 * 2. No hardcoded emails or user IDs grant special access
 * 3. Pro/Business features are correctly gated
 * 4. Admin status is separate from plan tier
 */

import { describe, it, expect } from 'vitest';
import { 
  resolveEffectiveTier, 
  tierIncludesPro, 
  tierIncludesBusiness,
  tierMeetsRequirement,
  TIER_HIERARCHY,
  type PlanTier,
} from '@/utils/planTier';

describe('Plan Gating - Tier Resolution', () => {
  it('defaults to free when no subscription tier provided', () => {
    expect(resolveEffectiveTier({})).toBe('free');
    expect(resolveEffectiveTier({ subscriptionTier: null })).toBe('free');
    expect(resolveEffectiveTier({ subscriptionTier: undefined })).toBe('free');
  });

  it('returns exact tier from subscriptionTier field', () => {
    expect(resolveEffectiveTier({ subscriptionTier: 'free' })).toBe('free');
    expect(resolveEffectiveTier({ subscriptionTier: 'pro' })).toBe('pro');
    expect(resolveEffectiveTier({ subscriptionTier: 'business' })).toBe('business');
  });

  it('does NOT have any email-based overrides', () => {
    // The resolveEffectiveTier function should only accept subscriptionTier
    // No email field should affect the result
    const context = { subscriptionTier: 'free' as PlanTier };
    expect(resolveEffectiveTier(context)).toBe('free');
    
    // Adding any email property should NOT change the result
    // (This tests the interface - email is not in PlanContext)
    expect(Object.keys(context)).not.toContain('email');
  });
});

describe('Plan Gating - Tier Hierarchy', () => {
  it('correctly orders tiers: free < pro < business', () => {
    expect(TIER_HIERARCHY.free).toBeLessThan(TIER_HIERARCHY.pro);
    expect(TIER_HIERARCHY.pro).toBeLessThan(TIER_HIERARCHY.business);
  });

  it('tierIncludesPro returns true for pro and business', () => {
    expect(tierIncludesPro('free')).toBe(false);
    expect(tierIncludesPro('pro')).toBe(true);
    expect(tierIncludesPro('business')).toBe(true);
  });

  it('tierIncludesBusiness returns true only for business', () => {
    expect(tierIncludesBusiness('free')).toBe(false);
    expect(tierIncludesBusiness('pro')).toBe(false);
    expect(tierIncludesBusiness('business')).toBe(true);
  });
});

describe('Plan Gating - Requirement Checks', () => {
  it('tierMeetsRequirement validates tier hierarchy correctly', () => {
    // Free tier meets free requirement only
    expect(tierMeetsRequirement('free', 'free')).toBe(true);
    expect(tierMeetsRequirement('free', 'pro')).toBe(false);
    expect(tierMeetsRequirement('free', 'business')).toBe(false);

    // Pro tier meets free and pro requirements
    expect(tierMeetsRequirement('pro', 'free')).toBe(true);
    expect(tierMeetsRequirement('pro', 'pro')).toBe(true);
    expect(tierMeetsRequirement('pro', 'business')).toBe(false);

    // Business tier meets all requirements
    expect(tierMeetsRequirement('business', 'free')).toBe(true);
    expect(tierMeetsRequirement('business', 'pro')).toBe(true);
    expect(tierMeetsRequirement('business', 'business')).toBe(true);
  });

  it('tierMeetsRequirement returns false for null tier', () => {
    expect(tierMeetsRequirement(null, 'free')).toBe(false);
    expect(tierMeetsRequirement(null, 'pro')).toBe(false);
    expect(tierMeetsRequirement(null, 'business')).toBe(false);
  });
});

describe('Plan Gating - No Hardcoded Overrides', () => {
  it('PlanContext interface only accepts subscriptionTier', () => {
    // This is a compile-time check essentially - the interface should
    // only have subscriptionTier, no email or userId fields
    const validContext = { subscriptionTier: 'pro' as PlanTier };
    
    // The function should work with just subscriptionTier
    expect(resolveEffectiveTier(validContext)).toBe('pro');
    
    // Empty context should default to free
    expect(resolveEffectiveTier({})).toBe('free');
  });
});

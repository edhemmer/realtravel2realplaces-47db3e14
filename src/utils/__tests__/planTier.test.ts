/**
 * Plan Tier Resolution Tests
 * 
 * Patch 2.6.21: Single Source of Truth for Effective Plan Tier
 * 
 * These tests validate the resolveEffectiveTier function which is
 * the single source of truth for computing effective plan tiers.
 */

import { describe, it, expect } from 'vitest';
import { 
  resolveEffectiveTier, 
  tierIncludesPro, 
  tierIncludesBusiness,
  tierMeetsRequirement,
  TIER_HIERARCHY,
  type PlanTier,
  type PlanContext
} from '../planTier';

describe('resolveEffectiveTier', () => {
  describe('Priority order', () => {
    it('should return "free" when no tier and no overrides', () => {
      const result = resolveEffectiveTier({});
      expect(result).toBe('free');
    });

    it('should return "free" when subscriptionTier is null and no overrides', () => {
      const result = resolveEffectiveTier({ subscriptionTier: null });
      expect(result).toBe('free');
    });

    it('should return subscriptionTier when set and no overrides', () => {
      expect(resolveEffectiveTier({ subscriptionTier: 'free' })).toBe('free');
      expect(resolveEffectiveTier({ subscriptionTier: 'pro' })).toBe('pro');
      expect(resolveEffectiveTier({ subscriptionTier: 'business' })).toBe('business');
    });

    it('should return "business" when isTester is true (tester override)', () => {
      const result = resolveEffectiveTier({ 
        subscriptionTier: 'free', 
        isTester: true 
      });
      expect(result).toBe('business');
    });

    it('should prioritize tester override over subscription tier', () => {
      // Free subscription + tester = Business
      expect(resolveEffectiveTier({ 
        subscriptionTier: 'free', 
        isTester: true 
      })).toBe('business');

      // Pro subscription + tester = Business
      expect(resolveEffectiveTier({ 
        subscriptionTier: 'pro', 
        isTester: true 
      })).toBe('business');
    });
  });

  describe('Guard tests for Admin Plan Management parity', () => {
    // These tests simulate the same PlanContext that Admin Plan Management
    // would use, ensuring header PlanPill and Admin table always agree

    it('should show Free for user with free subscription and no overrides', () => {
      const context: PlanContext = {
        subscriptionTier: 'free',
        isTester: false,
      };
      expect(resolveEffectiveTier(context)).toBe('free');
    });

    it('should show Business for user with free subscription but tester override', () => {
      const context: PlanContext = {
        subscriptionTier: 'free',
        isTester: true,
      };
      expect(resolveEffectiveTier(context)).toBe('business');
    });

    it('should show Pro for user with pro subscription and no overrides', () => {
      const context: PlanContext = {
        subscriptionTier: 'pro',
        isTester: false,
      };
      expect(resolveEffectiveTier(context)).toBe('pro');
    });

    it('should show Business for user with business subscription', () => {
      const context: PlanContext = {
        subscriptionTier: 'business',
        isTester: false,
      };
      expect(resolveEffectiveTier(context)).toBe('business');
    });
  });
});

describe('tierIncludesPro', () => {
  it('should return false for free tier', () => {
    expect(tierIncludesPro('free')).toBe(false);
  });

  it('should return true for pro tier', () => {
    expect(tierIncludesPro('pro')).toBe(true);
  });

  it('should return true for business tier', () => {
    expect(tierIncludesPro('business')).toBe(true);
  });
});

describe('tierIncludesBusiness', () => {
  it('should return false for free tier', () => {
    expect(tierIncludesBusiness('free')).toBe(false);
  });

  it('should return false for pro tier', () => {
    expect(tierIncludesBusiness('pro')).toBe(false);
  });

  it('should return true for business tier', () => {
    expect(tierIncludesBusiness('business')).toBe(true);
  });
});

describe('tierMeetsRequirement', () => {
  it('should return false for null tier', () => {
    expect(tierMeetsRequirement(null, 'free')).toBe(false);
    expect(tierMeetsRequirement(null, 'pro')).toBe(false);
    expect(tierMeetsRequirement(null, 'business')).toBe(false);
  });

  it('should allow free tier to access free features only', () => {
    expect(tierMeetsRequirement('free', 'free')).toBe(true);
    expect(tierMeetsRequirement('free', 'pro')).toBe(false);
    expect(tierMeetsRequirement('free', 'business')).toBe(false);
  });

  it('should allow pro tier to access free and pro features', () => {
    expect(tierMeetsRequirement('pro', 'free')).toBe(true);
    expect(tierMeetsRequirement('pro', 'pro')).toBe(true);
    expect(tierMeetsRequirement('pro', 'business')).toBe(false);
  });

  it('should allow business tier to access all features', () => {
    expect(tierMeetsRequirement('business', 'free')).toBe(true);
    expect(tierMeetsRequirement('business', 'pro')).toBe(true);
    expect(tierMeetsRequirement('business', 'business')).toBe(true);
  });
});

describe('TIER_HIERARCHY', () => {
  it('should have correct ordering', () => {
    expect(TIER_HIERARCHY.free).toBeLessThan(TIER_HIERARCHY.pro);
    expect(TIER_HIERARCHY.pro).toBeLessThan(TIER_HIERARCHY.business);
  });
});

/**
 * Plan Tier Resolution Tests
 * 
 * Patch 2.6.24: Simple Plan Model (Single Source of Truth)
 * 
 * These tests validate the plan tier utilities.
 * subscription_tier is the ONLY input - no overrides.
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
  describe('Basic tier resolution', () => {
    it('should return "free" when no tier provided', () => {
      const result = resolveEffectiveTier({});
      expect(result).toBe('free');
    });

    it('should return "free" when subscriptionTier is null', () => {
      const result = resolveEffectiveTier({ subscriptionTier: null });
      expect(result).toBe('free');
    });

    it('should return "free" when subscriptionTier is undefined', () => {
      const result = resolveEffectiveTier({ subscriptionTier: undefined });
      expect(result).toBe('free');
    });

    it('should return subscriptionTier when set to "free"', () => {
      expect(resolveEffectiveTier({ subscriptionTier: 'free' })).toBe('free');
    });

    it('should return subscriptionTier when set to "pro"', () => {
      expect(resolveEffectiveTier({ subscriptionTier: 'pro' })).toBe('pro');
    });

    it('should return subscriptionTier when set to "business"', () => {
      expect(resolveEffectiveTier({ subscriptionTier: 'business' })).toBe('business');
    });
  });

  describe('Tier transitions (Admin Plan Management parity)', () => {
    // These tests ensure all tier transitions work correctly
    // and that the same tier shows in Admin table, header, and gates
    
    it('Free → Pro transition', () => {
      // User starts at Free
      expect(resolveEffectiveTier({ subscriptionTier: 'free' })).toBe('free');
      // Admin changes to Pro
      expect(resolveEffectiveTier({ subscriptionTier: 'pro' })).toBe('pro');
    });

    it('Pro → Free transition', () => {
      expect(resolveEffectiveTier({ subscriptionTier: 'pro' })).toBe('pro');
      expect(resolveEffectiveTier({ subscriptionTier: 'free' })).toBe('free');
    });

    it('Pro → Business transition', () => {
      expect(resolveEffectiveTier({ subscriptionTier: 'pro' })).toBe('pro');
      expect(resolveEffectiveTier({ subscriptionTier: 'business' })).toBe('business');
    });

    it('Business → Pro transition', () => {
      expect(resolveEffectiveTier({ subscriptionTier: 'business' })).toBe('business');
      expect(resolveEffectiveTier({ subscriptionTier: 'pro' })).toBe('pro');
    });

    it('Free → Business transition', () => {
      expect(resolveEffectiveTier({ subscriptionTier: 'free' })).toBe('free');
      expect(resolveEffectiveTier({ subscriptionTier: 'business' })).toBe('business');
    });

    it('Business → Free transition', () => {
      expect(resolveEffectiveTier({ subscriptionTier: 'business' })).toBe('business');
      expect(resolveEffectiveTier({ subscriptionTier: 'free' })).toBe('free');
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

  it('should return true for business tier (Business includes Pro)', () => {
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
  it('should have correct ordering (free < pro < business)', () => {
    expect(TIER_HIERARCHY.free).toBeLessThan(TIER_HIERARCHY.pro);
    expect(TIER_HIERARCHY.pro).toBeLessThan(TIER_HIERARCHY.business);
  });

  it('should have free at level 0', () => {
    expect(TIER_HIERARCHY.free).toBe(0);
  });

  it('should have pro at level 1', () => {
    expect(TIER_HIERARCHY.pro).toBe(1);
  });

  it('should have business at level 2', () => {
    expect(TIER_HIERARCHY.business).toBe(2);
  });
});

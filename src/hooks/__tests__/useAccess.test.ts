/**
 * useAccess Hook Unit Tests
 * 
 * Patch 2.6.24: Simple Plan Model (Single Source of Truth)
 * 
 * This test suite validates that the access control logic correctly computes
 * tier and access flags based solely on subscription tier from the database.
 * 
 * NO OVERRIDES:
 * - No tester flags
 * - No owner email checks  
 * - No admin elevation
 * - subscription_tier is the ONLY driver
 * 
 * KEY BEHAVIOR:
 * - Admin role controls admin UI only (isAdminUser flag)
 * - Plan-based features depend on tier, NOT admin status
 * - All UI components (PlanPill, Admin table, gates) show the same tier
 * 
 * TEST MATRIX:
 * - Free user
 * - Pro user
 * - Business user
 * - Admin user with Free plan (should see Free behavior + admin UI)
 * - Admin user with Pro plan (should see Pro behavior + admin UI)
 * - Admin user with Business plan (should see Business behavior + admin UI)
 * - Tier transitions: Free↔Pro, Pro↔Business, Free↔Business
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock modules before importing the hook
// Patch 2.6.27: useAccess no longer uses useIsPro internally - it derives isPro from subscription tier
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: vi.fn(),
}));

vi.mock('@/hooks/useAdminUsers', () => ({
  useIsAdmin: vi.fn(),
}));

import { useAccess, canAccessFeature } from '../useAccess';
import { useSubscription } from '@/hooks/useSubscription';
import { useIsAdmin } from '@/hooks/useAdminUsers';

// Create a wrapper for React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Free user', () => {
    beforeEach(() => {
      vi.mocked(useSubscription).mockReturnValue({
        data: { tier: 'free', limits: { maxTripsLifetime: 2 } },
        isLoading: false,
      } as ReturnType<typeof useSubscription>);
      vi.mocked(useIsAdmin).mockReturnValue({
        data: false,
        isLoading: false,
      } as ReturnType<typeof useIsAdmin>);
    });

    it('should have tier = "free"', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.tier).toBe('free');
    });

    it('should have isPro = false', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.isPro).toBe(false);
    });

    it('should have canAccessBusinessFeatures = false', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.canAccessBusinessFeatures).toBe(false);
    });

    it('should have isAdminUser = false', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.isAdminUser).toBe(false);
    });

    it('should be authenticated', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Pro user', () => {
    beforeEach(() => {
      vi.mocked(useSubscription).mockReturnValue({
        data: { tier: 'pro', limits: { maxTripsLifetime: -1 } },
        isLoading: false,
      } as ReturnType<typeof useSubscription>);
      vi.mocked(useIsAdmin).mockReturnValue({
        data: false,
        isLoading: false,
      } as ReturnType<typeof useIsAdmin>);
    });

    it('should have tier = "pro"', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.tier).toBe('pro');
    });

    it('should have isPro = true', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.isPro).toBe(true);
    });

    it('should have canAccessBusinessFeatures = false', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.canAccessBusinessFeatures).toBe(false);
    });

    it('should have isAdminUser = false', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.isAdminUser).toBe(false);
    });
  });

  describe('Business user', () => {
    beforeEach(() => {
      vi.mocked(useSubscription).mockReturnValue({
        data: { tier: 'business', limits: { maxTripsLifetime: -1 } },
        isLoading: false,
      } as ReturnType<typeof useSubscription>);
      vi.mocked(useIsAdmin).mockReturnValue({
        data: false,
        isLoading: false,
      } as ReturnType<typeof useIsAdmin>);
    });

    it('should have tier = "business"', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.tier).toBe('business');
    });

    it('should have isPro = true (Business includes Pro)', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.isPro).toBe(true);
    });

    it('should have canAccessBusinessFeatures = true', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.canAccessBusinessFeatures).toBe(true);
    });

    it('should have isAdminUser = false', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.isAdminUser).toBe(false);
    });
  });

  // Admin with Free plan - should experience Free behavior
  describe('Admin user with Free plan (decoupled)', () => {
    beforeEach(() => {
      vi.mocked(useSubscription).mockReturnValue({
        data: { tier: 'free', limits: { maxTripsLifetime: 2 } },
        isLoading: false,
      } as ReturnType<typeof useSubscription>);
      vi.mocked(useIsAdmin).mockReturnValue({
        data: true, // Admin role active
        isLoading: false,
      } as ReturnType<typeof useIsAdmin>);
    });

    it('should have tier = "free" (admin does NOT elevate tier)', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.tier).toBe('free');
    });

    it('should have isPro = false (admin does NOT grant Pro)', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.isPro).toBe(false);
    });

    it('should have canAccessBusinessFeatures = false (admin does NOT grant Business)', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.canAccessBusinessFeatures).toBe(false);
    });

    it('should have isAdminUser = true (admin can access admin UI)', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.isAdminUser).toBe(true);
    });
  });

  // Admin with Pro plan
  describe('Admin user with Pro plan (decoupled)', () => {
    beforeEach(() => {
      vi.mocked(useSubscription).mockReturnValue({
        data: { tier: 'pro', limits: { maxTripsLifetime: -1 } },
        isLoading: false,
      } as ReturnType<typeof useSubscription>);
      vi.mocked(useIsAdmin).mockReturnValue({
        data: true,
        isLoading: false,
      } as ReturnType<typeof useIsAdmin>);
    });

    it('should have tier = "pro" (admin sees actual plan)', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.tier).toBe('pro');
    });

    it('should have isPro = true', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.isPro).toBe(true);
    });

    it('should have canAccessBusinessFeatures = false (Pro does NOT grant Business)', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.canAccessBusinessFeatures).toBe(false);
    });

    it('should have isAdminUser = true', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.isAdminUser).toBe(true);
    });
  });

  // Admin with Business plan
  describe('Admin user with Business plan', () => {
    beforeEach(() => {
      vi.mocked(useSubscription).mockReturnValue({
        data: { tier: 'business', limits: { maxTripsLifetime: -1 } },
        isLoading: false,
      } as ReturnType<typeof useSubscription>);
      vi.mocked(useIsAdmin).mockReturnValue({
        data: true,
        isLoading: false,
      } as ReturnType<typeof useIsAdmin>);
    });

    it('should have tier = "business"', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.tier).toBe('business');
    });

    it('should have canAccessBusinessFeatures = true (via Business tier, not admin)', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.canAccessBusinessFeatures).toBe(true);
    });

    it('should have isAdminUser = true', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.isAdminUser).toBe(true);
    });
  });

  describe('Loading states', () => {
    beforeEach(() => {
      vi.mocked(useSubscription).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof useSubscription>);
      vi.mocked(useIsAdmin).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof useIsAdmin>);
    });

    it('should have isLoading = true when subscription is loading', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(true);
    });

    it('should have tier = null when loading', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.tier).toBe(null);
    });
  });

  describe('Unauthenticated state', () => {
    beforeEach(() => {
      vi.mocked(useSubscription).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as ReturnType<typeof useSubscription>);
      vi.mocked(useIsAdmin).mockReturnValue({
        data: false,
        isLoading: false,
      } as ReturnType<typeof useIsAdmin>);
    });

    it('should have isAuthenticated = false', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should have tier = null', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.tier).toBe(null);
    });

    it('should have all access flags = false', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.isPro).toBe(false);
      expect(result.current.canAccessBusinessFeatures).toBe(false);
      expect(result.current.isAdminUser).toBe(false);
    });
  });
});

describe('canAccessFeature', () => {
  describe('Tier hierarchy', () => {
    it('should return false for null tier', () => {
      expect(canAccessFeature(null, 'free')).toBe(false);
      expect(canAccessFeature(null, 'pro')).toBe(false);
      expect(canAccessFeature(null, 'business')).toBe(false);
    });

    it('should allow Free tier to access Free features', () => {
      expect(canAccessFeature('free', 'free')).toBe(true);
    });

    it('should NOT allow Free tier to access Pro features', () => {
      expect(canAccessFeature('free', 'pro')).toBe(false);
    });

    it('should NOT allow Free tier to access Business features', () => {
      expect(canAccessFeature('free', 'business')).toBe(false);
    });

    it('should allow Pro tier to access Free and Pro features', () => {
      expect(canAccessFeature('pro', 'free')).toBe(true);
      expect(canAccessFeature('pro', 'pro')).toBe(true);
    });

    it('should NOT allow Pro tier to access Business features', () => {
      expect(canAccessFeature('pro', 'business')).toBe(false);
    });

    it('should allow Business tier to access all features', () => {
      expect(canAccessFeature('business', 'free')).toBe(true);
      expect(canAccessFeature('business', 'pro')).toBe(true);
      expect(canAccessFeature('business', 'business')).toBe(true);
    });
  });
});

/**
 * TIER TRANSITION TESTS
 * 
 * Verify that tier changes work correctly across Free↔Pro↔Business.
 * These simulate what happens when Admin → Plan Management changes a tier.
 */
describe('Tier Transition Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Patch 2.6.27: Simplified mock - no more useIsPro
  const mockTier = (tier: 'free' | 'pro' | 'business') => {
    vi.mocked(useSubscription).mockReturnValue({
      data: { tier, limits: { maxTripsLifetime: tier === 'free' ? 2 : -1 } },
      isLoading: false,
    } as ReturnType<typeof useSubscription>);
    vi.mocked(useIsAdmin).mockReturnValue({
      data: true, // Admin performing the test
      isLoading: false,
    } as ReturnType<typeof useIsAdmin>);
  };

  describe('Free → Pro transition', () => {
    it('should transition tier from free to pro', () => {
      mockTier('free');
      const { result: freeTier } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(freeTier.current.tier).toBe('free');
      expect(freeTier.current.isPro).toBe(false);

      mockTier('pro');
      const { result: proTier } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(proTier.current.tier).toBe('pro');
      expect(proTier.current.isPro).toBe(true);
    });
  });

  describe('Pro → Free transition', () => {
    it('should transition tier from pro to free', () => {
      mockTier('pro');
      const { result: proTier } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(proTier.current.tier).toBe('pro');

      mockTier('free');
      const { result: freeTier } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(freeTier.current.tier).toBe('free');
    });
  });

  describe('Pro → Business transition', () => {
    it('should transition tier from pro to business', () => {
      mockTier('pro');
      const { result: proTier } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(proTier.current.tier).toBe('pro');
      expect(proTier.current.canAccessBusinessFeatures).toBe(false);

      mockTier('business');
      const { result: bizTier } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(bizTier.current.tier).toBe('business');
      expect(bizTier.current.canAccessBusinessFeatures).toBe(true);
    });
  });

  describe('Business → Pro transition', () => {
    it('should transition tier from business to pro', () => {
      mockTier('business');
      const { result: bizTier } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(bizTier.current.tier).toBe('business');
      expect(bizTier.current.canAccessBusinessFeatures).toBe(true);

      mockTier('pro');
      const { result: proTier } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(proTier.current.tier).toBe('pro');
      expect(proTier.current.canAccessBusinessFeatures).toBe(false);
    });
  });

  describe('Free → Business transition', () => {
    it('should transition tier from free to business', () => {
      mockTier('free');
      const { result: freeTier } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(freeTier.current.tier).toBe('free');
      expect(freeTier.current.isPro).toBe(false);
      expect(freeTier.current.canAccessBusinessFeatures).toBe(false);

      mockTier('business');
      const { result: bizTier } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(bizTier.current.tier).toBe('business');
      expect(bizTier.current.isPro).toBe(true);
      expect(bizTier.current.canAccessBusinessFeatures).toBe(true);
    });
  });

  describe('Business → Free transition', () => {
    it('should transition tier from business to free', () => {
      mockTier('business');
      const { result: bizTier } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(bizTier.current.tier).toBe('business');

      mockTier('free');
      const { result: freeTier } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(freeTier.current.tier).toBe('free');
      expect(freeTier.current.isPro).toBe(false);
      expect(freeTier.current.canAccessBusinessFeatures).toBe(false);
    });
  });
});

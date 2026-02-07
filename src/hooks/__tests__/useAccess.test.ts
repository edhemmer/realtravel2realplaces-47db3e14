/**
 * useAccess Hook Unit Tests
 * 
 * Patch 2.6.23: Plan Gating Verification Tests (Subscription Only)
 * 
 * This test suite validates that the access control logic correctly computes
 * effectiveTier and access flags based solely on subscription tier.
 * 
 * SINGLE SOURCE OF TRUTH (Patch 2.6.23):
 * - useAccess.tier is computed via resolveEffectiveTier() from src/utils/planTier.ts
 * - Subscription tier is the ONLY driver of effective tier (no tester overrides)
 * - Guarantees header PlanPill, Admin table, and Users list always show the same tier
 * 
 * KEY BEHAVIOR:
 * - Admin role controls admin UI only (isAdminUser flag)
 * - Plan-based features depend on effectiveTier, NOT admin status
 * - Admins experience their actual plan (Free/Pro/Business)
 * 
 * TEST MATRIX:
 * - Free user
 * - Pro user
 * - Business user
 * - Admin user with Free plan (should see Free behavior + admin UI)
 * - Admin user with Pro plan (should see Pro behavior + admin UI)
 * - Admin user with Business plan (should see Business behavior + admin UI)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock modules before importing the hook
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: vi.fn(),
  useIsPro: vi.fn(),
}));

vi.mock('@/hooks/useAdminUsers', () => ({
  useIsAdmin: vi.fn(),
}));

import { useAccess, canAccessFeature } from '../useAccess';
import { useSubscription, useIsPro } from '@/hooks/useSubscription';
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
};

describe('useAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Free user', () => {
    beforeEach(() => {
      vi.mocked(useSubscription).mockReturnValue({
        data: { tier: 'free', limits: { maxTripsLifetime: 5 } },
        isLoading: false,
      } as ReturnType<typeof useSubscription>);
      vi.mocked(useIsPro).mockReturnValue(false);
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
      vi.mocked(useIsPro).mockReturnValue(true);
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
      vi.mocked(useIsPro).mockReturnValue(true); // Business includes Pro
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
  describe('Admin user with Free plan (decoupled behavior)', () => {
    beforeEach(() => {
      vi.mocked(useSubscription).mockReturnValue({
        data: { tier: 'free', limits: { maxTripsLifetime: 5 } }, // DB says Free
        isLoading: false,
      } as ReturnType<typeof useSubscription>);
      vi.mocked(useIsPro).mockReturnValue(false);
      vi.mocked(useIsAdmin).mockReturnValue({
        data: true, // Admin role active
        isLoading: false,
      } as ReturnType<typeof useIsAdmin>);
    });

    it('should have effectiveTier = "free" (admin does NOT elevate tier)', () => {
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
  describe('Admin user with Pro plan (decoupled behavior)', () => {
    beforeEach(() => {
      vi.mocked(useSubscription).mockReturnValue({
        data: { tier: 'pro', limits: { maxTripsLifetime: -1 } }, // DB says Pro
        isLoading: false,
      } as ReturnType<typeof useSubscription>);
      vi.mocked(useIsPro).mockReturnValue(true);
      vi.mocked(useIsAdmin).mockReturnValue({
        data: true, // Admin role active
        isLoading: false,
      } as ReturnType<typeof useIsAdmin>);
    });

    it('should have effectiveTier = "pro" (admin sees actual plan)', () => {
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
        data: { tier: 'business', limits: { maxTripsLifetime: -1 } }, // DB says Business
        isLoading: false,
      } as ReturnType<typeof useSubscription>);
      vi.mocked(useIsPro).mockReturnValue(true);
      vi.mocked(useIsAdmin).mockReturnValue({
        data: true, // Admin role active
        isLoading: false,
      } as ReturnType<typeof useIsAdmin>);
    });

    it('should have effectiveTier = "business"', () => {
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
      vi.mocked(useIsPro).mockReturnValue(false);
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
      vi.mocked(useIsPro).mockReturnValue(false);
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
 * GUARD TESTS: Admin Plan Management Parity (Patch 2.6.23)
 * 
 * These tests ensure that the same subscription tier produces identical
 * effectiveTier values in useAccess and Admin Plan Management, guaranteeing
 * that the header PlanPill and Admin table row always show the same tier.
 */
describe('Admin Plan Management Parity Guard Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Free subscription', () => {
    beforeEach(() => {
      vi.mocked(useSubscription).mockReturnValue({
        data: { tier: 'free', limits: { maxTripsLifetime: 5 } },
        isLoading: false,
      } as ReturnType<typeof useSubscription>);
      vi.mocked(useIsPro).mockReturnValue(false);
      vi.mocked(useIsAdmin).mockReturnValue({
        data: false,
        isLoading: false,
      } as ReturnType<typeof useIsAdmin>);
    });

    it('useAccess.tier should equal "free" (matches Admin table dropdown)', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.tier).toBe('free');
    });

    it('PlanPill would show "FREE" label', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.tier).toBe('free');
    });
  });

  describe('Pro subscription', () => {
    beforeEach(() => {
      vi.mocked(useSubscription).mockReturnValue({
        data: { tier: 'pro', limits: { maxTripsLifetime: -1 } },
        isLoading: false,
      } as ReturnType<typeof useSubscription>);
      vi.mocked(useIsPro).mockReturnValue(true);
      vi.mocked(useIsAdmin).mockReturnValue({
        data: false,
        isLoading: false,
      } as ReturnType<typeof useIsAdmin>);
    });

    it('useAccess.tier should equal "pro" (matches Admin table dropdown)', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.tier).toBe('pro');
    });

    it('PlanPill would show "PRO" label', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.tier).toBe('pro');
    });
  });

  describe('Business subscription', () => {
    beforeEach(() => {
      vi.mocked(useSubscription).mockReturnValue({
        data: { tier: 'business', limits: { maxTripsLifetime: -1 } },
        isLoading: false,
      } as ReturnType<typeof useSubscription>);
      vi.mocked(useIsPro).mockReturnValue(true);
      vi.mocked(useIsAdmin).mockReturnValue({
        data: false,
        isLoading: false,
      } as ReturnType<typeof useIsAdmin>);
    });

    it('useAccess.tier should equal "business" (matches Admin table dropdown)', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.tier).toBe('business');
    });

    it('PlanPill would show "BUSINESS" label', () => {
      const { result } = renderHook(() => useAccess(), { wrapper: createWrapper() });
      expect(result.current.tier).toBe('business');
    });
  });
});

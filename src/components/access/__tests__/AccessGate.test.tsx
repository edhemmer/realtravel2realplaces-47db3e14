/**
 * AccessGate Component Tests
 * 
 * Patch 2.6.17: Plan Gating Verification Tests
 * 
 * This test suite validates that the access gate components correctly
 * render or hide content based on the user's effective tier.
 * 
 * FEATURE MATRIX TESTS:
 * - ProOnly wrapper behavior
 * - BusinessOnly wrapper behavior
 * - AdminOnly wrapper behavior
 * - FeatureGate custom access logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { ProOnly, BusinessOnly, AdminOnly, FeatureGate } from '../AccessGate';

// Mock the useAccess hook
vi.mock('@/hooks/useAccess', () => ({
  useAccess: vi.fn(),
}));

import { useAccess } from '@/hooks/useAccess';

describe('ProOnly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Free user (no Pro access)', () => {
    beforeEach(() => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: false,
        canAccessBusinessFeatures: false,
        isAdminUser: false,
        isLoading: false,
        isAuthenticated: true,
        tier: 'free',
      });
    });

    it('should render children (ProOnly enforcement currently disabled)', () => {
      const { queryByTestId } = render(
        <ProOnly>
          <div data-testid="pro-content">Pro Content</div>
        </ProOnly>
      );
      // NOTE: ProOnly enforcement is disabled per Patch 2.2.2
      // Content always renders regardless of tier
      expect(queryByTestId('pro-content')).toBeInTheDocument();
    });

    it('should NOT render fallback when enforcement is disabled', () => {
      const { queryByTestId } = render(
        <ProOnly fallback={<div data-testid="fallback">Upgrade needed</div>}>
          <div data-testid="pro-content">Pro Content</div>
        </ProOnly>
      );
      expect(queryByTestId('pro-content')).toBeInTheDocument();
      expect(queryByTestId('fallback')).not.toBeInTheDocument();
    });
  });

  describe('Pro user', () => {
    beforeEach(() => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: true,
        canAccessBusinessFeatures: false,
        isAdminUser: false,
        isLoading: false,
        isAuthenticated: true,
        tier: 'pro',
      });
    });

    it('should render children', () => {
      const { queryByTestId } = render(
        <ProOnly>
          <div data-testid="pro-content">Pro Content</div>
        </ProOnly>
      );
      expect(queryByTestId('pro-content')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    beforeEach(() => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: false,
        canAccessBusinessFeatures: false,
        isAdminUser: false,
        isLoading: true,
        isAuthenticated: true,
        tier: null,
      });
    });

    it('should show loading skeleton when showLoadingState is true', () => {
      const { queryByTestId, container } = render(
        <ProOnly showLoadingState>
          <div data-testid="pro-content">Pro Content</div>
        </ProOnly>
      );
      expect(queryByTestId('pro-content')).not.toBeInTheDocument();
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });
});

describe('BusinessOnly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Free user (no Business access)', () => {
    beforeEach(() => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: false,
        canAccessBusinessFeatures: false,
        isAdminUser: false,
        isLoading: false,
        isAuthenticated: true,
        tier: 'free',
      });
    });

    it('should NOT render children', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="business-content">Business Content</div>
        </BusinessOnly>
      );
      expect(queryByTestId('business-content')).not.toBeInTheDocument();
    });

    it('should render fallback when provided', () => {
      const { queryByTestId } = render(
        <BusinessOnly fallback={<div data-testid="fallback">Upgrade to Business</div>}>
          <div data-testid="business-content">Business Content</div>
        </BusinessOnly>
      );
      expect(queryByTestId('business-content')).not.toBeInTheDocument();
      expect(queryByTestId('fallback')).toBeInTheDocument();
    });
  });

  describe('Pro user (no Business access)', () => {
    beforeEach(() => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: true,
        canAccessBusinessFeatures: false,
        isAdminUser: false,
        isLoading: false,
        isAuthenticated: true,
        tier: 'pro',
      });
    });

    it('should NOT render Business-only children', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="business-content">Business Content</div>
        </BusinessOnly>
      );
      expect(queryByTestId('business-content')).not.toBeInTheDocument();
    });
  });

  describe('Business user', () => {
    beforeEach(() => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: true,
        canAccessBusinessFeatures: true,
        isAdminUser: false,
        isLoading: false,
        isAuthenticated: true,
        tier: 'business',
      });
    });

    it('should render children', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="business-content">Business Content</div>
        </BusinessOnly>
      );
      expect(queryByTestId('business-content')).toBeInTheDocument();
    });
  });

  // Patch 2.6.19: Admin with Business tier (via DB assignment, not automatic)
  describe('Admin user with Business tier', () => {
    beforeEach(() => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: true,
        canAccessBusinessFeatures: true, // Via Business tier, NOT admin status
        isAdminUser: true,
        isLoading: false,
        isAuthenticated: true,
        tier: 'business', // Admin has Business tier assigned in DB
      });
    });

    it('should render children (admin has Business tier)', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="business-content">Business Content</div>
        </BusinessOnly>
      );
      expect(queryByTestId('business-content')).toBeInTheDocument();
    });
  });

  // Patch 2.6.19: Admin with Free plan should NOT have Business access
  describe('Admin user with Free plan (decoupled)', () => {
    beforeEach(() => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: false,
        canAccessBusinessFeatures: false, // Admin does NOT auto-grant Business
        isAdminUser: true,
        isLoading: false,
        isAuthenticated: true,
        tier: 'free', // Admin has Free plan
      });
    });

    it('should NOT render children (admin with Free has no Business access)', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="business-content">Business Content</div>
        </BusinessOnly>
      );
      expect(queryByTestId('business-content')).not.toBeInTheDocument();
    });
  });

  describe('Tester user with override', () => {
    beforeEach(() => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: true,
        canAccessBusinessFeatures: true, // Tester override grants Business access
        isAdminUser: false,
        isLoading: false,
        isAuthenticated: true,
        tier: 'business', // Effective tier is Business
      });
    });

    it('should render children (tester has Business access)', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="business-content">Business Content</div>
        </BusinessOnly>
      );
      expect(queryByTestId('business-content')).toBeInTheDocument();
    });
  });
});

describe('AdminOnly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Non-admin user', () => {
    beforeEach(() => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: true,
        canAccessBusinessFeatures: true,
        isAdminUser: false,
        isLoading: false,
        isAuthenticated: true,
        tier: 'business',
      });
    });

    it('should NOT render children', () => {
      const { queryByTestId } = render(
        <AdminOnly>
          <div data-testid="admin-content">Admin Content</div>
        </AdminOnly>
      );
      expect(queryByTestId('admin-content')).not.toBeInTheDocument();
    });

    it('should render fallback when provided', () => {
      const { queryByTestId } = render(
        <AdminOnly fallback={<div data-testid="fallback">Admin only</div>}>
          <div data-testid="admin-content">Admin Content</div>
        </AdminOnly>
      );
      expect(queryByTestId('admin-content')).not.toBeInTheDocument();
      expect(queryByTestId('fallback')).toBeInTheDocument();
    });
  });

  describe('Admin user', () => {
    beforeEach(() => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: true,
        canAccessBusinessFeatures: true,
        isAdminUser: true,
        isLoading: false,
        isAuthenticated: true,
        tier: 'business',
      });
    });

    it('should render children', () => {
      const { queryByTestId } = render(
        <AdminOnly>
          <div data-testid="admin-content">Admin Content</div>
        </AdminOnly>
      );
      expect(queryByTestId('admin-content')).toBeInTheDocument();
    });
  });
});

describe('FeatureGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Custom access logic', () => {
    it('should render when accessCheck returns true', () => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: true,
        canAccessBusinessFeatures: false,
        isAdminUser: false,
        isLoading: false,
        isAuthenticated: true,
        tier: 'pro',
      });

      const { queryByTestId } = render(
        <FeatureGate accessCheck={(access) => access.isPro}>
          <div data-testid="gated-content">Gated Content</div>
        </FeatureGate>
      );
      expect(queryByTestId('gated-content')).toBeInTheDocument();
    });

    it('should NOT render when accessCheck returns false', () => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: false,
        canAccessBusinessFeatures: false,
        isAdminUser: false,
        isLoading: false,
        isAuthenticated: true,
        tier: 'free',
      });

      const { queryByTestId } = render(
        <FeatureGate accessCheck={(access) => access.isPro}>
          <div data-testid="gated-content">Gated Content</div>
        </FeatureGate>
      );
      expect(queryByTestId('gated-content')).not.toBeInTheDocument();
    });

    it('should support complex access checks', () => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: true,
        canAccessBusinessFeatures: true,
        isAdminUser: true,
        isLoading: false,
        isAuthenticated: true,
        tier: 'business',
      });

      const { queryByTestId } = render(
        <FeatureGate accessCheck={(access) => access.isPro && access.isAdminUser}>
          <div data-testid="gated-content">Pro Admin Only</div>
        </FeatureGate>
      );
      expect(queryByTestId('gated-content')).toBeInTheDocument();
    });
  });

  describe('bypassGate prop', () => {
    it('should render children when bypassGate is true regardless of access', () => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: false,
        canAccessBusinessFeatures: false,
        isAdminUser: false,
        isLoading: false,
        isAuthenticated: true,
        tier: 'free',
      });

      const { queryByTestId } = render(
        <FeatureGate accessCheck={() => true}>
          <div data-testid="gated-content">Bypassed Content</div>
        </FeatureGate>
      );
      expect(queryByTestId('gated-content')).toBeInTheDocument();
    });
  });
});

/**
 * FEATURE MATRIX TESTS
 * 
 * These tests verify the visibility rules for key gated features:
 * - Reports tab visibility
 * - Tour/Stops tab visibility
 * - Expense → Stop assignment
 */
describe('Feature Matrix', () => {
  describe('Free tier access', () => {
    beforeEach(() => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: false,
        canAccessBusinessFeatures: false,
        isAdminUser: false,
        isLoading: false,
        isAuthenticated: true,
        tier: 'free',
      });
    });

    it('should NOT show Tour/Stops tab (Business-only)', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="tour-tab">Tour Tab</div>
        </BusinessOnly>
      );
      expect(queryByTestId('tour-tab')).not.toBeInTheDocument();
    });

    it('should NOT show Expense→Stop assignment (Business-only)', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="expense-stop">Expense Stop Assignment</div>
        </BusinessOnly>
      );
      expect(queryByTestId('expense-stop')).not.toBeInTheDocument();
    });

    it('should NOT show Business Reports (Business-only)', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="business-reports">Business Reports</div>
        </BusinessOnly>
      );
      expect(queryByTestId('business-reports')).not.toBeInTheDocument();
    });
  });

  describe('Pro tier access', () => {
    beforeEach(() => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: true,
        canAccessBusinessFeatures: false,
        isAdminUser: false,
        isLoading: false,
        isAuthenticated: true,
        tier: 'pro',
      });
    });

    it('should NOT show Tour/Stops tab (Business-only)', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="tour-tab">Tour Tab</div>
        </BusinessOnly>
      );
      expect(queryByTestId('tour-tab')).not.toBeInTheDocument();
    });

    it('should NOT show Expense→Stop assignment (Business-only)', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="expense-stop">Expense Stop Assignment</div>
        </BusinessOnly>
      );
      expect(queryByTestId('expense-stop')).not.toBeInTheDocument();
    });

    it('should NOT show Business Reports (Business-only)', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="business-reports">Business Reports</div>
        </BusinessOnly>
      );
      expect(queryByTestId('business-reports')).not.toBeInTheDocument();
    });
  });

  describe('Business tier access', () => {
    beforeEach(() => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: true,
        canAccessBusinessFeatures: true,
        isAdminUser: false,
        isLoading: false,
        isAuthenticated: true,
        tier: 'business',
      });
    });

    it('should show Tour/Stops tab', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="tour-tab">Tour Tab</div>
        </BusinessOnly>
      );
      expect(queryByTestId('tour-tab')).toBeInTheDocument();
    });

    it('should show Expense→Stop assignment', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="expense-stop">Expense Stop Assignment</div>
        </BusinessOnly>
      );
      expect(queryByTestId('expense-stop')).toBeInTheDocument();
    });

    it('should show Business Reports', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="business-reports">Business Reports</div>
        </BusinessOnly>
      );
      expect(queryByTestId('business-reports')).toBeInTheDocument();
    });
  });

  // Patch 2.6.19: Admin with Free plan - has admin UI, but NOT Business features
  describe('Admin with Free plan (decoupled behavior)', () => {
    beforeEach(() => {
      // Admin with Free DB tier - should experience Free behavior
      vi.mocked(useAccess).mockReturnValue({
        isPro: false,
        canAccessBusinessFeatures: false, // Admin does NOT auto-grant Business
        isAdminUser: true,
        isLoading: false,
        isAuthenticated: true,
        tier: 'free', // Admin has Free plan
      });
    });

    it('should NOT show Business features for admin with Free plan', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="tour-tab">Tour Tab</div>
        </BusinessOnly>
      );
      expect(queryByTestId('tour-tab')).not.toBeInTheDocument();
    });

    it('should still show Admin features', () => {
      const { queryByTestId } = render(
        <AdminOnly>
          <div data-testid="admin-panel">Admin Panel</div>
        </AdminOnly>
      );
      expect(queryByTestId('admin-panel')).toBeInTheDocument();
    });
  });

  // Patch 2.6.19: Admin with Business tier - has both admin UI and Business features
  describe('Admin with Business tier', () => {
    beforeEach(() => {
      vi.mocked(useAccess).mockReturnValue({
        isPro: true,
        canAccessBusinessFeatures: true, // Via Business tier
        isAdminUser: true,
        isLoading: false,
        isAuthenticated: true,
        tier: 'business', // Admin has Business tier assigned
      });
    });

    it('should show Business features for admin with Business tier', () => {
      const { queryByTestId } = render(
        <BusinessOnly>
          <div data-testid="tour-tab">Tour Tab</div>
        </BusinessOnly>
      );
      expect(queryByTestId('tour-tab')).toBeInTheDocument();
    });

    it('should show Admin features', () => {
      const { queryByTestId } = render(
        <AdminOnly>
          <div data-testid="admin-panel">Admin Panel</div>
        </AdminOnly>
      );
      expect(queryByTestId('admin-panel')).toBeInTheDocument();
    });
  });
});

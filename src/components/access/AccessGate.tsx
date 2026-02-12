/**
 * AccessGate - Conditional rendering components for plan/role-based UI gating
 * 
 * Patch 2.6.2: Commercial Code Integrity Documentation
 * 
 * SECURITY MODEL:
 * - These wrappers provide UI-level gating for better UX (hide unavailable features)
 * - CRITICAL: UI gating alone is NOT sufficient for security
 * - All protected operations MUST have server-side enforcement via RLS/DB functions
 * - Database-level enforcement is the primary security layer
 * 
 * GATING ENFORCEMENT STATUS:
 * - ProOnly: Currently UNENFORCED (content always renders)
 *   - Pro features are protected by RLS (trip limits, trip_state transitions)
 * - BusinessOnly: ENFORCED via canAccessBusinessFeatures check
 *   - Admin users bypass this gate for testing/support purposes
 *   - Non-admin, non-Business users see fallback (null by default)
 * - AdminOnly: ENFORCED via isAdminUser check
 *   - Always enforced; admin features must never be visible to regular users
 * 
 * ADMIN OVERRIDE INTENT:
 * - Admin users (from user_roles table) can access Business features
 * - This allows owner/developers to test and support Business functionality
 * - When Business tier is added to database, canAccessBusinessFeatures will include it
 * 
 * @example
 * <ProOnly>
 *   <AdvancedFeatureButton />
 * </ProOnly>
 * 
 * <BusinessOnly>
 *   <TourTab />
 * </BusinessOnly>
 * 
 * <AdminOnly>
 *   <AdminSettings />
 * </AdminOnly>
 */

import { ReactNode } from 'react';
import { useAccess } from '@/hooks/useAccess';

interface GateProps {
  children: ReactNode;
  /** 
   * Fallback content to show when access is denied.
   * If not provided, nothing will be rendered when gating is enforced.
   */
  fallback?: ReactNode;
  /**
   * If true, shows a loading skeleton while access state is being determined.
   * Default: false
   */
  showLoadingState?: boolean;
}

/**
 * ProOnly - Wrapper for Pro-tier features
 * 
 * Patch 2.2.2: Enforcement disabled. Content always renders.
 * When enforcement is needed, add an access check before rendering children.
 */
export function ProOnly({ children, fallback = null, showLoadingState = false }: GateProps) {
  const { isPro, isLoading } = useAccess();

  if (showLoadingState && isLoading) {
    return <div className="animate-pulse bg-muted rounded h-8 w-full" />;
  }

  // Enforcement currently disabled — content renders for all tiers
  // if (!isPro) {
  //   return <>{fallback}</>;
  // }

  return <>{children}</>;
}

/**
 * BusinessOnly - Wrapper for Business-tier features
 * 
 * Patch 2.3.9: Enforcement ENABLED.
 * Business features require Business access.
 * 
 * Business-only features include:
 * - Tour tab (multi-stop itineraries)
 * - Stop-level controls
 * - Expense-to-Stop assignment
 * - Advanced business reporting
 */
export function BusinessOnly({ children, fallback = null, showLoadingState = false }: GateProps) {
  const { canAccessBusinessFeatures, isLoading } = useAccess();

  if (showLoadingState && isLoading) {
    return <div className="animate-pulse bg-muted rounded h-8 w-full" />;
  }

  // Patch 2.3.9: Business gating enforcement enabled
  if (!canAccessBusinessFeatures) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * AdminOnly - Wrapper for admin/owner/developer-only features
 * 
 * NOTE: This gate IS enforced, as admin features should never be
 * visible to regular users.
 */
export function AdminOnly({ children, fallback = null, showLoadingState = false }: GateProps) {
  const { isAdminUser, isLoading } = useAccess();

  if (showLoadingState && isLoading) {
    return <div className="animate-pulse bg-muted rounded h-8 w-full" />;
  }

  if (!isAdminUser) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * FeatureGate - Generic wrapper that accepts a custom access check
 * 
 * Use this when you need more complex gating logic than the
 * standard Pro/Business/Admin gates provide.
 * 
 * @example
 * <FeatureGate accessCheck={(access) => access.isPro && access.isAdminUser}>
 *   <AdvancedAdminFeature />
 * </FeatureGate>
 */
interface FeatureGateProps extends GateProps {
  /** Function that receives access state and returns whether to show content */
  accessCheck: (access: ReturnType<typeof useAccess>) => boolean;
  /** If true, bypasses the access check (useful for development) */
  bypassGate?: boolean;
}

export function FeatureGate({ 
  children, 
  fallback = null, 
  showLoadingState = false,
  accessCheck,
  bypassGate = false,
}: FeatureGateProps) {
  const access = useAccess();

  if (showLoadingState && access.isLoading) {
    return <div className="animate-pulse bg-muted rounded h-8 w-full" />;
  }

  // Allow bypassing for development/testing
  if (bypassGate) {
    return <>{children}</>;
  }

  if (!accessCheck(access)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

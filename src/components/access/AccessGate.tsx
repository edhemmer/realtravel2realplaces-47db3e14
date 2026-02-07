/**
 * AccessGate - Conditional rendering components for plan/role-based UI gating
 * 
 * These wrapper components provide a consistent pattern for gating UI elements
 * based on subscription tier or user role. They are part of the UI gating
 * framework introduced in Patch 2.2.2.
 * 
 * IMPORTANT: Enforcement is NOT enabled in this patch. All wrapped content
 * will render normally. The wrappers exist to standardize how gating will
 * work in future patches.
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
 * NOTE: Enforcement disabled (Patch 2.2.2). Content always renders.
 * Enable enforcement by uncommenting the access check below.
 */
export function ProOnly({ children, fallback = null, showLoadingState = false }: GateProps) {
  const { isPro, isLoading } = useAccess();

  if (showLoadingState && isLoading) {
    return <div className="animate-pulse bg-muted rounded h-8 w-full" />;
  }

  // TODO (Future Patch): Uncomment to enable Pro gating enforcement
  // if (!isPro) {
  //   return <>{fallback}</>;
  // }

  return <>{children}</>;
}

/**
 * BusinessOnly - Wrapper for Business-tier features
 * 
 * Patch 2.3.9: Enforcement ENABLED.
 * Business features require Business access (currently admin/owner override).
 * 
 * Business-only features include:
 * - Tour tab (multi-stop itineraries)
 * - Stop-level controls
 * - Expense-to-Stop assignment
 * - Advanced business reporting (future)
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

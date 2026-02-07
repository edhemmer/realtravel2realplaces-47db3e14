/**
 * useUpgradeIntent.ts
 * 
 * Hook for capturing upgrade intent signals when users click disabled upgrade buttons.
 * This is non-intrusive tracking for billing decision support.
 * 
 * v2.6.5: Initial implementation
 * 
 * DEVELOPER NOTES:
 * - Signals are fire-and-forget (errors are logged but don't affect UX)
 * - No user feedback is shown when intent is captured
 * - Admins can view all intents via direct DB query or future admin UI
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';

export type UpgradeEntryPoint = 
  | 'account_page' 
  | 'plans_page' 
  | 'contextual_message';

export type TargetPlan = 'pro' | 'business';

/**
 * Hook to track upgrade intent signals
 * 
 * Usage:
 * ```tsx
 * const { trackUpgradeIntent } = useUpgradeIntent();
 * 
 * // When user clicks disabled upgrade button
 * <Button onClick={() => trackUpgradeIntent('pro', 'account_page')} disabled>
 *   Upgrade to Pro
 * </Button>
 * ```
 */
export function useUpgradeIntent() {
  const { user } = useAuth();
  const { data: subscription } = useSubscription();

  const trackUpgradeIntent = useCallback(async (
    targetPlan: TargetPlan,
    entryPoint: UpgradeEntryPoint
  ) => {
    // Only track for authenticated users
    if (!user?.id) {
      console.debug('[UpgradeIntent] No user, skipping tracking');
      return;
    }

    const currentPlan = subscription?.tier || 'free';

    // Don't track if user is already on or above target plan
    if (currentPlan === targetPlan) {
      console.debug('[UpgradeIntent] User already on target plan, skipping');
      return;
    }
    if (currentPlan === 'pro' && targetPlan === 'pro') {
      console.debug('[UpgradeIntent] Pro user clicking Pro, skipping');
      return;
    }

    try {
      const { error } = await supabase
        .from('upgrade_intents')
        .insert({
          user_id: user.id,
          current_plan: currentPlan,
          target_plan: targetPlan,
          entry_point: entryPoint,
        });

      if (error) {
        // Log but don't throw - this is non-critical telemetry
        console.error('[UpgradeIntent] Failed to record intent:', error.message);
      } else {
        console.debug('[UpgradeIntent] Recorded:', { targetPlan, entryPoint });
      }
    } catch (err) {
      // Silently fail - intent tracking should never break the app
      console.error('[UpgradeIntent] Unexpected error:', err);
    }
  }, [user?.id, subscription?.tier]);

  return { trackUpgradeIntent };
}

/**
 * useOnboardingStatus - Database-backed onboarding state
 * 
 * Patch 2.1.18: Onboarding now uses persistent DB flag instead of localStorage
 * 
 * BEHAVIOR:
 * - New users see onboarding on first login (has_completed_onboarding = false)
 * - After completing onboarding, flag is set to true in database
 * - Subsequent logins skip onboarding automatically
 * - Works consistently across desktop and mobile
 * - Manual "View Onboarding" from Account page resets localStorage temporarily
 *   but does NOT reset the DB flag (so it won't auto-show again)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

/**
 * Hook to get and manage onboarding completion status
 */
export function useOnboardingStatus() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();

  // Derive onboarding completion from profile
  const hasCompletedOnboarding = profile?.has_completed_onboarding === true;
  const isLoading = profileLoading;

  return {
    /** Whether the user has completed onboarding (from DB) */
    hasCompletedOnboarding,
    /** Whether the onboarding status is still loading */
    isLoading,
    /** Whether we should show onboarding (not loading AND not completed) */
    shouldShowOnboarding: !isLoading && !hasCompletedOnboarding && !!user,
  };
}

/**
 * Hook to mark onboarding as complete in the database
 */
export function useCompleteOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ has_completed_onboarding: true } as Record<string, unknown>)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error marking onboarding complete:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate profile query to refresh the onboarding status
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
}

/**
 * Legacy compatibility: Check localStorage for manual "View Onboarding" trigger
 * This allows the Account page "Getting Started Guide" to work without resetting DB
 */
export function isManualOnboardingView(): boolean {
  return localStorage.getItem('rt2rp_manual_onboarding_view') === 'true';
}

export function setManualOnboardingView(value: boolean) {
  if (value) {
    localStorage.setItem('rt2rp_manual_onboarding_view', 'true');
  } else {
    localStorage.removeItem('rt2rp_manual_onboarding_view');
  }
}

export function clearManualOnboardingView() {
  localStorage.removeItem('rt2rp_manual_onboarding_view');
}

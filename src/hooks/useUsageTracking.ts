import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * v2.0.0: Hook to track and increment feature usage
 * 
 * Used to update usage counters when rate-limited features are used.
 * Currently tracks AI generations per month.
 */
export function useUsageTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const incrementAiUsage = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.slice(0, 7); // YYYY-MM

      // First, get current profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('monthly_ai_generations, ai_generations_reset_at')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const resetMonth = profile?.ai_generations_reset_at?.slice(0, 7);
      const shouldReset = resetMonth !== currentMonth;

      // Update with incremented counter (or reset to 1 if new month)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          monthly_ai_generations: shouldReset ? 1 : (profile?.monthly_ai_generations || 0) + 1,
          ai_generations_reset_at: today,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      // Invalidate subscription query to refresh usage counts
      queryClient.invalidateQueries({ queryKey: ['subscription', user?.id] });
    },
  });

  return {
    incrementAiUsage: incrementAiUsage.mutate,
    isTracking: incrementAiUsage.isPending,
  };
}

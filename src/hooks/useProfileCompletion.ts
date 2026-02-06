import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileCompletionData {
  firstName: string | null;
  lastName: string | null;
  isComplete: boolean;
  isLoading: boolean;
}

/**
 * Hook to check if user profile has required first_name and last_name
 */
export function useProfileCompletion(): ProfileCompletionData {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['profileCompletion', user?.id],
    queryFn: async () => {
      if (!user) return { first_name: null, last_name: null };

      // Use raw query since types may not have regenerated yet
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking profile completion:', error);
        return { first_name: null, last_name: null };
      }

      const record = data as Record<string, unknown> | null;
      return {
        first_name: (record?.first_name as string) ?? null,
        last_name: (record?.last_name as string) ?? null,
      };
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const firstName = data?.first_name ?? null;
  const lastName = data?.last_name ?? null;
  
  const isComplete = !!(firstName && firstName.trim() && lastName && lastName.trim());

  return {
    firstName,
    lastName,
    isComplete,
    isLoading,
  };
}

/**
 * Hook to update profile with first and last name
 */
export function useCompleteProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ firstName, lastName }: { firstName: string; lastName: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        } as Record<string, unknown>)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      return { firstName, lastName };
    },
    onSuccess: () => {
      // Invalidate the profile completion query to refresh state
      queryClient.invalidateQueries({ queryKey: ['profileCompletion'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });
}

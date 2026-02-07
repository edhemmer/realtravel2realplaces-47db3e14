import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionTier } from '@/types/subscription';

interface AdminUser {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  subscription_tier: SubscriptionTier;
  lifetime_trip_count: number;
  current_trip_count: number;
  created_at: string;
}

interface DeleteUserResult {
  success: boolean;
  message?: string;
  error?: string;
  trip_count?: number;
}

/**
 * Hook to check if current user is an admin
 */
export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;

      const { data, error } = await supabase
        .rpc('is_admin');

      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }

      return data === true;
    },
    enabled: !!user,
    staleTime: 30000,
  });
}

/**
 * Hook to fetch all users (admin only)
 */
export function useAdminUsers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['adminUsers'],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await supabase
        .rpc('admin_get_all_users');

      if (error) {
        console.error('Error fetching admin users:', error);
        throw error;
      }

      return (data || []) as AdminUser[];
    },
    enabled: !!user,
  });
}

/**
 * Hook to update a user's subscription tier (admin only)
 */
export function useUpdateUserTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: SubscriptionTier }) => {
      const { data, error } = await supabase
        .rpc('admin_update_user_tier', {
          p_user_id: userId,
          p_new_tier: tier,
        });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });
}

/**
 * Hook to update a user's display name (admin only)
 */
export function useUpdateUserName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, firstName, lastName }: { userId: string; firstName: string; lastName: string }) => {
      const { data, error } = await supabase
        .rpc('admin_update_user_name', {
          p_user_id: userId,
          p_first_name: firstName,
          p_last_name: lastName,
        });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });
}

/**
 * Hook to delete a user (admin only)
 * Returns result object indicating success/failure and any blocking reason
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<DeleteUserResult> => {
      const { data, error } = await supabase
        .rpc('admin_delete_user', {
          p_user_id: userId,
        });

      if (error) {
        throw error;
      }

      // Type assertion with unknown intermediate to handle Supabase JSON return type
      return data as unknown as DeleteUserResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });
}

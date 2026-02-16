/**
 * usePendingTripInvites — v3.9.0: Canonical SSOT hook for in-app trip invite inbox
 *
 * Fetches pending invites addressed to the current user (by email match via RLS).
 * Provides accept/decline mutations using SECURITY DEFINER RPCs.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PendingTripInvite {
  id: string;
  trip_id: string;
  inviter_user_id: string;
  invitee_email: string;
  read_only: boolean;
  can_expenses: boolean;
  can_stay: boolean;
  expires_at: string;
  created_at: string;
  // Joined data
  trip_name?: string | null;
  inviter_display_name?: string | null;
}

function getPermissionSummary(invite: { read_only: boolean; can_expenses: boolean; can_stay: boolean }): string {
  if (invite.can_expenses && invite.can_stay) return 'Can Add Expenses + Lodging';
  if (invite.can_expenses) return 'Can Add Expenses';
  if (invite.can_stay) return 'Can Add Lodging';
  return 'Read Only';
}

export { getPermissionSummary };

export function usePendingTripInvites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-trip-invites', user?.id],
    queryFn: async (): Promise<PendingTripInvite[]> => {
      if (!user?.id) return [];

      // Use SECURITY DEFINER RPC to get enriched invites (bypasses profile/trip RLS)
      const { data, error } = await supabase.rpc('get_my_pending_invites');

      if (error) {
        console.error('Failed to fetch pending invites:', error);
        return [];
      }

      // Harden response shape: handle array or { data: [...] }
      const rows = Array.isArray(data) ? data : (data as any)?.data ?? [];
      if (!rows || rows.length === 0) return [];

      return (rows as any[]).map(inv => ({
        id: inv.id,
        trip_id: inv.trip_id,
        inviter_user_id: inv.inviter_user_id,
        invitee_email: inv.invitee_email,
        read_only: inv.read_only,
        can_expenses: inv.can_expenses,
        can_stay: inv.can_stay,
        expires_at: inv.expires_at,
        created_at: inv.created_at,
        trip_name: inv.trip_name || null,
        inviter_display_name: inv.inviter_display_name || null,
      }));
    },
    enabled: !!user?.id,
    refetchInterval: 60_000,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function usePendingInviteCount() {
  const { data: invites = [] } = usePendingTripInvites();
  return invites.length;
}

export function useAcceptTripInviteById() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { data, error } = await supabase.rpc('accept_trip_invite_by_id', {
        p_invite_id: inviteId,
      });

      if (error) throw error;
      return data as string; // trip_id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-trip-invites'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['shared-trips'] });
      queryClient.invalidateQueries({ queryKey: ['member-trips'] });
      toast.success('Trip added to your trips!');
    },
    onError: (error: Error) => {
      const msg = error.message || '';
      if (msg.includes('already') || msg.includes('duplicate')) {
        toast.success('You already have access to this trip.');
        queryClient.invalidateQueries({ queryKey: ['pending-trip-invites'] });
      } else {
        toast.error(error.message || 'Failed to accept invite');
      }
    },
  });
}

export function useDeclineTripInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { data, error } = await supabase.rpc('decline_trip_invite', {
        p_invite_id: inviteId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-trip-invites'] });
      toast.success('Invite declined');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to decline invite');
    },
  });
}

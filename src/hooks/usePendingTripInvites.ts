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
      if (!user?.email) return [];

      // Fetch pending invites for current user by email (RLS enforced)
      const { data: invites, error } = await supabase
        .from('trip_invites')
        .select('*')
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .ilike('invitee_email', user.email)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch pending invites:', error);
        return [];
      }

      if (!invites || invites.length === 0) return [];

      // Enrich with trip names and inviter display names
      const tripIds = [...new Set(invites.map(i => i.trip_id))];
      const inviterIds = [...new Set(invites.map(i => i.inviter_user_id))];

      const [tripsResult, profilesResult] = await Promise.all([
        supabase.from('trips').select('id, name').in('id', tripIds),
        supabase.from('profiles').select('user_id, display_name, first_name, last_name').in('user_id', inviterIds),
      ]);

      const tripMap = new Map<string, string>();
      tripsResult.data?.forEach(t => tripMap.set(t.id, t.name));

      const profileMap = new Map<string, string>();
      profilesResult.data?.forEach(p => {
        const name = p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || null;
        if (name) profileMap.set(p.user_id, name);
      });

      return invites.map(inv => ({
        id: inv.id,
        trip_id: inv.trip_id,
        inviter_user_id: inv.inviter_user_id,
        invitee_email: inv.invitee_email,
        read_only: inv.read_only,
        can_expenses: inv.can_expenses,
        can_stay: inv.can_stay,
        expires_at: inv.expires_at,
        created_at: inv.created_at,
        trip_name: tripMap.get(inv.trip_id) || null,
        inviter_display_name: profileMap.get(inv.inviter_user_id) || null,
      }));
    },
    enabled: !!user?.email,
    refetchInterval: 60_000,
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

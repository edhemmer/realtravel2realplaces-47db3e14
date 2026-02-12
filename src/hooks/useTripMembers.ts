/**
 * useTripMembers — v2.2.3: Hooks for trip membership and invite management
 * 
 * Uses trip_members and trip_invites tables + SECURITY DEFINER RPCs
 * from v2.2.2. No backend changes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: 'owner' | 'guest';
  created_at: string;
  // Joined from profiles
  display_name?: string | null;
  email?: string | null;
}

export interface TripInvite {
  id: string;
  trip_id: string;
  inviter_user_id: string;
  invitee_email: string;
  role: 'guest';
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  accepted_by_user_id?: string | null;
  created_at: string;
}

/**
 * Fetch trip members with display names
 */
export function useTripMembers(tripId: string) {
  return useQuery({
    queryKey: ['trip-members', tripId],
    queryFn: async (): Promise<TripMember[]> => {
      // Fetch members
      const { data: members, error } = await supabase
        .from('trip_members')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!members || members.length === 0) return [];

      // Fetch display names from profiles for each member
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .in('user_id', userIds);

      // Build lookup
      const profileMap = new Map<string, { display_name?: string | null; first_name?: string | null; last_name?: string | null }>();
      profiles?.forEach(p => profileMap.set(p.user_id, p));

      return members.map(m => {
        const profile = profileMap.get(m.user_id);
        const displayName = profile?.display_name 
          || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
          || null;
        return {
          ...m,
          role: m.role as 'owner' | 'guest',
          display_name: displayName,
          email: null, // Email not exposed via profiles RLS for non-self
        };
      });
    },
    enabled: !!tripId,
  });
}

/**
 * Fetch trip invites (owner only — RLS enforced)
 */
export function useTripInvites(tripId: string) {
  return useQuery({
    queryKey: ['trip-invites', tripId],
    queryFn: async (): Promise<TripInvite[]> => {
      const { data, error } = await supabase
        .from('trip_invites')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as TripInvite[];
    },
    enabled: !!tripId,
  });
}

/**
 * Create an invite via SECURITY DEFINER RPC
 * Returns the one-time plaintext token (never stored after display)
 */
export interface InvitePermissions {
  read_only: boolean;
  can_expenses: boolean;
  can_stay: boolean;
}

export function useCreateTripInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, email, permissions }: { tripId: string; email: string; permissions?: InvitePermissions }) => {
      const perms = permissions || { read_only: true, can_expenses: false, can_stay: false };
      const { data, error } = await supabase
        .rpc('create_trip_invite', {
          p_trip_id: tripId,
          p_invitee_email: email,
          p_ttl_days: 7,
          p_read_only: perms.read_only,
          p_can_expenses: perms.can_expenses,
          p_can_stay: perms.can_stay,
        });

      if (error) throw error;
      // RPC returns [{ invite_id, invite_token }]
      const result = Array.isArray(data) ? data[0] : data;
      return result as { invite_id: string; invite_token: string };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trip-invites', variables.tripId] });
      toast.success('Invite created!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create invite');
    },
  });
}

/**
 * Revoke a pending invite via SECURITY DEFINER RPC
 */
export function useRevokeTripInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteId, tripId }: { inviteId: string; tripId: string }) => {
      const { error } = await supabase
        .rpc('revoke_trip_invite', { p_invite_id: inviteId });

      if (error) throw error;
      return { tripId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['trip-invites', result.tripId] });
      toast.success('Invite revoked');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to revoke invite');
    },
  });
}

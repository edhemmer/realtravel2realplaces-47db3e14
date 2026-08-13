import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trip } from '@/types/database';

export interface SharedTrip extends Trip {
  isShared: true;
  permission: 'view' | 'edit';
}

export function useSharedTrips() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['shared-trips', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const tripIdSet = new Set<string>();
      const permissionMap = new Map<string, 'view' | 'edit'>();

      // 1) Legacy trip_shares (accepted)
      const { data: shares, error: sharesError } = await supabase
        .from('trip_shares')
        .select('trip_id, permission')
        .or(`shared_with_user_id.eq.${user.id},shared_with_email.eq.${user.email}`)
        .not('accepted_at', 'is', null);

      if (sharesError) throw sharesError;
      (shares || []).forEach(s => {
        tripIdSet.add(s.trip_id);
        permissionMap.set(s.trip_id, (s.permission || 'view') as 'view' | 'edit');
      });

      // 2) trip_members where user is a guest (from invite acceptance)
      const { data: memberships, error: membersError } = await supabase
        .from('trip_members')
        .select('trip_id, read_only, can_expenses, can_stay')
        .eq('user_id', user.id)
        .eq('role', 'guest');

      if (membersError) throw membersError;
      (memberships || []).forEach(m => {
        tripIdSet.add(m.trip_id);
        if (!permissionMap.has(m.trip_id)) {
          const hasScopedContribution = m.can_expenses === true || m.can_stay === true;
          permissionMap.set(m.trip_id, hasScopedContribution ? 'edit' : 'view');
        }
      });

      if (tripIdSet.size === 0) return [];

      const tripIds = Array.from(tripIdSet);
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .in('id', tripIds)
        .order('start_date', { ascending: false });

      if (tripsError) throw tripsError;

      return (trips || []).map(trip => ({
        ...trip,
        isShared: true as const,
        permission: permissionMap.get(trip.id) || 'view',
      })) as SharedTrip[];
    },
    enabled: !!user,
  });
}

/**
 * Canonical trip capabilities.
 *
 * IMPORTANT: `canEdit` is legacy broad-edit compatibility. Modern trip_members
 * guests never receive it. Scoped contribution permissions stay separate so
 * `can_expenses` or `can_stay` cannot unlock unrelated edit controls.
 */
export interface TripCapabilities {
  isOwner: boolean;
  /** Broad legacy edit authority. Modern scoped guests are always false. */
  canEdit: boolean;
  /** Can modify trip metadata (name, dates, etc.) — owner only. */
  canEditTripMeta: boolean;
  /** Can add expenses — owner OR guest with can_expenses. */
  canAddExpenses: boolean;
  /** Can add lodging/stays — owner OR guest with can_stay. */
  canAddLodging: boolean;
  /** True only when the user has no write/contribution capability. */
  isReadOnlyOverall: boolean;
}

export function deriveMemberCapabilities(membership: {
  read_only: boolean;
  can_expenses: boolean;
  can_stay: boolean;
}): TripCapabilities {
  const canAddExpenses = membership.read_only !== true && membership.can_expenses === true;
  const canAddLodging = membership.read_only !== true && membership.can_stay === true;
  const hasScopedContribution = canAddExpenses || canAddLodging;

  return {
    isOwner: false,
    canEdit: false,
    canEditTripMeta: false,
    canAddExpenses,
    canAddLodging,
    isReadOnlyOverall: !hasScopedContribution,
  };
}

export function useTripOwnership(tripId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trip-ownership', tripId, user?.id],
    queryFn: async (): Promise<TripCapabilities> => {
      if (!user || !tripId) return {
        isOwner: false, canEdit: false, canEditTripMeta: false,
        canAddExpenses: false, canAddLodging: false, isReadOnlyOverall: true,
      };

      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', tripId)
        .maybeSingle();

      if (tripError) throw tripError;
      
      if (trip?.user_id === user.id) {
        return {
          isOwner: true, canEdit: true, canEditTripMeta: true,
          canAddExpenses: true, canAddLodging: true, isReadOnlyOverall: false,
        };
      }

      const { data: membership, error: memberError } = await supabase
        .from('trip_members')
        .select('read_only, can_expenses, can_stay')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .eq('role', 'guest')
        .maybeSingle();

      if (memberError) throw memberError;

      if (membership) {
        return deriveMemberCapabilities(membership);
      }

      // Legacy trip_shares retain their historic broad edit signal until they
      // are inventoried/migrated. Phase 2 server RLS still places an upper bound
      // on trip, expense and booking writes.
      const { data: share, error: shareError } = await supabase
        .from('trip_shares')
        .select('permission')
        .eq('trip_id', tripId)
        .or(`shared_with_user_id.eq.${user.id},shared_with_email.eq.${user.email}`)
        .not('accepted_at', 'is', null)
        .maybeSingle();

      if (shareError) throw shareError;

      const isEditShare = share?.permission === 'edit';
      return {
        isOwner: false,
        canEdit: isEditShare,
        canEditTripMeta: false,
        canAddExpenses: isEditShare,
        canAddLodging: isEditShare,
        isReadOnlyOverall: !isEditShare,
      };
    },
    enabled: !!user && !!tripId,
  });
}

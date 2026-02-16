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
        // If not already tracked via trip_shares, derive permission
        if (!permissionMap.has(m.trip_id)) {
          permissionMap.set(m.trip_id, m.read_only ? 'view' : 'edit');
        }
      });

      if (tripIdSet.size === 0) return [];

      // Fetch trip details
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
 * v3.9.5: Canonical trip capabilities — capability-scoped, not role-scoped.
 * Returns granular write permissions derived from trip_members + trip_shares.
 */
export interface TripCapabilities {
  isOwner: boolean;
  /** Legacy compat — true if owner OR has any write capability */
  canEdit: boolean;
  /** Can modify trip metadata (name, dates, etc.) — owner only */
  canEditTripMeta: boolean;
  /** Can add expenses — owner OR guest with can_expenses flag */
  canAddExpenses: boolean;
  /** Can add lodging/stays — owner OR guest with can_stay flag */
  canAddLodging: boolean;
  /** True only when user has zero write capabilities */
  isReadOnlyOverall: boolean;
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

      // Check if user owns the trip
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

      // Check trip_members for capability-scoped permissions
      const { data: membership, error: memberError } = await supabase
        .from('trip_members')
        .select('read_only, can_expenses, can_stay')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .eq('role', 'guest')
        .maybeSingle();

      if (memberError) throw memberError;

      if (membership) {
        const canAddExpenses = membership.can_expenses === true;
        const canAddLodging = membership.can_stay === true;
        const hasAnyWrite = canAddExpenses || canAddLodging;
        return {
          isOwner: false,
          canEdit: hasAnyWrite,
          canEditTripMeta: false,
          canAddExpenses,
          canAddLodging,
          isReadOnlyOverall: !hasAnyWrite,
        };
      }

      // Fallback: check legacy trip_shares
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

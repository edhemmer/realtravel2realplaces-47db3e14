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

export function useTripOwnership(tripId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trip-ownership', tripId, user?.id],
    queryFn: async () => {
      if (!user || !tripId) return { isOwner: false, canEdit: false };

      // Check if user owns the trip
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', tripId)
        .maybeSingle();

      if (tripError) throw tripError;
      
      if (trip?.user_id === user.id) {
        return { isOwner: true, canEdit: true };
      }

      // Check share permission
      const { data: share, error: shareError } = await supabase
        .from('trip_shares')
        .select('permission')
        .eq('trip_id', tripId)
        .or(`shared_with_user_id.eq.${user.id},shared_with_email.eq.${user.email}`)
        .not('accepted_at', 'is', null)
        .maybeSingle();

      if (shareError) throw shareError;

      return {
        isOwner: false,
        canEdit: share?.permission === 'edit',
      };
    },
    enabled: !!user && !!tripId,
  });
}

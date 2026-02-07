/**
 * useTrips - Trip data access layer
 * 
 * Patch 2.6.2: Commercial Code Integrity Documentation
 * 
 * DATA INTEGRITY:
 * - Single source of truth for trip data
 * - useTrips() returns all user-owned trips
 * - useTrip(tripId) returns a single trip (including shared trips via RLS)
 * - Dashboard and TripDetail derive from these queries
 * 
 * ERROR HANDLING:
 * - All mutations surface errors via toast notifications (explicit, user-safe)
 * - Query failures throw to React Query error boundaries
 * - No silent errors - all failures are visible to users
 * 
 * LIFECYCLE ENFORCEMENT:
 * - trip_state is enforced at database level via RLS policies
 * - ACTIVE trips: fully editable
 * - LOCKED trips (Free users past end_date): read-only, enforced by RLS
 * - CLOSED trips (Pro users manual close): read-only, enforced by RLS
 * - Lifecycle transitions are validated by validate_trip_state_transition() trigger
 * 
 * SECURITY:
 * - RLS policies enforce trip ownership
 * - Shared trips are accessible via trip_shares table
 * - Delete is only allowed for ACTIVE trips owned by the user
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trip, TripType } from '@/types/database';
import { toast } from 'sonner';

export function useTrips() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trips', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as Trip[];
    },
    enabled: !!user,
  });
}

export function useTrip(tripId: string) {
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Trip | null;
    },
    enabled: !!tripId,
  });
}

interface CreateTripData {
  name: string;
  destination_city: string;
  destination_state?: string;
  destination_country: string;
  start_date: string;
  end_date: string;
  trip_type: TripType;
  transportation_mode?: 'flight' | 'drive' | 'unspecified';
  destination_type?: 'beach' | 'mountain' | 'city' | 'unspecified';
  origin_address?: string;
  destination_address?: string;
  notes?: string;
}

export function useCreateTrip() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTripData) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data: trip, error } = await supabase
        .from('trips')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return trip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trip created successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Trip> & { id: string }) => {
      const { error } = await supabase
        .from('trips')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', variables.id] });
      toast.success('Trip updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trip deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

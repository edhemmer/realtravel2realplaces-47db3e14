/**
 * useEngagements - Engagement/Stops data access layer
 * 
 * Part of Patch 2.3.0: Engagement Backend Foundation
 * Patch 2.6.2: Commercial Code Integrity Documentation
 * Patch 2.1.23: Tour/Booking Separation Enforcement
 * Patch 2.1.25: Manual Stops Only (no auto-generation from bookings)
 * 
 * TERMINOLOGY:
 * - "Engagement" is the internal/database term
 * - "Stop" or "Tour Stop" is the user-facing term in the UI
 * - Stops are work locations / activities (NOT lodging - use Stays for that)
 * 
 * v2.1.25 RULE: MANUAL STOPS ONLY
 * - Tours (Engagements) are NEVER auto-generated from bookings
 * - All stops must be manually added by the user
 * - The "Generate from bookings" and "Regenerate from bookings" actions have been removed
 * - The TourTab starts empty until the user adds stops manually
 * - Source hints ("From flight", "From stay") have been removed from the UI
 * 
 * TOUR/BOOKING SEPARATION (v2.1.23) - CRITICAL:
 * - Engagements are NON-MONETARY stops with NO cost fields
 * - Engagements are NEVER used in any cost calculations
 * - calculateTripCostSummary() does NOT accept engagements as input
 * - The Engagement entity has: id, trip_id, name, date, time, location, notes
 * - The Engagement entity does NOT have: price, cost, amount, currency, tax, fees
 * - Deleting a Booking does NOT require deleting related Engagements
 * - Engagements stand alone as "stops on the trip"
 * 
 * DATA INTEGRITY:
 * - Single source of truth for Stop data
 * - All Stop reads flow through useEngagements(tripId)
 * - TourTab and expense-to-Stop assignment derive from this query
 * - Stops are sorted by date + start_time for chronological display
 * 
 * ERROR HANDLING:
 * - Query failures are logged and rethrown
 * - PGRST116 (not found) is gracefully handled as null
 * - No silent errors in mutations
 * 
 * SECURITY:
 * - RLS policies enforce trip ownership via user_can_write_trip()
 * - Only trip owners can create/update/delete Stops
 * - Read access includes shared trips via user_has_trip_access()
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Engagement entity representing a Stop in a Trip
 */
export interface Engagement {
  id: string;
  trip_id: string;
  name: string;
  date: string; // ISO date string (YYYY-MM-DD)
  start_time: string; // Time string (HH:MM:SS)
  end_time: string | null;
  location: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new Engagement
 */
export interface CreateEngagementInput {
  trip_id: string;
  name: string;
  date: string;
  start_time: string;
  end_time?: string | null;
  location?: string | null;
  reference_id?: string | null;
  notes?: string | null;
}

/**
 * Input for updating an existing Engagement
 */
export interface UpdateEngagementInput {
  id: string;
  name?: string;
  date?: string;
  start_time?: string;
  end_time?: string | null;
  location?: string | null;
  reference_id?: string | null;
  notes?: string | null;
}

/**
 * Fetch all Engagements for a Trip, ordered by date and start_time
 */
export function useEngagements(tripId: string) {
  return useQuery({
    queryKey: ['engagements', tripId],
    queryFn: async (): Promise<Engagement[]> => {
      const { data, error } = await supabase
        .from('engagements')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching engagements:', error);
        throw error;
      }

      return data as Engagement[];
    },
    enabled: !!tripId,
  });
}

/**
 * Fetch a single Engagement by ID
 */
export function useEngagement(engagementId: string) {
  return useQuery({
    queryKey: ['engagement', engagementId],
    queryFn: async (): Promise<Engagement | null> => {
      const { data, error } = await supabase
        .from('engagements')
        .select('*')
        .eq('id', engagementId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        console.error('Error fetching engagement:', error);
        throw error;
      }

      return data as Engagement;
    },
    enabled: !!engagementId,
  });
}

/**
 * Create a new Engagement
 */
export function useCreateEngagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEngagementInput): Promise<Engagement> => {
      const { data, error } = await supabase
        .from('engagements')
        .insert({
          trip_id: input.trip_id,
          name: input.name,
          date: input.date,
          start_time: input.start_time,
          end_time: input.end_time || null,
          location: input.location || null,
          reference_id: input.reference_id || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating engagement:', error);
        throw error;
      }

      return data as Engagement;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['engagements', data.trip_id] });
    },
  });
}

/**
 * Update an existing Engagement
 */
export function useUpdateEngagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateEngagementInput): Promise<Engagement> => {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from('engagements')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating engagement:', error);
        throw error;
      }

      return data as Engagement;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['engagements', data.trip_id] });
      queryClient.invalidateQueries({ queryKey: ['engagement', data.id] });
    },
  });
}

/**
 * Delete an Engagement
 */
export function useDeleteEngagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tripId }: { id: string; tripId: string }): Promise<void> => {
      const { error } = await supabase
        .from('engagements')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting engagement:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['engagements', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['engagement', variables.id] });
    },
  });
}

/**
 * Fetch Engagements for a date range (useful for timeline views)
 */
export function useEngagementsByDateRange(tripId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['engagements', tripId, 'range', startDate, endDate],
    queryFn: async (): Promise<Engagement[]> => {
      const { data, error } = await supabase
        .from('engagements')
        .select('*')
        .eq('trip_id', tripId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching engagements by date range:', error);
        throw error;
      }

      return data as Engagement[];
    },
    enabled: !!tripId && !!startDate && !!endDate,
  });
}

/**
 * Count Engagements for a Trip (useful for summary displays)
 */
export function useEngagementCount(tripId: string) {
  return useQuery({
    queryKey: ['engagements', tripId, 'count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('engagements')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', tripId);

      if (error) {
        console.error('Error counting engagements:', error);
        throw error;
      }

      return count || 0;
    },
    enabled: !!tripId,
  });
}

/**
 * useEngagements - Backend access patterns for Engagement/Stops
 * 
 * Part of Patch 2.3.0: Engagement Backend Foundation
 * 
 * Engagements are the internal data model for Business-tier "Stops".
 * This hook provides CRUD operations but is not wired to any UI yet.
 * 
 * IMPORTANT: No UI exposure in this patch. These hooks exist for
 * future Tour tab and Stop-level expense features.
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

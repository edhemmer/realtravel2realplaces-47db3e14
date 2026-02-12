/**
 * useExpenseEngagement - Associate expenses with engagements
 * 
 * Patch 2.3.0: Engagement Backend Foundation
 * 
 * Provides utilities for linking expenses to engagements (Stops)
 * for Business-tier reporting features.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Expense } from '@/types/database';

/**
 * Fetch expenses for a specific Engagement
 */
export function useExpensesByEngagement(engagementId: string) {
  return useQuery({
    queryKey: ['expenses', 'engagement', engagementId],
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching expenses by engagement:', error);
        throw error;
      }

      return data as Expense[];
    },
    enabled: !!engagementId,
  });
}

/**
 * Link an expense to an engagement
 */
export function useLinkExpenseToEngagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      expenseId, 
      engagementId,
      tripId,
    }: { 
      expenseId: string; 
      engagementId: string | null;
      tripId: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from('expenses')
        .update({ engagement_id: engagementId })
        .eq('id', expenseId);

      if (error) {
        console.error('Error linking expense to engagement:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.tripId] });
      if (variables.engagementId) {
        queryClient.invalidateQueries({ queryKey: ['expenses', 'engagement', variables.engagementId] });
      }
    },
  });
}

/**
 * Unlink an expense from its engagement
 */
export function useUnlinkExpenseFromEngagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      expenseId,
      tripId,
      previousEngagementId,
    }: { 
      expenseId: string;
      tripId: string;
      previousEngagementId?: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from('expenses')
        .update({ engagement_id: null })
        .eq('id', expenseId);

      if (error) {
        console.error('Error unlinking expense from engagement:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.tripId] });
      if (variables.previousEngagementId) {
        queryClient.invalidateQueries({ queryKey: ['expenses', 'engagement', variables.previousEngagementId] });
      }
    },
  });
}

/**
 * Get engagement expense summary (total amount by engagement)
 * Useful for Stop-level cost breakdowns
 */
export function useEngagementExpenseSummary(tripId: string) {
  return useQuery({
    queryKey: ['expenses', tripId, 'engagement-summary'],
    queryFn: async (): Promise<Record<string, { total: number; count: number }>> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('engagement_id, amount')
        .eq('trip_id', tripId)
        .not('engagement_id', 'is', null);

      if (error) {
        console.error('Error fetching engagement expense summary:', error);
        throw error;
      }

      // Aggregate by engagement_id
      const summary: Record<string, { total: number; count: number }> = {};
      
      for (const expense of data || []) {
        const engId = expense.engagement_id as string;
        if (!summary[engId]) {
          summary[engId] = { total: 0, count: 0 };
        }
        summary[engId].total += Number(expense.amount) || 0;
        summary[engId].count += 1;
      }

      return summary;
    },
    enabled: !!tripId,
  });
}

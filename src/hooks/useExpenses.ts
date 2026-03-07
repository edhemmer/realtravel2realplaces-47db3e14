/**
 * useExpenses - Expense data access layer
 * 
 * v4.0.3: Offline expense queue integration.
 * When offline, expenses are queued locally and synced on reconnect.
 * Queued expenses are merged into the query results so they appear instantly.
 * 
 * DATA INTEGRITY:
 * - Single source of truth for expense data
 * - All expense reads flow through useExpenses(tripId)
 * - Offline expenses merged into results with isPendingSync flag
 * 
 * SECURITY:
 * - RLS policies enforce trip ownership at database level
 * - user_can_write_trip() prevents writes to locked/closed trips
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Expense, ExpenseCategory, ExpensePurpose } from '@/types/database';
import { toast } from 'sonner';
import { useEffect, useCallback, useRef, useState } from 'react';
import { isOnline, subscribeToNetworkChanges } from '@/lib/networkStatus';
import {
  generateClientId,
  enqueueExpense,
  getQueuedExpenses,
  removeQueuedExpense,
  processOfflineExpenseQueue,
  QueuedExpense,
} from '@/lib/offlineExpenseQueue';

/** Extended expense type that includes offline queue metadata */
export interface ExpenseWithSync extends Expense {
  isPendingSync?: boolean;
  clientExpenseId?: string;
}

export function useExpenses(tripId: string) {
  const [queuedExpenses, setQueuedExpenses] = useState<QueuedExpense[]>([]);

  // Load queued expenses from IndexedDB
  const refreshQueued = useCallback(async () => {
    if (!tripId) return;
    const queued = await getQueuedExpenses(tripId);
    setQueuedExpenses(queued.filter(q => q.syncStatus !== 'synced'));
  }, [tripId]);

  useEffect(() => {
    refreshQueued();
  }, [refreshQueued]);

  const query = useQuery({
    queryKey: ['expenses', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!tripId,
  });

  // Merge queued offline expenses into results
  const mergedData: ExpenseWithSync[] = [
    ...(query.data || []).map(e => ({ ...e, isPendingSync: false } as ExpenseWithSync)),
    ...queuedExpenses.map(q => ({
      id: q.clientExpenseId,
      trip_id: q.tripId,
      date: q.expensePayload.date as string,
      category: q.expensePayload.category as ExpenseCategory,
      sub_category: (q.expensePayload.sub_category as string) || null,
      description: (q.expensePayload.description as string) || null,
      amount: (q.expensePayload.amount as number) || 0,
      my_share: (q.expensePayload.my_share as number) || null,
      notes: (q.expensePayload.notes as string) || null,
      receipt_url: null,
      expense_purpose: (q.expensePayload.expense_purpose as string) || null,
      engagement_id: null,
      currency: (q.expensePayload.currency as string) || 'USD',
      converted_amount: null,
      converted_currency: null,
      created_at: new Date(q.createdAt).toISOString(),
      updated_at: new Date(q.createdAt).toISOString(),
      isPendingSync: true,
      clientExpenseId: q.clientExpenseId,
    } as ExpenseWithSync)),
  ];

  return {
    ...query,
    data: mergedData.length > 0 || queuedExpenses.length > 0 ? mergedData : query.data as ExpenseWithSync[] | undefined,
    refreshQueued,
  };
}

interface CreateExpenseData {
  trip_id: string;
  date: string;
  category: ExpenseCategory;
  sub_category?: string;
  description?: string;
  amount: number;
  my_share?: number;
  notes?: string;
  receipt_url?: string;
  expense_purpose?: ExpensePurpose;
  engagement_id?: string;
  currency?: string;
  converted_amount?: number | null;
  converted_currency?: string | null;
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseData) => {
      const insertData: Record<string, unknown> = {
        trip_id: data.trip_id,
        date: data.date,
        category: data.category,
        amount: data.amount,
      };
      
      if (data.sub_category) insertData.sub_category = data.sub_category;
      if (data.description) insertData.description = data.description;
      if (data.my_share !== undefined) insertData.my_share = data.my_share;
      if (data.notes) insertData.notes = data.notes;
      if (data.receipt_url) insertData.receipt_url = data.receipt_url;
      if (data.expense_purpose) insertData.expense_purpose = data.expense_purpose;
      if (data.engagement_id) insertData.engagement_id = data.engagement_id;
      if (data.currency) insertData.currency = data.currency;
      if (data.converted_amount !== undefined && data.converted_amount !== null) insertData.converted_amount = data.converted_amount;
      if (data.converted_currency) insertData.converted_currency = data.converted_currency;

      // v4.0.3: Offline queue path
      if (!isOnline()) {
        const clientId = generateClientId();
        const record: QueuedExpense = {
          clientExpenseId: clientId,
          tripId: data.trip_id,
          expensePayload: insertData,
          createdAt: Date.now(),
          syncStatus: 'pending',
          retryCount: 0,
        };
        await enqueueExpense(record);
        return { id: clientId, ...insertData, isPendingSync: true } as any;
      }

      const { data: expense, error } = await supabase
        .from('expenses')
        .insert(insertData as never)
        .select()
        .single();
      
      if (error) throw error;
      return expense;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.trip_id] });
      if (result?.isPendingSync) {
        toast.success('Expense saved offline — will sync when connected');
      } else {
        toast.success('Expense added successfully!');
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trip_id, ...data }: Partial<Expense> & { id: string; trip_id: string }) => {
      // v4.0.3: If updating a queued offline expense, update it in the queue
      const queued = await getQueuedExpenses(trip_id);
      const match = queued.find(q => q.clientExpenseId === id);
      if (match) {
        const { updateQueuedExpense } = await import('@/lib/offlineExpenseQueue');
        await updateQueuedExpense(id, {
          expensePayload: { ...match.expensePayload, ...data },
        });
        return { trip_id };
      }

      const { error } = await supabase
        .from('expenses')
        .update(data as never)
        .eq('id', id);
      
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', result.trip_id] });
      toast.success('Expense updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trip_id }: { id: string; trip_id: string }) => {
      // v4.0.3: If deleting a queued offline expense, remove from queue
      const queued = await getQueuedExpenses(trip_id);
      const match = queued.find(q => q.clientExpenseId === id);
      if (match) {
        await removeQueuedExpense(id);
        return { trip_id };
      }

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', result.trip_id] });
      toast.success('Expense deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

/**
 * v4.0.3: Hook that triggers offline expense queue processing on reconnect.
 * Mount once at the app/trip level.
 */
export function useOfflineExpenseSync(tripId?: string) {
  const queryClient = useQueryClient();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToNetworkChanges(async (online) => {
      if (online && mountedRef.current) {
        await processOfflineExpenseQueue((clientId, serverId, syncedTripId) => {
          if (mountedRef.current) {
            queryClient.invalidateQueries({ queryKey: ['expenses', syncedTripId] });
          }
        });
      }
    });

    // Also process on mount if online (handles page reload scenarios)
    if (isOnline()) {
      processOfflineExpenseQueue((clientId, serverId, syncedTripId) => {
        if (mountedRef.current) {
          queryClient.invalidateQueries({ queryKey: ['expenses', syncedTripId] });
        }
      });
    }

    return unsubscribe;
  }, [queryClient]);
}

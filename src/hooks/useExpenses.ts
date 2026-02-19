/**
 * useExpenses - Expense data access layer
 * 
 * Patch 2.6.2: Commercial Code Integrity Documentation
 * 
 * DATA INTEGRITY:
 * - Single source of truth for expense data
 * - All expense reads flow through useExpenses(tripId)
 * - UI components (ExpensesTab, Reports) derive from this query
 * - Exports (PDF/CSV) use the same filtered data path
 * 
 * ERROR HANDLING:
 * - All mutations surface errors via toast notifications (explicit, user-safe)
 * - Query failures throw to React Query error boundaries
 * - No silent errors - all failures are visible to users
 * 
 * SECURITY:
 * - RLS policies enforce trip ownership at database level
 * - user_can_write_trip() prevents writes to locked/closed trips
 * - Expense CRUD is gated by trip_state in RLS policies
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Expense, ExpenseCategory, ExpensePurpose } from '@/types/database';
import { toast } from 'sonner';

export function useExpenses(tripId: string) {
  return useQuery({
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
  expense_purpose?: ExpensePurpose; // v1.3.0: For mixed trips only
  engagement_id?: string; // Patch 2.3.8: Optional Stop assignment
  currency?: string; // v4.4.0: Multi-currency support
  converted_amount?: number | null; // v4.4.2: Manual conversion amount
  converted_currency?: string | null; // v4.4.2: Target currency for conversion
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

      const { data: expense, error } = await supabase
        .from('expenses')
        .insert(insertData as never)
        .select()
        .single();
      
      if (error) throw error;
      return expense;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.trip_id] });
      toast.success('Expense added successfully!');
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

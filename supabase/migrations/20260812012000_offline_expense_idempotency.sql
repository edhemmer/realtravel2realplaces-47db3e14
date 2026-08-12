-- Phase 1 trust hardening: durable idempotency for offline expense replay.
--
-- A locally queued expense keeps one UUID (`client_expense_id`) across retries.
-- The unique index lets PostgREST/Supabase upsert reconcile a retry to the
-- already-created server row instead of inserting a duplicate financial record.

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS client_expense_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_client_expense_id_unique
  ON public.expenses (client_expense_id);

COMMENT ON COLUMN public.expenses.client_expense_id IS
  'Stable client-generated idempotency key used for offline expense replay; null for ordinary online-created expenses.';

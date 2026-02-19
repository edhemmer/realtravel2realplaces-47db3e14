-- Add currency column to expenses table (default USD for existing records)
ALTER TABLE public.expenses ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
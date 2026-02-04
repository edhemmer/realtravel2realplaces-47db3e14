-- Add expense_purpose field for mixed trip expense classification (v1.3.0)
-- This field is optional and nullable for backwards compatibility
-- Values: 'business' or 'personal' - only required for mixed-type trips

ALTER TABLE public.expenses
ADD COLUMN expense_purpose text CHECK (expense_purpose IN ('business', 'personal'));

-- Add index for filtering expenses by purpose
CREATE INDEX idx_expenses_purpose ON public.expenses(expense_purpose) WHERE expense_purpose IS NOT NULL;

-- Add comment documenting the field
COMMENT ON COLUMN public.expenses.expense_purpose IS 'Classification for mixed trips: business or personal. NULL for pure business/personal trips.';
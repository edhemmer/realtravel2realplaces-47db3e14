-- v4.4.2: Add manual currency conversion columns to expenses
-- converted_amount: The user-entered amount in their home currency
-- converted_currency: The currency they converted to (their home currency)
-- When both are set, the expense is included in totals using converted_amount

ALTER TABLE public.expenses 
  ADD COLUMN converted_amount numeric DEFAULT NULL,
  ADD COLUMN converted_currency text DEFAULT NULL;
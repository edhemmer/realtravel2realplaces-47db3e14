-- Add context columns to support_tickets for Patch 2.1.27
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS page_path text,
ADD COLUMN IF NOT EXISTS trip_id uuid,
ADD COLUMN IF NOT EXISTS user_plan text;

-- Add index on trip_id for potential lookups
CREATE INDEX IF NOT EXISTS idx_support_tickets_trip_id ON public.support_tickets(trip_id);
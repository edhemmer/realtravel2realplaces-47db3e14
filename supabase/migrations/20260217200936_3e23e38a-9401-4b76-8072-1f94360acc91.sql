
-- v3.10.9: Add vehicle range fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avg_miles_per_tank numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tank_size_gallons numeric DEFAULT NULL;

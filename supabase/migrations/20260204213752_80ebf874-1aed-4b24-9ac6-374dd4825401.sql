-- Add travel preference columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN preferred_home_airport text,
ADD COLUMN preferred_currency text DEFAULT 'USD',
ADD COLUMN preferred_datetime_format text DEFAULT 'MM/DD/YYYY 12h';
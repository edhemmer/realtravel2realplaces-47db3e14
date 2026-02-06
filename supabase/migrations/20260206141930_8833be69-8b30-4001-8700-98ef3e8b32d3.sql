-- Add first_name and last_name columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT NULL;
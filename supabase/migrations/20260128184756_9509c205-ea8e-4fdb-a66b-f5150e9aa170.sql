-- Add tsa_reviewed flag to companions table
-- When true, companion won't appear in TSA warning list even if TSA number is blank
ALTER TABLE public.companions 
ADD COLUMN tsa_reviewed boolean NOT NULL DEFAULT false;
-- Add flight-specific fields to companions table for storing itinerary passenger info
ALTER TABLE public.companions 
ADD COLUMN IF NOT EXISTS tsa_precheck_number text,
ADD COLUMN IF NOT EXISTS frequent_flyer_number text,
ADD COLUMN IF NOT EXISTS airline text;
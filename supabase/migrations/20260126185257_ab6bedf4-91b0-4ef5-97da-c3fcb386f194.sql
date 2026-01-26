-- Create destination type enum
CREATE TYPE public.destination_type AS ENUM ('beach', 'mountain', 'city', 'unspecified');

-- Add destination_type column to trips table
ALTER TABLE public.trips 
ADD COLUMN destination_type public.destination_type NOT NULL DEFAULT 'unspecified';
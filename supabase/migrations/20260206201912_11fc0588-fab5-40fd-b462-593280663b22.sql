-- Add 'transport' to booking_type enum
ALTER TYPE public.booking_type ADD VALUE IF NOT EXISTS 'transport';

-- Create transport_mode enum
DO $$ BEGIN
  CREATE TYPE public.transport_mode AS ENUM ('train', 'bus', 'metro', 'ferry', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add transport-specific fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS transport_mode public.transport_mode,
ADD COLUMN IF NOT EXISTS from_location TEXT,
ADD COLUMN IF NOT EXISTS to_location TEXT,
ADD COLUMN IF NOT EXISTS operator TEXT;
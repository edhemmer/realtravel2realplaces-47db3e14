-- Add transportation mode to trips
CREATE TYPE public.transportation_mode AS ENUM ('flight', 'drive', 'unspecified');

ALTER TABLE public.trips 
ADD COLUMN transportation_mode public.transportation_mode NOT NULL DEFAULT 'unspecified';

-- Add mileage tracking fields for driving trips
ALTER TABLE public.trips
ADD COLUMN destination_address text,
ADD COLUMN origin_address text,
ADD COLUMN estimated_miles numeric;
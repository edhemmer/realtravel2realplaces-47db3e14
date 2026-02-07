-- v2.0.3: Airport Data Foundation
-- Add airport code and name fields to flight bookings

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS departure_airport_code text,
ADD COLUMN IF NOT EXISTS departure_airport_name text,
ADD COLUMN IF NOT EXISTS arrival_airport_code text,
ADD COLUMN IF NOT EXISTS arrival_airport_name text;

-- Add comments for documentation
COMMENT ON COLUMN public.bookings.departure_airport_code IS 'IATA code for departure airport (e.g., DEN, LAX)';
COMMENT ON COLUMN public.bookings.departure_airport_name IS 'Full name of departure airport when available';
COMMENT ON COLUMN public.bookings.arrival_airport_code IS 'IATA code for arrival airport (e.g., JFK, ORD)';
COMMENT ON COLUMN public.bookings.arrival_airport_name IS 'Full name of arrival airport when available';

-- Create index for efficient airport code lookups
CREATE INDEX IF NOT EXISTS idx_bookings_departure_airport ON public.bookings(departure_airport_code) WHERE departure_airport_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_arrival_airport ON public.bookings(arrival_airport_code) WHERE arrival_airport_code IS NOT NULL;
-- Add distance_unit and temperature_unit preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS distance_unit TEXT DEFAULT 'miles',
ADD COLUMN IF NOT EXISTS temperature_unit TEXT DEFAULT 'fahrenheit';

-- Add check constraints to ensure valid values
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_distance_unit_check 
CHECK (distance_unit IN ('miles', 'kilometers'));

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_temperature_unit_check 
CHECK (temperature_unit IN ('fahrenheit', 'celsius'));
-- Add new columns to companions table for booking-specific details
ALTER TABLE public.companions 
ADD COLUMN IF NOT EXISTS flight_number text,
ADD COLUMN IF NOT EXISTS seat_number text,
ADD COLUMN IF NOT EXISTS portion_owed numeric DEFAULT NULL;

-- Drop the existing function first since return type is changing
DROP FUNCTION IF EXISTS public.get_companions_safe(uuid);

-- Recreate the function with the new columns
CREATE FUNCTION public.get_companions_safe(p_trip_id uuid)
 RETURNS TABLE(
   id uuid, 
   trip_id uuid, 
   name text, 
   email text, 
   phone text, 
   notes text, 
   tsa_precheck_number text, 
   frequent_flyer_number text, 
   airline text,
   flight_number text,
   seat_number text,
   portion_owed numeric,
   created_at timestamp with time zone
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    c.id,
    c.trip_id,
    c.name,
    CASE WHEN user_owns_trip(c.trip_id) THEN c.email ELSE NULL END as email,
    CASE WHEN user_owns_trip(c.trip_id) THEN c.phone ELSE NULL END as phone,
    c.notes,
    c.tsa_precheck_number,
    c.frequent_flyer_number,
    c.airline,
    c.flight_number,
    c.seat_number,
    c.portion_owed,
    c.created_at
  FROM companions c
  WHERE c.trip_id = p_trip_id
    AND user_has_trip_access(c.trip_id)
  ORDER BY c.name ASC;
$function$;
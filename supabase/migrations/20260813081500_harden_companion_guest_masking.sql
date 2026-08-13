-- Phase 2 privacy hardening: minimize companion fields returned to non-owners.
-- Email, phone, TSA and frequent-flyer identifiers were already masked by the
-- existing function. Notes and per-person amount owed are also owner-private by
-- default because they can contain sensitive or financial context.

DROP FUNCTION IF EXISTS public.get_companions_safe(uuid);

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
  created_at timestamp with time zone,
  tsa_reviewed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.id,
    c.trip_id,
    c.name,
    CASE WHEN user_owns_trip(c.trip_id) THEN c.email ELSE NULL END,
    CASE WHEN user_owns_trip(c.trip_id) THEN c.phone ELSE NULL END,
    CASE WHEN user_owns_trip(c.trip_id) THEN c.notes ELSE NULL END,
    CASE WHEN user_owns_trip(c.trip_id) THEN c.tsa_precheck_number ELSE NULL END,
    CASE WHEN user_owns_trip(c.trip_id) THEN c.frequent_flyer_number ELSE NULL END,
    c.airline,
    c.flight_number,
    c.seat_number,
    CASE WHEN user_owns_trip(c.trip_id) THEN c.portion_owed ELSE NULL END,
    c.created_at,
    c.tsa_reviewed
  FROM public.companions c
  WHERE c.trip_id = p_trip_id
    AND user_has_trip_access(c.trip_id)
  ORDER BY c.name ASC;
$function$;

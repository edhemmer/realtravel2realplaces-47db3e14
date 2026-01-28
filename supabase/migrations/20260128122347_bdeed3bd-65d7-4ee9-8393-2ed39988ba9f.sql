-- Drop the insecure view
DROP VIEW IF EXISTS public.companions_safe;

-- Create a security definer function instead that respects ownership
CREATE OR REPLACE FUNCTION public.get_companions_safe(p_trip_id uuid)
RETURNS TABLE (
  id uuid,
  trip_id uuid,
  name text,
  email text,
  phone text,
  notes text,
  tsa_precheck_number text,
  frequent_flyer_number text,
  airline text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    c.created_at
  FROM companions c
  WHERE c.trip_id = p_trip_id
    AND user_has_trip_access(c.trip_id)
  ORDER BY c.name ASC;
$$;
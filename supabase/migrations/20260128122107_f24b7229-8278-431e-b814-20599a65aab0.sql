-- Create a view that masks sensitive companion fields for non-owners
-- This protects email and phone from view-only shared users

CREATE VIEW public.companions_safe
WITH (security_invoker=on) AS
SELECT 
  id,
  trip_id,
  name,
  CASE 
    WHEN user_owns_trip(trip_id) THEN email 
    ELSE NULL 
  END as email,
  CASE 
    WHEN user_owns_trip(trip_id) THEN phone 
    ELSE NULL 
  END as phone,
  notes,
  tsa_precheck_number,
  frequent_flyer_number,
  airline,
  created_at
FROM public.companions;
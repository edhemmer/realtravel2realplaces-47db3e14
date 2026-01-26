-- Fix the security definer views by recreating them with security_invoker=on
DROP VIEW IF EXISTS public.trip_shares_safe;
DROP VIEW IF EXISTS public.companions_safe;

-- Recreate trip_shares_safe view with security_invoker
CREATE VIEW public.trip_shares_safe 
WITH (security_invoker=on) AS
SELECT 
  id,
  trip_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM trips t WHERE t.id = trip_shares.trip_id AND t.user_id = auth.uid()
    ) THEN share_token
    ELSE NULL
  END as share_token,
  shared_with_email,
  shared_with_user_id,
  permission,
  accepted_at,
  created_at,
  updated_at
FROM public.trip_shares;

-- Recreate companions_safe view with security_invoker
CREATE VIEW public.companions_safe 
WITH (security_invoker=on) AS
SELECT 
  id,
  trip_id,
  name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM trips t WHERE t.id = companions.trip_id AND t.user_id = auth.uid()
    ) THEN email
    ELSE NULL
  END as email,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM trips t WHERE t.id = companions.trip_id AND t.user_id = auth.uid()
    ) THEN phone
    ELSE NULL
  END as phone,
  airline,
  frequent_flyer_number,
  tsa_precheck_number,
  notes,
  created_at
FROM public.companions;

-- Grant access to the views
GRANT SELECT ON public.trip_shares_safe TO authenticated;
GRANT SELECT ON public.companions_safe TO authenticated;
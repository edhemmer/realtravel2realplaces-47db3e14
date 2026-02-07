-- Patch 2.6.11: Update admin_get_all_users to include last_sign_in_at
-- This enables the admin UI to show last login times and filter inactive users

-- First drop the existing function (return type is changing)
DROP FUNCTION IF EXISTS public.admin_get_all_users();

-- Recreate with last_sign_in_at included
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(
  user_id uuid, 
  email text, 
  first_name text, 
  last_name text, 
  subscription_tier subscription_tier, 
  lifetime_trip_count integer, 
  current_trip_count bigint, 
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::text,
    p.first_name,
    p.last_name,
    COALESCE(p.subscription_tier, 'free'::subscription_tier) as subscription_tier,
    COALESCE(p.lifetime_trip_count, 0) as lifetime_trip_count,
    (SELECT COUNT(*) FROM trips t WHERE t.user_id = u.id) as current_trip_count,
    COALESCE(p.created_at, u.created_at) as created_at,
    u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN profiles p ON p.user_id = u.id
  ORDER BY COALESCE(p.created_at, u.created_at) DESC;
END;
$function$;
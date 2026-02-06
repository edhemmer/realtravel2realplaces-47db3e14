-- Fix admin_get_all_users to source from auth.users first and LEFT JOIN to profiles
-- This ensures ALL users are returned, even those without profile records

CREATE OR REPLACE FUNCTION public.admin_get_all_users()
 RETURNS TABLE(user_id uuid, email text, subscription_tier subscription_tier, lifetime_trip_count integer, current_trip_count bigint, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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
    COALESCE(p.subscription_tier, 'free'::subscription_tier) as subscription_tier,
    COALESCE(p.lifetime_trip_count, 0) as lifetime_trip_count,
    (SELECT COUNT(*) FROM trips t WHERE t.user_id = u.id) as current_trip_count,
    COALESCE(p.created_at, u.created_at) as created_at
  FROM auth.users u
  LEFT JOIN profiles p ON p.user_id = u.id
  ORDER BY COALESCE(p.created_at, u.created_at) DESC;
END;
$function$;
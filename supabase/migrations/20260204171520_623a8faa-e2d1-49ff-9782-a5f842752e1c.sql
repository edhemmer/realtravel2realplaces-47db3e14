-- Drop and recreate admin_get_all_users with current trip count
DROP FUNCTION IF EXISTS public.admin_get_all_users();

CREATE FUNCTION public.admin_get_all_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  subscription_tier subscription_tier,
  lifetime_trip_count integer,
  current_trip_count bigint,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    u.email,
    p.subscription_tier,
    p.lifetime_trip_count,
    (SELECT COUNT(*) FROM trips t WHERE t.user_id = p.user_id) as current_trip_count,
    p.created_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;
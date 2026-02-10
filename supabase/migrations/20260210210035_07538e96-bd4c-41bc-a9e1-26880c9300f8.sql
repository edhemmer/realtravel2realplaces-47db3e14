
-- Add soft-delete columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Replace admin_delete_user with soft-delete version
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
  profile_exists boolean;
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Get caller's user ID
  caller_id := auth.uid();
  
  -- Prevent self-deletion
  IF p_user_id = caller_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id = p_user_id) INTO profile_exists;
  
  IF NOT profile_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found.'
    );
  END IF;

  -- Soft-delete: mark profile as deleted
  UPDATE profiles
  SET is_deleted = true,
      deleted_at = now(),
      subscription_tier = 'free'::subscription_tier,
      subscription_started_at = NULL,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User account deactivated successfully'
  );
END;
$$;

-- Update admin_get_all_users to exclude soft-deleted users
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  subscription_tier subscription_tier,
  lifetime_trip_count integer,
  current_trip_count bigint,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    (SELECT COUNT(*) FROM trips t WHERE t.user_id = u.id)::bigint as current_trip_count,
    COALESCE(p.created_at, u.created_at) as created_at,
    u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN profiles p ON p.user_id = u.id
  WHERE COALESCE(p.is_deleted, false) = false
  ORDER BY COALESCE(p.created_at, u.created_at) DESC;
END;
$$;

-- Function to update a user's display name (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_user_name(
  p_user_id uuid,
  p_first_name text,
  p_last_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Validate names are not empty
  IF TRIM(COALESCE(p_first_name, '')) = '' OR TRIM(COALESCE(p_last_name, '')) = '' THEN
    RAISE EXCEPTION 'First name and last name cannot be empty';
  END IF;

  -- Update the user's name
  UPDATE profiles
  SET 
    first_name = TRIM(p_first_name),
    last_name = TRIM(p_last_name),
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$;

-- Function to safely delete a user (admin only)
-- Blocks deletion if user has trips (to prevent data loss)
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trip_count integer;
  caller_id uuid;
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

  -- Check if user has any trips
  SELECT COUNT(*) INTO trip_count FROM trips WHERE user_id = p_user_id;
  
  IF trip_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete user with existing trips. User has ' || trip_count || ' trip(s).',
      'trip_count', trip_count
    );
  END IF;

  -- Delete user's profile first (this will cascade)
  DELETE FROM profiles WHERE user_id = p_user_id;
  
  -- Delete user's roles
  DELETE FROM user_roles WHERE user_id = p_user_id;
  
  -- Delete from auth.users (this requires service role, done via Supabase Admin API)
  -- For now, we'll mark the profile as deleted and return success
  -- The actual auth.users deletion would need to be done via edge function with service role
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User profile deleted successfully'
  );
END;
$$;
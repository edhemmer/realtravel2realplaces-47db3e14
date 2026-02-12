
-- v2.2.9: Owner-only update companion permissions RPC
CREATE OR REPLACE FUNCTION public.update_member_permissions(
  p_trip_id uuid,
  p_member_user_id uuid,
  p_read_only boolean,
  p_can_expenses boolean,
  p_can_stay boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_member RECORD;
  v_final_read_only boolean;
  v_final_can_expenses boolean;
  v_final_can_stay boolean;
  v_defaulted boolean := false;
BEGIN
  -- Must be trip owner
  IF NOT is_trip_owner_member(p_trip_id) THEN
    RAISE EXCEPTION 'Only trip owner can update permissions';
  END IF;

  -- Cannot update yourself
  IF p_member_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot update your own permissions';
  END IF;

  -- Target must be a guest member of this trip
  SELECT * INTO v_member FROM trip_members
  WHERE trip_id = p_trip_id AND user_id = p_member_user_id AND role = 'guest';

  IF v_member IS NULL THEN
    RAISE EXCEPTION 'Member not found or not a guest on this trip';
  END IF;

  -- Validate: reject PERMISSION_CONFLICT
  IF p_read_only = true AND (p_can_expenses = true OR p_can_stay = true) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PERMISSION_CONFLICT',
      'message', 'read_only cannot be true when can_expenses or can_stay is true'
    );
  END IF;

  -- Handle PERMISSION_EMPTY: F F F → default to T F F
  v_final_read_only := p_read_only;
  v_final_can_expenses := p_can_expenses;
  v_final_can_stay := p_can_stay;

  IF p_read_only = false AND p_can_expenses = false AND p_can_stay = false THEN
    v_final_read_only := true;
    v_defaulted := true;
  END IF;

  -- Apply update
  UPDATE trip_members
  SET read_only = v_final_read_only,
      can_expenses = v_final_can_expenses,
      can_stay = v_final_can_stay
  WHERE trip_id = p_trip_id AND user_id = p_member_user_id AND role = 'guest';

  IF v_defaulted THEN
    RETURN jsonb_build_object(
      'success', true,
      'warning', 'PERMISSION_EMPTY_DEFAULTED',
      'message', 'No permissions set; defaulted to read-only',
      'read_only', v_final_read_only,
      'can_expenses', v_final_can_expenses,
      'can_stay', v_final_can_stay
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'read_only', v_final_read_only,
    'can_expenses', v_final_can_expenses,
    'can_stay', v_final_can_stay
  );
END;
$$;

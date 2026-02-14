
-- v3.10.4: Allow trip date editing on any trip state (active, locked, closed)
-- Bypasses the active-only RLS UPDATE policy by using SECURITY DEFINER
-- Also reactivates trips when end_date is extended into today/future
CREATE OR REPLACE FUNCTION public.update_trip_dates(
  p_trip_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trip RECORD;
  v_new_state trip_state;
BEGIN
  -- Validate caller owns the trip
  IF NOT user_owns_trip(p_trip_id) THEN
    RAISE EXCEPTION 'Access denied: you do not own this trip';
  END IF;

  -- Validate end_date >= start_date
  IF p_end_date < p_start_date THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_DATES',
      'message', 'End date cannot be before start date'
    );
  END IF;

  -- Get current trip
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id;
  IF v_trip IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  END IF;

  -- Determine new state based on dates:
  -- If end_date >= today → active
  -- If end_date < today and user is free → locked
  -- If end_date < today and user is pro → keep current or active
  IF p_end_date >= CURRENT_DATE THEN
    v_new_state := 'active';
  ELSE
    -- End date is still in the past
    IF user_is_pro(v_trip.user_id) THEN
      -- Pro users: if currently closed, stay closed; otherwise active
      v_new_state := CASE WHEN v_trip.trip_state = 'closed' THEN 'closed' ELSE 'active' END;
    ELSE
      -- Free users: locked if past
      v_new_state := 'locked';
    END IF;
  END IF;

  -- Perform the update (bypasses RLS via SECURITY DEFINER)
  UPDATE trips
  SET start_date = p_start_date,
      end_date = p_end_date,
      trip_state = v_new_state,
      updated_at = now()
  WHERE id = p_trip_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_state', v_new_state::text,
    'start_date', p_start_date::text,
    'end_date', p_end_date::text
  );
END;
$$;

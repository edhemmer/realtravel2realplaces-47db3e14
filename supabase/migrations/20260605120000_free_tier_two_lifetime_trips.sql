-- Free tier policy update: 2 lifetime trips, Pro/Business unlimited.
-- Lifetime count never decrements, so this applies to future create attempts.

CREATE OR REPLACE FUNCTION public.user_can_create_trip(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    CASE
      WHEN user_is_pro(p_user_id) THEN true
      ELSE count_user_active_trips(p_user_id) < 2
    END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_trip_limit(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    CASE
      WHEN user_is_pro(p_user_id) THEN -1
      ELSE 2
    END;
$$;

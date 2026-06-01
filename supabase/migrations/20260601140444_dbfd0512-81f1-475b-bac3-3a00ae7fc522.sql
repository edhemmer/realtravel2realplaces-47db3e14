
CREATE TABLE public.places_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  searches integer NOT NULL DEFAULT 0,
  photos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

GRANT SELECT ON public.places_usage TO authenticated;
GRANT ALL ON public.places_usage TO service_role;

ALTER TABLE public.places_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own places usage"
ON public.places_usage
FOR SELECT
USING (auth.uid() = user_id);

CREATE INDEX idx_places_usage_user_day ON public.places_usage (user_id, day);

-- Atomic increment + budget check.
-- p_kind: 'search' or 'photo'
-- Returns jsonb: { allowed boolean, count int, limit int, kind text }
CREATE OR REPLACE FUNCTION public.increment_places_usage(
  p_user_id uuid,
  p_kind text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_pro boolean;
  v_limit integer;
  v_today date := (now() AT TIME ZONE 'utc')::date;
  v_new_count integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;
  IF p_kind NOT IN ('search','photo') THEN
    RAISE EXCEPTION 'invalid kind';
  END IF;

  v_is_pro := user_is_pro(p_user_id);

  IF p_kind = 'search' THEN
    v_limit := CASE WHEN v_is_pro THEN 500 ELSE 50 END;
  ELSE
    v_limit := CASE WHEN v_is_pro THEN 2000 ELSE 200 END;
  END IF;

  INSERT INTO public.places_usage (user_id, day, searches, photos)
  VALUES (
    p_user_id,
    v_today,
    CASE WHEN p_kind = 'search' THEN 1 ELSE 0 END,
    CASE WHEN p_kind = 'photo' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, day) DO UPDATE
  SET searches = public.places_usage.searches + CASE WHEN p_kind = 'search' THEN 1 ELSE 0 END,
      photos   = public.places_usage.photos   + CASE WHEN p_kind = 'photo'  THEN 1 ELSE 0 END,
      updated_at = now()
  RETURNING CASE WHEN p_kind = 'search' THEN searches ELSE photos END
    INTO v_new_count;

  RETURN jsonb_build_object(
    'allowed', v_new_count <= v_limit,
    'count', v_new_count,
    'limit', v_limit,
    'kind', p_kind
  );
END;
$$;

REVOKE ALL ON FUNCTION public.increment_places_usage(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_places_usage(uuid, text) TO service_role;

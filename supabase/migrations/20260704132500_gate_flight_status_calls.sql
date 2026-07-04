CREATE TABLE IF NOT EXISTS public.flight_status_cache (
  flight_number text NOT NULL,
  departure_date date NOT NULL,
  response jsonb NOT NULL DEFAULT '{"signal": null}'::jsonb,
  provider text NOT NULL DEFAULT 'aviationstack',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '6 hours',
  PRIMARY KEY (flight_number, departure_date)
);

CREATE TABLE IF NOT EXISTS public.flight_status_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.flight_status_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_status_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct flight status cache access" ON public.flight_status_cache;
CREATE POLICY "No direct flight status cache access"
  ON public.flight_status_cache
  FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Users can read own flight status usage" ON public.flight_status_usage;
CREATE POLICY "Users can read own flight status usage"
  ON public.flight_status_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.increment_flight_status_usage(
  p_user_id uuid,
  p_daily_limit integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.flight_status_usage (user_id, usage_date, count, updated_at)
  VALUES (p_user_id, CURRENT_DATE, 1, now())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    count = public.flight_status_usage.count + 1,
    updated_at = now()
  RETURNING count INTO v_count;

  IF v_count > p_daily_limit THEN
    UPDATE public.flight_status_usage
      SET count = GREATEST(0, count - 1),
          updated_at = now()
      WHERE user_id = p_user_id
        AND usage_date = CURRENT_DATE;

    RETURN jsonb_build_object(
      'allowed', false,
      'count', p_daily_limit,
      'limit', p_daily_limit
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'count', v_count,
    'limit', p_daily_limit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_flight_status_usage(uuid, integer) TO service_role;

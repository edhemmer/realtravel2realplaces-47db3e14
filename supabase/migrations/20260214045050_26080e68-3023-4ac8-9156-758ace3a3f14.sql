
-- 1. Create trip_engagements table
CREATE TABLE public.trip_engagements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  location_name text,
  address text,
  lat numeric,
  lng numeric,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Unique constraint to prevent exact duplicates
CREATE UNIQUE INDEX uq_trip_engagements_dedup 
  ON public.trip_engagements (trip_id, title, start_time);

-- 3. Enable RLS
ALTER TABLE public.trip_engagements ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies (match existing patterns)
CREATE POLICY "Block anonymous trip_engagements access"
  ON public.trip_engagements FOR SELECT
  USING (false);

CREATE POLICY "Users can view trip_engagements for accessible trips"
  ON public.trip_engagements FOR SELECT
  USING (user_has_trip_access(trip_id));

CREATE POLICY "Users can create trip_engagements for owned trips"
  ON public.trip_engagements FOR INSERT
  WITH CHECK (user_can_write_trip(trip_id));

CREATE POLICY "Users can update trip_engagements for owned trips"
  ON public.trip_engagements FOR UPDATE
  USING (user_can_write_trip(trip_id));

CREATE POLICY "Users can delete trip_engagements for owned trips"
  ON public.trip_engagements FOR DELETE
  USING (user_can_write_trip(trip_id));

-- 5. Trigger function: sync trip_engagements → trip_events
CREATE OR REPLACE FUNCTION public.sync_trip_engagement_events()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Handle DELETE: remove canonical event
  IF TG_OP = 'DELETE' THEN
    DELETE FROM trip_events
    WHERE source_type = 'engagement' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Handle INSERT or UPDATE: remove existing then re-create
  DELETE FROM trip_events
  WHERE source_type = 'engagement' AND source_id = NEW.id;

  INSERT INTO trip_events (
    trip_id, event_type, event_datetime, source_type, source_id, title, location_summary
  ) VALUES (
    NEW.trip_id,
    'engagement_start',
    NEW.start_time,
    'engagement',
    NEW.id,
    NEW.title,
    COALESCE(NEW.location_name, NEW.address)
  );

  RETURN NEW;
END;
$function$;

-- 6. Attach trigger
CREATE TRIGGER sync_trip_engagement_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.trip_engagements
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_trip_engagement_events();

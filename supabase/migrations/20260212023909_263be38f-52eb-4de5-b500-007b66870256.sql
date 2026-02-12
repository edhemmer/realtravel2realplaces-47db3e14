
-- v2.2.5: Mixed-Plan Sharing - Canonical Trip Truth Enforcement
-- Engagement write-through to canonical event stream

-- 1. Add engagement event type to trip_event_type enum
ALTER TYPE public.trip_event_type ADD VALUE IF NOT EXISTS 'engagement_start';

-- 2. Add engagement source type to event_source_type enum
ALTER TYPE public.event_source_type ADD VALUE IF NOT EXISTS 'engagement';

-- 3. Add plan-neutral display columns to trip_events
-- These allow Timeline rendering without joining Business-only tables
ALTER TABLE public.trip_events ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.trip_events ADD COLUMN IF NOT EXISTS location_summary TEXT;

-- 4. Create engagement sync trigger function
-- IMPORTANT: No plan-tier check — canonical events are plan-neutral
-- All trip members can read these via existing user_has_trip_access RLS
CREATE OR REPLACE FUNCTION public.sync_engagement_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Handle DELETE: remove canonical event for this engagement
  IF TG_OP = 'DELETE' THEN
    DELETE FROM trip_events 
    WHERE source_type = 'engagement' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Handle INSERT or UPDATE: remove existing then re-create
  DELETE FROM trip_events 
  WHERE source_type = 'engagement' AND source_id = NEW.id;

  -- Write engagement as canonical timeline event
  -- Combines date + start_time into a timestamp for event_datetime
  INSERT INTO trip_events (
    trip_id, event_type, event_datetime, source_type, source_id, title, location_summary
  ) VALUES (
    NEW.trip_id,
    'engagement_start',
    (NEW.date + NEW.start_time),
    'engagement',
    NEW.id,
    NEW.name,
    COALESCE(NEW.location, NEW.address)
  );

  RETURN NEW;
END;
$$;

-- 5. Create trigger on engagements table
CREATE TRIGGER sync_engagement_events_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.engagements
FOR EACH ROW EXECUTE FUNCTION public.sync_engagement_events();

-- Patch 2.0.2: Pro Event Backbone

-- Create event type enum
CREATE TYPE public.trip_event_type AS ENUM (
  'flight_departure',
  'hotel_checkin',
  'hotel_checkout',
  'rental_pickup',
  'rental_return',
  'parking_expiration'
);

-- Create source type enum
CREATE TYPE public.event_source_type AS ENUM ('booking', 'parking');

-- Create trip_events table
CREATE TABLE public.trip_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  event_type trip_event_type NOT NULL,
  event_datetime timestamptz NOT NULL,
  source_type event_source_type NOT NULL,
  source_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_trip_events_trip_id ON trip_events(trip_id);
CREATE INDEX idx_trip_events_source ON trip_events(source_type, source_id);
CREATE INDEX idx_trip_events_datetime ON trip_events(event_datetime);

-- Enable RLS
ALTER TABLE public.trip_events ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as other trip-related tables)
CREATE POLICY "Block anonymous trip_events access"
ON public.trip_events FOR SELECT
USING (false);

CREATE POLICY "Users can view events for accessible trips"
ON public.trip_events FOR SELECT
USING (user_has_trip_access(trip_id));

CREATE POLICY "Users can manage events for owned trips"
ON public.trip_events FOR ALL
USING (user_owns_trip(trip_id));

-- Trigger for updated_at
CREATE TRIGGER update_trip_events_updated_at
BEFORE UPDATE ON trip_events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Helper function: Check if trip owner is Pro
CREATE OR REPLACE FUNCTION public.trip_owner_is_pro(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT user_is_pro(
    (SELECT user_id FROM trips WHERE id = p_trip_id)
  );
$$;

-- Function: Sync events from booking changes
CREATE OR REPLACE FUNCTION public.sync_booking_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process for Pro users
  IF NOT trip_owner_is_pro(COALESCE(NEW.trip_id, OLD.trip_id)) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Handle DELETE: remove all events for this booking
  IF TG_OP = 'DELETE' THEN
    DELETE FROM trip_events 
    WHERE source_type = 'booking' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Handle INSERT or UPDATE: sync events
  -- First, remove existing events for this booking
  DELETE FROM trip_events 
  WHERE source_type = 'booking' AND source_id = NEW.id;

  -- Create events based on booking type (only if datetime exists)
  IF NEW.booking_type = 'flight' THEN
    -- Flight departure event
    IF NEW.start_datetime IS NOT NULL THEN
      INSERT INTO trip_events (trip_id, event_type, event_datetime, source_type, source_id)
      VALUES (NEW.trip_id, 'flight_departure', NEW.start_datetime, 'booking', NEW.id);
    END IF;
    
  ELSIF NEW.booking_type = 'stay' THEN
    -- Hotel check-in event
    IF NEW.start_datetime IS NOT NULL THEN
      INSERT INTO trip_events (trip_id, event_type, event_datetime, source_type, source_id)
      VALUES (NEW.trip_id, 'hotel_checkin', NEW.start_datetime, 'booking', NEW.id);
    END IF;
    -- Hotel check-out event
    IF NEW.end_datetime IS NOT NULL THEN
      INSERT INTO trip_events (trip_id, event_type, event_datetime, source_type, source_id)
      VALUES (NEW.trip_id, 'hotel_checkout', NEW.end_datetime, 'booking', NEW.id);
    END IF;
    
  ELSIF NEW.booking_type = 'car_rental' THEN
    -- Rental pickup event
    IF NEW.start_datetime IS NOT NULL THEN
      INSERT INTO trip_events (trip_id, event_type, event_datetime, source_type, source_id)
      VALUES (NEW.trip_id, 'rental_pickup', NEW.start_datetime, 'booking', NEW.id);
    END IF;
    -- Rental return event
    IF NEW.end_datetime IS NOT NULL THEN
      INSERT INTO trip_events (trip_id, event_type, event_datetime, source_type, source_id)
      VALUES (NEW.trip_id, 'rental_return', NEW.end_datetime, 'booking', NEW.id);
    END IF;
  END IF;
  -- Note: 'activity' booking type does not generate events

  RETURN NEW;
END;
$$;

-- Function: Sync events from parking changes
CREATE OR REPLACE FUNCTION public.sync_parking_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process for Pro users
  IF NOT trip_owner_is_pro(COALESCE(NEW.trip_id, OLD.trip_id)) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Handle DELETE: remove all events for this parking
  IF TG_OP = 'DELETE' THEN
    DELETE FROM trip_events 
    WHERE source_type = 'parking' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Handle INSERT or UPDATE: sync events
  -- First, remove existing events for this parking
  DELETE FROM trip_events 
  WHERE source_type = 'parking' AND source_id = NEW.id;

  -- Create parking expiration event (only if end_datetime exists)
  IF NEW.end_datetime IS NOT NULL THEN
    INSERT INTO trip_events (trip_id, event_type, event_datetime, source_type, source_id)
    VALUES (NEW.trip_id, 'parking_expiration', NEW.end_datetime, 'parking', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers on bookings table
DROP TRIGGER IF EXISTS sync_booking_events_trigger ON bookings;
CREATE TRIGGER sync_booking_events_trigger
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION sync_booking_events();

-- Create triggers on parking table
DROP TRIGGER IF EXISTS sync_parking_events_trigger ON parking;
CREATE TRIGGER sync_parking_events_trigger
AFTER INSERT OR UPDATE OR DELETE ON parking
FOR EACH ROW
EXECUTE FUNCTION sync_parking_events();
-- Create trip_state enum
CREATE TYPE trip_state AS ENUM ('active', 'locked', 'closed');

-- Add trip_state column to trips table
ALTER TABLE trips 
ADD COLUMN trip_state trip_state NOT NULL DEFAULT 'active';

-- Create index for efficient state queries
CREATE INDEX idx_trips_state ON trips(trip_state);
CREATE INDEX idx_trips_end_date ON trips(end_date);

-- Function to check if a trip is writable (not locked or closed)
CREATE OR REPLACE FUNCTION trip_is_writable(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trips 
    WHERE id = p_trip_id 
    AND trip_state = 'active'
  );
$$;

-- Function to enforce Free plan auto-lock on past trips
CREATE OR REPLACE FUNCTION enforce_free_trip_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is Free and trip end_date has passed
  IF NOT user_is_pro(NEW.user_id) 
     AND NEW.end_date < CURRENT_DATE 
     AND NEW.trip_state = 'active' THEN
    NEW.trip_state := 'locked';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-lock free trips on any update
CREATE TRIGGER trigger_enforce_free_trip_lock
BEFORE UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION enforce_free_trip_lock();

-- Function to validate trip state transitions
CREATE OR REPLACE FUNCTION validate_trip_state_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If state is changing
  IF OLD.trip_state IS DISTINCT FROM NEW.trip_state THEN
    -- LOCKED trips cannot change state (Free plan)
    IF OLD.trip_state = 'locked' THEN
      RAISE EXCEPTION 'Locked trips cannot be modified';
    END IF;
    
    -- CLOSED trips cannot change state (Pro plan)
    IF OLD.trip_state = 'closed' THEN
      RAISE EXCEPTION 'Closed trips cannot be modified';
    END IF;
    
    -- Only Pro users can transition to CLOSED
    IF NEW.trip_state = 'closed' AND NOT user_is_pro(NEW.user_id) THEN
      RAISE EXCEPTION 'Only Pro users can close trips';
    END IF;
    
    -- Cannot transition to LOCKED manually (only system can do this)
    IF NEW.trip_state = 'locked' AND OLD.trip_state = 'active' THEN
      -- Only allow if user is Free and trip is past end date
      IF user_is_pro(NEW.user_id) OR NEW.end_date >= CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot manually lock trips';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to validate state transitions
CREATE TRIGGER trigger_validate_trip_state_transition
BEFORE UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION validate_trip_state_transition();

-- Function to check if trip allows writes (for RLS)
CREATE OR REPLACE FUNCTION user_can_write_trip(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT user_owns_trip(p_trip_id) AND trip_is_writable(p_trip_id);
$$;

-- Update RLS policies on trips table for UPDATE to check writable state
DROP POLICY IF EXISTS "Users can update their own trips" ON trips;
CREATE POLICY "Users can update their own trips" 
ON trips FOR UPDATE
USING (auth.uid() = user_id AND trip_state = 'active')
WITH CHECK (auth.uid() = user_id);

-- Update RLS policies on trips table for DELETE to check writable state
DROP POLICY IF EXISTS "Users can delete their own trips" ON trips;
CREATE POLICY "Users can delete their own trips" 
ON trips FOR DELETE
USING (auth.uid() = user_id AND trip_state = 'active');

-- Update bookings policies to check trip writability
DROP POLICY IF EXISTS "Users can create bookings for owned trips" ON bookings;
CREATE POLICY "Users can create bookings for owned trips" 
ON bookings FOR INSERT
WITH CHECK (user_can_write_trip(trip_id));

DROP POLICY IF EXISTS "Users can update bookings for owned trips" ON bookings;
CREATE POLICY "Users can update bookings for owned trips" 
ON bookings FOR UPDATE
USING (user_can_write_trip(trip_id));

DROP POLICY IF EXISTS "Users can delete bookings for owned trips" ON bookings;
CREATE POLICY "Users can delete bookings for owned trips" 
ON bookings FOR DELETE
USING (user_can_write_trip(trip_id));

-- Update expenses policies
DROP POLICY IF EXISTS "Users can create expenses for owned trips" ON expenses;
CREATE POLICY "Users can create expenses for owned trips" 
ON expenses FOR INSERT
WITH CHECK (user_can_write_trip(trip_id));

DROP POLICY IF EXISTS "Users can update expenses for owned trips" ON expenses;
CREATE POLICY "Users can update expenses for owned trips" 
ON expenses FOR UPDATE
USING (user_can_write_trip(trip_id));

DROP POLICY IF EXISTS "Users can delete expenses for owned trips" ON expenses;
CREATE POLICY "Users can delete expenses for owned trips" 
ON expenses FOR DELETE
USING (user_can_write_trip(trip_id));

-- Update companions policies
DROP POLICY IF EXISTS "Users can create companions for owned trips" ON companions;
CREATE POLICY "Users can create companions for owned trips" 
ON companions FOR INSERT
WITH CHECK (user_can_write_trip(trip_id));

DROP POLICY IF EXISTS "Users can update companions for owned trips" ON companions;
CREATE POLICY "Users can update companions for owned trips" 
ON companions FOR UPDATE
USING (user_can_write_trip(trip_id));

DROP POLICY IF EXISTS "Users can delete companions for owned trips" ON companions;
CREATE POLICY "Users can delete companions for owned trips" 
ON companions FOR DELETE
USING (user_can_write_trip(trip_id));

-- Update packing_items policies
DROP POLICY IF EXISTS "Users can create packing items for owned trips" ON packing_items;
CREATE POLICY "Users can create packing items for owned trips" 
ON packing_items FOR INSERT
WITH CHECK (user_can_write_trip(trip_id));

DROP POLICY IF EXISTS "Users can update packing items for owned trips" ON packing_items;
CREATE POLICY "Users can update packing items for owned trips" 
ON packing_items FOR UPDATE
USING (user_can_write_trip(trip_id));

DROP POLICY IF EXISTS "Users can delete packing items for owned trips" ON packing_items;
CREATE POLICY "Users can delete packing items for owned trips" 
ON packing_items FOR DELETE
USING (user_can_write_trip(trip_id));

-- Update parking policies
DROP POLICY IF EXISTS "Users can create parking for owned trips" ON parking;
CREATE POLICY "Users can create parking for owned trips" 
ON parking FOR INSERT
WITH CHECK (user_can_write_trip(trip_id));

DROP POLICY IF EXISTS "Users can update parking for owned trips" ON parking;
CREATE POLICY "Users can update parking for owned trips" 
ON parking FOR UPDATE
USING (user_can_write_trip(trip_id));

DROP POLICY IF EXISTS "Users can delete parking for owned trips" ON parking;
CREATE POLICY "Users can delete parking for owned trips" 
ON parking FOR DELETE
USING (user_can_write_trip(trip_id));

-- Update trip_notes policies
DROP POLICY IF EXISTS "Users can create notes for owned trips" ON trip_notes;
CREATE POLICY "Users can create notes for owned trips" 
ON trip_notes FOR INSERT
WITH CHECK (user_can_write_trip(trip_id));

DROP POLICY IF EXISTS "Users can update notes for owned trips" ON trip_notes;
CREATE POLICY "Users can update notes for owned trips" 
ON trip_notes FOR UPDATE
USING (user_can_write_trip(trip_id));

DROP POLICY IF EXISTS "Users can delete notes for owned trips" ON trip_notes;
CREATE POLICY "Users can delete notes for owned trips" 
ON trip_notes FOR DELETE
USING (user_can_write_trip(trip_id));

-- Update booking_companions policies
DROP POLICY IF EXISTS "Users can create booking companions for owned bookings" ON booking_companions;
CREATE POLICY "Users can create booking companions for owned bookings" 
ON booking_companions FOR INSERT
WITH CHECK (
  user_owns_booking(booking_id) 
  AND trip_is_writable((SELECT trip_id FROM bookings WHERE id = booking_id))
);

DROP POLICY IF EXISTS "Users can delete booking companions for owned bookings" ON booking_companions;
CREATE POLICY "Users can delete booking companions for owned bookings" 
ON booking_companions FOR DELETE
USING (
  user_owns_booking(booking_id) 
  AND trip_is_writable((SELECT trip_id FROM bookings WHERE id = booking_id))
);

-- Function for scheduled retention job to lock Free trips and delete Pro trips
CREATE OR REPLACE FUNCTION run_trip_lifecycle_enforcement()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  locked_count integer := 0;
  deleted_count integer := 0;
  trip_record RECORD;
BEGIN
  -- Step 1: Lock all Free user trips that are past end_date and still active
  UPDATE trips t
  SET trip_state = 'locked', updated_at = now()
  WHERE t.trip_state = 'active'
    AND t.end_date < CURRENT_DATE
    AND NOT user_is_pro(t.user_id);
  
  GET DIAGNOSTICS locked_count = ROW_COUNT;

  -- Step 2: Hard delete Pro trips that are CLOSED and 45+ days past end_date
  -- First delete all related data, then the trip itself
  FOR trip_record IN 
    SELECT t.id 
    FROM trips t
    WHERE t.trip_state = 'closed'
      AND t.end_date + INTERVAL '45 days' <= CURRENT_DATE
      AND user_is_pro(t.user_id)
  LOOP
    -- Delete related data in order (respecting foreign keys)
    DELETE FROM booking_companions WHERE booking_id IN (SELECT id FROM bookings WHERE trip_id = trip_record.id);
    DELETE FROM bookings WHERE trip_id = trip_record.id;
    DELETE FROM expenses WHERE trip_id = trip_record.id;
    DELETE FROM companions WHERE trip_id = trip_record.id;
    DELETE FROM packing_items WHERE trip_id = trip_record.id;
    DELETE FROM parking WHERE trip_id = trip_record.id;
    DELETE FROM trip_notes WHERE trip_id = trip_record.id;
    DELETE FROM trip_events WHERE trip_id = trip_record.id;
    DELETE FROM trip_shares WHERE trip_id = trip_record.id;
    DELETE FROM trips WHERE id = trip_record.id;
    
    deleted_count := deleted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'locked_free_trips', locked_count,
    'deleted_pro_trips', deleted_count,
    'executed_at', now()
  );
END;
$$;
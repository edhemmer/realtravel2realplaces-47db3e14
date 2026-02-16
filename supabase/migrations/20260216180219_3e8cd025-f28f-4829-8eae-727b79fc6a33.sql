-- Fix: Allow owner row deletion when the trip itself is being deleted
-- The trigger should only block direct member removal, not cascade from trip deletion
CREATE OR REPLACE FUNCTION public.prevent_owner_removal()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Allow cascade deletes when the trip itself is being deleted
  IF NOT EXISTS (SELECT 1 FROM public.trips WHERE id = OLD.trip_id) THEN
    RETURN OLD;
  END IF;
  
  IF OLD.role = 'owner' THEN
    RAISE EXCEPTION 'Cannot remove trip owner';
  END IF;
  RETURN OLD;
END;
$$;
-- Fix infinite recursion in RLS policies by using security definer functions

-- 1. Create a security definer function to check if user has access to a trip
CREATE OR REPLACE FUNCTION public.user_has_trip_access(trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_id AND t.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM trip_shares ts
    WHERE ts.trip_id = trip_id 
    AND (ts.shared_with_user_id = auth.uid() 
         OR ts.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
    AND ts.accepted_at IS NOT NULL
  )
$$;

-- 2. Create a function to check if user owns a trip (for non-SELECT operations)
CREATE OR REPLACE FUNCTION public.user_owns_trip(trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_id AND t.user_id = auth.uid()
  )
$$;

-- 3. Drop the problematic policy on trips that causes recursion
DROP POLICY IF EXISTS "Users can view shared trips" ON trips;

-- 4. Create new policies using the security definer functions
CREATE POLICY "Users can view accessible trips" 
ON trips FOR SELECT
USING (
  user_id = auth.uid() 
  OR public.user_has_trip_access(id)
);

-- 5. Update child table policies to use the security definer function
-- Bookings
DROP POLICY IF EXISTS "Users can view bookings for their trips" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings for their trips" ON bookings;
DROP POLICY IF EXISTS "Users can update bookings for their trips" ON bookings;
DROP POLICY IF EXISTS "Users can delete bookings for their trips" ON bookings;

CREATE POLICY "Users can view bookings for accessible trips" 
ON bookings FOR SELECT USING (public.user_has_trip_access(trip_id));

CREATE POLICY "Users can create bookings for owned trips" 
ON bookings FOR INSERT WITH CHECK (public.user_owns_trip(trip_id));

CREATE POLICY "Users can update bookings for owned trips" 
ON bookings FOR UPDATE USING (public.user_owns_trip(trip_id));

CREATE POLICY "Users can delete bookings for owned trips" 
ON bookings FOR DELETE USING (public.user_owns_trip(trip_id));

-- Expenses
DROP POLICY IF EXISTS "Users can view expenses for their trips" ON expenses;
DROP POLICY IF EXISTS "Users can create expenses for their trips" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses for their trips" ON expenses;
DROP POLICY IF EXISTS "Users can delete expenses for their trips" ON expenses;

CREATE POLICY "Users can view expenses for accessible trips" 
ON expenses FOR SELECT USING (public.user_has_trip_access(trip_id));

CREATE POLICY "Users can create expenses for owned trips" 
ON expenses FOR INSERT WITH CHECK (public.user_owns_trip(trip_id));

CREATE POLICY "Users can update expenses for owned trips" 
ON expenses FOR UPDATE USING (public.user_owns_trip(trip_id));

CREATE POLICY "Users can delete expenses for owned trips" 
ON expenses FOR DELETE USING (public.user_owns_trip(trip_id));

-- Companions
DROP POLICY IF EXISTS "Users can view companions for their trips" ON companions;
DROP POLICY IF EXISTS "Users can create companions for their trips" ON companions;
DROP POLICY IF EXISTS "Users can update companions for their trips" ON companions;
DROP POLICY IF EXISTS "Users can delete companions for their trips" ON companions;

CREATE POLICY "Users can view companions for accessible trips" 
ON companions FOR SELECT USING (public.user_has_trip_access(trip_id));

CREATE POLICY "Users can create companions for owned trips" 
ON companions FOR INSERT WITH CHECK (public.user_owns_trip(trip_id));

CREATE POLICY "Users can update companions for owned trips" 
ON companions FOR UPDATE USING (public.user_owns_trip(trip_id));

CREATE POLICY "Users can delete companions for owned trips" 
ON companions FOR DELETE USING (public.user_owns_trip(trip_id));

-- Packing Items
DROP POLICY IF EXISTS "Users can view packing items for their trips" ON packing_items;
DROP POLICY IF EXISTS "Users can create packing items for their trips" ON packing_items;
DROP POLICY IF EXISTS "Users can update packing items for their trips" ON packing_items;
DROP POLICY IF EXISTS "Users can delete packing items for their trips" ON packing_items;

CREATE POLICY "Users can view packing items for accessible trips" 
ON packing_items FOR SELECT USING (public.user_has_trip_access(trip_id));

CREATE POLICY "Users can create packing items for owned trips" 
ON packing_items FOR INSERT WITH CHECK (public.user_owns_trip(trip_id));

CREATE POLICY "Users can update packing items for owned trips" 
ON packing_items FOR UPDATE USING (public.user_owns_trip(trip_id));

CREATE POLICY "Users can delete packing items for owned trips" 
ON packing_items FOR DELETE USING (public.user_owns_trip(trip_id));

-- Parking
DROP POLICY IF EXISTS "Users can view parking for their trips" ON parking;
DROP POLICY IF EXISTS "Users can create parking for their trips" ON parking;
DROP POLICY IF EXISTS "Users can update parking for their trips" ON parking;
DROP POLICY IF EXISTS "Users can delete parking for their trips" ON parking;

CREATE POLICY "Users can view parking for accessible trips" 
ON parking FOR SELECT USING (public.user_has_trip_access(trip_id));

CREATE POLICY "Users can create parking for owned trips" 
ON parking FOR INSERT WITH CHECK (public.user_owns_trip(trip_id));

CREATE POLICY "Users can update parking for owned trips" 
ON parking FOR UPDATE USING (public.user_owns_trip(trip_id));

CREATE POLICY "Users can delete parking for owned trips" 
ON parking FOR DELETE USING (public.user_owns_trip(trip_id));

-- Trip Notes
DROP POLICY IF EXISTS "Users can view notes for their trips" ON trip_notes;
DROP POLICY IF EXISTS "Users can create notes for their trips" ON trip_notes;
DROP POLICY IF EXISTS "Users can update notes for their trips" ON trip_notes;
DROP POLICY IF EXISTS "Users can delete notes for their trips" ON trip_notes;

CREATE POLICY "Users can view notes for accessible trips" 
ON trip_notes FOR SELECT USING (public.user_has_trip_access(trip_id));

CREATE POLICY "Users can create notes for owned trips" 
ON trip_notes FOR INSERT WITH CHECK (public.user_owns_trip(trip_id));

CREATE POLICY "Users can update notes for owned trips" 
ON trip_notes FOR UPDATE USING (public.user_owns_trip(trip_id));

CREATE POLICY "Users can delete notes for owned trips" 
ON trip_notes FOR DELETE USING (public.user_owns_trip(trip_id));
-- Phase 2: enforce the meaning of scoped guest capabilities in Postgres.
-- Existing permissive RLS remains in place. These restrictive policies add a
-- non-bypassable upper bound so a client/UI mistake cannot turn a scoped flag
-- into generic write access.

CREATE OR REPLACE FUNCTION public.rt2rp_guest_can_add_expense(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT user_owns_trip(p_trip_id)
    OR EXISTS (
      SELECT 1
      FROM public.trip_members tm
      WHERE tm.trip_id = p_trip_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'guest'
        AND tm.read_only = false
        AND tm.can_expenses = true
    );
$$;

CREATE OR REPLACE FUNCTION public.rt2rp_guest_can_add_stay(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT user_owns_trip(p_trip_id)
    OR EXISTS (
      SELECT 1
      FROM public.trip_members tm
      WHERE tm.trip_id = p_trip_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'guest'
        AND tm.read_only = false
        AND tm.can_stay = true
    );
$$;

DROP POLICY IF EXISTS "RT2RP scoped expense insert" ON public.expenses;
CREATE POLICY "RT2RP scoped expense insert"
ON public.expenses AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (public.rt2rp_guest_can_add_expense(trip_id));

-- "Can add expenses" is intentionally not "can modify everyone's expenses".
DROP POLICY IF EXISTS "RT2RP scoped expense update" ON public.expenses;
CREATE POLICY "RT2RP scoped expense update"
ON public.expenses AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (user_owns_trip(trip_id))
WITH CHECK (user_owns_trip(trip_id));

DROP POLICY IF EXISTS "RT2RP scoped expense delete" ON public.expenses;
CREATE POLICY "RT2RP scoped expense delete"
ON public.expenses AS RESTRICTIVE
FOR DELETE TO authenticated
USING (user_owns_trip(trip_id));

-- "Can add lodging" permits only creation of stay records. It does not grant
-- edits/deletes of existing reservations or creation of flights/cars/activities.
DROP POLICY IF EXISTS "RT2RP scoped booking insert" ON public.bookings;
CREATE POLICY "RT2RP scoped booking insert"
ON public.bookings AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (
  user_owns_trip(trip_id)
  OR (booking_type = 'stay' AND public.rt2rp_guest_can_add_stay(trip_id))
);

DROP POLICY IF EXISTS "RT2RP scoped booking update" ON public.bookings;
CREATE POLICY "RT2RP scoped booking update"
ON public.bookings AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (user_owns_trip(trip_id))
WITH CHECK (user_owns_trip(trip_id));

DROP POLICY IF EXISTS "RT2RP scoped booking delete" ON public.bookings;
CREATE POLICY "RT2RP scoped booking delete"
ON public.bookings AS RESTRICTIVE
FOR DELETE TO authenticated
USING (user_owns_trip(trip_id));

-- Trip identity/metadata is always owner-managed.
DROP POLICY IF EXISTS "RT2RP scoped trip update" ON public.trips;
CREATE POLICY "RT2RP scoped trip update"
ON public.trips AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (user_owns_trip(id))
WITH CHECK (user_owns_trip(id));

DROP POLICY IF EXISTS "RT2RP scoped trip delete" ON public.trips;
CREATE POLICY "RT2RP scoped trip delete"
ON public.trips AS RESTRICTIVE
FOR DELETE TO authenticated
USING (user_owns_trip(id));

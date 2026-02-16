
-- v3.9.8: RPC for member self-removal
CREATE OR REPLACE FUNCTION public.remove_my_trip_membership(p_trip_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  -- Refuse if user is owner
  IF user_owns_trip(p_trip_id) THEN
    RAISE EXCEPTION 'Trip owner cannot remove their own membership';
  END IF;

  -- Delete membership
  DELETE FROM trip_members
  WHERE trip_id = p_trip_id AND user_id = v_user_id AND role = 'guest';

  -- Delete legacy trip_shares
  DELETE FROM trip_shares
  WHERE trip_id = p_trip_id
    AND (shared_with_user_id = v_user_id OR shared_with_email = (SELECT email FROM auth.users WHERE id = v_user_id));

  RETURN true;
END;
$function$;

-- Ensure cascade on trip deletion: add ON DELETE CASCADE to trip_members, trip_shares, trip_invites FK if not already
-- Check and recreate FKs with CASCADE

-- trip_members -> trips
ALTER TABLE public.trip_members DROP CONSTRAINT IF EXISTS trip_members_trip_id_fkey;
ALTER TABLE public.trip_members ADD CONSTRAINT trip_members_trip_id_fkey
  FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

-- trip_shares -> trips
ALTER TABLE public.trip_shares DROP CONSTRAINT IF EXISTS trip_shares_trip_id_fkey;
ALTER TABLE public.trip_shares ADD CONSTRAINT trip_shares_trip_id_fkey
  FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

-- trip_invites -> trips
ALTER TABLE public.trip_invites DROP CONSTRAINT IF EXISTS trip_invites_trip_id_fkey;
ALTER TABLE public.trip_invites ADD CONSTRAINT trip_invites_trip_id_fkey
  FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


-- v2.2.6: Granular guest permissions on trip_members
-- Add permission columns with defaults matching TFF (read_only=true, can_expenses=false, can_stay=false)
ALTER TABLE public.trip_members
  ADD COLUMN IF NOT EXISTS read_only boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_expenses boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_stay boolean NOT NULL DEFAULT false;

-- Add permission columns to trip_invites to carry permissions through invite flow
ALTER TABLE public.trip_invites
  ADD COLUMN IF NOT EXISTS read_only boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_expenses boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_stay boolean NOT NULL DEFAULT false;

-- Backend constraint: reject INVITE_PERMISSION_CONFLICT (read_only=true AND (can_expenses=true OR can_stay=true))
-- Uses validation trigger instead of CHECK constraint per project guidelines
CREATE OR REPLACE FUNCTION public.validate_member_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- INVITE_PERMISSION_CONFLICT: read_only=true with any write permission
  IF NEW.read_only = true AND (NEW.can_expenses = true OR NEW.can_stay = true) THEN
    RAISE EXCEPTION 'INVITE_PERMISSION_CONFLICT: read_only cannot be true when can_expenses or can_stay is true';
  END IF;
  
  -- INVITE_PERMISSION_EMPTY: read_only=false with no write permissions → default to TFF
  IF NEW.read_only = false AND NEW.can_expenses = false AND NEW.can_stay = false THEN
    NEW.read_only := true;
  END IF;
  
  -- Owners always have full access, override any permission columns
  IF NEW.role = 'owner' THEN
    NEW.read_only := false;
    NEW.can_expenses := true;
    NEW.can_stay := true;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_member_permissions_trigger
  BEFORE INSERT OR UPDATE ON public.trip_members
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_member_permissions();

CREATE TRIGGER validate_invite_permissions_trigger
  BEFORE INSERT OR UPDATE ON public.trip_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_member_permissions();

-- Update create_trip_invite to accept permission params
CREATE OR REPLACE FUNCTION public.create_trip_invite(
  p_trip_id uuid, 
  p_invitee_email text, 
  p_ttl_days integer DEFAULT 7,
  p_read_only boolean DEFAULT true,
  p_can_expenses boolean DEFAULT false,
  p_can_stay boolean DEFAULT false
)
RETURNS TABLE(invite_id uuid, invite_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token TEXT;
  v_hash TEXT;
  v_invite_id UUID;
BEGIN
  IF NOT is_trip_owner_member(p_trip_id) THEN
    RAISE EXCEPTION 'Only trip owner can create invites';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token::bytea, 'sha256'), 'hex');

  INSERT INTO trip_invites (trip_id, inviter_user_id, invitee_email, token_hash, expires_at, read_only, can_expenses, can_stay)
  VALUES (p_trip_id, auth.uid(), p_invitee_email, v_hash, now() + (p_ttl_days || ' days')::interval, p_read_only, p_can_expenses, p_can_stay)
  RETURNING id INTO v_invite_id;

  RETURN QUERY SELECT v_invite_id, v_token;
END;
$$;

-- Update accept_trip_invite to carry permissions from invite to membership
CREATE OR REPLACE FUNCTION public.accept_trip_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hash TEXT;
  v_invite RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  v_hash := encode(digest(p_token::bytea, 'sha256'), 'hex');

  SELECT * INTO v_invite FROM trip_invites
  WHERE token_hash = v_hash AND status = 'pending' AND expires_at > now()
  LIMIT 1;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  -- Create guest membership with permissions from invite
  INSERT INTO trip_members (trip_id, user_id, role, read_only, can_expenses, can_stay)
  VALUES (v_invite.trip_id, v_user_id, 'guest', v_invite.read_only, v_invite.can_expenses, v_invite.can_stay)
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Mark invite accepted
  UPDATE trip_invites
  SET status = 'accepted', accepted_by_user_id = v_user_id
  WHERE id = v_invite.id;

  RETURN v_invite.trip_id;
END;
$$;

-- Update guest_can_write_trip to respect read_only flag
CREATE OR REPLACE FUNCTION public.guest_can_write_trip(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = p_trip_id 
      AND user_id = auth.uid() 
      AND role = 'guest'
      AND read_only = false
  ) AND trip_is_writable(p_trip_id);
$$;

-- New: Check if guest can add expenses
CREATE OR REPLACE FUNCTION public.guest_can_add_expenses(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = p_trip_id 
      AND user_id = auth.uid() 
      AND role = 'guest'
      AND can_expenses = true
  ) AND trip_is_writable(p_trip_id);
$$;

-- New: Check if guest can add stays
CREATE OR REPLACE FUNCTION public.guest_can_add_stays(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = p_trip_id 
      AND user_id = auth.uid() 
      AND role = 'guest'
      AND can_stay = true
  ) AND trip_is_writable(p_trip_id);
$$;

-- Update RLS: Guests can create expenses only if can_expenses=true
DROP POLICY IF EXISTS "Guests can create expenses for member trips" ON public.expenses;
CREATE POLICY "Guests can create expenses for member trips"
ON public.expenses
FOR INSERT
WITH CHECK (guest_can_add_expenses(trip_id));

-- Update RLS: Guests can update expense category only if can_expenses=true
DROP POLICY IF EXISTS "Guests can update expense category" ON public.expenses;
CREATE POLICY "Guests can update expense category"
ON public.expenses
FOR UPDATE
USING (guest_can_add_expenses(trip_id));

-- Update RLS: Guests can create stay bookings only if can_stay=true
DROP POLICY IF EXISTS "Guests can create stay bookings" ON public.bookings;
CREATE POLICY "Guests can create stay bookings"
ON public.bookings
FOR INSERT
WITH CHECK (guest_can_add_stays(trip_id) AND booking_type = 'stay'::booking_type);

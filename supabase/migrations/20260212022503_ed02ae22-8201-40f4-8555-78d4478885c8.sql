
-- v2.2.2: Collaboration Layer — Secure Invite + Membership Foundation

-- 1. Enable pgcrypto for token hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Enums
CREATE TYPE public.trip_member_role AS ENUM ('owner', 'guest');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- 3. trip_members table
CREATE TABLE public.trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role trip_member_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

-- 4. trip_invites table
CREATE TABLE public.trip_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  inviter_user_id UUID NOT NULL,
  invitee_email TEXT NOT NULL,
  role trip_member_role NOT NULL DEFAULT 'guest',
  token_hash TEXT NOT NULL,
  status invite_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;

-- 5. Helper functions

-- Check if authenticated user is trip owner via trip_members
CREATE OR REPLACE FUNCTION public.is_trip_owner_member(p_trip_id UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = p_trip_id AND user_id = auth.uid() AND role = 'owner'
  );
$$;

-- Check if authenticated user is a guest via trip_members
CREATE OR REPLACE FUNCTION public.is_trip_guest(p_trip_id UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = p_trip_id AND user_id = auth.uid() AND role = 'guest'
  );
$$;

-- Guest write access: must be guest + trip active
CREATE OR REPLACE FUNCTION public.guest_can_write_trip(p_trip_id UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT is_trip_guest(p_trip_id) AND trip_is_writable(p_trip_id);
$$;

-- 6. Extend user_has_trip_access to include trip_members
CREATE OR REPLACE FUNCTION public.user_has_trip_access(trip_id UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trips t WHERE t.id = trip_id AND t.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM trip_shares ts
    WHERE ts.trip_id = trip_id
    AND (ts.shared_with_user_id = auth.uid()
         OR ts.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
    AND ts.accepted_at IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_id AND tm.user_id = auth.uid()
  );
$$;

-- 7. Auto-create owner membership on trip insert
CREATE OR REPLACE FUNCTION public.auto_create_trip_owner()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO trip_members (trip_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner')
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_trip_owner
AFTER INSERT ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.auto_create_trip_owner();

-- 8. Enforce exactly 1 owner per trip
CREATE OR REPLACE FUNCTION public.enforce_single_owner()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'owner' THEN
    IF EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_id = NEW.trip_id AND role = 'owner' AND id IS DISTINCT FROM NEW.id
    ) THEN
      RAISE EXCEPTION 'Trip already has an owner';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_single_owner
BEFORE INSERT OR UPDATE ON public.trip_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_owner();

-- 9. Prevent owner removal
CREATE OR REPLACE FUNCTION public.prevent_owner_removal()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'owner' THEN
    RAISE EXCEPTION 'Cannot remove trip owner';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_owner_removal
BEFORE DELETE ON public.trip_members
FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_removal();

-- 10. Restrict guest expense updates to category only
CREATE OR REPLACE FUNCTION public.restrict_guest_expense_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only restrict guests, not owners
  IF is_trip_guest(NEW.trip_id) AND NOT user_owns_trip(NEW.trip_id) THEN
    IF OLD.amount IS DISTINCT FROM NEW.amount
       OR OLD.date IS DISTINCT FROM NEW.date
       OR OLD.description IS DISTINCT FROM NEW.description
       OR OLD.my_share IS DISTINCT FROM NEW.my_share
       OR OLD.notes IS DISTINCT FROM NEW.notes
       OR OLD.receipt_url IS DISTINCT FROM NEW.receipt_url
       OR OLD.expense_purpose IS DISTINCT FROM NEW.expense_purpose
       OR OLD.sub_category IS DISTINCT FROM NEW.sub_category
       OR OLD.engagement_id IS DISTINCT FROM NEW.engagement_id
       OR OLD.trip_id IS DISTINCT FROM NEW.trip_id
    THEN
      RAISE EXCEPTION 'Guests can only update expense category';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restrict_guest_expense_update
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.restrict_guest_expense_update();

-- 11. Seed existing trips with owner membership
INSERT INTO public.trip_members (trip_id, user_id, role)
SELECT id, user_id, 'owner'::trip_member_role FROM public.trips
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- 12. Secure invite creation (SECURITY DEFINER — token never stored plaintext)
CREATE OR REPLACE FUNCTION public.create_trip_invite(
  p_trip_id UUID,
  p_invitee_email TEXT,
  p_ttl_days INT DEFAULT 7
)
RETURNS TABLE(invite_id UUID, invite_token TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

  INSERT INTO trip_invites (trip_id, inviter_user_id, invitee_email, token_hash, expires_at)
  VALUES (p_trip_id, auth.uid(), p_invitee_email, v_hash, now() + (p_ttl_days || ' days')::interval)
  RETURNING id INTO v_invite_id;

  RETURN QUERY SELECT v_invite_id, v_token;
END;
$$;

-- 13. Accept invite (SECURITY DEFINER — validates hash + status + expiry)
CREATE OR REPLACE FUNCTION public.accept_trip_invite(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

  -- Create guest membership
  INSERT INTO trip_members (trip_id, user_id, role)
  VALUES (v_invite.trip_id, v_user_id, 'guest')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Mark invite accepted
  UPDATE trip_invites
  SET status = 'accepted', accepted_by_user_id = v_user_id
  WHERE id = v_invite.id;

  RETURN v_invite.trip_id;
END;
$$;

-- 14. Revoke invite (owner only)
CREATE OR REPLACE FUNCTION public.revoke_trip_invite(p_invite_id UUID)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT * INTO v_invite FROM trip_invites WHERE id = p_invite_id AND status = 'pending';

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found or already processed';
  END IF;

  IF NOT is_trip_owner_member(v_invite.trip_id) THEN
    RAISE EXCEPTION 'Only trip owner can revoke invites';
  END IF;

  UPDATE trip_invites SET status = 'revoked' WHERE id = p_invite_id;
  RETURN true;
END;
$$;

-- 15. RLS policies — trip_members

-- Block anonymous
CREATE POLICY "Block anonymous trip_members access"
ON public.trip_members FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Members can view memberships for their trips
CREATE POLICY "Members can view trip memberships"
ON public.trip_members FOR SELECT
USING (user_id = auth.uid() OR is_trip_owner_member(trip_id));

-- Only system (triggers/functions) manages trip_members — no direct user INSERT/UPDATE/DELETE
-- Owner removal blocked by trigger; membership created via accept_trip_invite or auto_create_trip_owner

-- Owners can remove guests
CREATE POLICY "Owners can remove guest members"
ON public.trip_members FOR DELETE
USING (is_trip_owner_member(trip_id) AND role = 'guest');

-- 16. RLS policies — trip_invites

CREATE POLICY "Block anonymous trip_invites access"
ON public.trip_invites FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Owners can view their trip invites
CREATE POLICY "Owners can view trip invites"
ON public.trip_invites FOR SELECT
USING (is_trip_owner_member(trip_id));

-- Invitees can view their own invites
CREATE POLICY "Invitees can view own invites"
ON public.trip_invites FOR SELECT
USING (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text);

-- 17. Guest write policies — expenses

-- Guests can insert expenses
CREATE POLICY "Guests can create expenses for member trips"
ON public.expenses FOR INSERT
WITH CHECK (guest_can_write_trip(trip_id));

-- Guests can update expenses (trigger restricts to category only)
CREATE POLICY "Guests can update expense category"
ON public.expenses FOR UPDATE
USING (guest_can_write_trip(trip_id));

-- 18. Guest write policies — bookings (stays only)

CREATE POLICY "Guests can create stay bookings"
ON public.bookings FOR INSERT
WITH CHECK (guest_can_write_trip(trip_id) AND booking_type = 'stay');

-- 19. Update run_trip_lifecycle_enforcement to also clean up trip_members and trip_invites
CREATE OR REPLACE FUNCTION public.run_trip_lifecycle_enforcement()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  locked_count integer := 0;
  deleted_count integer := 0;
  trip_record RECORD;
BEGIN
  UPDATE trips t
  SET trip_state = 'locked', updated_at = now()
  WHERE t.trip_state = 'active'
    AND t.end_date < CURRENT_DATE
    AND NOT user_is_pro(t.user_id);

  GET DIAGNOSTICS locked_count = ROW_COUNT;

  FOR trip_record IN
    SELECT t.id
    FROM trips t
    WHERE t.trip_state = 'closed'
      AND t.end_date + INTERVAL '45 days' <= CURRENT_DATE
      AND user_is_pro(t.user_id)
  LOOP
    DELETE FROM booking_companions WHERE booking_id IN (SELECT id FROM bookings WHERE trip_id = trip_record.id);
    DELETE FROM bookings WHERE trip_id = trip_record.id;
    DELETE FROM expenses WHERE trip_id = trip_record.id;
    DELETE FROM companions WHERE trip_id = trip_record.id;
    DELETE FROM packing_items WHERE trip_id = trip_record.id;
    DELETE FROM parking WHERE trip_id = trip_record.id;
    DELETE FROM trip_notes WHERE trip_id = trip_record.id;
    DELETE FROM trip_events WHERE trip_id = trip_record.id;
    DELETE FROM trip_shares WHERE trip_id = trip_record.id;
    DELETE FROM trip_invites WHERE trip_id = trip_record.id;
    DELETE FROM trip_members WHERE trip_id = trip_record.id;
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

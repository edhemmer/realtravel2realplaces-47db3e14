
-- 1) Add 'declined' to invite_status enum
ALTER TYPE public.invite_status ADD VALUE IF NOT EXISTS 'declined';

-- 2) Add declined_at and declined_by_user_id columns to trip_invites
ALTER TABLE public.trip_invites
  ADD COLUMN IF NOT EXISTS declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS declined_by_user_id uuid;

-- 3) RPC: accept_trip_invite_by_id — accepts an invite by ID for the current user
CREATE OR REPLACE FUNCTION public.accept_trip_invite_by_id(p_invite_id uuid)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Find the invite
  SELECT * INTO v_invite FROM trip_invites
  WHERE id = p_invite_id AND status = 'pending' AND expires_at > now()
  LIMIT 1;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  -- Verify the invite is addressed to this user (by email match)
  IF lower(v_invite.invitee_email) <> lower(v_user_email) THEN
    RAISE EXCEPTION 'This invite is not addressed to you';
  END IF;

  -- Create membership (idempotent)
  INSERT INTO trip_members (trip_id, user_id, role, read_only, can_expenses, can_stay)
  VALUES (v_invite.trip_id, v_user_id, 'guest', v_invite.read_only, v_invite.can_expenses, v_invite.can_stay)
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Mark invite accepted
  UPDATE trip_invites
  SET status = 'accepted', accepted_by_user_id = v_user_id
  WHERE id = p_invite_id AND status = 'pending';

  RETURN v_invite.trip_id;
END;
$function$;

-- 4) RPC: decline_trip_invite — declines an invite by ID for the current user
CREATE OR REPLACE FUNCTION public.decline_trip_invite(p_invite_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  SELECT * INTO v_invite FROM trip_invites
  WHERE id = p_invite_id AND status = 'pending'
  LIMIT 1;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found or already processed';
  END IF;

  -- Verify ownership by email
  IF lower(v_invite.invitee_email) <> lower(v_user_email) THEN
    RAISE EXCEPTION 'This invite is not addressed to you';
  END IF;

  UPDATE trip_invites
  SET status = 'declined',
      declined_at = now(),
      declined_by_user_id = v_user_id
  WHERE id = p_invite_id AND status = 'pending';

  RETURN true;
END;
$function$;

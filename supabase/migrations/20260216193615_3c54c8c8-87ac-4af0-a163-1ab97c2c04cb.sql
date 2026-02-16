-- Fix create_trip_invite (with permissions overload) to include extensions in search_path
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
SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;

-- Fix the simpler overload too
CREATE OR REPLACE FUNCTION public.create_trip_invite(
  p_trip_id uuid,
  p_invitee_email text,
  p_ttl_days integer DEFAULT 7
)
RETURNS TABLE(invite_id uuid, invite_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;

-- Also fix accept_trip_invite search_path for digest()
CREATE OR REPLACE FUNCTION public.accept_trip_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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

  INSERT INTO trip_members (trip_id, user_id, role, read_only, can_expenses, can_stay)
  VALUES (v_invite.trip_id, v_user_id, 'guest', v_invite.read_only, v_invite.can_expenses, v_invite.can_stay)
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  UPDATE trip_invites
  SET status = 'accepted', accepted_by_user_id = v_user_id
  WHERE id = v_invite.id;

  RETURN v_invite.trip_id;
END;
$function$;
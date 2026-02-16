
-- v3.9.1: Fix invite email normalization + idempotent accept

-- 1) Update create_trip_invite (6-param version) to normalize email and attempt user lookup
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
  v_normalized_email TEXT;
BEGIN
  IF NOT is_trip_owner_member(p_trip_id) THEN
    RAISE EXCEPTION 'Only trip owner can create invites';
  END IF;

  -- Normalize email: trim + lowercase
  v_normalized_email := lower(trim(p_invitee_email));

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token::bytea, 'sha256'), 'hex');

  INSERT INTO trip_invites (trip_id, inviter_user_id, invitee_email, token_hash, expires_at, read_only, can_expenses, can_stay)
  VALUES (p_trip_id, auth.uid(), v_normalized_email, v_hash, now() + (p_ttl_days || ' days')::interval, p_read_only, p_can_expenses, p_can_stay)
  RETURNING id INTO v_invite_id;

  RETURN QUERY SELECT v_invite_id, v_token;
END;
$function$;

-- 2) Update create_trip_invite (3-param version) to normalize email
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
  v_normalized_email TEXT;
BEGIN
  IF NOT is_trip_owner_member(p_trip_id) THEN
    RAISE EXCEPTION 'Only trip owner can create invites';
  END IF;

  v_normalized_email := lower(trim(p_invitee_email));

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token::bytea, 'sha256'), 'hex');

  INSERT INTO trip_invites (trip_id, inviter_user_id, invitee_email, token_hash, expires_at)
  VALUES (p_trip_id, auth.uid(), v_normalized_email, v_hash, now() + (p_ttl_days || ' days')::interval)
  RETURNING id INTO v_invite_id;

  RETURN QUERY SELECT v_invite_id, v_token;
END;
$function$;

-- 3) Make accept_trip_invite_by_id idempotent: if already a member, still mark invite accepted
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

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Find the invite (pending only)
  SELECT * INTO v_invite FROM trip_invites
  WHERE id = p_invite_id AND status = 'pending' AND expires_at > now()
  LIMIT 1;

  IF v_invite IS NULL THEN
    -- Check if already accepted (idempotent)
    SELECT * INTO v_invite FROM trip_invites
    WHERE id = p_invite_id AND status = 'accepted';
    IF v_invite IS NOT NULL THEN
      RETURN v_invite.trip_id;
    END IF;
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  -- Verify the invite is addressed to this user (by email match)
  IF lower(v_invite.invitee_email) <> lower(v_user_email) THEN
    RAISE EXCEPTION 'This invite is not addressed to you';
  END IF;

  -- Create membership (idempotent via ON CONFLICT)
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

-- 4) Update get_my_pending_invites to be more robust with expires_at handling
CREATE OR REPLACE FUNCTION public.get_my_pending_invites()
RETURNS TABLE(
  id uuid, 
  trip_id uuid, 
  inviter_user_id uuid, 
  invitee_email text, 
  read_only boolean, 
  can_expenses boolean, 
  can_stay boolean, 
  expires_at timestamp with time zone, 
  created_at timestamp with time zone, 
  trip_name text, 
  inviter_display_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email TEXT;
BEGIN
  v_user_email := (SELECT email FROM auth.users WHERE auth.users.id = auth.uid());
  
  IF v_user_email IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ti.id,
    ti.trip_id,
    ti.inviter_user_id,
    ti.invitee_email,
    ti.read_only,
    ti.can_expenses,
    ti.can_stay,
    ti.expires_at,
    ti.created_at,
    t.name AS trip_name,
    COALESCE(
      p.display_name,
      NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''),
      NULL
    ) AS inviter_display_name
  FROM trip_invites ti
  JOIN trips t ON t.id = ti.trip_id
  LEFT JOIN profiles p ON p.user_id = ti.inviter_user_id
  WHERE ti.status = 'pending'
    AND (ti.expires_at IS NULL OR ti.expires_at > now())
    AND lower(ti.invitee_email) = lower(v_user_email)
  ORDER BY ti.created_at DESC;
END;
$function$;

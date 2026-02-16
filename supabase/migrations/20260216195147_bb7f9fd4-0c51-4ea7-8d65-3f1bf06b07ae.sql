
-- RPC: get_my_pending_invites — returns enriched pending invites for the current user
CREATE OR REPLACE FUNCTION public.get_my_pending_invites()
  RETURNS TABLE(
    id uuid,
    trip_id uuid,
    inviter_user_id uuid,
    invitee_email text,
    read_only boolean,
    can_expenses boolean,
    can_stay boolean,
    expires_at timestamptz,
    created_at timestamptz,
    trip_name text,
    inviter_display_name text
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
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
    AND ti.expires_at > now()
    AND lower(ti.invitee_email) = lower(v_user_email)
  ORDER BY ti.created_at DESC;
END;
$function$;

-- REVIEWED PATCH — NOT A MIGRATION FILE
--
-- Convert this patch into a real Supabase migration with:
--   supabase migration new harden_internal_rpc_execute_grants
-- then copy the SQL below into the generated file.
--
-- Production application remains blocked until the RT2RP Supabase project is
-- writable again and the generated migration can be applied and verified.

REVOKE EXECUTE ON FUNCTION public.run_trip_lifecycle_enforcement()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_trip_lifecycle_enforcement()
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_places_usage(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_places_usage(uuid, text)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_flight_status_usage(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_flight_status_usage(uuid, integer)
  TO service_role;

-- Authenticated application RPCs: callable by signed-in users only.
-- These functions are directly used by React hooks/pages and enforce their
-- own owner/admin/member checks internally.

REVOKE EXECUTE ON FUNCTION public.is_admin()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin()
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_get_all_users()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users()
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_update_user_name(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_name(uuid, text, text)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_update_user_tier(uuid, subscription_tier)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_tier(uuid, subscription_tier)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_bookings_safe(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bookings_safe(uuid)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_companions_safe(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_companions_safe(uuid)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_trip_shares_safe(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trip_shares_safe(uuid)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_my_pending_invites()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_pending_invites()
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.accept_trip_invite(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_trip_invite(text)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.accept_trip_invite_by_id(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_trip_invite_by_id(uuid)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.create_trip_invite(uuid, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_trip_invite(uuid, text, integer)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.create_trip_invite(
  uuid, text, integer, boolean, boolean, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_trip_invite(
  uuid, text, integer, boolean, boolean, boolean
) TO authenticated, service_role;

DO $
BEGIN
  IF has_function_privilege(
    'anon',
    'public.run_trip_lifecycle_enforcement()',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.run_trip_lifecycle_enforcement()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'run_trip_lifecycle_enforcement remains publicly executable';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.increment_places_usage(uuid,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.increment_places_usage(uuid,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'increment_places_usage remains publicly executable';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.increment_flight_status_usage(uuid,integer)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.increment_flight_status_usage(uuid,integer)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'increment_flight_status_usage remains publicly executable';
  END IF;

  IF NOT has_function_privilege(
    'service_role',
    'public.run_trip_lifecycle_enforcement()',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.increment_places_usage(uuid,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.increment_flight_status_usage(uuid,integer)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'service_role is missing one or more required internal RPC privileges';
  END IF;
END
$$;


-- Verify authenticated-only RPCs are not callable anonymously and remain
-- executable by authenticated users. This intentionally does not alter RLS
-- helper or trigger-function privileges; those require live-database testing.
DO $$
DECLARE
  fn text;
  authenticated_rpc_signatures text[] := ARRAY[
    'public.is_admin()',
    'public.admin_get_all_users()',
    'public.admin_update_user_name(uuid,text,text)',
    'public.admin_update_user_tier(uuid,subscription_tier)',
    'public.admin_delete_user(uuid)',
    'public.get_bookings_safe(uuid)',
    'public.get_companions_safe(uuid)',
    'public.get_trip_shares_safe(uuid)',
    'public.get_my_pending_invites()',
    'public.accept_trip_invite(text)',
    'public.accept_trip_invite_by_id(uuid)',
    'public.create_trip_invite(uuid,text,integer)',
    'public.create_trip_invite(uuid,text,integer,boolean,boolean,boolean)'
  ];
BEGIN
  FOREACH fn IN ARRAY authenticated_rpc_signatures LOOP
    IF has_function_privilege('anon', fn, 'EXECUTE') THEN
      RAISE EXCEPTION '% remains executable by anon', fn;
    END IF;

    IF NOT has_function_privilege('authenticated', fn, 'EXECUTE') THEN
      RAISE EXCEPTION '% is no longer executable by authenticated', fn;
    END IF;

    IF NOT has_function_privilege('service_role', fn, 'EXECUTE') THEN
      RAISE EXCEPTION '% is no longer executable by service_role', fn;
    END IF;
  END LOOP;
END
$$;

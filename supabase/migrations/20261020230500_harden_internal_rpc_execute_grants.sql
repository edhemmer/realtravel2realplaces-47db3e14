-- Phase 31: restrict internal SECURITY DEFINER RPCs to service_role only.
--
-- These functions are invoked by trusted Edge Functions after their own
-- authentication / secret checks. They are not part of the public client RPC
-- contract and must not be executable directly by anon or authenticated users.
--
-- This migration is intentionally narrow. User-facing sharing/invite/admin
-- RPCs are audited separately because their authenticated execution contract
-- is different.

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

-- Fail the migration if the effective privileges are not the intended ones.
DO $$
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

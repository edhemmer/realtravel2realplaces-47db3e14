-- Enable RLS on the safe views and add policies
-- Note: Views don't support RLS directly, so we need to drop these views
-- and rely on the base tables' RLS (which now blocks anonymous access)

-- Drop the views since they're causing security issues and aren't being used in the app
DROP VIEW IF EXISTS public.companions_safe;
DROP VIEW IF EXISTS public.trip_shares_safe;

-- Also drop the unused function
DROP FUNCTION IF EXISTS public.user_owns_companion_trip(uuid);
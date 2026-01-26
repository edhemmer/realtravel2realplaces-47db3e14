-- Revoke public access to the views and ensure only authenticated users can access
REVOKE ALL ON public.companions_safe FROM anon;
REVOKE ALL ON public.companions_safe FROM public;
REVOKE ALL ON public.trip_shares_safe FROM anon;
REVOKE ALL ON public.trip_shares_safe FROM public;

-- Ensure only authenticated users can access
GRANT SELECT ON public.companions_safe TO authenticated;
GRANT SELECT ON public.trip_shares_safe TO authenticated;
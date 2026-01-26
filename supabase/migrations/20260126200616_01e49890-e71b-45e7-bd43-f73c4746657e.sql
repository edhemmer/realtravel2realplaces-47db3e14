-- Fix 1: Create a view for companions that hides sensitive data from view-only users
-- First, create a security definer function to check if user owns the trip
CREATE OR REPLACE FUNCTION public.user_owns_companion_trip(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = p_trip_id AND t.user_id = auth.uid()
  )
$$;

-- Fix 2: Update trip_shares policy to hide share_token from non-owners
-- Drop existing policy that exposes tokens to recipients
DROP POLICY IF EXISTS "Users can view their shares" ON public.trip_shares;

-- Create a new policy that only shows share_token to trip owners
-- Recipients can see their shares but without the token
CREATE POLICY "Users can view their shares without token" 
ON public.trip_shares 
FOR SELECT 
USING (
  shared_with_user_id = auth.uid() 
  OR shared_with_email = auth.email()
);

-- Create a view that hides share_token for non-owners
CREATE OR REPLACE VIEW public.trip_shares_safe AS
SELECT 
  id,
  trip_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM trips t WHERE t.id = trip_shares.trip_id AND t.user_id = auth.uid()
    ) THEN share_token
    ELSE NULL
  END as share_token,
  shared_with_email,
  shared_with_user_id,
  permission,
  accepted_at,
  created_at,
  updated_at
FROM public.trip_shares;

-- Grant access to the view
GRANT SELECT ON public.trip_shares_safe TO authenticated;

-- Create a view for companions that hides sensitive data from view-only shared users
CREATE OR REPLACE VIEW public.companions_safe AS
SELECT 
  id,
  trip_id,
  name,
  -- Only show email/phone to trip owners
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM trips t WHERE t.id = companions.trip_id AND t.user_id = auth.uid()
    ) THEN email
    ELSE NULL
  END as email,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM trips t WHERE t.id = companions.trip_id AND t.user_id = auth.uid()
    ) THEN phone
    ELSE NULL
  END as phone,
  airline,
  frequent_flyer_number,
  tsa_precheck_number,
  notes,
  created_at
FROM public.companions;

-- Grant access to the view
GRANT SELECT ON public.companions_safe TO authenticated;
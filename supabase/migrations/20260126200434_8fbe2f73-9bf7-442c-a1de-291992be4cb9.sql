-- Fix the trip_shares RLS policy that incorrectly queries auth.users table
DROP POLICY IF EXISTS "Users can view their shares" ON public.trip_shares;

CREATE POLICY "Users can view their shares" 
ON public.trip_shares 
FOR SELECT 
USING (
  shared_with_user_id = auth.uid() 
  OR shared_with_email = auth.email()
);
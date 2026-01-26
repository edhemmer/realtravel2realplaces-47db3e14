-- Fix the trip_shares UPDATE security issue - add explicit policy for share acceptance
CREATE POLICY "Users can accept their own shares"
ON public.trip_shares
FOR UPDATE
USING (
  (shared_with_email = auth.email() OR shared_with_user_id = auth.uid())
  AND accepted_at IS NULL  -- Can only accept pending shares
)
WITH CHECK (
  shared_with_user_id = auth.uid()  -- Can only set their own user ID
  AND accepted_at IS NOT NULL  -- Must be setting accepted_at
);
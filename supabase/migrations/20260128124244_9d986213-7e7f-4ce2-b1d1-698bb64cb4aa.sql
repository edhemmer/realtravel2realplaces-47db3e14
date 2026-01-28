-- Update trip_shares policies to hide share_token from non-owners
-- Only trip owners should see the full share token

-- Drop the existing view policy for shared users
DROP POLICY IF EXISTS "Users can view their shares without token" ON public.trip_shares;

-- Create a new policy that allows users to view their shares but we'll mask the token via a function
CREATE POLICY "Users can view their own pending shares"
ON public.trip_shares
AS RESTRICTIVE
FOR SELECT
USING (
  (shared_with_user_id = auth.uid()) 
  OR (shared_with_email = auth.email())
);

-- Create a secure function to get trip shares with masked tokens for non-owners
CREATE OR REPLACE FUNCTION public.get_trip_shares_safe(p_trip_id uuid)
RETURNS TABLE (
  id uuid,
  trip_id uuid,
  share_token uuid,
  shared_with_email text,
  shared_with_user_id uuid,
  permission text,
  accepted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ts.id,
    ts.trip_id,
    -- Only trip owners can see the share token
    CASE WHEN user_owns_trip(ts.trip_id) THEN ts.share_token ELSE NULL END as share_token,
    -- Mask email for non-owners (show only domain)
    CASE WHEN user_owns_trip(ts.trip_id) THEN ts.shared_with_email 
         ELSE CASE WHEN ts.shared_with_email IS NOT NULL 
                   THEN '***@' || SPLIT_PART(ts.shared_with_email, '@', 2)
                   ELSE NULL END 
    END as shared_with_email,
    ts.shared_with_user_id,
    ts.permission,
    ts.accepted_at,
    ts.created_at,
    ts.updated_at
  FROM trip_shares ts
  WHERE ts.trip_id = p_trip_id
    AND (user_owns_trip(ts.trip_id) OR ts.shared_with_user_id = auth.uid() OR ts.shared_with_email = auth.email())
  ORDER BY ts.created_at DESC;
$$;
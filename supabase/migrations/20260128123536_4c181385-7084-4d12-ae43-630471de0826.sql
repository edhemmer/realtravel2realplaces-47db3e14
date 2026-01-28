-- Create a secure function to get bookings with sensitive fields masked for non-owners
-- This protects TSA PreCheck and Frequent Flyer numbers from view-only shared users

CREATE OR REPLACE FUNCTION public.get_bookings_safe(p_trip_id uuid)
RETURNS TABLE (
  id uuid,
  trip_id uuid,
  booking_type text,
  vendor_name text,
  start_datetime timestamptz,
  end_datetime timestamptz,
  address text,
  confirmation_number text,
  total_cost numeric,
  my_share numeric,
  link_url text,
  notes text,
  passenger_name text,
  airline text,
  tsa_precheck_number text,
  frequent_flyer_number text,
  stay_type text,
  property_name text,
  rental_company text,
  pickup_location text,
  return_location text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.id,
    b.trip_id,
    b.booking_type::text,
    b.vendor_name,
    b.start_datetime,
    b.end_datetime,
    b.address,
    -- Mask confirmation number for non-owners (last 4 chars only)
    CASE WHEN user_owns_trip(b.trip_id) THEN b.confirmation_number 
         ELSE CASE WHEN b.confirmation_number IS NOT NULL 
                   THEN '****' || RIGHT(b.confirmation_number, 4) 
                   ELSE NULL END 
    END as confirmation_number,
    b.total_cost,
    b.my_share,
    b.link_url,
    b.notes,
    b.passenger_name,
    b.airline,
    -- Mask TSA PreCheck for non-owners
    CASE WHEN user_owns_trip(b.trip_id) THEN b.tsa_precheck_number ELSE NULL END as tsa_precheck_number,
    -- Mask Frequent Flyer for non-owners
    CASE WHEN user_owns_trip(b.trip_id) THEN b.frequent_flyer_number ELSE NULL END as frequent_flyer_number,
    b.stay_type::text,
    b.property_name,
    b.rental_company,
    b.pickup_location,
    b.return_location,
    b.created_at,
    b.updated_at
  FROM bookings b
  WHERE b.trip_id = p_trip_id
    AND user_has_trip_access(b.trip_id)
  ORDER BY b.start_datetime ASC;
$$;

-- Add expiration to share tokens - tokens expire after 7 days if not accepted
-- Update the accept policy to check expiration
DROP POLICY IF EXISTS "Users can accept their own shares" ON public.trip_shares;

CREATE POLICY "Users can accept their own shares"
ON public.trip_shares
AS RESTRICTIVE
FOR UPDATE
USING (
  ((shared_with_email = auth.email()) OR (shared_with_user_id = auth.uid())) 
  AND (accepted_at IS NULL)
  AND (created_at > NOW() - INTERVAL '7 days')
)
WITH CHECK (
  (shared_with_user_id = auth.uid()) 
  AND (accepted_at IS NOT NULL)
);
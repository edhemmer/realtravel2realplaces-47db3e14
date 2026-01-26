-- Create booking_companions join table for many-to-many relationship
CREATE TABLE public.booking_companions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES public.companions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(booking_id, companion_id)
);

-- Enable RLS
ALTER TABLE public.booking_companions ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check booking access
CREATE OR REPLACE FUNCTION public.user_has_booking_access(p_booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = p_booking_id 
    AND user_has_trip_access(b.trip_id)
  )
$$;

-- Create a security definer function to check booking ownership
CREATE OR REPLACE FUNCTION public.user_owns_booking(p_booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = p_booking_id 
    AND user_owns_trip(b.trip_id)
  )
$$;

-- RLS Policies using security definer functions
CREATE POLICY "Users can view booking companions for accessible bookings"
ON public.booking_companions
FOR SELECT
USING (user_has_booking_access(booking_id));

CREATE POLICY "Users can create booking companions for owned bookings"
ON public.booking_companions
FOR INSERT
WITH CHECK (user_owns_booking(booking_id));

CREATE POLICY "Users can delete booking companions for owned bookings"
ON public.booking_companions
FOR DELETE
USING (user_owns_booking(booking_id));
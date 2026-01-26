-- Fix: Add PERMISSIVE policies to all tables to ensure anonymous users cannot access
-- The current RESTRICTIVE policies work for authenticated users but we need to ensure anon is blocked

-- For companions table - ensure auth is required
DROP POLICY IF EXISTS "Block anonymous companions access" ON public.companions;
CREATE POLICY "Block anonymous companions access" 
ON public.companions 
FOR SELECT 
TO anon
USING (false);

-- For bookings table - ensure auth is required  
DROP POLICY IF EXISTS "Block anonymous bookings access" ON public.bookings;
CREATE POLICY "Block anonymous bookings access" 
ON public.bookings 
FOR SELECT 
TO anon
USING (false);

-- For profiles table - ensure auth is required
DROP POLICY IF EXISTS "Block anonymous profiles access" ON public.profiles;
CREATE POLICY "Block anonymous profiles access" 
ON public.profiles 
FOR SELECT 
TO anon
USING (false);

-- For trip_shares table - ensure auth is required
DROP POLICY IF EXISTS "Block anonymous trip_shares access" ON public.trip_shares;
CREATE POLICY "Block anonymous trip_shares access" 
ON public.trip_shares 
FOR SELECT 
TO anon
USING (false);

-- For trips table - ensure auth is required
DROP POLICY IF EXISTS "Block anonymous trips access" ON public.trips;
CREATE POLICY "Block anonymous trips access" 
ON public.trips 
FOR SELECT 
TO anon
USING (false);

-- For expenses table - ensure auth is required
DROP POLICY IF EXISTS "Block anonymous expenses access" ON public.expenses;
CREATE POLICY "Block anonymous expenses access" 
ON public.expenses 
FOR SELECT 
TO anon
USING (false);

-- For packing_items table - ensure auth is required
DROP POLICY IF EXISTS "Block anonymous packing_items access" ON public.packing_items;
CREATE POLICY "Block anonymous packing_items access" 
ON public.packing_items 
FOR SELECT 
TO anon
USING (false);

-- For parking table - ensure auth is required
DROP POLICY IF EXISTS "Block anonymous parking access" ON public.parking;
CREATE POLICY "Block anonymous parking access" 
ON public.parking 
FOR SELECT 
TO anon
USING (false);

-- For trip_notes table - ensure auth is required
DROP POLICY IF EXISTS "Block anonymous trip_notes access" ON public.trip_notes;
CREATE POLICY "Block anonymous trip_notes access" 
ON public.trip_notes 
FOR SELECT 
TO anon
USING (false);

-- For booking_companions table - ensure auth is required
DROP POLICY IF EXISTS "Block anonymous booking_companions access" ON public.booking_companions;
CREATE POLICY "Block anonymous booking_companions access" 
ON public.booking_companions 
FOR SELECT 
TO anon
USING (false);
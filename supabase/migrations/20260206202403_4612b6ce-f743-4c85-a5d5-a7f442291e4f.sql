-- Drop and recreate get_bookings_safe to include transport and activity fields
DROP FUNCTION IF EXISTS public.get_bookings_safe(uuid);

CREATE FUNCTION public.get_bookings_safe(p_trip_id uuid)
 RETURNS TABLE(
   id uuid, 
   trip_id uuid, 
   booking_type text, 
   vendor_name text, 
   start_datetime timestamp with time zone, 
   end_datetime timestamp with time zone, 
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
   created_at timestamp with time zone, 
   updated_at timestamp with time zone,
   transport_mode text,
   from_location text,
   to_location text,
   operator text,
   activity_source text,
   ticket_required boolean,
   advance_recommended boolean,
   booking_pattern text,
   booking_url text,
   tickets_purchased boolean,
   location_summary text
)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    b.id,
    b.trip_id,
    b.booking_type::text,
    b.vendor_name,
    b.start_datetime,
    b.end_datetime,
    b.address,
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
    CASE WHEN user_owns_trip(b.trip_id) THEN b.tsa_precheck_number ELSE NULL END as tsa_precheck_number,
    CASE WHEN user_owns_trip(b.trip_id) THEN b.frequent_flyer_number ELSE NULL END as frequent_flyer_number,
    b.stay_type::text,
    b.property_name,
    b.rental_company,
    b.pickup_location,
    b.return_location,
    b.created_at,
    b.updated_at,
    b.transport_mode::text,
    b.from_location,
    b.to_location,
    b.operator,
    b.activity_source,
    b.ticket_required,
    b.advance_recommended,
    b.booking_pattern,
    b.booking_url,
    b.tickets_purchased,
    b.location_summary
  FROM bookings b
  WHERE b.trip_id = p_trip_id
    AND user_has_trip_access(b.trip_id)
  ORDER BY b.start_datetime ASC;
$function$;
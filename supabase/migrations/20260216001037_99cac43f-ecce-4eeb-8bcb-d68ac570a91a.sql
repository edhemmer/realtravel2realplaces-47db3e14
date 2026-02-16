
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_id uuid;
  profile_exists boolean;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  caller_id := auth.uid();
  
  IF p_user_id = caller_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id = p_user_id) INTO profile_exists;
  
  IF NOT profile_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found.');
  END IF;

  -- Clean up all user data
  DELETE FROM stop_reminders WHERE user_id = p_user_id;
  DELETE FROM ticket_reminders WHERE user_id = p_user_id;
  DELETE FROM notification_preferences WHERE user_id = p_user_id;
  DELETE FROM notifications WHERE user_id = p_user_id;
  DELETE FROM upgrade_intents WHERE user_id = p_user_id;
  DELETE FROM support_tickets WHERE user_id = p_user_id;
  DELETE FROM email_ingestion_addresses WHERE user_id = p_user_id;
  DELETE FROM pending_imports WHERE user_id = p_user_id;
  DELETE FROM user_roles WHERE user_id = p_user_id;

  -- Clean up trip-related data for owned trips
  DELETE FROM booking_companions WHERE booking_id IN (SELECT id FROM bookings WHERE trip_id IN (SELECT id FROM trips WHERE user_id = p_user_id));
  DELETE FROM bookings WHERE trip_id IN (SELECT id FROM trips WHERE user_id = p_user_id);
  DELETE FROM expenses WHERE trip_id IN (SELECT id FROM trips WHERE user_id = p_user_id);
  DELETE FROM companions WHERE trip_id IN (SELECT id FROM trips WHERE user_id = p_user_id);
  DELETE FROM packing_items WHERE trip_id IN (SELECT id FROM trips WHERE user_id = p_user_id);
  DELETE FROM parking WHERE trip_id IN (SELECT id FROM trips WHERE user_id = p_user_id);
  DELETE FROM trip_notes WHERE trip_id IN (SELECT id FROM trips WHERE user_id = p_user_id);
  DELETE FROM trip_events WHERE trip_id IN (SELECT id FROM trips WHERE user_id = p_user_id);
  DELETE FROM trip_shares WHERE trip_id IN (SELECT id FROM trips WHERE user_id = p_user_id);
  DELETE FROM trip_invites WHERE trip_id IN (SELECT id FROM trips WHERE user_id = p_user_id);
  DELETE FROM engagements WHERE trip_id IN (SELECT id FROM trips WHERE user_id = p_user_id);
  DELETE FROM trip_engagements WHERE trip_id IN (SELECT id FROM trips WHERE user_id = p_user_id);
  DELETE FROM trip_members WHERE trip_id IN (SELECT id FROM trips WHERE user_id = p_user_id);
  DELETE FROM trips WHERE user_id = p_user_id;

  -- Remove guest memberships on other trips
  DELETE FROM trip_members WHERE user_id = p_user_id;

  -- Delete profile
  DELETE FROM profiles WHERE user_id = p_user_id;

  -- Hard-delete from auth.users so the email can re-register
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User account permanently deleted. Email can be re-used for signup.'
  );
END;
$function$;

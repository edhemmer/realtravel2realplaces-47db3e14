-- Patch 2.0.0a: Correct trip limits and remove usage tracking

-- Add lifetime_trip_count (only increments, never decrements)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS lifetime_trip_count integer NOT NULL DEFAULT 0;

-- Remove AI generation tracking columns
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS monthly_ai_generations,
DROP COLUMN IF EXISTS ai_generations_reset_at;

-- Update function: get lifetime trip count from profile (not from trips table)
CREATE OR REPLACE FUNCTION public.count_user_active_trips(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT lifetime_trip_count FROM profiles WHERE user_id = p_user_id),
    0
  );
$$;

-- Historical migration: later migrations may override this free-tier limit.
CREATE OR REPLACE FUNCTION public.user_can_create_trip(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN user_is_pro(p_user_id) THEN true
      ELSE count_user_active_trips(p_user_id) < 5
    END;
$$;

-- Historical migration: later migrations may override this free-tier limit.
CREATE OR REPLACE FUNCTION public.get_user_trip_limit(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN user_is_pro(p_user_id) THEN -1
      ELSE 5
    END;
$$;

-- Function to increment lifetime trip count (called on trip creation)
CREATE OR REPLACE FUNCTION public.increment_lifetime_trip_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles 
  SET lifetime_trip_count = lifetime_trip_count + 1
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Trigger to auto-increment on trip insert
DROP TRIGGER IF EXISTS increment_trip_count_on_insert ON trips;
CREATE TRIGGER increment_trip_count_on_insert
AFTER INSERT ON trips
FOR EACH ROW
EXECUTE FUNCTION public.increment_lifetime_trip_count();

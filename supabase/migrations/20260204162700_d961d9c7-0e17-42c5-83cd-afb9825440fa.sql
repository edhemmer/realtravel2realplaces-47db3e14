-- v2.0.0 Foundation: Add subscription tier to profiles
-- Extend profiles table with subscription_tier column

-- Add subscription_tier enum type
CREATE TYPE subscription_tier AS ENUM ('free', 'pro');

-- Add subscription_tier column to profiles (default to free for all existing users)
ALTER TABLE profiles 
ADD COLUMN subscription_tier subscription_tier NOT NULL DEFAULT 'free';

-- Add subscription_started_at to track when Pro was activated
ALTER TABLE profiles 
ADD COLUMN subscription_started_at timestamptz;

-- Add usage tracking columns for feature limits
ALTER TABLE profiles
ADD COLUMN monthly_ai_generations integer NOT NULL DEFAULT 0,
ADD COLUMN ai_generations_reset_at date DEFAULT CURRENT_DATE;

-- Create helper function to check subscription tier
CREATE OR REPLACE FUNCTION public.get_user_subscription_tier(p_user_id uuid)
RETURNS subscription_tier
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT subscription_tier FROM profiles WHERE user_id = p_user_id),
    'free'::subscription_tier
  );
$$;

-- Create helper function to check if user is Pro
CREATE OR REPLACE FUNCTION public.user_is_pro(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT get_user_subscription_tier(p_user_id) = 'pro';
$$;

-- Create function to count user's active trips
CREATE OR REPLACE FUNCTION public.count_user_active_trips(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM trips
  WHERE user_id = p_user_id
    AND end_date >= CURRENT_DATE;
$$;

-- Create function to check if user can create new trip (tier limit check)
CREATE OR REPLACE FUNCTION public.user_can_create_trip(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN user_is_pro(p_user_id) THEN true
      ELSE count_user_active_trips(p_user_id) < 3
    END;
$$;

-- Create function to get trip limit for user's tier
CREATE OR REPLACE FUNCTION public.get_user_trip_limit(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN user_is_pro(p_user_id) THEN -1  -- -1 means unlimited
      ELSE 3
    END;
$$;
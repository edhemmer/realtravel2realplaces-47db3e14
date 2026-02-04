-- Patch 2.0.x: Admin Plan Dashboard
-- Create secure role-based admin system

-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Create is_admin helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin')
$$;

-- 6. RLS policies for user_roles table
-- Block anonymous access
CREATE POLICY "Block anonymous user_roles access"
ON public.user_roles
AS RESTRICTIVE
FOR SELECT
USING (false);

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (is_admin());

-- 7. Admin function to get all users with profiles
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  subscription_tier subscription_tier,
  lifetime_trip_count integer,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    u.email,
    p.subscription_tier,
    p.lifetime_trip_count,
    p.created_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;

-- 8. Admin function to update user subscription tier
CREATE OR REPLACE FUNCTION public.admin_update_user_tier(
  p_user_id uuid,
  p_new_tier subscription_tier
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Update the user's subscription tier
  UPDATE profiles
  SET 
    subscription_tier = p_new_tier,
    subscription_started_at = CASE 
      WHEN p_new_tier = 'pro' AND subscription_started_at IS NULL THEN now()
      WHEN p_new_tier = 'free' THEN NULL
      ELSE subscription_started_at
    END,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$;

-- 9. Insert the beta admin user
-- First, get the user_id for the admin email and insert the role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'edhemmer@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
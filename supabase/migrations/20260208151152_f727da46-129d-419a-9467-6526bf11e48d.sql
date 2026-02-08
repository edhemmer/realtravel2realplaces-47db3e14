-- Patch 2.1.18: Set has_completed_onboarding = true for all existing users
-- This ensures existing users who already went through onboarding (via localStorage)
-- don't see onboarding again when we switch to DB-backed state.
-- All users created before this migration are considered to have completed onboarding.

UPDATE public.profiles 
SET has_completed_onboarding = true
WHERE has_completed_onboarding = false;
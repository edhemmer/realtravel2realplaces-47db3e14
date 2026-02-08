-- Patch 2.1.18: Add has_completed_onboarding to profiles table
-- This column stores whether the user has completed the initial onboarding flow
-- Defaults to false for new users, should be set to true when onboarding completes

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN NOT NULL DEFAULT false;
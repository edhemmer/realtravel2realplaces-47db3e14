-- Patch 2.6.12: Add 'business' to subscription_tier enum for admin override
-- This allows admins to set users to Business tier as a non-billed override

ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'business';
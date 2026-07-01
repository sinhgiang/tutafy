-- Run in Supabase SQL Editor
-- https://app.supabase.com/project/dkxngropifwsqsozerxb/sql

-- Rename subscription_status to store plan name (free/pro/academy)
-- If subscription_status already exists, just update the default and add check
ALTER TABLE public.tutors
  ALTER COLUMN subscription_status SET DEFAULT 'free';

-- Add polar_checkout_id to track which product they subscribed to
ALTER TABLE public.tutors
  ADD COLUMN IF NOT EXISTS polar_checkout_id text;

-- Update any NULL values
UPDATE public.tutors
  SET subscription_status = 'free'
  WHERE subscription_status IS NULL;

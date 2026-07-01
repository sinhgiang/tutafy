-- Run this in Supabase SQL Editor:
-- https://app.supabase.com/project/dkxngropifwsqsozerxb/sql

-- Tutor payment methods (how they receive money from students)
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS paypal_link text;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS paddle_checkout_link text;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS default_lesson_price decimal(10,2);

-- Tutafy subscription (how tutors pay for the platform)
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free';
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS polar_subscription_id text;

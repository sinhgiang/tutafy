-- Add buffer_minutes column to tutors table
-- Run this in the Supabase SQL Editor: https://app.supabase.com/project/dkxngropifwsqsozerxb/sql
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS buffer_minutes integer default 15;

-- Add materials column to lessons (list of URLs/links)
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS materials jsonb default '[]';

-- Add reminder_24h_sent and reminder_1h_sent to track which reminders were sent
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean default false;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS reminder_1h_sent boolean default false;

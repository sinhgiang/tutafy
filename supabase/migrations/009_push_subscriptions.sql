ALTER TABLE tutors ADD COLUMN IF NOT EXISTS push_subscription jsonb;
ALTER TABLE students ADD COLUMN IF NOT EXISTS push_subscription jsonb;

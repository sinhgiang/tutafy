-- Migration 010: Availability Exceptions

CREATE TABLE IF NOT EXISTS public.availability_exceptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tutor_id, date)
);

ALTER TABLE public.availability_exceptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='availability_exceptions' AND policyname='Tutors manage exceptions') THEN
    CREATE POLICY "Tutors manage exceptions" ON public.availability_exceptions FOR ALL USING (tutor_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='availability_exceptions' AND policyname='Public read exceptions') THEN
    CREATE POLICY "Public read exceptions" ON public.availability_exceptions FOR SELECT USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS avail_exceptions_tutor_date ON public.availability_exceptions(tutor_id, date);

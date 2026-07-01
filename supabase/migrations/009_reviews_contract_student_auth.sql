-- Migration 009: Reviews, Contract, Student Auth

-- Contract template for tutors
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS contract_template text;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS average_rating decimal(3,2) DEFAULT 0;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- Terms acceptance on lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS terms_agreed_at timestamptz;

-- Student auth link (for student login)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS auth_user_id uuid;
CREATE INDEX IF NOT EXISTS students_auth_user_idx ON public.students(auth_user_id);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lesson_id, student_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='Public read reviews') THEN
    CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (is_public = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='Tutors see own reviews') THEN
    CREATE POLICY "Tutors see own reviews" ON public.reviews FOR ALL USING (tutor_id = auth.uid());
  END IF;
END $$;

-- Index for tutor reviews
CREATE INDEX IF NOT EXISTS reviews_tutor_idx ON public.reviews(tutor_id);
CREATE INDEX IF NOT EXISTS reviews_student_idx ON public.reviews(student_id);

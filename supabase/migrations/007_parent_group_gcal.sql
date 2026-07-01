-- 007: Parent portal + Group classes + Payment reminders + Google Calendar + Tutor notifications

-- STUDENTS: parent portal
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_email text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_token uuid DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS students_parent_token_idx ON public.students(parent_token);

-- LESSONS: payment reminder + group class + gcal
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS payment_reminder_sent_at timestamptz;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_group boolean DEFAULT false;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS group_max_students integer DEFAULT 1;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS google_event_id text;

-- TUTORS: google calendar + notification prefs
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS google_calendar_refresh_token text;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS google_calendar_id text;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS notify_new_booking boolean DEFAULT true;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS notify_new_message boolean DEFAULT true;

-- GROUP LESSON STUDENTS junction table
CREATE TABLE IF NOT EXISTS public.lesson_students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  price decimal(10,2),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(lesson_id, student_id)
);

ALTER TABLE public.lesson_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutors manage lesson_students" ON public.lesson_students
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND l.tutor_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS lesson_students_lesson_idx ON public.lesson_students(lesson_id);
CREATE INDEX IF NOT EXISTS lesson_students_student_idx ON public.lesson_students(student_id);

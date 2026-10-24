-- Migration 027: real reviews after the first lesson (T-0898, designs A, A, A of T-0876).
--
-- NOT run on the real database by the agent: the owner runs it after reading it (docs/reviews-flow.md). The whole flow stays OFF until the owner
-- also sets REVIEWS_FLOW=on on the server, so applying this file alone changes nothing a visitor can see; it is safe to run first.
--
-- What it does, in the owner's words (W-2747):
--   * a review has stars (1 to 5), up to three tags and up to 500 characters; only a student who had a lesson with the tutor writes one, one review per
--     student per tutor; the student may edit it for 7 days; the tutor answers once and can neither edit nor hide a review; Tutafy removes a review only for abuse;
--   * the old reviews (written before this file) keep working exactly as they did: they have flow = false and none of the new rules touch them.
--
-- Who can do what (rule 2 and 6 of the owner's security rules): the browser keys (anon, authenticated) can only READ reviews, as before: everybody the
-- public ones, a tutor their own. Nobody writes with a browser key. Every write goes through a server route that checks who is asking (a student by
-- their portal link, a tutor by their sign-in) and uses the server's key; and the database itself refuses what the rules forbid, even for the server's key
-- (the trigger below), so a mistake in a route cannot let a tutor edit a review or answer twice.

-- ---- the new columns ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS flow boolean NOT NULL DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS tutor_reply text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS replied_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_flow_shape') THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_flow_shape CHECK (
      flow = false OR (
        char_length(coalesce(comment, '')) <= 500
        AND char_length(coalesce(tutor_reply, '')) <= 500
        AND cardinality(tags) <= 3
        AND tags <@ ARRAY['patient', 'clear_explanations', 'well_prepared', 'fun', 'good_value', 'friendly']::text[]
        AND (tutor_reply IS NULL) = (replied_at IS NULL)
      )
    );
  END IF;
END $$;

-- one review per student per tutor (only for the new flow: the old reviews were one per lesson and stay as they are)
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_student_tutor ON public.reviews (student_id, tutor_id) WHERE flow;

-- ---- who can read and write -------------------------------------------------------------------------------------------------------------
-- "Public read reviews" (is_public) stays. The tutor's old policy was FOR ALL, which let a tutor edit and delete reviews: it becomes read-only.
DROP POLICY IF EXISTS "Tutors see own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Tutors read own reviews" ON public.reviews;
CREATE POLICY "Tutors read own reviews" ON public.reviews FOR SELECT USING (tutor_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.reviews FROM anon, authenticated;

-- ---- what the database refuses, whoever asks (the server's key too) --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reviews_flow_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF old.flow IS NOT TRUE THEN
    RETURN new; -- an old review: nothing new applies
  END IF;
  IF new.flow IS DISTINCT FROM old.flow OR new.student_id IS DISTINCT FROM old.student_id OR new.tutor_id IS DISTINCT FROM old.tutor_id
     OR new.lesson_id IS DISTINCT FROM old.lesson_id OR new.created_at IS DISTINCT FROM old.created_at THEN
    RAISE EXCEPTION 'a review keeps its student, its tutor, its lesson and its date' USING ERRCODE = '42501';
  END IF;
  -- the tutor's answer: once, with text, and never changed afterwards
  IF new.tutor_reply IS DISTINCT FROM old.tutor_reply OR new.replied_at IS DISTINCT FROM old.replied_at THEN
    IF old.tutor_reply IS NOT NULL THEN
      RAISE EXCEPTION 'a tutor answers a review once' USING ERRCODE = '42501';
    END IF;
    IF new.tutor_reply IS NULL OR btrim(new.tutor_reply) = '' THEN
      RAISE EXCEPTION 'an answer needs text' USING ERRCODE = '23514';
    END IF;
  END IF;
  -- the student's words: editable for 7 days after they were first written
  IF new.rating IS DISTINCT FROM old.rating OR new.comment IS DISTINCT FROM old.comment OR new.tags IS DISTINCT FROM old.tags THEN
    IF now() > old.created_at + interval '7 days' THEN
      RAISE EXCEPTION 'a review can be edited for 7 days' USING ERRCODE = '42501';
    END IF;
    new.edited_at := now();
  END IF;
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS reviews_flow_guard ON public.reviews;
CREATE TRIGGER reviews_flow_guard BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.reviews_flow_guard();

-- ---- the invitations already sent ----------------------------------------------------------------------------------------------------
-- One row per student and tutor: the invitation goes once, with at most one reminder, and "stop reminders" is remembered.
-- Row level security is on and there is no policy: no browser key reads or writes it; only the server's key (the daily run) does.
CREATE TABLE IF NOT EXISTS public.review_invites (
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tutor_id uuid NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  reminded_at timestamptz,
  stopped_at timestamptz,
  PRIMARY KEY (student_id, tutor_id)
);
ALTER TABLE public.review_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_invites FROM anon, authenticated;

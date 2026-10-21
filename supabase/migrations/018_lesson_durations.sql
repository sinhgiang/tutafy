-- Let a tutor choose which lesson lengths they take (T-0675).
--
-- WRITTEN BUT NOT APPLIED: the owner decides when this runs on the real database.
-- Tested on a local copy only (tests/lesson-durations-migration.test.ts, PGlite).
--
-- Two columns on public.tutors:
--   lesson_durations         integer[]  the lengths (minutes) the booking page offers; null = the tutor
--                                       chose nothing, so the page keeps offering 30, 45, 60 and 90
--   default_lesson_duration  integer    the length selected first; null = 60 (or the first length chosen
--                                       when 60 is not among them)
-- Both stay null for every existing tutor, so nothing changes for them until they save the new Settings
-- section. The code reads them in a separate query and works without them, so the code can go live first.
--
-- Who may write them: the existing policy "Tutors can update own profile" (002_rls.sql, auth.uid() = id)
-- already limits a signed-in tutor to their own row, and the paid-columns trigger of 016 does not touch these
-- two columns. Who may read them: the same rows the public booking page already reads
-- ("Anyone can view tutor for booking", only rows with booking_url_active). No policy changes.
--
-- The checks keep out values the booking page cannot show: only 30, 45, 60 or 90, at least one length,
-- and the default has to be one of the lengths chosen. Safe to run twice.

alter table public.tutors add column if not exists lesson_durations integer[];
alter table public.tutors add column if not exists default_lesson_duration integer;

alter table public.tutors drop constraint if exists tutors_lesson_durations_valid;
alter table public.tutors add constraint tutors_lesson_durations_valid
  check (
    lesson_durations is null
    or (
      cardinality(lesson_durations) between 1 and 4
      and lesson_durations <@ array[30, 45, 60, 90]
      and array_position(lesson_durations, null) is null
    )
  );

alter table public.tutors drop constraint if exists tutors_default_lesson_duration_valid;
alter table public.tutors add constraint tutors_default_lesson_duration_valid
  check (
    default_lesson_duration is null
    or (
      default_lesson_duration in (30, 45, 60, 90)
      and (lesson_durations is null or default_lesson_duration = any (lesson_durations))
    )
  );

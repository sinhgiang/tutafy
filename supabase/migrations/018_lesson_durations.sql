-- Let a tutor choose which lesson lengths they take, and type lengths of their own (T-0675, custom lengths T-0700).
--
-- WRITTEN BUT NOT APPLIED: the owner decides when this runs on the real database. It is ONE file: nobody has run an
-- earlier version of it, so this is the whole change (the first version only allowed 30, 45, 60 and 90; T-0700 edited it in
-- place so the owner runs a single file).
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
-- What the checks allow (the same rule as src/lib/lesson-durations.ts): every length is a whole number of minutes from 10
-- to 240 and a multiple of 5; no length twice; no empty slot; at least one and at most six lengths; and the default has to
-- be one of the lengths chosen. So 75 or 120 is fine, 7, 12, 250 or a repeat is refused by the database whatever sends it.
-- The rule lives in one small function, because a CHECK cannot look inside an array on its own. The function only reads
-- the array it is given (no table, no setting), so it is safe for anyone to call.
-- Safe to run twice.

alter table public.tutors add column if not exists lesson_durations integer[];
alter table public.tutors add column if not exists default_lesson_duration integer;

create or replace function public.lesson_durations_valid(d integer[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select d is null or (
    cardinality(d) between 1 and 6
    and not exists (select 1 from unnest(d) as x where x is null or x < 10 or x > 240 or x % 5 <> 0)
    and (select count(distinct x) from unnest(d) as x) = cardinality(d)
  )
$$;

alter table public.tutors drop constraint if exists tutors_lesson_durations_valid;
alter table public.tutors add constraint tutors_lesson_durations_valid
  check (public.lesson_durations_valid(lesson_durations));

alter table public.tutors drop constraint if exists tutors_default_lesson_duration_valid;
alter table public.tutors add constraint tutors_default_lesson_duration_valid
  check (
    default_lesson_duration is null
    or (
      default_lesson_duration between 10 and 240
      and default_lesson_duration % 5 = 0
      and (lesson_durations is null or default_lesson_duration = any (lesson_durations))
    )
  );

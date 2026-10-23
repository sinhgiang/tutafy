-- Let a tutor say which student levels they teach, so a student can filter the tutor directory by level (T-0863).
--
-- NOT YET RUN on the real database: the owner runs it in the Supabase SQL Editor. The code works without it: the directory reads the column in its own
-- query and treats a database without it as "no tutor said", the level filter is hidden until a listed tutor has chosen a level, and Settings
-- saves the levels apart from everything else, so a missing column only answers "This option is not available yet" and loses nothing.
-- Safe to run twice. It changes no row: every existing tutor gets an empty list.
--
-- One column on public.tutors:
--   levels_taught  text[]  the groups of student levels the tutor teaches: any of 'beginner' (A1 to A2), 'intermediate' (B1 to B2),
--                          'advanced' (C1 to C2). Empty = the tutor has not said.
--
-- Who may write it: the existing policy "Tutors can update own profile" (002_rls.sql, auth.uid() = id) already limits a signed-in tutor to their
-- own row, and the paid-columns trigger of 016 does not touch this column. Who may read it: after 025 nobody but the tutor and the server's own
-- key can read tutor rows, and the directory reads it on the server with that key, sending out only the ids (never anything else of the row).
-- No policy changes. The value is public by intent (it is drawn on the directory), it holds no personal data.
--
-- What the check allows (the same rule as cleanLevels in src/lib/directory.ts): only the three ids, none twice, at most three.
-- A CHECK cannot look inside an array on its own, so the rule is one small function that only reads the array it is given.

alter table public.tutors add column if not exists levels_taught text[] not null default '{}';

create or replace function public.levels_taught_valid(l text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select l is not null
    and cardinality(l) <= 3
    and l <@ array['beginner', 'intermediate', 'advanced']::text[]
    and (select count(distinct x) from unnest(l) as x) = cardinality(l)
$$;

alter table public.tutors drop constraint if exists tutors_levels_taught_valid;
alter table public.tutors add constraint tutors_levels_taught_valid check (public.levels_taught_valid(levels_taught));

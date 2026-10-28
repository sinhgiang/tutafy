-- Let a tutor say which kinds of student they like to teach ("Learning for": work, exams, kids and teens, travel, university, conversation),
-- so a student can filter the tutor directory by it and a niche page such as /learn/english/working-professionals can exist (T-1033, stage B of T-1006).
--
-- NOT YET RUN on the real database: the owner runs it in the Supabase SQL Editor. The code works without it: the directory reads the column in its
-- own query and treats a database without it as "no tutor said", the filter is hidden and no niche page exists until a listed tutor has ticked a
-- group, and Settings saves the groups apart from everything else, so a missing column only answers "This option is not available yet" and loses nothing.
-- Safe to run twice. It changes no row: every existing tutor gets an empty list.
--
-- One column on public.tutors:
--   learning_groups  text[]  any of 'work', 'exams', 'kids', 'travel', 'university', 'conversation'. Empty = the tutor has not said.
--
-- Who may write it: the existing policy "Tutors can update own profile" (002_rls.sql, auth.uid() = id) already limits a signed-in tutor to their
-- own row, and the paid-columns trigger of 016 does not touch this column. Who may read it: after 025 nobody but the tutor and the server's own
-- key can read tutor rows, and the directory reads it on the server with that key, sending out only the ids (never anything else of the row).
-- No policy changes. The value is public by intent (it is drawn on the directory), it holds no personal data.
--
-- What the check allows (the same rule as cleanGroups in src/lib/tutor-groups.ts): only the six ids, none twice. A CHECK cannot look inside an
-- array on its own, so the rule is one small function that only reads the array it is given (as levels_taught_valid does in 026).

alter table public.tutors add column if not exists learning_groups text[] not null default '{}';

create or replace function public.learning_groups_valid(g text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select g is not null
    and cardinality(g) <= 6
    and g <@ array['work', 'exams', 'kids', 'travel', 'university', 'conversation']::text[]
    and (select count(distinct x) from unnest(g) as x) = cardinality(g)
$$;

alter table public.tutors drop constraint if exists tutors_learning_groups_valid;
alter table public.tutors add constraint tutors_learning_groups_valid check (public.learning_groups_valid(learning_groups));

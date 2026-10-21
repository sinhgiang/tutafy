-- Let a tutor type lesson lengths of their own, such as 20, 75 or 120 minutes (T-0700).
--
-- WRITTEN BUT NOT APPLIED: the owner decides when this runs on the real database. It is the ONLY file to run for custom
-- lengths. Migration 018 (T-0675) is already on the real database and is NOT changed: it allowed only 30, 45, 60 and 90 minutes
-- and at most four lengths. This file replaces its two checks with wider ones. Tested on a local copy only
-- (tests/lesson-durations-019.test.ts, PGlite): 018 as it was applied, then this file, then this file again.
--
-- What it changes: ONLY two CHECK constraints on public.tutors. No column, no row, no policy, no trigger, no function. It does
-- not touch anybody's data. Every value 018 accepted is still accepted, so every row that exists now stays valid and the
-- constraints are added already checked (no NOT VALID step, nothing to run afterwards).
--
-- The new rule, the same one src/lib/lesson-durations.ts and the Settings page use:
--   tutors_lesson_durations_valid          null (the tutor chose nothing), or 1 to 6 lengths, each a whole number of minutes from
--                                          10 to 240 and a multiple of 5, with no null inside the list
--   tutors_default_lesson_duration_valid   null, or a whole number from 10 to 240 that is a multiple of 5, and, when the tutor
--                                          chose lengths, one of them
-- The database does not refuse the same length twice in a list (018 did not either, and a row already saved that way must stay
-- valid); Settings and the booking page never write or show a repeat.
--
-- Until this file is run the code still works: a tutor who types a length of their own gets a plain sentence saying it cannot be
-- saved yet (the old check refuses it), the rest of their settings are saved, and the page keeps working.
--
-- Safe to run twice: each constraint is dropped if it is there and added again.

alter table public.tutors drop constraint if exists tutors_lesson_durations_valid;
alter table public.tutors add constraint tutors_lesson_durations_valid
  check (
    lesson_durations is null
    or (
      cardinality(lesson_durations) between 1 and 6
      and lesson_durations <@ array[
        10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125,
        130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205, 210, 215, 220, 225, 230, 235, 240
      ]
      and array_position(lesson_durations, null) is null
    )
  );

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

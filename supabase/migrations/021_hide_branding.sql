-- A paid tutor may turn off the small "Made with Tutafy" line on their booking page (T-0717).
--
-- WRITTEN BUT NOT APPLIED: the owner runs this on the real database (Supabase SQL Editor). Safe to run again.
-- Tested on a local copy only (tests/hide-branding-migration.test.ts, PGlite). Numbered 021 because 019 (on
-- helme/lesson-lengths-019) and 020 (the feedback table, pull request #53) are waiting on their own branches; none of the
-- three touches the others, so they can be applied in any order.
--
-- WHAT IT ADDS: one column, public.tutors.hide_branding, true or false, false for everybody (so nothing changes for any tutor
-- until a paid tutor ticks the box in Settings, Booking page).
--
-- WHO MAY WRITE IT: the tutor, on their own row, through the policy that already lets a tutor update their own row
-- (002_rls.sql). The column is NOT locked like the plan columns (016): it does not need to be, because the page decides by the PLAN
-- first. A free tutor who writes true here (by calling the database from their browser) still shows the line: the pages show it unless
-- the plan is Pro or Academy AND this column is true (src/lib/branding.ts).
--
-- Until this is applied nothing breaks: the pages read the column apart from the rest of the row and treat a missing column as
-- "keep the line", and Settings tells a paid tutor "not available yet" if they try to tick the box.

alter table public.tutors add column if not exists hide_branding boolean not null default false;

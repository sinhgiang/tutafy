-- T-0767 / T-0774: stop letting a visitor read other tutors' private columns.
--
-- ALREADY RUN on the real Supabase project (the owner, in the SQL Editor, W-2548, after the code of T-0774 was live; the checks afterwards showed both
-- public policies gone and no select left for anon). This file is the same statements, kept as a migration so a database built from the files (a new
-- environment, a branch, the tests) is born closed. It is safe to run again. Do NOT run it before the code of T-0774 is live: the public pages read the
-- tutor on the server with the admin client, and the proxy asks "is this a tutor?" with the signed-in account's own session; without that code the booking
-- pages would show "not found". The two read-only checks and the way back are in docs/tutors-rls (025_checks_read_only.sql, 025_tutors_not_public_rollback.sql,
-- README.md); the way back re-opens the exposure and is a stop-gap only.
-- Tested on a local copy (tests/tutors-read-exposure.test.ts and tests/tutors-025-ready.test.ts, PGlite). The marker below is what those tests look for:
-- with it in supabase/migrations the test that documented the exposure now expects NONE and keeps it closed.
--
-- T-0767-FIX
--
-- WHAT IS WRONG TODAY (proved on a copy built from every migration file, see docs/tutors-rls/README.md):
--   1. 002_rls.sql: the policy "Anyone can view tutor for booking" lets the public key read EVERY column of a tutor row whose booking page is
--      on, and Supabase's default privileges give the roles anon and authenticated select on every column. So anyone with the public key
--      (it is in every page of the site) can read, for all those tutors, the email, the Google Calendar refresh token, the push subscription,
--      the Stripe account id, the Polar ids, the plan, the referral credits and the contract text.
--   2. availability_exceptions: the policy "Public read exceptions" (using true) lets anyone read the tutor's private `reason` for a blocked day.
--
-- WHAT IT DOES:
--   - drops both public read policies and takes select on both tables away from anon;
--   - a signed-in tutor still reads and writes their OWN rows (the policies "Tutors can view own profile", "Tutors can update own profile",
--     "Tutors can insert own profile" and "Tutors manage exceptions" stay), and the server's own key (service_role) is not affected by row security;
--   - changes no row, no column and no other table (availability, packages, reviews and subscription_plans stay public on purpose: no private
--     column in them; see the policy list test).
--
-- THE CODE THAT HAD TO CHANGE FIRST (done in T-0774, each one is proved by tests/public-tutor-reads.test.ts, tests/public-tutor-scan.test.ts and
-- tests/proxy-tutor-reads.test.ts): the booking pages, the embed, the public profile, the sitemap, the student page and the proxy. Safe to run again.

drop policy if exists "Anyone can view tutor for booking" on public.tutors;
revoke select on public.tutors from anon;

drop policy if exists "Public read exceptions" on public.availability_exceptions;
revoke select on public.availability_exceptions from anon;

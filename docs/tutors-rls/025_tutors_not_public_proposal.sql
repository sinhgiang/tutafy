-- T-0767 / T-0774: stop letting a visitor read other tutors' private columns.
--
-- READY, NOT RUN. Run it ONLY AFTER the code of T-0774 is merged and live: the public pages now read the tutor on the server, with the admin
-- client, and the proxy asks "is this a tutor?" with the signed-in account's own session. Before that code is live, this file would make the booking
-- pages show "not found". The owner runs it in the SQL Editor of the Supabase project (nothing else runs it). Steps, the two read-only checks and
-- the way back are in docs/tutors-rls/README.md ("Running it"); the way back is docs/tutors-rls/025_tutors_not_public_rollback.sql.
-- Tested on a local copy only (tests/tutors-read-exposure.test.ts and tests/tutors-025-ready.test.ts, PGlite): nothing here ran on a real database.
-- It stays outside supabase/migrations on purpose. Once the owner has run it, move it into supabase/migrations WITH the marker below: the test that
-- documents today's exposure then expects the fix and becomes the guard that keeps it closed.
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

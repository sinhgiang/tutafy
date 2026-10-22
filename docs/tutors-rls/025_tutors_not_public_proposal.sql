-- T-0767 PROPOSAL: stop letting a visitor read other tutors' private columns.
--
-- NOT APPLIED. NOT IN supabase/migrations ON PURPOSE. Do not run it, and do not move it there, until the code in docs/tutors-rls/README.md
-- ("Order of work") reads these tables on the server: the booking pages, the embed, the public profile and the sitemap read `tutors`
-- (and the blocked days) with a visitor's key today, and they would show "not found" the moment this runs. The owner approves it; the Chief
-- schedules it after the code change. Tested on a local copy only (tests/tutors-read-exposure.test.ts, PGlite): nothing here ran on a real database.
-- When it is moved into supabase/migrations it must keep the marker below, which makes the test that documents today's exposure expect the fix.
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
-- WHAT MUST CHANGE IN THE CODE FIRST (each reads with a visitor's key today; each must read on the server with the admin client, only the
-- columns the page shows): the list is in docs/tutors-rls/README.md. Safe to run again.

drop policy if exists "Anyone can view tutor for booking" on public.tutors;
revoke select on public.tutors from anon;

drop policy if exists "Public read exceptions" on public.availability_exceptions;
revoke select on public.availability_exceptions from anon;

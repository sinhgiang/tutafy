-- T-0774: the way back from 025_tutors_not_public_proposal.sql. Run it ONLY if, after 025, the site is broken in a way the code cannot explain.
-- It puts back exactly what 002_rls.sql and 010_availability_exceptions.sql made: the two public read policies and the visitor's right to select.
-- That re-opens the exposure described in docs/tutors-rls/README.md (a visitor can read every column of a tutor whose page is on), so it is a
-- stop-gap, not a place to stay. It changes no row and no column. Safe to run again. Tested on a local copy (tests/tutors-025-ready.test.ts):
-- after 025 and then this file, the policies and the grants are the same as before 025.

drop policy if exists "Anyone can view tutor for booking" on public.tutors;
create policy "Anyone can view tutor for booking" on public.tutors for select using (booking_url_active = true);
grant select on public.tutors to anon;

drop policy if exists "Public read exceptions" on public.availability_exceptions;
create policy "Public read exceptions" on public.availability_exceptions for select using (true);
grant select on public.availability_exceptions to anon;

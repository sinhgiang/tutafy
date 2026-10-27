-- T-0774: the two read-only checks for supabase/migrations/025_tutors_not_public.sql. They change nothing (two select statements). Run each one on its own
-- in the SQL Editor of the Supabase project; the editor shows the result of the last statement it runs.
--
-- CHECK 1 - which policies are on the two tables. After 025 the list must NOT contain "Anyone can view tutor for booking" or "Public read exceptions",
-- and must still contain "Tutors can view own profile", "Tutors can update own profile", "Tutors can insert own profile" and "Tutors manage exceptions".
-- Any other row with a condition that is just true, or only booking_url_active = true, is a public policy the files do not know about: tell the Chief.
select tablename, policyname, cmd, qual from pg_policies where schemaname = 'public' and tablename in ('tutors', 'availability_exceptions') order by tablename, policyname;

-- CHECK 2 - can the visitor's role select from them? Before 025 this shows two rows (SELECT on tutors and on availability_exceptions for anon).
-- After 025 it must show NO row.
select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name in ('tutors', 'availability_exceptions') and grantee = 'anon' and privilege_type = 'SELECT' order by table_name;

-- The tutor's intro video link and the facts behind the "Established" badge (T-0915).
--
-- WRITTEN BUT NOT APPLIED: the owner runs this on the real database (Supabase SQL Editor, project "tutafy"). Safe to run twice. It changes no
-- existing row. Tested on a local copy only (tests/intro-video-migration.test.ts, PGlite with a small stand-in of Supabase's auth table).
-- Until it is applied nothing breaks: the profile and the directory read the new column and the new function on their own and treat a database
-- without them as "no video" and "no badge"; Settings says "This option is not available yet" and loses nothing.
--
-- 1. tutors.intro_video_url, one column. A tutor pastes a link to a YouTube or Vimeo video; the video stays on that site. The server route
--    (src/app/api/tutors/intro-video/route.ts) rebuilds the address from the provider and the video id (src/lib/intro-video.ts) and stores only
--    that rebuilt form. The CHECK below accepts exactly those two forms and nothing else, so even a tutor who writes the column directly with
--    their own session (the policy "Tutors can update own profile" lets them) cannot store another site, a script or a long text.
--      https://www.youtube.com/watch?v=<11 letters, digits, - or _>
--      https://vimeo.com/<6 to 12 digits>[/<8 to 16 hex digits>]
--
-- 2. public.tutor_established_facts(ids), the three facts the badge needs and the tutor row does not hold: the date the sign-in email was
--    confirmed (auth.users), how many lessons were taught and marked completed, and the date of the tenth. It is SECURITY DEFINER because it reads
--    auth.users; only the server's own key may call it (EXECUTE is taken from public, anon and authenticated), and it returns a date and two
--    numbers, never an address or any other column. At most 100 ids are read per call.

alter table public.tutors add column if not exists intro_video_url text;

create or replace function public.intro_video_url_valid(u text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select u is null or (
    length(u) <= 300 and (
      u ~ '^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$'
      or u ~ '^https://vimeo\.com/[0-9]{6,12}(/[0-9a-f]{8,16})?$'
    )
  )
$$;

alter table public.tutors drop constraint if exists tutors_intro_video_url_valid;
alter table public.tutors add constraint tutors_intro_video_url_valid check (public.intro_video_url_valid(intro_video_url));

create or replace function public.tutor_established_facts(ids uuid[])
returns table (tutor_id uuid, email_confirmed_at timestamptz, completed_lessons integer, tenth_lesson_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id,
    (select u.email_confirmed_at from auth.users u where u.id = t.id),
    (select count(*)::integer from public.lessons l where l.tutor_id = t.id and l.status = 'completed' and l.starts_at <= now()),
    (select l.starts_at from public.lessons l where l.tutor_id = t.id and l.status = 'completed' and l.starts_at <= now() order by l.starts_at, l.id offset 9 limit 1)
  from public.tutors t
  where t.id = any (ids[1:100])
$$;

revoke all on function public.tutor_established_facts(uuid[]) from public, anon, authenticated;
grant execute on function public.tutor_established_facts(uuid[]) to service_role;

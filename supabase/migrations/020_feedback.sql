-- In-app feedback: one table for what tutors and students write in the Feedback box (T-0723).
--
-- WRITTEN BUT NOT APPLIED: the owner runs this on the real database (Supabase SQL Editor). Safe to run again.
-- Tested on a local copy only (tests/feedback-migration.test.ts, PGlite). Numbered 020 and not 019 because a
-- file 019_custom_lesson_durations.sql is waiting on its own branch (helme/lesson-lengths-019); the two do not
-- touch each other, so they can be applied in either order.
--
-- WHAT IS KEPT, and nothing more: when it was sent, the author's role (tutor or student), the author's email
-- as the server knows it (from the signed-in session, or from a valid student link; never typed by the sender),
-- for a tutor their account id, the kind (bug, idea or question) and the text. No address, no browser, no page.
--
-- WHO MAY DO WHAT: nobody but the server. Row level security is on and there is NO policy, and the
-- table rights of the signed-in and anonymous roles are taken away, so the browser (public key) can neither
-- read nor write a row, whatever it is signed in as. The route /api/feedback checks who is asking and writes
-- with the service role; the admin page reads with the service role after its own admin check.
--
-- HOW OFTEN: a trigger refuses the 11th feedback of one author within an hour (error code TF429,
-- message feedback_rate_limited). It counts rows, so it holds across every server instance and cannot be
-- bypassed by calling the route in a different way; the route also has its own, shorter limit in memory.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  author_role text not null check (author_role in ('tutor', 'student')),
  -- the author's account for a tutor; null for a student (a student has no account, only a mailbox)
  tutor_id uuid references public.tutors (id) on delete cascade,
  author_email text not null check (author_email = lower(author_email) and char_length(author_email) between 3 and 254),
  kind text not null check (kind in ('bug', 'idea', 'question')),
  message text not null check (char_length(btrim(message, E' \t\r\n')) between 1 and 2000),
  check ((author_role = 'tutor') = (tutor_id is not null))
);

create index if not exists feedback_author_recent on public.feedback (author_email, created_at desc);
create index if not exists feedback_newest on public.feedback (created_at desc);

alter table public.feedback enable row level security;
-- no policy on purpose: with row level security on and no policy, the signed-in and anonymous roles see and change nothing
revoke all on public.feedback from anon, authenticated;

create or replace function public.feedback_rate_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    select count(*) from public.feedback
    where author_email = new.author_email and created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'feedback_rate_limited' using errcode = 'TF429';
  end if;
  return new;
end;
$$;

drop trigger if exists feedback_rate_guard on public.feedback;
create trigger feedback_rate_guard
  before insert on public.feedback
  for each row execute function public.feedback_rate_guard();

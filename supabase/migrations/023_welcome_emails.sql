-- Welcome emails for new tutors: the log of what was sent and the list of addresses that unsubscribed (T-0737).
--
-- WRITTEN BUT NOT APPLIED: the owner runs this on the real database (Supabase SQL Editor). Safe to run again.
-- Tested on a local copy only (tests/welcome-emails-migration.test.ts, PGlite). Numbered 023 because 019 and 022 are
-- waiting on their own branches; the files do not touch each other, so they can be applied in any order.
--
-- TWO TABLES, and nothing else is changed:
--   welcome_email_sends  one row per (tutor, step). The row IS the claim: the sender inserts it BEFORE it sends, the
--                        primary key lets only one run win, so a double run (or two servers) can never send a step twice.
--                        If the mail service refuses, the sender deletes its own claim so the next run may try again.
--   email_optouts        addresses that unsubscribed, by ADDRESS (lower case), so the choice holds even if the tutor
--                        deletes the account and signs up again. It covers the welcome series and any later lifecycle
--                        series; mail the tutor needs to run lessons (bookings, reminders, invoices) is not part of it.
--
-- WHO MAY DO WHAT: nobody but the server. Row level security is on with NO policy, and the table rights of the signed-in
-- and anonymous roles are taken away, so the browser (public key) can neither read nor write a row, whatever it is
-- signed in as. The cron route and the unsubscribe route check who is asking, then use the service role.

create table if not exists public.welcome_email_sends (
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  step text not null check (step in ('welcome', 'nudge', 'checkin')),
  sent_at timestamptz not null default now(),
  primary key (tutor_id, step)
);

create table if not exists public.email_optouts (
  email text primary key check (email = lower(email) and char_length(email) between 3 and 254),
  created_at timestamptz not null default now()
);

alter table public.welcome_email_sends enable row level security;
alter table public.email_optouts enable row level security;
-- no policy on purpose: with row level security on and no policy, the signed-in and anonymous roles see and change nothing
revoke all on public.welcome_email_sends from anon, authenticated;
revoke all on public.email_optouts from anon, authenticated;

-- One-off email to the tutors who already signed up: the queue that sends it one tutor at a time, three minutes apart (T-1064).
--
-- WRITTEN BUT NOT APPLIED: the owner runs this on the real database (Supabase SQL Editor). Safe to run again.
-- Tested on a local copy only (tests/tutor-announcement-migration.test.ts, PGlite). It adds two tables and changes nothing else.
--
--   tutor_announcement_sends    one row per (campaign, tutor). The row IS the claim: the server inserts it BEFORE it asks the
--                               mail service to send, and the primary key lets only one request win, so pressing Start twice (or two
--                               servers) can never queue the same tutor twice. It holds NO address and NO name: the tutor is
--                               the id, and `error` holds only the mail service's error name, never its message.
--   tutor_announcement_control  one row per campaign: when the admin last sent themself the test mail (Start is refused without a recent
--                               one) and when the admin pressed Stop.
--
-- WHO MAY DO WHAT: nobody but the server. Row level security is on with NO policy and the table rights of the signed-in and anonymous roles
-- are taken away, so the browser (public key) can neither read nor write a row, whatever it is signed in as, a tutor's own row included.
-- The API routes check that the caller is the platform admin (ADMIN_EMAIL) on the server, then use the service role.

create table if not exists public.tutor_announcement_sends (
  campaign text not null check (char_length(campaign) between 1 and 60),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  state text not null check (state in ('queued', 'scheduled', 'cancelled', 'failed')),
  scheduled_for timestamptz not null,
  mail_id text check (mail_id is null or char_length(mail_id) <= 100),
  error text check (error is null or char_length(error) <= 100),
  attempt integer not null default 1 check (attempt >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (campaign, tutor_id)
);

create table if not exists public.tutor_announcement_control (
  campaign text primary key check (char_length(campaign) between 1 and 60),
  test_sent_at timestamptz,
  stopped_at timestamptz
);

alter table public.tutor_announcement_sends enable row level security;
alter table public.tutor_announcement_control enable row level security;
-- no policy on purpose: with row level security on and no policy, the signed-in and anonymous roles see and change nothing
revoke all on public.tutor_announcement_sends from anon, authenticated;
revoke all on public.tutor_announcement_control from anon, authenticated;

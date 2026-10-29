-- What Tutafy remembers about each Polar subscription's cancellation: the order of events and the safety net (T-1074).
--
-- WRITTEN BUT NOT APPLIED: the owner runs this on the real database (Supabase SQL Editor). Safe to run again.
-- Tested on a local copy only (tests/polar-safety.test.ts, PGlite). It adds one table and changes nothing else.
-- The code works WITHOUT this table (it then behaves as before T-1074 and logs a warning); applying it turns the safety net on.
--
-- WHY: when a tutor cancels, Polar sends `subscription.canceled` and the tutor keeps the plan until the paid period ends; the plan is taken
-- away by `subscription.revoked`. Nothing in the database said "cancelled, ends on ...", so (1) a `revoked` that came BEFORE a late
-- `canceled` or `updated` of the same subscription could give the plan back, and (2) if Polar never sent `revoked`, the plan stayed forever.
-- One row per Polar subscription fixes both:
--   state          'active' | 'canceling' (the customer asked to cancel; ends_at is the end of the paid period) | 'ended'
--   ended_by       'revoked' (Polar said so), 'canceled' (the period was already over), 'safety_net' (the daily check took the plan away
--                  because Polar sent nothing by ends_at + a grace time)
--   last_event_at  the `modified_at` of the newest event seen, so an older event arriving late is ignored
--   *_noticed_at   when the owner was told (once for each subscription)
-- It holds NO address and NO name: the tutor is the id.
--
-- WHO MAY DO WHAT: nobody but the server. Row level security is on with NO policy and the table rights of the signed-in and anonymous roles
-- are taken away, so a tutor cannot read or write it (a tutor must not be able to move `ends_at` or set state back to 'active').
-- The Polar webhook (signature checked) and the daily check (CRON_SECRET) use the service role.

create table if not exists public.polar_subscription_state (
  subscription_id text primary key check (char_length(subscription_id) between 1 and 100),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  state text not null check (state in ('active', 'canceling', 'ended')),
  ends_at timestamptz,
  last_event_at timestamptz,
  ended_by text check (ended_by is null or ended_by in ('revoked', 'canceled', 'safety_net')),
  cancel_noticed_at timestamptz,
  safety_downgraded_at timestamptz,
  safety_noticed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists polar_subscription_state_canceling_idx
  on public.polar_subscription_state (ends_at) where state = 'canceling';

alter table public.polar_subscription_state enable row level security;
-- no policy on purpose: with row level security on and no policy, the signed-in and anonymous roles see and change nothing
revoke all on public.polar_subscription_state from anon, authenticated;

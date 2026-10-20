-- Card payments of lessons through the tutor's own Stripe account (T-0618).
--
-- WRITTEN BUT NOT APPLIED: the owner decides when this runs on the real database. It adds one new
-- table; it changes no existing table and no existing data. Tested against a local copy
-- (tests/lesson-card-payments-migration.test.ts, PGlite).
--
-- ORDER: apply this BEFORE Stripe Connect is switched on for real tutors. The checkout route
-- (src/app/api/stripe/checkout/route.ts) writes a row here for every card session it opens and refuses to
-- hand out a payment link if it cannot, and the Connect webhook
-- (src/app/api/webhooks/stripe-connect/route.ts) marks a lesson paid only through a row of this table.
-- Stripe is off today, so nothing writes here until then. (Number 017: 016 is the tutors paid-columns lock.)
--
-- One row per Stripe Checkout session the app opened for a lesson. The row is what the webhook trusts:
-- the lesson, the tutor, the connected account, the amount and the currency were written by OUR server
-- when it made the session, so a webhook body only has to name the session (and arrive from that account).
--
--   created    the session was opened; not paid yet
--   paid       the webhook saw a paid session of this row and marked the lesson paid (exactly one row per lesson)
--   duplicate  a paid session arrived but the lesson was not pending any more (paid another way, or by
--              another session): the student may have paid twice, so the tutor may owe a refund
--   mismatch   the paid amount or currency differs from what we asked for: nothing was marked, look at it
--   expired    the session was closed (a newer one replaced it, or it ran out)
--
-- Locked to the service role: RLS on with no policy, no grant to anon or authenticated. The rows are not
-- deleted when a lesson is deleted (lesson_id becomes null): a payment record outlives the lesson.

create table if not exists public.lesson_card_payments (
  stripe_session_id text primary key,
  lesson_id uuid references public.lessons(id) on delete set null,
  tutor_id uuid references public.tutors(id) on delete set null,
  stripe_account_id text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  status text not null default 'created' check (status in ('created', 'paid', 'duplicate', 'mismatch', 'expired')),
  stripe_event_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- At most one open session per lesson: a second one cannot be recorded while the first is still open,
-- even if two requests race.
create unique index if not exists lesson_card_payments_one_open_per_lesson
  on public.lesson_card_payments (lesson_id) where status = 'created';
-- At most one paid row per lesson: two sessions can never both claim "this lesson is paid".
create unique index if not exists lesson_card_payments_one_paid_per_lesson
  on public.lesson_card_payments (lesson_id) where status = 'paid';
create index if not exists lesson_card_payments_lesson_idx on public.lesson_card_payments (lesson_id);

alter table public.lesson_card_payments enable row level security;
revoke all on public.lesson_card_payments from anon, authenticated;

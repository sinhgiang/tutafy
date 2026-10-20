-- First-party visitor journey for the owner's /super-admin page (T-0610).
--
-- WRITTEN BUT NOT APPLIED: the owner decides when this runs on the real database.
-- It only adds two new tables; it changes no existing table and no existing data.
-- Tested against a local copy (tests/visitor-migration.test.ts, PGlite).
--
-- Privacy by design (Privacy page updated in the same change):
--   * rows exist only for visitors who accepted cookies; the random id lives in
--     an httpOnly cookie that the server sets only after consent;
--   * no IP address, no user agent, no query string and no email are stored;
--   * country is the two-letter code from Vercel's header, nothing finer;
--   * paths are normalised by the app (no ids, no tokens, no query strings);
--   * both tables are readable and writable ONLY with the service-role key
--     (RLS on, no policy, no grant to anon or authenticated).

create table if not exists public.visitors (
  id uuid primary key,
  first_seen_at timestamptz not null default now(),
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  first_source text not null default 'direct' check (first_source in (
    'google_search', 'google_ads',
    'ai_chatgpt', 'ai_gemini', 'ai_claude', 'ai_perplexity', 'ai_copilot',
    'social', 'direct', 'other'
  )),
  first_referrer_host text,
  first_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  -- set when this visitor signs up / signs in as a tutor (consented visitors only)
  tutor_id uuid references public.tutors(id) on delete set null
);

create table if not exists public.visitor_events (
  id bigint generated always as identity primary key,
  visitor_id uuid not null references public.visitors(id) on delete cascade,
  kind text not null check (kind in ('page_view', 'checkout_click', 'order_paid')),
  path text,
  plan text check (plan is null or plan in ('pro', 'academy')),
  created_at timestamptz not null default now()
);

create index if not exists visitors_first_seen_idx on public.visitors (first_seen_at desc);
create index if not exists visitors_tutor_idx on public.visitors (tutor_id) where tutor_id is not null;
create index if not exists visitor_events_visitor_idx on public.visitor_events (visitor_id, created_at);
create index if not exists visitor_events_kind_idx on public.visitor_events (kind, created_at desc);

-- Locked to the service role: RLS on with no policies = nobody else can read or write.
alter table public.visitors enable row level security;
alter table public.visitor_events enable row level security;
revoke all on public.visitors from anon, authenticated;
revoke all on public.visitor_events from anon, authenticated;

-- Retention helper. NOT scheduled by this migration; the owner decides whether and
-- how often to run it (for example monthly: select public.purge_old_visitor_data(395)).
-- Deleting a visitor deletes its events (on delete cascade).
create or replace function public.purge_old_visitor_data(keep_days integer)
returns integer
language sql
security invoker
as $$
  with gone as (
    delete from public.visitors
    where first_seen_at < now() - make_interval(days => keep_days)
    returning 1
  )
  select count(*)::integer from gone;
$$;
revoke all on function public.purge_old_visitor_data(integer) from public, anon, authenticated;

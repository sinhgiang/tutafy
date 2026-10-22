-- The log of "View as this tutor" (T-0708): one row each time the platform admin opens a tutor's dashboard in the read-only view.
--
-- WRITTEN BUT NOT APPLIED: the owner runs this on the real database (Supabase SQL Editor). Safe to run again; it adds one new table
-- and changes no existing table and no existing data. Tested on a local copy only (tests/admin-view-log-migration.test.ts, PGlite).
-- Numbered 022 because 019, 020 and 021 are waiting on their own branches; none of them touches this table, so any order works.
--
-- Until it is applied the button "View as this tutor" says "not available yet" and opens nothing: a view that cannot be written
-- to the log is never opened.
--
-- WHAT A ROW IS: the view session itself. `id` is a random UUID that is handed to the admin's browser in an httpOnly cookie; the server
-- accepts the cookie only while the row is for the signed-in admin, is not closed and has not passed `expires_at` (30 minutes after
-- `opened_at`). So the same row says who looked at whom and when:
--   admin_id    the signed-in admin (the auth user id)
--   tutor_id    the tutor whose dashboard was opened (no foreign key on purpose: the log outlives a deleted tutor)
--   opened_at   when the view was opened
--   expires_at  when it stops working by itself
--   closed_at   when the admin pressed Exit (null: it ran out, or the tab was just left; `expires_at` is then the end)
--
-- WHO MAY READ OR WRITE IT: nobody through the public API. Row level security is on with NO policy, and every right of the two public
-- roles is taken away, so only the server (service role, after its own admin check) reads or writes rows. A tutor can never see that
-- they were viewed through this table, and cannot add, change or remove a row.

create table if not exists public.admin_view_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  tutor_id uuid not null,
  opened_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes',
  closed_at timestamptz,
  constraint admin_view_log_expires_after_open check (expires_at > opened_at),
  constraint admin_view_log_closed_after_open check (closed_at is null or closed_at >= opened_at)
);

create index if not exists admin_view_log_opened_idx on public.admin_view_log (opened_at desc);
create index if not exists admin_view_log_tutor_idx on public.admin_view_log (tutor_id, opened_at desc);

alter table public.admin_view_log enable row level security;
revoke all on public.admin_view_log from anon, authenticated;

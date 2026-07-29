-- Give each team member their own bookable identity: a slug, bio, avatar,
-- timezone and independent availability, so students can book a specific
-- tutor within an Academy team instead of only the owner account.

alter table public.team_members
  add column if not exists slug text,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists timezone text,
  add column if not exists booking_url_active boolean not null default true;

-- Backfill slugs for any existing team members so their booking page works immediately.
update public.team_members
set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(id::text), 1, 4)
where slug is null;

alter table public.team_members alter column slug set not null;

create unique index if not exists team_members_owner_slug_idx on public.team_members(owner_id, slug);

-- Availability rows can now optionally belong to a specific team member.
-- Rows with team_member_id = null remain the owner's own availability (unchanged behavior).
alter table public.availability
  add column if not exists team_member_id uuid references public.team_members(id) on delete cascade;

create index if not exists availability_team_member_id_idx on public.availability(team_member_id);

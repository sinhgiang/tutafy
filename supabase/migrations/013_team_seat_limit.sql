-- Enforce the Academy plan's 5-seat team cap (and that team_members can only
-- be created by Academy tutors at all) at the data layer, mirroring
-- 012_student_limit.sql — not just the one API route that checks it.
create or replace function public.enforce_team_seat_limit()
returns trigger as $$
declare
  plan text;
  cnt integer;
begin
  select subscription_status into plan from public.tutors where id = new.owner_id;
  if coalesce(plan, 'free') <> 'academy' then
    raise exception 'team_requires_academy' using errcode = 'P0001';
  end if;
  select count(*) into cnt from public.team_members where owner_id = new.owner_id;
  if cnt >= 5 then
    raise exception 'team_seat_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_enforce_team_seat_limit on public.team_members;
create trigger trg_enforce_team_seat_limit
  before insert on public.team_members
  for each row execute function public.enforce_team_seat_limit();

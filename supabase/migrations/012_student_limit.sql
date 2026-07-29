-- Enforce the Free plan's 10-student cap at the data layer so it can't be
-- bypassed by any insert path (client SDK, /api/v1/students, /api/import,
-- future code) — not just the one "Add Student" page that checked it in the UI.
create or replace function public.enforce_student_limit()
returns trigger as $$
declare
  plan text;
  cnt integer;
begin
  select subscription_status into plan from public.tutors where id = new.tutor_id;
  if coalesce(plan, 'free') = 'free' then
    select count(*) into cnt from public.students where tutor_id = new.tutor_id;
    if cnt >= 10 then
      raise exception 'student_limit_reached' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_enforce_student_limit on public.students;
create trigger trg_enforce_student_limit
  before insert on public.students
  for each row execute function public.enforce_student_limit();

-- Stop a signed-in tutor from changing the paid-plan and money columns of their own row (T-0613).
--
-- WRITTEN BUT NOT APPLIED: the owner decides when this runs on the real database.
-- Tested on a local copy only (tests/tutors-paid-columns.test.ts, PGlite).
--
-- THE HOLE: 002_rls.sql line 16 lets a tutor update ANY column of their own row
-- ("using (auth.uid() = id)", no column limit), and no trigger stood in the way, so
--   update public.tutors set subscription_status = 'academy' where id = auth.uid()
-- sent from the browser with the public key gave a free paid plan. The plan limits
-- (012_student_limit.sql, 013_team_seat_limit.sql) read that same column, so they were
-- lifted with it. The tutor could also write the Polar ids, the Stripe account id and
-- onboarding flag, and the referral credits.
--
-- THE FIX: a trigger. Only the database owner and the service role (the server: Polar
-- webhook, plan upgrade route, Stripe onboarding) may change these columns, on insert and
-- on update. Any other role (anon, authenticated, ...) gets error 42501 "paid_columns_locked".
-- Changing other columns of the same row still works, and writing a locked column with the
-- value it already has is not a change, so forms that send the whole row keep working.
--
-- Read with to_jsonb(), so a column that does not exist on a given database is simply
-- ignored instead of breaking every update of the table.
--
-- BEFORE YOU APPLY: the code that writes these columns with the signed-in user's client must
-- already use the service role (the Stripe onboarding route and the Stripe return page do, as
-- of the same change). Safe to apply after that code is live; applying first would break Stripe
-- onboarding for tutors.

create or replace function public.lock_paid_tutor_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  col text;
  locked text[] := array[
    'subscription_status', 'subscription_expires_at',
    'polar_subscription_id', 'polar_checkout_id',
    'stripe_account_id', 'stripe_onboarding_complete',
    'referral_credits'
  ];
  -- the values a brand-new row may carry (anything else must be left out or null)
  starting jsonb := '{"subscription_status": "free", "stripe_onboarding_complete": false, "referral_credits": 0}';
  new_j jsonb := to_jsonb(new);
  old_j jsonb;
  v jsonb;
begin
  -- the owner (migrations, SQL editor) and the server (service role) are trusted
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    old_j := to_jsonb(old);
    foreach col in array locked loop
      if (new_j -> col) is distinct from (old_j -> col) then
        raise exception 'paid_columns_locked'
          using errcode = '42501', detail = format('column %s can only be changed by the server', col);
      end if;
    end loop;
  else
    foreach col in array locked loop
      v := new_j -> col;
      if v is not null and v <> 'null'::jsonb and v is distinct from (starting -> col) then
        raise exception 'paid_columns_locked'
          using errcode = '42501', detail = format('column %s can only be set by the server', col);
      end if;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lock_paid_tutor_columns on public.tutors;
create trigger trg_lock_paid_tutor_columns
  before insert or update on public.tutors
  for each row execute function public.lock_paid_tutor_columns();

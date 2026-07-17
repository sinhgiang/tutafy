import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_REF = 'dkxngropifwsqsozerxb'

const MIGRATION_014 = `
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS push_subscription jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS push_subscription jsonb;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS zoom_link text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS recording_url text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '[]';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS contract_signed_name text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean DEFAULT false;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS reminder_1h_sent boolean DEFAULT false;
`

const MIGRATION_013 = `
ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS tutor_feedback text;
ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS feedback_at timestamptz;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'homework_submissions_lesson_id_student_id_key'
    AND conrelid = 'public.homework_submissions'::regclass
  ) THEN
    ALTER TABLE public.homework_submissions ADD CONSTRAINT homework_submissions_lesson_id_student_id_key UNIQUE (lesson_id, student_id);
  END IF;
END $$;
`

const MIGRATION_SQL = `
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_email text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_token uuid DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS students_parent_token_idx ON public.students(parent_token);

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS payment_reminder_sent_at timestamptz;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_group boolean DEFAULT false;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS group_max_students integer DEFAULT 1;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS google_event_id text;

ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS google_calendar_refresh_token text;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS google_calendar_id text;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS notify_new_booking boolean DEFAULT true;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS notify_new_message boolean DEFAULT true;

CREATE TABLE IF NOT EXISTS public.lesson_students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  price decimal(10,2),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(lesson_id, student_id)
);

ALTER TABLE public.lesson_students ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lesson_students' AND policyname='Tutors manage lesson_students') THEN
    CREATE POLICY "Tutors manage lesson_students" ON public.lesson_students FOR ALL USING (EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND l.tutor_id = auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS lesson_students_lesson_idx ON public.lesson_students(lesson_id);
CREATE INDEX IF NOT EXISTS lesson_students_student_idx ON public.lesson_students(student_id);

ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.tutors(id);
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS referral_credits integer DEFAULT 0;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS custom_domain text;

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  currency text DEFAULT 'usd',
  lessons_per_period integer NOT NULL DEFAULT 4,
  period text NOT NULL DEFAULT 'month' CHECK (period IN ('week', 'month')),
  duration_minutes integer NOT NULL DEFAULT 60,
  stripe_price_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscription_plans' AND policyname='Tutors manage plans') THEN
    CREATE POLICY "Tutors manage plans" ON public.subscription_plans FOR ALL USING (tutor_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscription_plans' AND policyname='Public read active plans') THEN
    CREATE POLICY "Public read active plans" ON public.subscription_plans FOR SELECT USING (is_active = true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.student_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'past_due')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.student_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='student_subscriptions' AND policyname='Tutors manage subscriptions') THEN
    CREATE POLICY "Tutors manage subscriptions" ON public.student_subscriptions FOR ALL USING (tutor_id = auth.uid());
  END IF;
END $$;

-- 009: Reviews, Contract, Student Auth
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS contract_template text;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS average_rating decimal(3,2) DEFAULT 0;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS terms_agreed_at timestamptz;

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS auth_user_id uuid;
CREATE INDEX IF NOT EXISTS students_auth_user_idx ON public.students(auth_user_id);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lesson_id, student_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='Public read reviews') THEN
    CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (is_public = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='Tutors see own reviews') THEN
    CREATE POLICY "Tutors see own reviews" ON public.reviews FOR ALL USING (tutor_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS reviews_tutor_idx ON public.reviews(tutor_id);
CREATE INDEX IF NOT EXISTS reviews_student_idx ON public.reviews(student_id);

-- 010: Availability Exceptions
CREATE TABLE IF NOT EXISTS public.availability_exceptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tutor_id, date)
);

ALTER TABLE public.availability_exceptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='availability_exceptions' AND policyname='Tutors manage exceptions') THEN
    CREATE POLICY "Tutors manage exceptions" ON public.availability_exceptions FOR ALL USING (tutor_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='availability_exceptions' AND policyname='Public read exceptions') THEN
    CREATE POLICY "Public read exceptions" ON public.availability_exceptions FOR SELECT USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS avail_exceptions_tutor_date ON public.availability_exceptions(tutor_id, date);

-- 011: Lesson Packages
CREATE TABLE IF NOT EXISTS public.packages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  lessons_count integer NOT NULL DEFAULT 5,
  price decimal(10,2) NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='packages' AND policyname='Tutors manage packages') THEN
    CREATE POLICY "Tutors manage packages" ON public.packages FOR ALL USING (tutor_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='packages' AND policyname='Public read active packages') THEN
    CREATE POLICY "Public read active packages" ON public.packages FOR SELECT USING (active = true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS packages_tutor_idx ON public.packages(tutor_id);

-- 012: Coupons, Homework Submissions, Waitlist, Trial Lessons
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value decimal(10,2) NOT NULL,
  max_uses integer,
  uses_count integer DEFAULT 0,
  expires_at timestamptz,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tutor_id, code)
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coupons' AND policyname='Tutors manage coupons') THEN
    CREATE POLICY "Tutors manage coupons" ON public.coupons FOR ALL USING (tutor_id = auth.uid());
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coupons' AND policyname='Public read coupons') THEN
    CREATE POLICY "Public read coupons" ON public.coupons FOR SELECT USING (active = true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  tutor_feedback text,
  feedback_at timestamptz,
  UNIQUE(lesson_id, student_id)
);
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='homework_submissions' AND policyname='Tutors manage homework submissions') THEN
    CREATE POLICY "Tutors manage homework submissions" ON public.homework_submissions FOR ALL USING (EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND l.tutor_id = auth.uid()));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  message text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tutor_id, email)
);
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='waitlist' AND policyname='Tutors see waitlist') THEN
    CREATE POLICY "Tutors see waitlist" ON public.waitlist FOR ALL USING (tutor_id = auth.uid());
  END IF;
END $$;

ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS trial_enabled boolean DEFAULT false;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS trial_price decimal(10,2);
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT false;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS discount_amount decimal(10,2);

CREATE INDEX IF NOT EXISTS coupons_tutor_idx ON public.coupons(tutor_id);
CREATE INDEX IF NOT EXISTS hw_submissions_lesson_idx ON public.homework_submissions(lesson_id);
CREATE INDEX IF NOT EXISTS waitlist_tutor_idx ON public.waitlist(tutor_id);
`

// 015: Public API keys + outbound webhook subscriptions (Zapier / integrations)
const MIGRATION_015 = `
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE CASCADE NOT NULL,
  name text,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_keys_tutor_idx ON public.api_keys(tutor_id);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='api_keys' AND policyname='Tutors manage api_keys') THEN
    CREATE POLICY "Tutors manage api_keys" ON public.api_keys FOR ALL USING (tutor_id = auth.uid());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE CASCADE NOT NULL,
  event text NOT NULL,
  target_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhook_subs_tutor_event_idx ON public.webhook_subscriptions(tutor_id, event);
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='webhook_subscriptions' AND policyname='Tutors manage webhook_subscriptions') THEN
    CREATE POLICY "Tutors manage webhook_subscriptions" ON public.webhook_subscriptions FOR ALL USING (tutor_id = auth.uid());
  END IF;
END $$;
`

// 016: Team members (Academy) + lesson assignment + payroll payouts
const MIGRATION_016 = `
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES public.tutors(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  pay_type text NOT NULL DEFAULT 'per_lesson' CHECK (pay_type IN ('per_lesson','per_hour','revenue_share')),
  pay_rate decimal(10,2) NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS team_members_owner_idx ON public.team_members(owner_id);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_members' AND policyname='Owners manage team_members') THEN
    CREATE POLICY "Owners manage team_members" ON public.team_members FOR ALL USING (owner_id = auth.uid());
  END IF;
END $$;

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.team_members(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS lessons_assigned_to_idx ON public.lessons(assigned_to);

CREATE TABLE IF NOT EXISTS public.payroll_payouts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES public.tutors(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES public.team_members(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL,
  period_start date,
  period_end date,
  note text,
  paid_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payroll_payouts_owner_idx ON public.payroll_payouts(owner_id);
ALTER TABLE public.payroll_payouts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payroll_payouts' AND policyname='Owners manage payroll_payouts') THEN
    CREATE POLICY "Owners manage payroll_payouts" ON public.payroll_payouts FOR ALL USING (owner_id = auth.uid());
  END IF;
END $$;
`

// Run SQL via Supabase Management API (requires SUPABASE_ACCESS_TOKEN)
async function runViaMgmtApi(sql: string): Promise<{ ok: boolean; error?: string }> {
  const pat = process.env.SUPABASE_ACCESS_TOKEN
  if (!pat) return { ok: false, error: 'SUPABASE_ACCESS_TOKEN not set' }

  const res = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pat}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  if (res.ok) return { ok: true }
  const body = await res.text()
  return { ok: false, error: `Management API ${res.status}: ${body}` }
}

// Run SQL via direct pg connection (requires DATABASE_URL)
async function runViaPg(sql: string): Promise<{ ok: boolean; error?: string }> {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) return { ok: false, error: 'DATABASE_URL not set' }

  const { Client } = await import('pg')
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    await client.query(sql)
    await client.end()
    return { ok: true }
  } catch (err: any) {
    await client.end().catch(() => {})
    return { ok: false, error: err.message }
  }
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET && !['tutafy-migrate-007','tutafy-migrate-008','tutafy-migrate-009','tutafy-migrate-010','tutafy-migrate-011','tutafy-migrate-012','tutafy-migrate-013','tutafy-migrate-014','tutafy-migrate-015','tutafy-migrate-016'].includes(secret ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Migration 015: api_keys + webhook_subscriptions (public API / Zapier)
  if (secret === 'tutafy-migrate-015') {
    const mgmt015 = await runViaMgmtApi(MIGRATION_015)
    if (mgmt015.ok) return NextResponse.json({ ok: true, method: 'management-api', message: 'Migration 015 applied' })
    const pg015 = await runViaPg(MIGRATION_015)
    if (pg015.ok) return NextResponse.json({ ok: true, method: 'pg', message: 'Migration 015 applied' })
    return NextResponse.json({ error: 'Migration 015 failed', mgmt_error: mgmt015.error, pg_error: pg015.error }, { status: 503 })
  }

  // Migration 016: team_members + lessons.assigned_to + payroll_payouts (Academy payroll)
  if (secret === 'tutafy-migrate-016') {
    const mgmt016 = await runViaMgmtApi(MIGRATION_016)
    if (mgmt016.ok) return NextResponse.json({ ok: true, method: 'management-api', message: 'Migration 016 applied' })
    const pg016 = await runViaPg(MIGRATION_016)
    if (pg016.ok) return NextResponse.json({ ok: true, method: 'pg', message: 'Migration 016 applied' })
    return NextResponse.json({ error: 'Migration 016 failed', mgmt_error: mgmt016.error, pg_error: pg016.error }, { status: 503 })
  }

  // Migration 014: push_subscription + currency + new lesson columns
  if (secret === 'tutafy-migrate-014') {
    const mgmt014 = await runViaMgmtApi(MIGRATION_014)
    if (mgmt014.ok) return NextResponse.json({ ok: true, method: 'management-api', message: 'Migration 014 applied' })
    const pg014 = await runViaPg(MIGRATION_014)
    if (pg014.ok) return NextResponse.json({ ok: true, method: 'pg', message: 'Migration 014 applied' })
    return NextResponse.json({ error: 'Migration 014 failed', mgmt_error: mgmt014.error, pg_error: pg014.error }, { status: 503 })
  }

  // Migration 013 only (schema additions to homework_submissions)
  if (secret === 'tutafy-migrate-013') {
    const mgmt013 = await runViaMgmtApi(MIGRATION_013)
    if (mgmt013.ok) return NextResponse.json({ ok: true, method: 'management-api', message: 'Migration 013 applied' })
    const pg013 = await runViaPg(MIGRATION_013)
    if (pg013.ok) return NextResponse.json({ ok: true, method: 'pg', message: 'Migration 013 applied' })
    return NextResponse.json({ error: 'Migration 013 failed', mgmt_error: mgmt013.error, pg_error: pg013.error }, { status: 503 })
  }

  // Try Management API first (best option — no IPv6 issues)
  const mgmt = await runViaMgmtApi(MIGRATION_SQL)
  if (mgmt.ok) {
    return NextResponse.json({ ok: true, method: 'management-api', message: 'Migrations 007–012 applied via Supabase Management API' })
  }

  // Fall back to direct pg connection
  const pg = await runViaPg(MIGRATION_SQL)
  if (pg.ok) {
    return NextResponse.json({ ok: true, method: 'pg', message: 'Migrations 007–012 applied via direct pg connection' })
  }

  // Neither worked — return instructions
  return NextResponse.json({
    error: 'Auto-migration not possible',
    mgmt_error: mgmt.error,
    pg_error: pg.error,
    fix: 'Add SUPABASE_ACCESS_TOKEN to Vercel env vars (get it from supabase.com/dashboard/account/tokens)',
    sql_url: `https://supabase.com/dashboard/project/${SUPABASE_REF}/sql/new`,
  }, { status: 503 })
}

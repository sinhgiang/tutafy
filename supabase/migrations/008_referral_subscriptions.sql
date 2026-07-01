-- Referral tracking
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.tutors(id);
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS referral_credits integer DEFAULT 0;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS custom_domain text;

-- Subscription plans (tutor creates plans for students)
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
    CREATE POLICY "Tutors manage plans" ON public.subscription_plans
      FOR ALL USING (tutor_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscription_plans' AND policyname='Public read active plans') THEN
    CREATE POLICY "Public read active plans" ON public.subscription_plans
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- Student subscriptions (tracks active subscriptions)
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
    CREATE POLICY "Tutors manage subscriptions" ON public.student_subscriptions
      FOR ALL USING (tutor_id = auth.uid());
  END IF;
END $$;

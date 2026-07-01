'use client'

import { useState } from 'react'
import { Database, Copy, CheckCircle, ExternalLink, Play, Loader2, Key, Zap } from 'lucide-react'

const SQL_007_008 = `-- Migration 007 + 008 (idempotent — safe to run multiple times)

-- 007: Parent Portal, Group Classes, Google Calendar, Payment Reminders
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

-- 008: Referral System, Subscription Plans, White-label Domain
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
END $$;`

export default function AdminMigratePage() {
  const [copied, setCopied] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; message?: string; method?: string; error?: string; fix?: string; sql_url?: string } | null>(null)

  async function copySQL() {
    await navigator.clipboard.writeText(SQL_007_008)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function runMigration() {
    setRunning(true)
    setResult(null)
    const res = await fetch('/api/admin/migrate?secret=tutafy-migrate-008')
    const data = await res.json()
    setResult(data)
    setRunning(false)
  }

  return (
    <div className="max-w-[760px] space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Database Migrations</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">
          Migrations 007 + 008 — Parent Portal, Group Class, Referral, Subscriptions, White-label
        </p>
      </div>

      {/* BEST METHOD: Management API */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-indigo-500" fill="currentColor" />
          <p className="text-[13px] font-bold text-indigo-900">Cách tự động (làm 1 lần, dùng mãi mãi)</p>
        </div>
        <p className="text-[12px] text-indigo-700 leading-relaxed">
          Thêm <strong>SUPABASE_ACCESS_TOKEN</strong> vào Vercel → sau đó click &quot;Run&quot; là xong. Lần sau có migration mới cũng chỉ cần click Run, không cần paste SQL nữa.
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
            <div>
              <p className="text-[12px] text-indigo-800 font-medium">Lấy Personal Access Token</p>
              <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-indigo-600 hover:text-indigo-800 font-semibold mt-0.5">
                supabase.com/dashboard/account/tokens <ExternalLink className="h-3 w-3" />
              </a>
              <p className="text-[11px] text-indigo-600 mt-0.5">Click &quot;Generate new token&quot; → đặt tên &quot;Tutafy Deploy&quot; → Copy token</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            <div>
              <p className="text-[12px] text-indigo-800 font-medium">Add vào Vercel Environment Variables</p>
              <a href="https://vercel.com/sinh-giang-s-projects/tutafy/settings/environment-variables" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-indigo-600 hover:text-indigo-800 font-semibold mt-0.5">
                vercel.com → tutafy → Settings → Env Vars <ExternalLink className="h-3 w-3" />
              </a>
              <div className="mt-1.5 bg-white border border-indigo-100 rounded-lg px-3 py-2 font-mono text-[11px] text-gray-700">
                <span className="text-indigo-600">Key:</span> SUPABASE_ACCESS_TOKEN<br/>
                <span className="text-indigo-600">Value:</span> sbp_xxxxxxxxxxxxxxxxxxxxxxxx<br/>
                <span className="text-indigo-600">Environment:</span> Production ✓
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
            <div>
              <p className="text-[12px] text-indigo-800 font-medium">Click Run bên dưới</p>
              <p className="text-[11px] text-indigo-600 mt-0.5">Migrations chạy qua Supabase Management API — không cần paste SQL bao giờ nữa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Run button */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-indigo-500" />
          <p className="text-[13px] font-semibold text-gray-900">Run Migrations 007 + 008</p>
        </div>
        <p className="text-[12px] text-gray-500">
          Tự động chọn phương thức tốt nhất: Management API → pg fallback. Idempotent — chạy lại nhiều lần cũng không sao.
        </p>

        {result && (
          <div className={`rounded-lg p-4 space-y-1 ${result.ok ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
            <div className="flex items-center gap-2">
              {result.ok
                ? <CheckCircle className="h-4 w-4 text-green-500" />
                : <Database className="h-4 w-4 text-red-500" />}
              <p className={`text-[13px] font-bold ${result.ok ? 'text-green-800' : 'text-red-800'}`}>
                {result.ok ? `✅ Done! (via ${result.method})` : '❌ Failed — use manual SQL below'}
              </p>
            </div>
            {result.message && <p className="text-[12px] text-green-600">{result.message}</p>}
            {result.fix && <p className="text-[12px] text-red-600 font-medium">{result.fix}</p>}
            {result.error && <p className="text-[11px] text-red-500 font-mono mt-1">{result.error}</p>}
          </div>
        )}

        <button onClick={runMigration} disabled={running}
          className="flex items-center gap-2 text-[13px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 px-5 py-2.5 rounded-xl transition-colors">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? 'Running...' : 'Run Migrations'}
        </button>
      </div>

      {/* Fallback: manual SQL */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-gray-400" />
            <p className="text-[13px] font-semibold text-gray-900">Backup: Supabase SQL Editor</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copySQL}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
              {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy SQL'}
            </button>
            <a href="https://supabase.com/dashboard/project/dkxngropifwsqsozerxb/sql/new" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 hover:text-gray-700 transition-colors">
              <ExternalLink className="h-3.5 w-3.5" /> Open SQL Editor
            </a>
          </div>
        </div>
        <p className="text-[12px] text-gray-500">Dùng khi chưa có SUPABASE_ACCESS_TOKEN. Copy → paste vào SQL Editor → Run.</p>
        <pre className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-[11px] text-gray-700 overflow-auto max-h-[350px] font-mono leading-relaxed whitespace-pre-wrap">
          {SQL_007_008}
        </pre>
      </div>
    </div>
  )
}

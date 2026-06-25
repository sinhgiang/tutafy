-- ============================================
-- TUTAFY - Full Database Setup (Run once)
-- ============================================

-- Extensions
create extension if not exists "uuid-ossp";

-- TUTORS
create table if not exists public.tutors (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text not null,
  slug text unique not null,
  bio text,
  avatar_url text,
  languages text[] default '{}',
  timezone text default 'UTC',
  stripe_account_id text,
  stripe_onboarding_complete boolean default false,
  booking_url_active boolean default true,
  cancellation_hours integer default 24,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- STUDENTS
create table if not exists public.students (
  id uuid default uuid_generate_v4() primary key,
  tutor_id uuid references public.tutors(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  country text,
  timezone text default 'UTC',
  level text check (level in ('A1','A2','B1','B2','C1','C2','Native')) default 'A1',
  goals text,
  native_language text,
  notes text,
  tags text[] default '{}',
  status text check (status in ('active','paused','inactive')) default 'active',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- AVAILABILITY
create table if not exists public.availability (
  id uuid default uuid_generate_v4() primary key,
  tutor_id uuid references public.tutors(id) on delete cascade not null,
  day_of_week integer check (day_of_week between 0 and 6) not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now()
);

-- BLOCKED TIMES
create table if not exists public.blocked_times (
  id uuid default uuid_generate_v4() primary key,
  tutor_id uuid references public.tutors(id) on delete cascade not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz default now()
);

-- LESSONS
create table if not exists public.lessons (
  id uuid default uuid_generate_v4() primary key,
  tutor_id uuid references public.tutors(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer default 60,
  status text check (status in ('scheduled','completed','cancelled','no_show')) default 'scheduled',
  zoom_link text,
  meet_link text,
  notes text,
  homework text,
  vocabulary jsonb default '[]',
  recording_url text,
  price decimal(10,2),
  currency text default 'USD',
  payment_status text check (payment_status in ('pending','paid','refunded','free')) default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INVOICES
create table if not exists public.invoices (
  id uuid default uuid_generate_v4() primary key,
  tutor_id uuid references public.tutors(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete set null,
  amount decimal(10,2) not null,
  currency text default 'USD',
  status text check (status in ('draft','sent','paid','overdue','cancelled')) default 'draft',
  stripe_payment_intent_id text,
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PACKAGES
create table if not exists public.packages (
  id uuid default uuid_generate_v4() primary key,
  tutor_id uuid references public.tutors(id) on delete cascade not null,
  name text not null,
  description text,
  lessons_count integer not null,
  price decimal(10,2) not null,
  currency text default 'USD',
  active boolean default true,
  created_at timestamptz default now()
);

-- STUDENT PACKAGES
create table if not exists public.student_packages (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete cascade not null,
  package_id uuid references public.packages(id) on delete set null,
  lessons_remaining integer not null,
  expires_at timestamptz,
  stripe_payment_intent_id text,
  created_at timestamptz default now()
);

-- SUBSCRIPTIONS
create table if not exists public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  tutor_id uuid references public.tutors(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  amount decimal(10,2) not null,
  currency text default 'USD',
  interval text check (interval in ('weekly','monthly')) default 'monthly',
  lessons_per_period integer default 4,
  stripe_subscription_id text,
  status text check (status in ('active','paused','cancelled')) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- HOMEWORK
create table if not exists public.homework_submissions (
  id uuid default uuid_generate_v4() primary key,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  content text not null,
  ai_feedback text,
  submitted_at timestamptz default now()
);

-- FLASHCARDS
create table if not exists public.flashcard_sets (
  id uuid default uuid_generate_v4() primary key,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  tutor_id uuid references public.tutors(id) on delete cascade not null,
  cards jsonb default '[]',
  created_at timestamptz default now()
);

-- TRIGGERS
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger tutors_updated_at before update on public.tutors for each row execute function update_updated_at();
create trigger students_updated_at before update on public.students for each row execute function update_updated_at();
create trigger lessons_updated_at before update on public.lessons for each row execute function update_updated_at();
create trigger invoices_updated_at before update on public.invoices for each row execute function update_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.tutors enable row level security;
alter table public.students enable row level security;
alter table public.availability enable row level security;
alter table public.blocked_times enable row level security;
alter table public.lessons enable row level security;
alter table public.invoices enable row level security;
alter table public.packages enable row level security;
alter table public.student_packages enable row level security;
alter table public.subscriptions enable row level security;
alter table public.homework_submissions enable row level security;
alter table public.flashcard_sets enable row level security;

create policy "Tutors can view own profile" on public.tutors for select using (auth.uid() = id);
create policy "Tutors can update own profile" on public.tutors for update using (auth.uid() = id);
create policy "Tutors can insert own profile" on public.tutors for insert with check (auth.uid() = id);
create policy "Anyone can view tutor for booking" on public.tutors for select using (booking_url_active = true);
create policy "Tutors can manage own students" on public.students for all using (auth.uid() = tutor_id);
create policy "Tutors can manage own availability" on public.availability for all using (auth.uid() = tutor_id);
create policy "Anyone can view availability for booking" on public.availability for select using (true);
create policy "Tutors can manage own blocked times" on public.blocked_times for all using (auth.uid() = tutor_id);
create policy "Tutors can manage own lessons" on public.lessons for all using (auth.uid() = tutor_id);
create policy "Tutors can manage own invoices" on public.invoices for all using (auth.uid() = tutor_id);
create policy "Tutors can manage own packages" on public.packages for all using (auth.uid() = tutor_id);
create policy "Anyone can view active packages" on public.packages for select using (active = true);
create policy "Tutors can view student packages" on public.student_packages for select using (exists (select 1 from public.students s where s.id = student_id and s.tutor_id = auth.uid()));
create policy "Tutors can insert student packages" on public.student_packages for insert with check (exists (select 1 from public.students s where s.id = student_id and s.tutor_id = auth.uid()));
create policy "Tutors can manage own subscriptions" on public.subscriptions for all using (auth.uid() = tutor_id);
create policy "Tutors can manage homework" on public.homework_submissions for all using (exists (select 1 from public.lessons l where l.id = lesson_id and l.tutor_id = auth.uid()));
create policy "Tutors can manage own flashcards" on public.flashcard_sets for all using (auth.uid() = tutor_id);

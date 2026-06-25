-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- TUTORS (extends auth.users)
create table public.tutors (
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
create table public.students (
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

-- AVAILABILITY (tutor's recurring availability)
create table public.availability (
  id uuid default uuid_generate_v4() primary key,
  tutor_id uuid references public.tutors(id) on delete cascade not null,
  day_of_week integer check (day_of_week between 0 and 6) not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now()
);

-- BLOCKED TIMES (holidays, breaks)
create table public.blocked_times (
  id uuid default uuid_generate_v4() primary key,
  tutor_id uuid references public.tutors(id) on delete cascade not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz default now()
);

-- LESSONS
create table public.lessons (
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
create table public.invoices (
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

-- PACKAGES (lesson bundles)
create table public.packages (
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

-- STUDENT PACKAGES (purchased)
create table public.student_packages (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete cascade not null,
  package_id uuid references public.packages(id) on delete set null,
  lessons_remaining integer not null,
  expires_at timestamptz,
  stripe_payment_intent_id text,
  created_at timestamptz default now()
);

-- SUBSCRIPTIONS
create table public.subscriptions (
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

-- HOMEWORK SUBMISSIONS
create table public.homework_submissions (
  id uuid default uuid_generate_v4() primary key,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  content text not null,
  ai_feedback text,
  submitted_at timestamptz default now()
);

-- FLASHCARD SETS (AI generated)
create table public.flashcard_sets (
  id uuid default uuid_generate_v4() primary key,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  tutor_id uuid references public.tutors(id) on delete cascade not null,
  cards jsonb default '[]',
  created_at timestamptz default now()
);

-- Updated_at trigger function
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply trigger to tables with updated_at
create trigger tutors_updated_at before update on public.tutors for each row execute function update_updated_at();
create trigger students_updated_at before update on public.students for each row execute function update_updated_at();
create trigger lessons_updated_at before update on public.lessons for each row execute function update_updated_at();
create trigger invoices_updated_at before update on public.invoices for each row execute function update_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function update_updated_at();

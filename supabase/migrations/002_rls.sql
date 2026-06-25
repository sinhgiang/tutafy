-- Enable RLS on all tables
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

-- TUTORS policies
create policy "Tutors can view own profile" on public.tutors for select using (auth.uid() = id);
create policy "Tutors can update own profile" on public.tutors for update using (auth.uid() = id);
create policy "Tutors can insert own profile" on public.tutors for insert with check (auth.uid() = id);

-- Public booking page: anyone can view tutor by slug
create policy "Anyone can view tutor for booking" on public.tutors for select using (booking_url_active = true);

-- STUDENTS policies (tutor owns students)
create policy "Tutors can manage own students" on public.students for all using (auth.uid() = tutor_id);

-- AVAILABILITY policies
create policy "Tutors can manage own availability" on public.availability for all using (auth.uid() = tutor_id);
create policy "Anyone can view availability for booking" on public.availability for select using (true);

-- BLOCKED TIMES policies
create policy "Tutors can manage own blocked times" on public.blocked_times for all using (auth.uid() = tutor_id);

-- LESSONS policies
create policy "Tutors can manage own lessons" on public.lessons for all using (auth.uid() = tutor_id);

-- INVOICES policies
create policy "Tutors can manage own invoices" on public.invoices for all using (auth.uid() = tutor_id);

-- PACKAGES policies
create policy "Tutors can manage own packages" on public.packages for all using (auth.uid() = tutor_id);
create policy "Anyone can view active packages" on public.packages for select using (active = true);

-- STUDENT PACKAGES policies
create policy "Tutors can view student packages" on public.student_packages for select using (
  exists (select 1 from public.students s where s.id = student_id and s.tutor_id = auth.uid())
);
create policy "Tutors can insert student packages" on public.student_packages for insert with check (
  exists (select 1 from public.students s where s.id = student_id and s.tutor_id = auth.uid())
);

-- SUBSCRIPTIONS policies
create policy "Tutors can manage own subscriptions" on public.subscriptions for all using (auth.uid() = tutor_id);

-- HOMEWORK SUBMISSIONS policies
create policy "Tutors can manage homework submissions" on public.homework_submissions for all using (
  exists (select 1 from public.lessons l where l.id = lesson_id and l.tutor_id = auth.uid())
);

-- FLASHCARD SETS policies
create policy "Tutors can manage own flashcard sets" on public.flashcard_sets for all using (auth.uid() = tutor_id);

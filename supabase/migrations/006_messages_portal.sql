-- MESSAGES TABLE (in-app messaging tutor ↔ student)
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  tutor_id uuid references public.tutors(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  sender_type text not null check (sender_type in ('tutor', 'student')),
  content text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);

alter table public.messages enable row level security;

-- Tutors can manage all messages in their conversations
create policy "Tutors can manage own messages" on public.messages
  for all using (auth.uid() = tutor_id);

-- STUDENT PORTAL TOKEN (for student portal access without login)
alter table public.students add column if not exists portal_token uuid default gen_random_uuid();
alter table public.students add column if not exists portal_token_created_at timestamptz default now();

-- Index for fast portal token lookup
create index if not exists students_portal_token_idx on public.students(portal_token);
-- Index for fast message retrieval
create index if not exists messages_conversation_idx on public.messages(tutor_id, student_id, created_at desc);
create index if not exists messages_unread_idx on public.messages(tutor_id, read_at) where read_at is null;

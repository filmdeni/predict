create table if not exists public.saved_questions (
  id          bigserial primary key,
  user_id     uuid not null references public.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(user_id, question_id)
);

create index if not exists saved_questions_user_idx on saved_questions(user_id, created_at desc);

alter table public.saved_questions enable row level security;

create policy "saved_self_read"   on saved_questions for select using (auth.uid() = user_id);
create policy "saved_self_insert" on saved_questions for insert with check (auth.uid() = user_id);
create policy "saved_self_delete" on saved_questions for delete using (auth.uid() = user_id);

grant select, insert, delete on public.saved_questions to authenticated;
grant usage, select on sequence public.saved_questions_id_seq to authenticated;

create table feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete set null,
  category    text not null default 'other',
  message     text not null,
  contact     text,
  status      text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at  timestamptz not null default now()
);

alter table feedback enable row level security;

-- users can insert their own feedback
create policy "users can submit feedback"
  on feedback for insert
  to authenticated
  with check (user_id = auth.uid());

-- only service_role / admin reads (admin page uses service role via server action)
create policy "users can read own feedback"
  on feedback for select
  to authenticated
  using (user_id = auth.uid());

grant insert on feedback to authenticated;
grant select on feedback to authenticated;

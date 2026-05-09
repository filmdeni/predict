alter table notifications add column if not exists question_id uuid references questions(id) on delete cascade;

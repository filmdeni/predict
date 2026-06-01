-- Track first-time shares per user per question
create table if not exists question_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  shared_at timestamptz not null default now(),
  unique (user_id, question_id)
);

alter table question_shares enable row level security;
create policy "users can insert own shares" on question_shares
  for insert with check (auth.uid() = user_id);
create policy "users can read own shares" on question_shares
  for select using (auth.uid() = user_id);

-- Award 500 coins on first share of a question
create or replace function share_question_reward(p_user_id uuid, p_question_id uuid)
returns int
language plpgsql
security definer
as $$
declare
  v_coins int := 500;
begin
  -- insert returns nothing if already exists (unique constraint)
  insert into question_shares (user_id, question_id)
  values (p_user_id, p_question_id)
  on conflict (user_id, question_id) do nothing;

  -- if no row was inserted, already shared before
  if not found then
    return 0;
  end if;

  update users set coins = coins + v_coins where id = p_user_id;
  return v_coins;
end;
$$;

grant execute on function share_question_reward(uuid, uuid) to authenticated;

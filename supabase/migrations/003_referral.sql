-- ─────────────────────────────────────────
-- NOTIFICATIONS TABLE (create if not exists)
-- ─────────────────────────────────────────
create table if not exists notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  type        text not null,           -- 'reply' | 'referral'
  read        boolean not null default false,
  comment_id  uuid references comments(id) on delete cascade,
  message     text,
  coins_gained int,
  ref_user_id uuid references public.users(id) on delete set null,
  question_id uuid references questions(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications(user_id, created_at desc);

-- RLS
alter table notifications enable row level security;
do $$ begin
  create policy "notifications_self_read" on notifications for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "notifications_self_update" on notifications for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "notifications_service_insert" on notifications for insert with check (true);
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────
-- ADD referred_by TO predictions
-- ─────────────────────────────────────────
alter table predictions
  add column if not exists referred_by uuid references public.users(id) on delete set null;

-- ─────────────────────────────────────────
-- REFERRAL REWARD TRIGGER
-- fires after insert on predictions
-- gives referrer +100 coins if:
--   referred_by IS NOT NULL
--   referred_by != user_id (can't ref yourself)
-- ─────────────────────────────────────────
create or replace function handle_referral_reward()
returns trigger language plpgsql security definer as $$
begin
  if new.referred_by is null then return new; end if;
  if new.referred_by = new.user_id then return new; end if;

  -- give coins to referrer
  update public.users
    set coins = coins + 100
    where id = new.referred_by;

  -- notify referrer
  insert into notifications (user_id, type, message, coins_gained, ref_user_id, question_id)
  select
    new.referred_by,
    'referral',
    u.display_name || ' มาทายจากลิงก์ของคุณ!',
    100,
    new.user_id,
    new.question_id
  from public.users u where u.id = new.user_id;

  -- log coin transaction
  insert into coin_transactions (user_id, amount, balance, reason, ref_id)
  select
    new.referred_by,
    100,
    u.coins,
    'referral_reward',
    new.id
  from public.users u where u.id = new.referred_by;

  return new;
end;
$$;

drop trigger if exists on_prediction_referral on predictions;
create trigger on_prediction_referral
  after insert on predictions
  for each row execute function handle_referral_reward();

-- ─────────────────────────────────────────
-- OVERRIDE place_prediction TO ACCEPT p_referred_by
-- ─────────────────────────────────────────
create or replace function place_prediction(
  p_question_id  uuid,
  p_user_id      uuid,
  p_option_id    text,
  p_coins        int,
  p_referred_by  uuid default null
)
returns predictions language plpgsql as $$
declare
  v_question  questions;
  v_user      public.users;
  v_pool      jsonb;
  v_odds      numeric;
  v_prediction predictions;
begin
  select * into v_question from questions
    where id = p_question_id and status = 'open' and closes_at > now()
    for update;

  if not found then raise exception 'question_not_available'; end if;

  select * into v_user from public.users where id = p_user_id for update;

  if v_user.coins < p_coins then raise exception 'insufficient_coins'; end if;

  v_pool := coalesce(v_question.pool, '{}'::jsonb);
  v_pool := jsonb_set(
    v_pool,
    array[p_option_id],
    to_jsonb(coalesce((v_pool->>p_option_id)::int, 0) + p_coins)
  );

  v_odds := case
    when (v_question.total_pool + p_coins) = 0 then 1
    else (v_question.total_pool + p_coins)::numeric /
         nullif((v_pool->>p_option_id)::numeric, 0)
  end;

  update public.users set coins = coins - p_coins where id = p_user_id;

  update questions
    set pool = v_pool,
        total_pool = total_pool + p_coins,
        predictions_count = predictions_count + 1
    where id = p_question_id;

  insert into predictions (question_id, user_id, option_id, coins_wagered, odds_at_time, referred_by)
  values (
    p_question_id, p_user_id, p_option_id, p_coins, v_odds,
    case when p_referred_by = p_user_id then null else p_referred_by end
  )
  returning * into v_prediction;

  insert into coin_transactions (user_id, amount, balance, reason, ref_id)
  values (p_user_id, -p_coins, v_user.coins - p_coins, 'prediction_placed', v_prediction.id);

  update public.users set total_predictions = total_predictions + 1 where id = p_user_id;

  return v_prediction;
end;
$$;

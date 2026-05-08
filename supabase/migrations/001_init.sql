-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────

do $$ begin
  create type question_status as enum ('open', 'closed', 'resolved', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type rank_tier as enum ('มือใหม่', 'นักพยากรณ์', 'โหรมือทอง', 'เซียนฟันธง', 'เทพทำนาย');
exception when duplicate_object then null;
end $$;

-- ─────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────

create table if not exists categories (
  id          serial primary key,
  slug        text unique not null,
  name_th     text not null,
  emoji       text not null,
  sort_order  int default 0
);

insert into categories (slug, name_th, emoji, sort_order) values
  ('drama',    'ดราม่า',    '🔥', 1),
  ('esports',  'eSports',   '🎮', 2),
  ('stock',    'หุ้น',      '📈', 3),
  ('politics', 'การเมือง',  '🗳️', 4),
  ('viral',    'ไวรัล',     '💫', 5),
  ('crypto',   'Crypto',    '₿',  6)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────
-- USERS (extends auth.users)
-- ─────────────────────────────────────────

create table if not exists public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique not null,
  display_name    text not null,
  avatar_url      text,
  bio             text,

  coins           int not null default 10000,
  coins_reset_at  timestamptz not null default date_trunc('month', now()) + interval '1 month',
  reputation      numeric(10,2) not null default 0,
  rank            rank_tier not null default 'มือใหม่',

  total_predictions   int not null default 0,
  correct_predictions int not null default 0,
  win_streak          int not null default 0,
  best_streak         int not null default 0,
  followers_count     int not null default 0,
  following_count     int not null default 0,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- QUESTIONS
-- ─────────────────────────────────────────

create table if not exists questions (
  id              uuid primary key default uuid_generate_v4(),
  category_id     int not null references categories(id),
  created_by      uuid not null references public.users(id),

  title           text not null,
  description     text,
  image_url       text,
  source_url      text,

  options         jsonb not null default '[]',
  correct_option  text,

  status          question_status not null default 'open',

  pool            jsonb not null default '{}',
  total_pool      int not null default 0,

  closes_at       timestamptz not null,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  predictions_count int not null default 0,
  comments_count    int not null default 0,
  views_count       int not null default 0
);

create index if not exists questions_category_idx on questions(category_id);
create index if not exists questions_status_idx on questions(status);
create index if not exists questions_closes_at_idx on questions(closes_at);
create index if not exists questions_created_at_idx on questions(created_at desc);

-- ─────────────────────────────────────────
-- PREDICTIONS
-- ─────────────────────────────────────────

create table if not exists predictions (
  id              uuid primary key default uuid_generate_v4(),
  question_id     uuid not null references questions(id) on delete cascade,
  user_id         uuid not null references public.users(id),

  option_id       text not null,
  coins_wagered   int not null check (coins_wagered >= 10),
  coins_won       int,

  odds_at_time    numeric(6,2),
  rep_delta       numeric(8,2),

  is_correct      boolean,
  placed_at       timestamptz not null default now(),
  resolved_at     timestamptz,

  unique(question_id, user_id)
);

create index if not exists predictions_user_idx on predictions(user_id);
create index if not exists predictions_question_idx on predictions(question_id);

-- ─────────────────────────────────────────
-- COMMENTS
-- ─────────────────────────────────────────

create table if not exists comments (
  id          uuid primary key default uuid_generate_v4(),
  question_id uuid not null references questions(id) on delete cascade,
  user_id     uuid not null references public.users(id),
  parent_id   uuid references comments(id) on delete cascade,
  body        text not null check (char_length(body) <= 500),
  likes_count int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists comments_question_idx on comments(question_id, created_at desc);

-- ─────────────────────────────────────────
-- FOLLOWS
-- ─────────────────────────────────────────

create table if not exists follows (
  follower_id  uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- ─────────────────────────────────────────
-- COIN TRANSACTIONS
-- ─────────────────────────────────────────

create table if not exists coin_transactions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id),
  amount      int not null,
  balance     int not null,
  reason      text not null,
  ref_id      uuid,
  created_at  timestamptz not null default now()
);

create index if not exists coin_tx_user_idx on coin_transactions(user_id, created_at desc);

-- ─────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at before update on public.users
  for each row execute function set_updated_at();

drop trigger if exists questions_updated_at on questions;
create trigger questions_updated_at before update on questions
  for each row execute function set_updated_at();

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  _username text;
begin
  _username := coalesce(
    new.raw_user_meta_data->>'preferred_username',
    split_part(new.email, '@', 1)
  );
  _username := _username || '_' || substr(new.id::text, 1, 4);

  insert into public.users (id, username, display_name, avatar_url)
  values (
    new.id,
    _username,
    coalesce(new.raw_user_meta_data->>'full_name', _username),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function place_prediction(
  p_question_id  uuid,
  p_user_id      uuid,
  p_option_id    text,
  p_coins        int
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

  if not found then
    raise exception 'question_not_available';
  end if;

  select * into v_user from public.users
    where id = p_user_id
    for update;

  if v_user.coins < p_coins then
    raise exception 'insufficient_coins';
  end if;

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

  update public.users
    set coins = coins - p_coins
    where id = p_user_id;

  update questions
    set pool = v_pool,
        total_pool = total_pool + p_coins,
        predictions_count = predictions_count + 1
    where id = p_question_id;

  insert into predictions (question_id, user_id, option_id, coins_wagered, odds_at_time)
  values (p_question_id, p_user_id, p_option_id, p_coins, v_odds)
  returning * into v_prediction;

  insert into coin_transactions (user_id, amount, balance, reason, ref_id)
  values (p_user_id, -p_coins, v_user.coins - p_coins, 'prediction_placed', v_prediction.id);

  update public.users set total_predictions = total_predictions + 1 where id = p_user_id;

  return v_prediction;
end;
$$;

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────

alter table public.users enable row level security;
alter table questions enable row level security;
alter table predictions enable row level security;
alter table comments enable row level security;
alter table follows enable row level security;
alter table coin_transactions enable row level security;

-- users
do $$ begin
  create policy "users_public_read" on public.users for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "users_self_update" on public.users for update using (auth.uid() = id);
exception when duplicate_object then null;
end $$;

-- questions
do $$ begin
  create policy "questions_public_read" on questions for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "questions_auth_insert" on questions for insert with check (auth.uid() = created_by);
exception when duplicate_object then null;
end $$;

-- predictions
do $$ begin
  create policy "predictions_self_read" on predictions for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "predictions_self_insert" on predictions for insert with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- comments
do $$ begin
  create policy "comments_public_read" on comments for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "comments_auth_insert" on comments for insert with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "comments_self_delete" on comments for delete using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- follows
do $$ begin
  create policy "follows_public_read" on follows for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "follows_self_insert" on follows for insert with check (auth.uid() = follower_id);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "follows_self_delete" on follows for delete using (auth.uid() = follower_id);
exception when duplicate_object then null;
end $$;

-- coin_transactions
do $$ begin
  create policy "cointx_self_read" on coin_transactions for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

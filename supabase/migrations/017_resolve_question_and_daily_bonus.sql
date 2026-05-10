-- ============================================================
-- 1. Add last_login_bonus_at column for daily bonus tracking
-- ============================================================
alter table public.users
  add column if not exists last_login_bonus_at timestamptz;

-- ============================================================
-- 2. daily_login_bonus() — call on app load, idempotent
--    gives +20 coins if not claimed today (Bangkok time)
-- ============================================================
create or replace function public.daily_login_bonus(p_user_id uuid)
returns int language plpgsql security definer as $$
declare
  v_user public.users;
  v_bonus int := 20;
begin
  select * into v_user from public.users where id = p_user_id for update;
  if not found then return 0; end if;

  -- Already claimed today (Asia/Bangkok = UTC+7)
  if v_user.last_login_bonus_at is not null and
     (v_user.last_login_bonus_at at time zone 'Asia/Bangkok')::date =
     (now() at time zone 'Asia/Bangkok')::date
  then return 0; end if;

  update public.users
    set coins = coins + v_bonus,
        last_login_bonus_at = now()
    where id = p_user_id;

  insert into coin_transactions (user_id, amount, balance, reason)
  values (p_user_id, v_bonus, v_user.coins + v_bonus, 'daily_login');

  return v_bonus;
end;
$$;

-- ============================================================
-- 3. resolve_question() — parimutuel payout + stats update
-- ============================================================
create or replace function public.resolve_question(
  p_question_id   uuid,
  p_correct_option text
)
returns void language plpgsql security definer as $$
declare
  v_question      questions;
  v_winning_pool  numeric;
  v_pred          record;
  v_payout        int;
  v_rep_gain      numeric;
begin
  select * into v_question from questions
    where id = p_question_id for update;

  if not found then raise exception 'question_not_found'; end if;
  if v_question.status = 'resolved' then raise exception 'already_resolved'; end if;

  -- Mark question resolved
  update questions
    set status         = 'resolved',
        correct_option = p_correct_option,
        resolved_at    = now()
    where id = p_question_id;

  -- Get total coins on winning side
  v_winning_pool := coalesce((v_question.pool ->> p_correct_option)::numeric, 0);

  -- Process each prediction
  for v_pred in
    select * from predictions
    where question_id = p_question_id
    for update
  loop
    if v_pred.option_id = p_correct_option then
      -- Parimutuel payout: proportion of total pool
      v_payout := case
        when v_winning_pool = 0 then v_pred.coins_wagered
        else floor(v_pred.coins_wagered::numeric / v_winning_pool * v_question.total_pool)
      end;

      -- Rep gain: base 10 + accuracy bonus (contrarian gets more)
      v_rep_gain := 10 + greatest(0,
        (v_question.total_pool::numeric / greatest(v_winning_pool, 1) - 1) * 5
      );

      update predictions
        set is_correct  = true,
            coins_won   = v_payout,
            rep_delta   = v_rep_gain,
            resolved_at = now()
        where id = v_pred.id;

      update public.users
        set coins               = coins + v_payout,
            correct_predictions = correct_predictions + 1,
            total_predictions   = total_predictions,  -- already incremented on place
            win_streak          = win_streak + 1,
            best_streak         = greatest(best_streak, win_streak + 1),
            reputation          = reputation + v_rep_gain
        where id = v_pred.user_id;

      insert into coin_transactions (user_id, amount, balance, reason, ref_id)
      select v_pred.user_id, v_payout, coins, 'prediction_won', v_pred.id
      from public.users where id = v_pred.user_id;

    else
      -- Wrong prediction
      update predictions
        set is_correct  = false,
            coins_won   = 0,
            rep_delta   = 0,
            resolved_at = now()
        where id = v_pred.id;

      update public.users
        set win_streak = 0
        where id = v_pred.user_id;
    end if;
  end loop;
end;
$$;

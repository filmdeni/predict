-- drop old 4-param version to avoid overload ambiguity
drop function if exists place_prediction(uuid, uuid, text, int);

-- definitive version with security definer so RLS/lock issues don't block it
create or replace function place_prediction(
  p_question_id  uuid,
  p_user_id      uuid,
  p_option_id    text,
  p_coins        int,
  p_referred_by  uuid default null
)
returns predictions language plpgsql security definer as $$
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

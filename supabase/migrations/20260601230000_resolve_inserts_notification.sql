-- Add coins_won column to notifications if not exists
alter table notifications add column if not exists is_correct boolean;
alter table notifications add column if not exists coins_won int;
alter table notifications add column if not exists rep_delta numeric;

-- Update resolve_question to insert notifications for each predictor
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

  update questions
    set status         = 'resolved',
        correct_option = p_correct_option,
        resolved_at    = now()
    where id = p_question_id;

  v_winning_pool := coalesce((v_question.pool ->> p_correct_option)::numeric, 0);

  for v_pred in
    select * from predictions
    where question_id = p_question_id
    for update
  loop
    if v_pred.option_id = p_correct_option then
      v_payout := case
        when v_winning_pool = 0 then v_pred.coins_wagered
        else floor(v_pred.coins_wagered::numeric / v_winning_pool * v_question.total_pool)
      end;

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
            win_streak          = win_streak + 1,
            best_streak         = greatest(best_streak, win_streak + 1),
            reputation          = reputation + v_rep_gain
        where id = v_pred.user_id;

      insert into notifications (user_id, type, message, question_id, is_correct, coins_won, rep_delta)
        values (v_pred.user_id, 'prediction_resolved', v_question.title, p_question_id, true, v_payout, v_rep_gain);

    else
      update predictions
        set is_correct  = false,
            coins_won   = 0,
            rep_delta   = 0,
            resolved_at = now()
        where id = v_pred.id;

      update public.users
        set total_predictions = total_predictions,
            win_streak        = 0
        where id = v_pred.user_id;

      insert into notifications (user_id, type, message, question_id, is_correct, coins_won, rep_delta)
        values (v_pred.user_id, 'prediction_resolved', v_question.title, p_question_id, false, 0, 0);
    end if;
  end loop;

  perform check_and_award_badges(v_pred.user_id);
end;
$$;

-- ============================================================
-- Badge auto-award system
-- ============================================================

-- Helper: safely insert a badge (no-op if already earned)
create or replace function public.award_badge(p_user_id uuid, p_badge_id text)
returns void language plpgsql security definer as $$
begin
  insert into user_badges (user_id, badge_id)
  values (p_user_id, p_badge_id)
  on conflict (user_id, badge_id) do nothing;
exception when others then null;
end;
$$;

-- ============================================================
-- check_and_award_badges(user_id, question_id?)
-- Called after resolve_question for each participant.
-- p_question_id is optional — used for category-specific checks.
-- ============================================================
create or replace function public.check_and_award_badges(
  p_user_id    uuid,
  p_question_id uuid default null
)
returns void language plpgsql security definer as $$
declare
  v_user           public.users;
  v_cat_slug       text;
  v_correct_sport  int;
  v_correct_pol    int;
  v_correct_esport int;
begin
  select * into v_user from public.users where id = p_user_id;
  if not found then return; end if;

  -- first_blood: first ever prediction
  if v_user.total_predictions >= 1 then
    perform public.award_badge(p_user_id, 'first_blood');
  end if;

  -- reputation milestones
  if v_user.reputation >= 1000 then
    perform public.award_badge(p_user_id, 'gold_oracle');
  end if;
  if v_user.reputation >= 5000 then
    perform public.award_badge(p_user_id, 'diamond_oracle');
  end if;

  -- sharp_shooter: 70%+ accuracy with at least 20 predictions
  if v_user.total_predictions >= 20 and
     v_user.correct_predictions::numeric / v_user.total_predictions >= 0.70
  then
    perform public.award_badge(p_user_id, 'sharp_shooter');
  end if;

  -- weekly_streak: win_streak (any) >= 7 days equivalent (7 correct in a row)
  if v_user.win_streak >= 7 then
    perform public.award_badge(p_user_id, 'weekly_streak');
  end if;

  -- Category-specific badges — only when a question context is available
  if p_question_id is not null then
    select c.slug into v_cat_slug
    from questions q
    join categories c on c.id = q.category_id
    where q.id = p_question_id;

    -- sport_oracle: 10+ correct sport/esport predictions
    if v_cat_slug in ('กีฬา', 'sport', 'esport', 'football', 'basketball') then
      select count(*) into v_correct_sport
      from predictions p
      join questions q on q.id = p.question_id
      join categories c on c.id = q.category_id
      where p.user_id = p_user_id
        and p.is_correct = true
        and c.slug in ('กีฬา', 'sport', 'football', 'basketball');

      if v_correct_sport >= 10 then
        perform public.award_badge(p_user_id, 'sport_oracle');
      end if;

      -- sport_streak: win_streak >= 5 while in a sport question
      if v_user.win_streak >= 5 and v_cat_slug not in ('esport') then
        perform public.award_badge(p_user_id, 'sport_streak');
      end if;

      -- esport_legend: 10+ correct esport predictions
      if v_cat_slug = 'esport' then
        select count(*) into v_correct_esport
        from predictions p
        join questions q on q.id = p.question_id
        join categories c on c.id = q.category_id
        where p.user_id = p_user_id
          and p.is_correct = true
          and c.slug = 'esport';

        if v_correct_esport >= 10 then
          perform public.award_badge(p_user_id, 'esport_legend');
        end if;
      end if;
    end if;

    if v_cat_slug in ('การเมือง', 'politics') then
      select count(*) into v_correct_pol
      from predictions p
      join questions q on q.id = p.question_id
      join categories c on c.id = q.category_id
      where p.user_id = p_user_id
        and p.is_correct = true
        and c.slug in ('การเมือง', 'politics');

      if v_correct_pol >= 5 then
        perform public.award_badge(p_user_id, 'politics_god');
      end if;
    end if;
  end if;
end;
$$;

-- ============================================================
-- Update resolve_question to call check_and_award_badges
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
            total_predictions   = total_predictions,
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

    -- Check badges for every participant after their stats are updated
    perform public.check_and_award_badges(v_pred.user_id, p_question_id);
  end loop;
end;
$$;

-- ============================================================
-- Also award first_blood on place_prediction (first prediction)
-- via a trigger on predictions INSERT
-- ============================================================
create or replace function public.trg_prediction_badges()
returns trigger language plpgsql security definer as $$
begin
  -- award first_blood when total_predictions hits 1
  perform public.check_and_award_badges(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_prediction_badges on predictions;
create trigger trg_prediction_badges
  after insert on predictions
  for each row execute function public.trg_prediction_badges();

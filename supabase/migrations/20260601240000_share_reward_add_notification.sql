-- Update share_question_reward to also insert a notification
create or replace function share_question_reward(p_user_id uuid, p_question_id uuid)
returns int
language plpgsql
security definer
as $$
declare
  v_coins int := 500;
begin
  insert into question_shares (user_id, question_id)
  values (p_user_id, p_question_id)
  on conflict (user_id, question_id) do nothing;

  if not found then
    return 0;
  end if;

  update users set coins = coins + v_coins where id = p_user_id;

  insert into notifications (user_id, type, message, question_id, coins_won)
  values (p_user_id, 'share', 'แชร์คำถามสำเร็จ! ได้รับ +' || v_coins || ' คะแนน', p_question_id, v_coins);

  return v_coins;
end;
$$;

grant execute on function share_question_reward(uuid, uuid) to authenticated;

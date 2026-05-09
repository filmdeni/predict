create or replace function notify_question_approval()
returns trigger language plpgsql security definer as $$
begin
  -- only fire when status changes from pending → approved or rejected
  if old.status::text = 'pending' and new.status::text = 'open' then
    insert into notifications (user_id, type, message, question_id)
    values (
      new.created_by,
      'question_approved',
      '🎉 คำถามของคุณได้รับการอนุมัติแล้ว! ทุกคนสามารถทายได้แล้ว',
      new.id
    );
  elsif old.status::text = 'pending' and new.status::text = 'cancelled' then
    insert into notifications (user_id, type, message, question_id)
    values (
      new.created_by,
      'question_rejected',
      '❌ คำถามของคุณไม่ผ่านการอนุมัติในครั้งนี้',
      new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_question_status_change on questions;
create trigger on_question_status_change
  after update of status on questions
  for each row execute function notify_question_approval();

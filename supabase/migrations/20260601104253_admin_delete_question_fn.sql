create or replace function admin_delete_question(p_question_id uuid)
returns void language plpgsql security definer as $$
begin
  if auth.email() != 'zwwzww19192@gmail.com' then
    raise exception 'unauthorized';
  end if;
  delete from questions where id = p_question_id;
end;
$$;

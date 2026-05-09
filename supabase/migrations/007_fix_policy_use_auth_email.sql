drop policy if exists "questions_auth_insert" on questions;

create policy "questions_auth_insert" on questions
  for insert with check (
    auth.uid() = created_by
    and (
      auth.email() = 'zwwzww19192@gmail.com'
      or
      status::text = 'pending'
    )
  );

drop policy if exists "questions_admin_update" on questions;

create policy "questions_admin_update" on questions
  for update using (
    auth.email() = 'zwwzww19192@gmail.com'
  );

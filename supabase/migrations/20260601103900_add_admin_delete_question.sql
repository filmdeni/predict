create policy "questions_admin_delete" on questions
  for delete using (
    auth.email() = 'zwwzww19192@gmail.com'
  );

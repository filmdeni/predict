insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

create policy "Public read question images"
  on storage.objects for select
  using (bucket_id = 'question-images');

create policy "Admin upload question images"
  on storage.objects for insert
  with check (bucket_id = 'question-images' AND auth.role() = 'authenticated');

create policy "Admin update question images"
  on storage.objects for update
  using (bucket_id = 'question-images' AND auth.role() = 'authenticated');

insert into categories (slug, name_th, emoji, sort_order) values
  ('sports', 'กีฬา', '⚽', 7)
on conflict (slug) do nothing;

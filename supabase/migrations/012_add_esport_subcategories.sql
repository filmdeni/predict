-- แทนที่หมวด "eSports" ด้วย 3 หมวดย่อย
update categories set sort_order = 98 where slug = 'esports';

insert into categories (slug, name_th, emoji, sort_order) values
  ('dota2', 'Dota 2', '🔴', 3),
  ('apex',  'Apex',   '🎯', 4),
  ('cs2',   'CS2',    '🔫', 5)
on conflict (slug) do nothing;

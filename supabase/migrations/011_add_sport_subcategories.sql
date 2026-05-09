-- แทนที่หมวด "กีฬา" ด้วย 3 หมวดย่อย
update categories set sort_order = 99 where slug = 'sports';

insert into categories (slug, name_th, emoji, sort_order) values
  ('football', 'ฟุตบอล', '⚽', 7),
  ('boxing',   'มวย',    '🥊', 8),
  ('nba',      'NBA',    '🏀', 9)
on conflict (slug) do nothing;

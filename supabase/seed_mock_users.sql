-- ─────────────────────────────────────────
-- MOCK USERS WITH BADGES
-- วาง SQL นี้ใน Supabase SQL Editor แล้วกด Run
-- (รัน migrations/013_badges.sql ก่อน)
-- ─────────────────────────────────────────

-- 1. สร้าง auth.users ก่อน
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
values
  ('00000000-0000-0000-0001-000000000001', 'siam_ball@mock.app',     '', now(), now(), now(), '{"full_name":"สยาม บอลแม่น","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=siam"}'),
  ('00000000-0000-0000-0001-000000000002', 'nong_politics@mock.app', '', now(), now(), now(), '{"full_name":"น้องการเมือง","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=nong"}'),
  ('00000000-0000-0000-0001-000000000003', 'gold_oracle@mock.app',   '', now(), now(), now(), '{"full_name":"Gold Oracle","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=gold"}'),
  ('00000000-0000-0000-0001-000000000004', 'weekly_champ@mock.app',  '', now(), now(), now(), '{"full_name":"แชมป์สัปดาห์","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=weekly"}'),
  ('00000000-0000-0000-0001-000000000005', 'esport_king@mock.app',   '', now(), now(), now(), '{"full_name":"อีสปอร์ต คิง","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=esport"}'),
  ('00000000-0000-0000-0001-000000000006', 'crypto_witch@mock.app',  '', now(), now(), now(), '{"full_name":"หมอดูคริปโต","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=crypto"}'),
  ('00000000-0000-0000-0001-000000000007', 'newbie_lek@mock.app',    '', now(), now(), now(), '{"full_name":"เล็ก มือใหม่","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=lek"}'),
  ('00000000-0000-0000-0001-000000000008', 'sharp_aim@mock.app',     '', now(), now(), now(), '{"full_name":"ยิงแม่น ชาญชัย","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=sharp"}'),
  ('00000000-0000-0000-0001-000000000009', 'drama_queen@mock.app',   '', now(), now(), now(), '{"full_name":"ดราม่า ควีน","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=drama"}'),
  ('00000000-0000-0000-0001-000000000010', 'lucky_star@mock.app',    '', now(), now(), now(), '{"full_name":"ลักกี้ สตาร์","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=lucky"}')
on conflict (id) do nothing;

-- 2. สร้าง public.users profile
insert into public.users (id, username, display_name, avatar_url, coins, reputation, rank, total_predictions, correct_predictions, win_streak, best_streak)
values
  ('00000000-0000-0000-0001-000000000001', 'siam_ballman',   'สยาม บอลแม่น',   'https://api.dicebear.com/7.x/thumbs/svg?seed=siam',   8500,  1240, 'โหรมือทอง',   42, 31, 5, 8),
  ('00000000-0000-0000-0001-000000000002', 'nong_politics',  'น้องการเมือง',   'https://api.dicebear.com/7.x/thumbs/svg?seed=nong',  12000,  890, 'นักพยากรณ์',  28, 19, 3, 6),
  ('00000000-0000-0000-0001-000000000003', 'gold_oracle_x',  'Gold Oracle',     'https://api.dicebear.com/7.x/thumbs/svg?seed=gold',  15000, 5200, 'เทพทำนาย',    95, 74, 9, 14),
  ('00000000-0000-0000-0001-000000000004', 'weekly_champ',   'แชมป์สัปดาห์',   'https://api.dicebear.com/7.x/thumbs/svg?seed=weekly', 9200,  660, 'นักพยากรณ์',  35, 22, 4, 7),
  ('00000000-0000-0000-0001-000000000005', 'esport_king99',  'อีสปอร์ต คิง',   'https://api.dicebear.com/7.x/thumbs/svg?seed=esport',11000, 1100, 'โหรมือทอง',   50, 38, 6, 11),
  ('00000000-0000-0000-0001-000000000006', 'crypto_witch',   'หมอดูคริปโต',    'https://api.dicebear.com/7.x/thumbs/svg?seed=crypto',13500, 2300, 'เซียนฟันธง',  60, 41, 2, 9),
  ('00000000-0000-0000-0001-000000000007', 'lek_newbie',     'เล็ก มือใหม่',   'https://api.dicebear.com/7.x/thumbs/svg?seed=lek',   10000,   20, 'มือใหม่',      3,  1, 1, 1),
  ('00000000-0000-0000-0001-000000000008', 'sharp_chaichai', 'ยิงแม่น ชาญชัย', 'https://api.dicebear.com/7.x/thumbs/svg?seed=sharp',  7800,  780, 'นักพยากรณ์',  30, 23, 0, 5),
  ('00000000-0000-0000-0001-000000000009', 'drama_queen_th', 'ดราม่า ควีน',    'https://api.dicebear.com/7.x/thumbs/svg?seed=drama',  6200,  340, 'มือใหม่',     15,  8, 0, 3),
  ('00000000-0000-0000-0001-000000000010', 'lucky_star7',    'ลักกี้ สตาร์',   'https://api.dicebear.com/7.x/thumbs/svg?seed=lucky',  9800,  450, 'นักพยากรณ์',  20, 12, 2, 4)
on conflict (id) do nothing;

-- 3. assign badges ให้ users
insert into user_badges (user_id, badge_id, earned_at) values
  -- สยาม บอลแม่น: เซียนทายบอล + ยิงแม่น
  ('00000000-0000-0000-0001-000000000001', 'sport_oracle',  now() - interval '10 days'),
  ('00000000-0000-0000-0001-000000000001', 'sharp_shooter', now() - interval '5 days'),
  ('00000000-0000-0000-0001-000000000001', 'first_blood',   now() - interval '30 days'),

  -- น้องการเมือง: เทพการเมือง
  ('00000000-0000-0000-0001-000000000002', 'politics_god',  now() - interval '7 days'),
  ('00000000-0000-0000-0001-000000000002', 'first_blood',   now() - interval '20 days'),

  -- Gold Oracle: Gold Oracle + Diamond Oracle + ยิงแม่น + เซียนทายบอล
  ('00000000-0000-0000-0001-000000000003', 'gold_oracle',   now() - interval '60 days'),
  ('00000000-0000-0000-0001-000000000003', 'diamond_oracle',now() - interval '14 days'),
  ('00000000-0000-0000-0001-000000000003', 'sharp_shooter', now() - interval '30 days'),
  ('00000000-0000-0000-0001-000000000003', 'sport_oracle',  now() - interval '45 days'),
  ('00000000-0000-0000-0001-000000000003', 'first_blood',   now() - interval '90 days'),

  -- แชมป์สัปดาห์: คนทายแม่นสุดสัปดาห์ + ไม่หยุดทาย
  ('00000000-0000-0000-0001-000000000004', 'weekly_best',   now() - interval '2 days'),
  ('00000000-0000-0000-0001-000000000004', 'weekly_streak', now() - interval '2 days'),
  ('00000000-0000-0000-0001-000000000004', 'first_blood',   now() - interval '15 days'),

  -- อีสปอร์ต คิง: ตำนาน Esport + Gold Oracle
  ('00000000-0000-0000-0001-000000000005', 'esport_legend', now() - interval '20 days'),
  ('00000000-0000-0000-0001-000000000005', 'gold_oracle',   now() - interval '5 days'),
  ('00000000-0000-0000-0001-000000000005', 'sport_streak',  now() - interval '10 days'),
  ('00000000-0000-0000-0001-000000000005', 'first_blood',   now() - interval '25 days'),

  -- หมอดูคริปโต: Gold Oracle + ยิงแม่น
  ('00000000-0000-0000-0001-000000000006', 'gold_oracle',   now() - interval '30 days'),
  ('00000000-0000-0000-0001-000000000006', 'sharp_shooter', now() - interval '12 days'),
  ('00000000-0000-0000-0001-000000000006', 'first_blood',   now() - interval '40 days'),

  -- เล็ก มือใหม่: ทายแรก
  ('00000000-0000-0000-0001-000000000007', 'first_blood',   now() - interval '1 days'),

  -- ยิงแม่น ชาญชัย: ยิงแม่น
  ('00000000-0000-0000-0001-000000000008', 'sharp_shooter', now() - interval '8 days'),
  ('00000000-0000-0000-0001-000000000008', 'first_blood',   now() - interval '18 days'),

  -- ดราม่า ควีน: ทายแรก
  ('00000000-0000-0000-0001-000000000009', 'first_blood',   now() - interval '12 days'),

  -- ลักกี้ สตาร์: ทายแรก + คนทายแม่นสุดสัปดาห์
  ('00000000-0000-0000-0001-000000000010', 'first_blood',   now() - interval '9 days'),
  ('00000000-0000-0000-0001-000000000010', 'weekly_best',   now() - interval '3 days')
on conflict (user_id, badge_id) do nothing;

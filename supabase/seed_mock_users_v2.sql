-- ─────────────────────────────────────────────────────────────
-- MOCK USERS v2 — ~40 additional users across all rank tiers
-- วาง SQL นี้ใน Supabase SQL Editor แล้วกด Run
-- ─────────────────────────────────────────────────────────────

-- ─── auth.users ───────────────────────────────────────────────
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
values
  -- จักรวาลเลือก (rep ≥ 15000)
  ('00000000-0000-0000-0002-000000000001', 'natthawut.k@mock.app',   '', now(), now() - interval '180 days', now(), '{"full_name":"ณัฐวุฒิ กิตติพงษ์","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=natthawut"}'),
  ('00000000-0000-0000-0002-000000000002', 'waranya.s@mock.app',     '', now(), now() - interval '200 days', now(), '{"full_name":"วรัญญา สุขสมบูรณ์","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=waranya"}'),

  -- เทพทำนาย (rep 7000–14999)
  ('00000000-0000-0000-0002-000000000003', 'somchai.p@mock.app',     '', now(), now() - interval '120 days', now(), '{"full_name":"สมชาย ประสิทธิ์","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=somchai"}'),
  ('00000000-0000-0000-0002-000000000004', 'kanokporn.t@mock.app',   '', now(), now() - interval '150 days', now(), '{"full_name":"กนกพร ทองดี","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=kanokporn"}'),
  ('00000000-0000-0000-0002-000000000005', 'wichit.r@mock.app',      '', now(), now() - interval '100 days', now(), '{"full_name":"วิชิต รัตนโชติ","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=wichit"}'),

  -- เซียนทำนาย (rep 3000–6999)
  ('00000000-0000-0000-0002-000000000006', 'siriporn.w@mock.app',    '', now(), now() - interval '90 days',  now(), '{"full_name":"ศิริพร วงศ์ชัย","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=siriporn"}'),
  ('00000000-0000-0000-0002-000000000007', 'kritpong.a@mock.app',    '', now(), now() - interval '80 days',  now(), '{"full_name":"กฤตพงษ์ อนันต์","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=kritpong"}'),
  ('00000000-0000-0000-0002-000000000008', 'narumon.c@mock.app',     '', now(), now() - interval '70 days',  now(), '{"full_name":"นฤมล ชัยสิทธิ์","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=narumon"}'),
  ('00000000-0000-0000-0002-000000000009', 'titipong.b@mock.app',    '', now(), now() - interval '65 days',  now(), '{"full_name":"ติติพงษ์ บุญมา","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=titipong"}'),
  ('00000000-0000-0000-0002-000000000010', 'praeploy.n@mock.app',    '', now(), now() - interval '85 days',  now(), '{"full_name":"แพรพลอย นิลสวัสดิ์","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=praeploy"}'),

  -- โหรมือทอง (rep 1200–2999)
  ('00000000-0000-0000-0002-000000000011', 'watcharapol.s@mock.app', '', now(), now() - interval '60 days',  now(), '{"full_name":"วัชรพล สงวนพันธุ์","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=watcharapol"}'),
  ('00000000-0000-0000-0002-000000000012', 'mayuree.l@mock.app',     '', now(), now() - interval '55 days',  now(), '{"full_name":"มยุรี ลิ้มสกุล","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=mayuree"}'),
  ('00000000-0000-0000-0002-000000000013', 'phluek.j@mock.app',      '', now(), now() - interval '50 days',  now(), '{"full_name":"ฟลุ๊ค จันทร์แดง","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=phluek"}'),
  ('00000000-0000-0000-0002-000000000014', 'yoksiri.m@mock.app',     '', now(), now() - interval '45 days',  now(), '{"full_name":"ยศศิริ มณีรัตน์","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=yoksiri"}'),
  ('00000000-0000-0000-0002-000000000015', 'wanida.p@mock.app',      '', now(), now() - interval '40 days',  now(), '{"full_name":"วนิดา พรมสิทธิ์","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=wanida"}'),
  ('00000000-0000-0000-0002-000000000016', 'tawanrat.k@mock.app',    '', now(), now() - interval '35 days',  now(), '{"full_name":"ตะวันรัตน์ เกษมสุข","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=tawanrat"}'),

  -- นักพยากรณ์ (rep 500–1199)
  ('00000000-0000-0000-0002-000000000017', 'miw.t@mock.app',         '', now(), now() - interval '30 days',  now(), '{"full_name":"มิ้ว ทวีสุข","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=miw"}'),
  ('00000000-0000-0000-0002-000000000018', 'patchara.s@mock.app',    '', now(), now() - interval '28 days',  now(), '{"full_name":"พัชรา สายน้ำ","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=patchara"}'),
  ('00000000-0000-0000-0002-000000000019', 'ohm.w@mock.app',         '', now(), now() - interval '25 days',  now(), '{"full_name":"โอม วัฒนา","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=ohm"}'),
  ('00000000-0000-0000-0002-000000000020', 'fah.ch@mock.app',        '', now(), now() - interval '22 days',  now(), '{"full_name":"ฟ้า ชัยภูมิ","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=fah"}'),
  ('00000000-0000-0000-0002-000000000021', 'ing.p@mock.app',         '', now(), now() - interval '20 days',  now(), '{"full_name":"อิ้ง ปาลิตา","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=ing"}'),
  ('00000000-0000-0000-0002-000000000022', 'tong.sr@mock.app',       '', now(), now() - interval '18 days',  now(), '{"full_name":"ต้อง ศรีวิชัย","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=tong"}'),
  ('00000000-0000-0000-0002-000000000023', 'pim.k@mock.app',         '', now(), now() - interval '15 days',  now(), '{"full_name":"พิม กาญจนา","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=pim"}'),

  -- ผู้ตื่นรู้ (rep 150–499)
  ('00000000-0000-0000-0002-000000000024', 'nook.ch@mock.app',       '', now(), now() - interval '14 days',  now(), '{"full_name":"นุ้ก ชูศรี","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=nook"}'),
  ('00000000-0000-0000-0002-000000000025', 'ton.ph@mock.app',        '', now(), now() - interval '12 days',  now(), '{"full_name":"ต้น ภูวนาท","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=ton"}'),
  ('00000000-0000-0000-0002-000000000026', 'kwanta.r@mock.app',      '', now(), now() - interval '11 days',  now(), '{"full_name":"ขวัญตา รุ่งเรือง","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=kwanta"}'),
  ('00000000-0000-0000-0002-000000000027', 'gift.su@mock.app',       '', now(), now() - interval '10 days',  now(), '{"full_name":"กิ๊ฟต์ สุภาพร","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=gift"}'),
  ('00000000-0000-0000-0002-000000000028', 'arm.nt@mock.app',        '', now(), now() - interval '9 days',   now(), '{"full_name":"อาม นทีทิพย์","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=arm"}'),
  ('00000000-0000-0000-0002-000000000029', 'bam.y@mock.app',         '', now(), now() - interval '8 days',   now(), '{"full_name":"แบม ยิ้มแย้ม","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=bam"}'),
  ('00000000-0000-0000-0002-000000000030', 'jane.kr@mock.app',       '', now(), now() - interval '7 days',   now(), '{"full_name":"เจน กรองทอง","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=jane"}'),

  -- ผู้มาใหม่ (rep < 150)
  ('00000000-0000-0000-0002-000000000031', 'petch.w@mock.app',       '', now(), now() - interval '6 days',   now(), '{"full_name":"เพชร วิสุทธิ์","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=petch"}'),
  ('00000000-0000-0000-0002-000000000032', 'mild.s@mock.app',        '', now(), now() - interval '5 days',   now(), '{"full_name":"ไมลด์ สมบัติ","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=mild"}'),
  ('00000000-0000-0000-0002-000000000033', 'grace.n@mock.app',       '', now(), now() - interval '4 days',   now(), '{"full_name":"เกรซ นิรันดร์","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=grace"}'),
  ('00000000-0000-0000-0002-000000000034', 'boy.d@mock.app',         '', now(), now() - interval '3 days',   now(), '{"full_name":"บอย ดวงจิตร","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=boyduan"}'),
  ('00000000-0000-0000-0002-000000000035', 'sky.a@mock.app',         '', now(), now() - interval '2 days',   now(), '{"full_name":"สกาย อ่อนละมุน","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=sky"}'),
  ('00000000-0000-0000-0002-000000000036', 'lilly.c@mock.app',       '', now(), now() - interval '2 days',   now(), '{"full_name":"ลิลลี่ เจริญสุข","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=lilly"}'),
  ('00000000-0000-0000-0002-000000000037', 'james.th@mock.app',      '', now(), now() - interval '1 days',   now(), '{"full_name":"เจมส์ ธนพล","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=james"}'),
  ('00000000-0000-0000-0002-000000000038', 'nat.kh@mock.app',        '', now(), now() - interval '1 days',   now(), '{"full_name":"แนท ขจรเกียรติ","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=nat"}'),
  ('00000000-0000-0000-0002-000000000039', 'palm.sr@mock.app',       '', now(), now() - interval '12 hours', now(), '{"full_name":"ปาล์ม สระแก้ว","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=palm"}'),
  ('00000000-0000-0000-0002-000000000040', 'joy.m@mock.app',         '', now(), now() - interval '6 hours',  now(), '{"full_name":"จอย มณีนุช","avatar_url":"https://api.dicebear.com/7.x/thumbs/svg?seed=joy"}')
on conflict (id) do nothing;

-- ─── public.users ──────────────────────────────────────────────
insert into public.users (id, username, display_name, avatar_url, coins, reputation, rank, total_predictions, correct_predictions, win_streak, best_streak, created_at)
values
  -- จักรวาลเลือก
  ('00000000-0000-0000-0002-000000000001', 'natthawut_k',    'ณัฐวุฒิ กิตติพงษ์',  'https://api.dicebear.com/7.x/thumbs/svg?seed=natthawut',  1820, 16800, 'จักรวาลเลือก', 184, 143, 14, 18, now() - interval '180 days'),
  ('00000000-0000-0000-0002-000000000002', 'waranya_s',      'วรัญญา สุขสมบูรณ์',  'https://api.dicebear.com/7.x/thumbs/svg?seed=waranya',    1540, 15200, 'จักรวาลเลือก', 162, 124, 11, 15, now() - interval '200 days'),

  -- เทพทำนาย
  ('00000000-0000-0000-0002-000000000003', 'somchai_p',      'สมชาย ประสิทธิ์',    'https://api.dicebear.com/7.x/thumbs/svg?seed=somchai',    1380, 11200, 'เทพทำนาย',    130,  96,  9, 13, now() - interval '120 days'),
  ('00000000-0000-0000-0002-000000000004', 'kanokporn_t',    'กนกพร ทองดี',        'https://api.dicebear.com/7.x/thumbs/svg?seed=kanokporn',  1190,  9100, 'เทพทำนาย',    112,  81,  7, 11, now() - interval '150 days'),
  ('00000000-0000-0000-0002-000000000005', 'wichit_r',       'วิชิต รัตนโชติ',     'https://api.dicebear.com/7.x/thumbs/svg?seed=wichit',     1050,  7400, 'เทพทำนาย',     96,  68,  5,  9, now() - interval '100 days'),

  -- เซียนทำนาย
  ('00000000-0000-0000-0002-000000000006', 'siriporn_w',     'ศิริพร วงศ์ชัย',     'https://api.dicebear.com/7.x/thumbs/svg?seed=siriporn',    920,  5400, 'เซียนทำนาย',   78,  54,  6,  9, now() - interval '90 days'),
  ('00000000-0000-0000-0002-000000000007', 'kritpong_a',     'กฤตพงษ์ อนันต์',    'https://api.dicebear.com/7.x/thumbs/svg?seed=kritpong',    810,  4600, 'เซียนทำนาย',   68,  47,  4,  8, now() - interval '80 days'),
  ('00000000-0000-0000-0002-000000000008', 'narumon_c',      'นฤมล ชัยสิทธิ์',    'https://api.dicebear.com/7.x/thumbs/svg?seed=narumon',     740,  3900, 'เซียนทำนาย',   60,  41,  3,  7, now() - interval '70 days'),
  ('00000000-0000-0000-0002-000000000009', 'titipong_b',     'ติติพงษ์ บุญมา',     'https://api.dicebear.com/7.x/thumbs/svg?seed=titipong',    680,  3300, 'เซียนทำนาย',   54,  37,  3,  6, now() - interval '65 days'),
  ('00000000-0000-0000-0002-000000000010', 'praeploy_n',     'แพรพลอย นิลสวัสดิ์', 'https://api.dicebear.com/7.x/thumbs/svg?seed=praeploy',   620,  3000, 'เซียนทำนาย',   48,  33,  2,  6, now() - interval '85 days'),

  -- โหรมือทอง
  ('00000000-0000-0000-0002-000000000011', 'watcharapol_s',  'วัชรพล สงวนพันธุ์',  'https://api.dicebear.com/7.x/thumbs/svg?seed=watcharapol', 580,  2500, 'โหรมือทอง',    42,  28,  5,  8, now() - interval '60 days'),
  ('00000000-0000-0000-0002-000000000012', 'mayuree_l',      'มยุรี ลิ้มสกุล',     'https://api.dicebear.com/7.x/thumbs/svg?seed=mayuree',     530,  2100, 'โหรมือทอง',    36,  24,  3,  6, now() - interval '55 days'),
  ('00000000-0000-0000-0002-000000000013', 'phluek_j',       'ฟลุ๊ค จันทร์แดง',    'https://api.dicebear.com/7.x/thumbs/svg?seed=phluek',      490,  1800, 'โหรมือทอง',    30,  20,  2,  5, now() - interval '50 days'),
  ('00000000-0000-0000-0002-000000000014', 'yoksiri_m',      'ยศศิริ มณีรัตน์',    'https://api.dicebear.com/7.x/thumbs/svg?seed=yoksiri',     460,  1600, 'โหรมือทอง',    28,  18,  2,  4, now() - interval '45 days'),
  ('00000000-0000-0000-0002-000000000015', 'wanida_p',       'วนิดา พรมสิทธิ์',    'https://api.dicebear.com/7.x/thumbs/svg?seed=wanida',      430,  1400, 'โหรมือทอง',    25,  17,  4,  6, now() - interval '40 days'),
  ('00000000-0000-0000-0002-000000000016', 'tawanrat_k',     'ตะวันรัตน์ เกษมสุข', 'https://api.dicebear.com/7.x/thumbs/svg?seed=tawanrat',   410,  1250, 'โหรมือทอง',    22,  15,  3,  5, now() - interval '35 days'),

  -- นักพยากรณ์
  ('00000000-0000-0000-0002-000000000017', 'miw_t',          'มิ้ว ทวีสุข',        'https://api.dicebear.com/7.x/thumbs/svg?seed=miw',         380,   980, 'นักพยากรณ์',   18,  12,  3,  4, now() - interval '30 days'),
  ('00000000-0000-0000-0002-000000000018', 'patchara_s',     'พัชรา สายน้ำ',       'https://api.dicebear.com/7.x/thumbs/svg?seed=patchara',    360,   840, 'นักพยากรณ์',   16,  10,  2,  3, now() - interval '28 days'),
  ('00000000-0000-0000-0002-000000000019', 'ohm_w',          'โอม วัฒนา',          'https://api.dicebear.com/7.x/thumbs/svg?seed=ohm',         340,   720, 'นักพยากรณ์',   14,   9,  1,  3, now() - interval '25 days'),
  ('00000000-0000-0000-0002-000000000020', 'fah_ch',         'ฟ้า ชัยภูมิ',         'https://api.dicebear.com/7.x/thumbs/svg?seed=fah',         320,   620, 'นักพยากรณ์',   13,   8,  2,  3, now() - interval '22 days'),
  ('00000000-0000-0000-0002-000000000021', 'ing_p',          'อิ้ง ปาลิตา',        'https://api.dicebear.com/7.x/thumbs/svg?seed=ing',         300,   560, 'นักพยากรณ์',   12,   7,  0,  2, now() - interval '20 days'),
  ('00000000-0000-0000-0002-000000000022', 'tong_sr',        'ต้อง ศรีวิชัย',       'https://api.dicebear.com/7.x/thumbs/svg?seed=tong',        280,   530, 'นักพยากรณ์',   11,   7,  1,  2, now() - interval '18 days'),
  ('00000000-0000-0000-0002-000000000023', 'pim_k',          'พิม กาญจนา',         'https://api.dicebear.com/7.x/thumbs/svg?seed=pim',         260,   510, 'นักพยากรณ์',   10,   6,  2,  3, now() - interval '15 days'),

  -- ผู้ตื่นรู้
  ('00000000-0000-0000-0002-000000000024', 'nook_ch',        'นุ้ก ชูศรี',          'https://api.dicebear.com/7.x/thumbs/svg?seed=nook',        240,   400, 'ผู้ตื่นรู้',     8,   4,  2,  3, now() - interval '14 days'),
  ('00000000-0000-0000-0002-000000000025', 'ton_ph',         'ต้น ภูวนาท',          'https://api.dicebear.com/7.x/thumbs/svg?seed=ton',         220,   330, 'ผู้ตื่นรู้',     7,   4,  1,  2, now() - interval '12 days'),
  ('00000000-0000-0000-0002-000000000026', 'kwanta_r',       'ขวัญตา รุ่งเรือง',    'https://api.dicebear.com/7.x/thumbs/svg?seed=kwanta',      200,   270, 'ผู้ตื่นรู้',     6,   3,  0,  2, now() - interval '11 days'),
  ('00000000-0000-0000-0002-000000000027', 'gift_su',        'กิ๊ฟต์ สุภาพร',      'https://api.dicebear.com/7.x/thumbs/svg?seed=gift',        185,   230, 'ผู้ตื่นรู้',     5,   3,  1,  2, now() - interval '10 days'),
  ('00000000-0000-0000-0002-000000000028', 'arm_nt',         'อาม นทีทิพย์',       'https://api.dicebear.com/7.x/thumbs/svg?seed=arm',         175,   190, 'ผู้ตื่นรู้',     5,   3,  2,  2, now() - interval '9 days'),
  ('00000000-0000-0000-0002-000000000029', 'bam_y',          'แบม ยิ้มแย้ม',       'https://api.dicebear.com/7.x/thumbs/svg?seed=bam',         165,   165, 'ผู้ตื่นรู้',     4,   2,  0,  2, now() - interval '8 days'),
  ('00000000-0000-0000-0002-000000000030', 'jane_kr',        'เจน กรองทอง',        'https://api.dicebear.com/7.x/thumbs/svg?seed=jane',        158,   155, 'ผู้ตื่นรู้',     4,   2,  1,  1, now() - interval '7 days'),

  -- ผู้มาใหม่
  ('00000000-0000-0000-0002-000000000031', 'petch_w',        'เพชร วิสุทธิ์',       'https://api.dicebear.com/7.x/thumbs/svg?seed=petch',       510,    85, 'ผู้มาใหม่',      3,   1,  0,  1, now() - interval '6 days'),
  ('00000000-0000-0000-0002-000000000032', 'mild_s',         'ไมลด์ สมบัติ',        'https://api.dicebear.com/7.x/thumbs/svg?seed=mild',        500,    65, 'ผู้มาใหม่',      3,   1,  1,  1, now() - interval '5 days'),
  ('00000000-0000-0000-0002-000000000033', 'grace_n',        'เกรซ นิรันดร์',       'https://api.dicebear.com/7.x/thumbs/svg?seed=grace',       490,    45, 'ผู้มาใหม่',      2,   1,  0,  1, now() - interval '4 days'),
  ('00000000-0000-0000-0002-000000000034', 'boy_d',          'บอย ดวงจิตร',         'https://api.dicebear.com/7.x/thumbs/svg?seed=boyduan',     480,    35, 'ผู้มาใหม่',      2,   1,  1,  1, now() - interval '3 days'),
  ('00000000-0000-0000-0002-000000000035', 'sky_a',          'สกาย อ่อนละมุน',     'https://api.dicebear.com/7.x/thumbs/svg?seed=sky',         470,    25, 'ผู้มาใหม่',      1,   0,  0,  0, now() - interval '2 days'),
  ('00000000-0000-0000-0002-000000000036', 'lilly_c',        'ลิลลี่ เจริญสุข',    'https://api.dicebear.com/7.x/thumbs/svg?seed=lilly',       460,    15, 'ผู้มาใหม่',      1,   0,  0,  0, now() - interval '2 days'),
  ('00000000-0000-0000-0002-000000000037', 'james_th',       'เจมส์ ธนพล',          'https://api.dicebear.com/7.x/thumbs/svg?seed=james',       450,     8, 'ผู้มาใหม่',      1,   0,  0,  0, now() - interval '1 days'),
  ('00000000-0000-0000-0002-000000000038', 'nat_kh',         'แนท ขจรเกียรติ',      'https://api.dicebear.com/7.x/thumbs/svg?seed=nat',         440,     4, 'ผู้มาใหม่',      0,   0,  0,  0, now() - interval '1 days'),
  ('00000000-0000-0000-0002-000000000039', 'palm_sr',        'ปาล์ม สระแก้ว',       'https://api.dicebear.com/7.x/thumbs/svg?seed=palm',       10000,     0, 'ผู้มาใหม่',      0,   0,  0,  0, now() - interval '12 hours'),
  ('00000000-0000-0000-0002-000000000040', 'joy_m',          'จอย มณีนุช',          'https://api.dicebear.com/7.x/thumbs/svg?seed=joy',        10000,     0, 'ผู้มาใหม่',      0,   0,  0,  0, now() - interval '6 hours')
on conflict (id) do update set
  username            = excluded.username,
  display_name        = excluded.display_name,
  avatar_url          = excluded.avatar_url,
  coins               = excluded.coins,
  reputation          = excluded.reputation,
  total_predictions   = excluded.total_predictions,
  correct_predictions = excluded.correct_predictions,
  win_streak          = excluded.win_streak,
  best_streak         = excluded.best_streak;

-- ─── follows ──────────────────────────────────────────────────
insert into follows (follower_id, following_id)
select f.follower_id::uuid, f.following_id::uuid from (values
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-000000000006', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-000000000007', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-000000000008', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-000000000009', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-000000000010', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-000000000011', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-000000000012', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-000000000013', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0002-000000000002'),
  ('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0002-000000000002'),
  ('00000000-0000-0000-0002-000000000006', '00000000-0000-0000-0002-000000000002'),
  ('00000000-0000-0000-0002-000000000007', '00000000-0000-0000-0002-000000000002'),
  ('00000000-0000-0000-0002-000000000008', '00000000-0000-0000-0002-000000000002'),
  ('00000000-0000-0000-0002-000000000014', '00000000-0000-0000-0002-000000000003'),
  ('00000000-0000-0000-0002-000000000015', '00000000-0000-0000-0002-000000000003'),
  ('00000000-0000-0000-0002-000000000016', '00000000-0000-0000-0002-000000000003'),
  ('00000000-0000-0000-0002-000000000017', '00000000-0000-0000-0002-000000000003'),
  ('00000000-0000-0000-0002-000000000018', '00000000-0000-0000-0002-000000000004'),
  ('00000000-0000-0000-0002-000000000019', '00000000-0000-0000-0002-000000000004'),
  ('00000000-0000-0000-0002-000000000020', '00000000-0000-0000-0002-000000000005'),
  ('00000000-0000-0000-0002-000000000021', '00000000-0000-0000-0002-000000000005')
) as f(follower_id, following_id)
on conflict do nothing;

-- ─── อัปเดต followers_count / following_count ───────────────
update public.users u
set followers_count = (
  select count(*) from follows where following_id = u.id
),
following_count = (
  select count(*) from follows where follower_id = u.id
)
where id::text like '00000000-0000-0000-0002-%';

-- ─── recalculate rank from reputation (ให้ตรงกับ trigger) ────
update public.users
set rank = case
  when reputation >= 15000 then 'จักรวาลเลือก'
  when reputation >= 7000  then 'เทพทำนาย'
  when reputation >= 3000  then 'เซียนทำนาย'
  when reputation >= 1200  then 'โหรมือทอง'
  when reputation >= 500   then 'นักพยากรณ์'
  when reputation >= 150   then 'ผู้ตื่นรู้'
  else 'ผู้มาใหม่'
end::rank_tier
where id::text like '00000000-0000-0000-0002-%';

-- ─────────────────────────────────────────────────────────────
-- MOCK QUESTIONS — ครอบทุก category, pool อิง scale จริง
-- user จริง ~500 coins, rank สูงสุดมี ~1,820 coins
-- pool = ผลรวมคะแนนที่วางจริง (หลักร้อย–หลักพัน)
-- ─────────────────────────────────────────────────────────────

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000001', 'seed@fantong.app', '', now(), now(), now(), '{"full_name":"ทีมฟันธง","avatar_url":""}')
on conflict (id) do nothing;

insert into public.users (id, username, display_name, coins, reputation)
values ('00000000-0000-0000-0000-000000000001', 'fantong_admin', 'ทีมฟันธง', 10000, 999)
on conflict (id) do nothing;

insert into questions (
  category_id, created_by, title, description, options,
  closes_at, status, pool, total_pool, predictions_count
)
values

-- ════════════════════════════════════════════════════════════
-- 🔥 ดราม่า
-- ════════════════════════════════════════════════════════════
(
  (select id from categories where slug = 'drama'),
  '00000000-0000-0000-0000-000000000001',
  'ดาราคนดังจะออกมาขอโทษสาธารณะภายใน 48 ชั่วโมงไหม?',
  'หลังถูกชาวเน็ตแห่แบน #แบนดาราX เทรนด์ขึ้นอันดับ 1 ทวิตเตอร์ไทย',
  '[{"id":"yes","label":"ขอโทษ"},{"id":"no","label":"เงียบ"},{"id":"pr","label":"ให้ทีม PR แถลง"}]',
  now() + interval '2 days', 'open',
  '{"yes": 2840, "no": 1960, "pr": 700}', 5500, 187
),
(
  (select id from categories where slug = 'drama'),
  '00000000-0000-0000-0000-000000000001',
  'ยูทูบเบอร์ดังจะกลับมาโพสต์คลิปหลังหายไป 2 เดือนไหม?',
  'ช่อง 5 ล้านซับ หายเงียบหลังดราม่าใหญ่ — แฟนๆ จับตา',
  '[{"id":"yes","label":"กลับมา"},{"id":"no","label":"เลิกถาวร"},{"id":"new","label":"เปิดช่องใหม่"}]',
  now() + interval '14 days', 'open',
  '{"yes": 3100, "no": 890, "new": 410}', 4400, 214
),
(
  (select id from categories where slug = 'drama'),
  '00000000-0000-0000-0000-000000000001',
  'แบรนด์ดังจะยกเลิกสัญญาพรีเซ็นเตอร์หลังดราม่าไหม?',
  null,
  '[{"id":"yes","label":"ยกเลิก"},{"id":"no","label":"ยังคงไว้"},{"id":"wait","label":"รอดูสถานการณ์"}]',
  now() + interval '5 days', 'open',
  '{"yes": 4200, "no": 1100, "wait": 700}', 6000, 302
),
(
  (select id from categories where slug = 'drama'),
  '00000000-0000-0000-0000-000000000001',
  'คู่รักดาราที่ถูกจับได้นอกใจ — จะเลิกกันจริงไหม?',
  'หลักฐานชัดเจน แต่ยังไม่มีแถลงการณ์อย่างเป็นทางการ',
  '[{"id":"break","label":"เลิกกันแน่"},{"id":"stay","label":"ยังอยู่ด้วยกัน"},{"id":"quiet","label":"เงียบไม่ตอบ"}]',
  now() + interval '3 days', 'open',
  '{"break": 5800, "stay": 780, "quiet": 620}', 7200, 418
),

-- ════════════════════════════════════════════════════════════
-- 🎮 eSports
-- ════════════════════════════════════════════════════════════
(
  (select id from categories where slug = 'esports'),
  '00000000-0000-0000-0000-000000000001',
  'T1 จะป้องกันแชมป์ Worlds 2026 ได้ไหม?',
  'Faker นำทัพลุยซีซั่นที่ 5 ติดต่อกัน หากชนะจะเป็นสถิติโลก',
  '[{"id":"yes","label":"ป้องกันได้"},{"id":"no","label":"ทีมอื่นโค่น"},{"id":"top4","label":"เข้า Top 4 แต่ไม่แชมป์"}]',
  now() + interval '60 days', 'open',
  '{"yes": 7100, "no": 4200, "top4": 1900}', 13200, 891
),
(
  (select id from categories where slug = 'dota2'),
  '00000000-0000-0000-0000-000000000001',
  'Team Spirit จะคว้าแชมป์ TI 2026 ได้ไหม?',
  'หลังฟอร์มเด่นใน DPC ซีซั่นนี้ Spirit ติดอันดับต้นของโลก',
  '[{"id":"yes","label":"ได้แชมป์"},{"id":"top3","label":"Top 3"},{"id":"no","label":"ไม่ผ่านรอบแรก"}]',
  now() + interval '45 days', 'open',
  '{"yes": 2900, "top3": 3100, "no": 1000}', 7000, 443
),
(
  (select id from categories where slug = 'cs2'),
  '00000000-0000-0000-0000-000000000001',
  'NaVi จะกลับสู่ Top 1 โลก CS2 ในปีนี้ไหม?',
  's1mple กลับมา — ทีมแฟนกรี้ดทั่วโลก',
  '[{"id":"yes","label":"ขึ้น #1"},{"id":"top5","label":"ติด Top 5"},{"id":"no","label":"ยังไม่ถึง"}]',
  now() + interval '30 days', 'open',
  '{"yes": 1750, "top5": 2100, "no": 950}', 4800, 267
),
(
  (select id from categories where slug = 'apex'),
  '00000000-0000-0000-0000-000000000001',
  'ทีม APAC จะทำผลงานได้ดีกว่า NA ใน Apex ALGS 2026 ไหม?',
  null,
  '[{"id":"yes","label":"APAC เหนือกว่า"},{"id":"no","label":"NA ยังครอง"},{"id":"even","label":"สูสีพอกัน"}]',
  now() + interval '21 days', 'open',
  '{"yes": 1350, "no": 1050, "even": 500}', 2900, 198
),

-- ════════════════════════════════════════════════════════════
-- 📈 หุ้น
-- ════════════════════════════════════════════════════════════
(
  (select id from categories where slug = 'stock'),
  '00000000-0000-0000-0000-000000000001',
  'SET Index จะกลับไปแตะ 1,400 จุดก่อนสิ้นปี 2026 ไหม?',
  'หลังเศรษฐกิจไทยฟื้นตัว นักวิเคราะห์แนะนำ "ซื้อ"',
  '[{"id":"yes","label":"แตะ 1,400+"},{"id":"no","label":"ต่ำกว่า 1,400"},{"id":"crash","label":"ลงหนักกว่า 10%"}]',
  now() + interval '90 days', 'open',
  '{"yes": 2100, "no": 3400, "crash": 1100}', 6600, 312
),
(
  (select id from categories where slug = 'stock'),
  '00000000-0000-0000-0000-000000000001',
  'หุ้น NVDA จะทำ All-Time High ใหม่ก่อน Q3 2026 ไหม?',
  'AI boom ยังไม่หยุด — Blackwell chip ออกมาแล้ว',
  '[{"id":"yes","label":"ATH ใหม่"},{"id":"no","label":"ยังไม่ถึง"},{"id":"drop","label":"ร่วงหนักกว่า 20%"}]',
  now() + interval '60 days', 'open',
  '{"yes": 4900, "no": 2600, "drop": 500}', 8000, 521
),
(
  (select id from categories where slug = 'stock'),
  '00000000-0000-0000-0000-000000000001',
  'PTT จะประกาศปันผลพิเศษในปีนี้ไหม?',
  'กำไร Q1 สูงสุดในรอบ 3 ปี นักลงทุนจับตา',
  '[{"id":"yes","label":"มีปันผลพิเศษ"},{"id":"no","label":"ปันผลปกติ"}]',
  now() + interval '45 days', 'open',
  '{"yes": 1650, "no": 2150}', 3800, 189
),
(
  (select id from categories where slug = 'stock'),
  '00000000-0000-0000-0000-000000000001',
  'Apple จะประกาศ Stock Split ในปี 2026 ไหม?',
  null,
  '[{"id":"yes","label":"แยกหุ้น"},{"id":"no","label":"ไม่แยก"}]',
  now() + interval '120 days', 'open',
  '{"yes": 1400, "no": 2400}', 3800, 203
),

-- ════════════════════════════════════════════════════════════
-- 🗳️ การเมือง
-- ════════════════════════════════════════════════════════════
(
  (select id from categories where slug = 'politics'),
  '00000000-0000-0000-0000-000000000001',
  'รัฐบาลจะผ่านงบประมาณ 2026 ได้ทันกำหนดไหม?',
  'ฝ่ายค้านเตรียมอภิปรายยาว — นับถอยหลังวันสุดท้าย',
  '[{"id":"yes","label":"ผ่านทันเวลา"},{"id":"late","label":"ผ่านแต่ล่าช้า"},{"id":"no","label":"ไม่ผ่าน"}]',
  now() + interval '30 days', 'open',
  '{"yes": 1850, "late": 2700, "no": 1250}', 5800, 334
),
(
  (select id from categories where slug = 'politics'),
  '00000000-0000-0000-0000-000000000001',
  'พรรคการเมืองใดจะชนะเลือกตั้งซ่อมครั้งถัดไป?',
  null,
  '[{"id":"a","label":"พรรค A (ฝ่ายรัฐบาล)"},{"id":"b","label":"พรรค B (ฝ่ายค้าน)"},{"id":"c","label":"พรรคหน้าใหม่"}]',
  now() + interval '21 days', 'open',
  '{"a": 2000, "b": 3100, "c": 650}', 5750, 287
),
(
  (select id from categories where slug = 'politics'),
  '00000000-0000-0000-0000-000000000001',
  'ไทยจะเป็นเจ้าภาพ ASEAN Summit ปีนี้ไหม?',
  null,
  '[{"id":"yes","label":"ได้เป็นเจ้าภาพ"},{"id":"no","label":"ประเทศอื่นแทน"}]',
  now() + interval '90 days', 'open',
  '{"yes": 2700, "no": 1100}', 3800, 156
),

-- ════════════════════════════════════════════════════════════
-- 💫 ไวรัล
-- ════════════════════════════════════════════════════════════
(
  (select id from categories where slug = 'viral'),
  '00000000-0000-0000-0000-000000000001',
  'มีมไหนจะครองทวิตเตอร์ไทยตลอดสัปดาห์นี้?',
  'ตอนนี้มีมแข่งกันอยู่หลายกระแส — โหวตให้อันที่ใช่!',
  '[{"id":"cat","label":"มีมแมวอวกาศ"},{"id":"office","label":"มีมออฟฟิศซีรีส์"},{"id":"politician","label":"มีมนักการเมือง"},{"id":"food","label":"มีมอาหาร"}]',
  now() + interval '7 days', 'open',
  '{"cat": 2100, "office": 1750, "politician": 2450, "food": 1400}', 7700, 634
),
(
  (select id from categories where slug = 'viral'),
  '00000000-0000-0000-0000-000000000001',
  'คลิปไวรัลสัปดาห์นี้จะทำยอดวิวถึง 10 ล้านภายใน 3 วันไหม?',
  'คลิปแมวพูดภาษาไทย กำลังระเบิดทุกแพลตฟอร์ม',
  '[{"id":"yes","label":"ถึง 10M"},{"id":"no","label":"ไม่ถึง"},{"id":"more","label":"ทะลุ 20M"}]',
  now() + interval '3 days', 'open',
  '{"yes": 3000, "more": 1350, "no": 450}', 4800, 389
),
(
  (select id from categories where slug = 'viral'),
  '00000000-0000-0000-0000-000000000001',
  'เพลงไหนจะขึ้น #1 Spotify ไทยสัปดาห์หน้า?',
  null,
  '[{"id":"a","label":"เพลงใหม่ลิซ่า"},{"id":"b","label":"เพลงอินดี้ไวรัล"},{"id":"c","label":"เพลงดังจากซีรีส์"},{"id":"d","label":"เพลง cover ติดเทรนด์"}]',
  now() + interval '7 days', 'open',
  '{"a": 4300, "b": 1150, "c": 1750, "d": 550}', 7750, 512
),
(
  (select id from categories where slug = 'viral'),
  '00000000-0000-0000-0000-000000000001',
  'Challenge ใหม่บน TikTok จะมียอด UGC เกิน 1 แสนคลิปไหม?',
  '#ท้าทายแดนซ์ กำลังมาแรง ศิลปินดังร่วม challenge แล้ว',
  '[{"id":"yes","label":"เกิน 100K คลิป"},{"id":"no","label":"ไม่ถึง"}]',
  now() + interval '14 days', 'open',
  '{"yes": 3550, "no": 1250}', 4800, 298
),

-- ════════════════════════════════════════════════════════════
-- ₿ Crypto
-- ════════════════════════════════════════════════════════════
(
  (select id from categories where slug = 'crypto'),
  '00000000-0000-0000-0000-000000000001',
  'Bitcoin จะแตะ $150,000 ก่อนสิ้นปี 2026 ไหม?',
  'Halving เพิ่งผ่านไป ETF spot ไหลเข้าต่อเนื่อง',
  '[{"id":"yes","label":"แตะ 150K+"},{"id":"100k","label":"แค่ 100–150K"},{"id":"no","label":"ต่ำกว่า 100K"}]',
  now() + interval '120 days', 'open',
  '{"yes": 5100, "100k": 3700, "no": 1000}', 9800, 723
),
(
  (select id from categories where slug = 'crypto'),
  '00000000-0000-0000-0000-000000000001',
  'Ethereum จะ flip Bitcoin ในเชิง Market Cap ได้ไหม?',
  '"The Flippening" — นักเก็งกำไรลุ้นมา 5 ปีแล้ว',
  '[{"id":"yes","label":"Flip ได้ปีนี้"},{"id":"no","label":"ยังไม่เกิด"},{"id":"never","label":"ไม่มีวันเกิด"}]',
  now() + interval '180 days', 'open',
  '{"yes": 1700, "no": 4000, "never": 2000}', 7700, 489
),
(
  (select id from categories where slug = 'crypto'),
  '00000000-0000-0000-0000-000000000001',
  'ราคา SOL จะทะลุ $500 ในปี 2026 ไหม?',
  'Solana ecosystem เติบโตแรง DEX volume ทุบสถิติ',
  '[{"id":"yes","label":"ทะลุ 500"},{"id":"300","label":"แค่ 300–500"},{"id":"no","label":"ต่ำกว่า 300"}]',
  now() + interval '90 days', 'open',
  '{"yes": 2600, "300": 3200, "no": 950}', 6750, 401
),
(
  (select id from categories where slug = 'crypto'),
  '00000000-0000-0000-0000-000000000001',
  'รัฐบาลไทยจะออกกฎหมาย Crypto ฉบับใหม่ในปีนี้ไหม?',
  null,
  '[{"id":"yes","label":"ออกกฎหมาย"},{"id":"draft","label":"แค่ร่าง ยังไม่ผ่าน"},{"id":"no","label":"ไม่มีอะไรใหม่"}]',
  now() + interval '90 days', 'open',
  '{"yes": 1350, "draft": 2500, "no": 950}', 4800, 213
),

-- ════════════════════════════════════════════════════════════
-- ⚽ ฟุตบอล
-- ════════════════════════════════════════════════════════════
(
  (select id from categories where slug = 'football'),
  '00000000-0000-0000-0000-000000000001',
  'แมนซิตี้จะคว้าแชมป์ Premier League 2025/26 ได้ไหม?',
  'ฟอร์มเดินหน้า แต่ Arsenal ไม่ยอมแพ้ — ลุ้นถึงนัดสุดท้าย',
  '[{"id":"city","label":"แมนซิตี้"},{"id":"arsenal","label":"Arsenal"},{"id":"other","label":"ทีมอื่น"}]',
  now() + interval '30 days', 'open',
  '{"city": 5700, "arsenal": 4600, "other": 1500}', 11800, 876
),
(
  (select id from categories where slug = 'football'),
  '00000000-0000-0000-0000-000000000001',
  'ทีมชาติไทยจะผ่านรอบคัดเลือก World Cup 2026 ได้ไหม?',
  'เหลืออีก 4 นัด — ต้องชนะอย่างน้อย 3 นัด',
  '[{"id":"yes","label":"ผ่านได้"},{"id":"no","label":"พลาด"},{"id":"playoff","label":"ต้องลุ้น Playoff"}]',
  now() + interval '60 days', 'open',
  '{"yes": 3050, "no": 2800, "playoff": 1950}', 7800, 612
),
(
  (select id from categories where slug = 'football'),
  '00000000-0000-0000-0000-000000000001',
  'Mbappe จะทำแฮตทริกในเกมถัดไปของ Real Madrid ไหม?',
  null,
  '[{"id":"yes","label":"แฮตทริก"},{"id":"goal","label":"ยิงได้แต่ไม่ครบ 3"},{"id":"no","label":"ไม่ยิงเลย"}]',
  now() + interval '4 days', 'open',
  '{"yes": 1150, "goal": 3700, "no": 950}', 5800, 421
),

-- ════════════════════════════════════════════════════════════
-- 🥊 มวย
-- ════════════════════════════════════════════════════════════
(
  (select id from categories where slug = 'boxing'),
  '00000000-0000-0000-0000-000000000001',
  'บัวขาว ป.ประมุข จะป้องกันแชมป์โลกครั้งหน้าได้ไหม?',
  'ผู้ท้าชิงเป็นอดีตแชมป์โลก 2 สมัย — ศึกนี้เดือดมาก',
  '[{"id":"buakaw","label":"บัวขาวชนะ KO"},{"id":"buakaw_pts","label":"บัวขาวชนะคะแนน"},{"id":"opp","label":"คู่ต่อสู้ชนะ"}]',
  now() + interval '14 days', 'open',
  '{"buakaw": 4250, "buakaw_pts": 2700, "opp": 750}', 7700, 567
),
(
  (select id from categories where slug = 'boxing'),
  '00000000-0000-0000-0000-000000000001',
  'นักมวยไทยจะคว้าเหรียญทองใน ONE Championship เดือนนี้ไหม?',
  null,
  '[{"id":"yes","label":"ได้เหรียญทอง"},{"id":"silver","label":"เหรียญเงิน/แพ้ไฟนอล"},{"id":"no","label":"ตกรอบก่อน"}]',
  now() + interval '21 days', 'open',
  '{"yes": 3100, "silver": 1750, "no": 950}', 5800, 334
),

-- ════════════════════════════════════════════════════════════
-- 🏀 NBA
-- ════════════════════════════════════════════════════════════
(
  (select id from categories where slug = 'nba'),
  '00000000-0000-0000-0000-000000000001',
  'LeBron James จะประกาศเลิกเล่น NBA ในซีซั่นนี้ไหม?',
  'อายุ 41 ปีแต่ยังฟอร์มดี — แต่ปีนี้อาจเป็นปีสุดท้าย',
  '[{"id":"retire","label":"เลิกเล่นปีนี้"},{"id":"1more","label":"ต่อสัญญาอีก 1 ปี"},{"id":"stay","label":"เล่นต่ออีกหลายปี"}]',
  now() + interval '90 days', 'open',
  '{"retire": 2700, "1more": 4100, "no": 950}', 7750, 634
),
(
  (select id from categories where slug = 'nba'),
  '00000000-0000-0000-0000-000000000001',
  'ทีมไหนจะคว้าแชมป์ NBA Finals 2026?',
  'Conference Finals เพิ่งเริ่ม — 4 ทีมสุดท้ายสูสีมาก',
  '[{"id":"boston","label":"Boston Celtics"},{"id":"okc","label":"OKC Thunder"},{"id":"denver","label":"Denver Nuggets"},{"id":"other","label":"ทีมอื่น"}]',
  now() + interval '45 days', 'open',
  '{"boston": 3700, "okc": 5100, "denver": 2400, "other": 450}', 11650, 912
)

on conflict do nothing;

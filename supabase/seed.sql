-- Seed ข้อมูลตัวอย่าง โดยไม่ต้องมี user จริง
-- paste ทั้งหมดใน Supabase SQL Editor แล้วกด Run

-- 1. สร้าง dummy user ใน auth.users ก่อน
insert into auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000001',
  'seed@fantong.app',
  '',
  now(), now(), now(),
  '{"full_name": "ทีมฟันธง", "avatar_url": ""}'::jsonb
) on conflict (id) do nothing;

-- 2. สร้าง profile ใน public.users
insert into public.users (id, username, display_name, coins, reputation)
values (
  '00000000-0000-0000-0000-000000000001',
  'fantong_admin',
  'ทีมฟันธง',
  10000,
  999
) on conflict (id) do nothing;

-- 3. insert คำถามตัวอย่าง
insert into questions (category_id, created_by, title, description, options, closes_at, status, pool, total_pool, predictions_count)
values
(
  (select id from categories where slug = 'drama'),
  '00000000-0000-0000-0000-000000000001',
  'ดราม่าครั้งนี้จะทำให้แบรนด์ X ยอดขายลดลงไหม?',
  'หลังจากเกิดดราม่าใหญ่บนทวิตเตอร์ คุณคิดว่ายอดขายแบรนด์ X จะลดลงใน 30 วันหรือไม่',
  '[{"id":"yes","label":"ลดลง"},{"id":"no","label":"ไม่ลดลง"}]',
  now() + interval '7 days', 'open',
  '{"yes": 6800, "no": 3200}', 10000, 47
),
(
  (select id from categories where slug = 'esports'),
  '00000000-0000-0000-0000-000000000001',
  'ทีม T1 จะคว้าแชมป์ LCK ซัมเมอร์ 2026 ได้ไหม?',
  null,
  '[{"id":"yes","label":"ได้แชมป์"},{"id":"no","label":"ไม่ได้"},{"id":"runner","label":"รองแชมป์"}]',
  now() + interval '14 days', 'open',
  '{"yes": 12000, "no": 4000, "runner": 2000}', 18000, 89
),
(
  (select id from categories where slug = 'politics'),
  '00000000-0000-0000-0000-000000000001',
  'ร่าง พ.ร.บ. ดิจิทัลวอลเล็ต จะผ่านสภาในปีนี้ไหม?',
  null,
  '[{"id":"yes","label":"ผ่าน"},{"id":"no","label":"ไม่ผ่าน"}]',
  now() + interval '30 days', 'open',
  '{"yes": 3000, "no": 7000}', 10000, 34
),
(
  (select id from categories where slug = 'crypto'),
  '00000000-0000-0000-0000-000000000001',
  'Bitcoin จะแตะ $120,000 ก่อนสิ้นปี 2026 ไหม?',
  null,
  '[{"id":"yes","label":"แตะ $120k"},{"id":"no","label":"ไม่ถึง"}]',
  now() + interval '60 days', 'open',
  '{"yes": 9500, "no": 500}', 10000, 62
),
(
  (select id from categories where slug = 'viral'),
  '00000000-0000-0000-0000-000000000001',
  'มีม "แมวอวกาศ" จะได้ยอด 1 ล้าน RT บน X ภายใน 48 ชม. ไหม?',
  null,
  '[{"id":"yes","label":"ได้"},{"id":"no","label":"ไม่ได้"}]',
  now() + interval '2 days', 'open',
  '{"yes": 4200, "no": 5800}', 10000, 28
);

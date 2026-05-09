-- ─────────────────────────────────────────
-- BADGES
-- ─────────────────────────────────────────

create table if not exists badges (
  id           text primary key,
  name_th      text not null,
  description_th text,
  emoji        text not null,
  category     text not null default 'general', -- sport, politics, esport, weekly, general
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists user_badges (
  user_id    uuid not null references public.users(id) on delete cascade,
  badge_id   text not null references badges(id) on delete cascade,
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create index if not exists user_badges_user_idx on user_badges(user_id);

-- ─────────────────────────────────────────
-- BADGE DEFINITIONS
-- ─────────────────────────────────────────

insert into badges (id, name_th, description_th, emoji, category) values
  -- กีฬา
  ('sport_oracle',    'เซียนทายบอล',           'ทายผลกีฬาถูกต้อง 10 ครั้งขึ้นไป',              '⚽', 'sport'),
  ('sport_streak',    'เจ้าพ่อสกอร์',           'ทายผลกีฬาถูก 5 ครั้งติดต่อกัน',               '🏆', 'sport'),

  -- การเมือง
  ('politics_god',    'เทพการเมือง',            'ทายผลการเมืองถูกต้อง 5 ครั้งขึ้นไป',           '🗳️', 'politics'),
  ('politics_first',  'นักการเมืองพยากรณ์',     'เป็นคนแรกที่ทายถูกในคำถามการเมือง',           '📜', 'politics'),

  -- eSports
  ('esport_legend',   'ตำนาน Esport',           'ทายผล esport ถูกต้อง 10 ครั้งขึ้นไป',          '🎮', 'esport'),

  -- ทั่วไป / ความแม่น
  ('gold_oracle',     'Gold Oracle',             'มี reputation สูงกว่า 1,000 คะแนน',            '🔮', 'general'),
  ('diamond_oracle',  'Diamond Oracle',          'มี reputation สูงกว่า 5,000 คะแนน',            '💎', 'general'),
  ('first_blood',     'ทายแรก',                 'ส่งการทายครั้งแรกในระบบ',                      '🩸', 'general'),
  ('sharp_shooter',   'ยิงแม่น',                'อัตราทายถูก 70% ขึ้นไป (ขั้นต่ำ 20 ครั้ง)',    '🎯', 'general'),

  -- รายสัปดาห์
  ('weekly_best',     'คนทายแม่นสุดสัปดาห์',   'ทายถูกมากที่สุดในสัปดาห์',                     '🌟', 'weekly'),
  ('weekly_streak',   'ไม่หยุดทาย',             'ทายทุกวันครบ 7 วันติดต่อกัน',                  '🔥', 'weekly')
on conflict (id) do nothing;

-- ─────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────

alter table badges enable row level security;
alter table user_badges enable row level security;

do $$ begin
  create policy "badges_public_read" on badges for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "user_badges_public_read" on user_badges for select using (true);
exception when duplicate_object then null;
end $$;

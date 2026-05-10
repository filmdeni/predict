# ภาวนา — App Overview

> แพลตฟอร์มทายผลเหตุการณ์ เน้นความสนุก ชุมชน และการลุ้น — ไม่ใช่เว็บพนัน

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Backend / DB | Supabase (PostgreSQL, Auth, Realtime, RLS) |
| Deploy | Railway (runs `next build` on push) |

---

## โครงสร้าง Route

```
app/
├── (auth)/
│   ├── login/          — หน้า login (Magic Link / OAuth)
│   └── callback/       — OAuth callback handler
│
├── (main)/
│   ├── feed/           — หน้าหลัก ฟีดคำถาม
│   ├── how-to-play/    — วิธีเล่น
│   ├── leaderboard/    — อันดับนักทาย
│   ├── profile/me/     — โปรไฟล์ตัวเอง
│   ├── profile/[username]/ — โปรไฟล์คนอื่น
│   ├── question/[id]/  — หน้าคำถามเดี่ยว
│   └── submit/         — ส่งคำถามใหม่
│
├── admin/
│   └── questions/      — อนุมัติ / จัดการคำถาม
│
└── api/
    └── resolve/        — endpoint สำหรับ resolve คำถาม
```

---

## Database Schema (หลัก)

### `users`
| Column | Type | หมายเหตุ |
|---|---|---|
| id | uuid | FK → auth.users |
| username | text | unique |
| coins | int | ค่าเริ่ม 500 |
| reputation | int | ใช้คำนวณ rank |
| rank_tier | RankTier | อัปเดตอัตโนมัติ via trigger |
| correct_predictions | int | |
| total_predictions | int | |
| win_streak / best_streak | int | |
| last_login_bonus_at | timestamptz | กัน claim bonus ซ้ำ |

### `questions`
| Column | Type | หมายเหตุ |
|---|---|---|
| id | uuid | |
| title | text | คำถาม |
| options | QuestionOption[] | JSON [{id, label}] |
| status | QuestionStatus | pending → open → closed → resolved |
| pool | jsonb | coins แยกตาม option_id |
| total_pool | int | รวมทุก option |
| correct_option | text | เฉลยเมื่อ resolve |
| category_id | uuid | FK → categories |
| submitted_by | uuid | FK → users (nullable) |

### `predictions`
| Column | Type | หมายเหตุ |
|---|---|---|
| user_id | uuid | |
| question_id | uuid | |
| option_id | text | option ที่เลือก |
| coins_wagered | int | |
| is_correct | bool | null จนกว่าจะ resolve |
| coins_won | int | parimutuel payout |
| rep_delta | numeric | reputation ที่ได้/เสีย |

### `coin_transactions`
ทุก transaction บันทึก amount, balance, reason (`daily_login`, `prediction_won` ฯลฯ)

### ตารางอื่น
- **categories** — หมวดหมู่ + subcategory (กีฬา, esport ฯลฯ)
- **notifications** — แจ้งเตือน approval, ผลทาย
- **follows** — user follow กัน
- **comments** — comment + threading ใต้คำถาม
- **badges** — ป้ายสะสม
- **saved_questions** — bookmark คำถาม

---

## ระบบเศรษฐกิจ (Coins & Reputation)

### Coins (P)
- **เริ่มต้น** 500 P
- **Daily Login Bonus** +20 P/วัน (ฟังก์ชัน `daily_login_bonus()` idempotent ตาม Bangkok timezone)
- **Parimutuel Payout** — ทายถูก ได้สัดส่วนของ pool รวมทั้งหมด

```
payout = (coins_wagered / winning_pool) × total_pool
```

### Reputation
- ทายถูก: +10 rep (base) + bonus ถ้าเลือก option ที่คนอื่นไม่ค่อยเลือก (contrarian bonus)
- ทายผิด: rep ไม่เพิ่ม, win_streak reset เป็น 0

---

## ระบบ Rank (7 ขั้น)

| Rank | ฉายา (Thai) | Rep ขั้นต่ำ |
|---|---|---|
| 🌫️ ผู้มาใหม่ | นักเดินทางผู้หลงทาง | 0 |
| 🌙 ผู้ตื่นรู้ | ผู้มองเห็นสิ่งที่คนอื่นมองไม่เห็น | 150 |
| ⚡ นักพยากรณ์ | ผู้อ่านสัญญาณจากดวงดาว | 500 |
| 🎯 โหรมือทอง | ผู้ที่โชคชะตาเลือกสรร | 1,200 |
| 🔮 เซียนทำนาย | ผู้เฝ้ามองกาลเวลา | 3,000 |
| 👁️ เทพทำนาย | ผู้รู้แจ้งในสิ่งที่ยังไม่เกิด | 7,000 |
| 🌌 จักรวาลเลือก | ผู้ที่จักรวาลเลือกมาเพื่อสิ่งนี้ | 15,000 |

Rank อัปเดตอัตโนมัติผ่าน PostgreSQL trigger เมื่อ reputation เปลี่ยน

---

## Components หลัก

```
components/
├── feed/
│   ├── QuestionCard        — การ์ดคำถามในฟีด
│   ├── PredictionBar       — แสดง % odds แบบ visual
│   ├── CategoryFilter      — กรองหมวดหมู่ + subcategory
│   └── TopPredictors       — top 3 นักทายในฟีด
├── prediction/
│   └── PlacePredictionModal — modal วางการทาย
├── layout/
│   ├── BottomNav           — nav bar มือถือ
│   ├── Header              — header + search
│   ├── DailyBonusProvider  — context provider รับ daily bonus อัตโนมัติ
│   └── NotificationBell    — ไอคอนแจ้งเตือน
└── question/
    └── CommentSection      — comment + reply
```

---

## Flow หลัก

### การทาย
1. User เลือกคำถามใน Feed
2. กด option → `PlacePredictionModal` เปิด
3. กรอก coins → call `place_prediction()` (RPC)
4. pool ของ option นั้นเพิ่มขึ้น realtime

### การ Resolve
1. Admin ไปที่ `/admin/questions`
2. เลือก correct option → call `POST /api/resolve`
3. Server เรียก `resolve_question()` (PostgreSQL function)
4. Parimutuel payout คำนวณและแจกอัตโนมัติ
5. Reputation + coin transaction บันทึก

### การส่งคำถาม
1. User ไปที่ `/submit`
2. คำถามไปอยู่ใน status `pending`
3. Admin อนุมัติ → status เปลี่ยนเป็น `open`
4. User ได้รับ notification

---

## Auth

- Supabase Auth (Magic Link / Email OTP)
- Middleware (`middleware.ts`) guard routes `/feed`, `/profile`, `/admin` ฯลฯ
- Admin check ด้วย email whitelist หรือ role column

---

## Key Files

| File | หน้าที่ |
|---|---|
| [lib/supabase/types.ts](../lib/supabase/types.ts) | TypeScript types ทั้งหมดจาก DB |
| [lib/game/ranks.ts](../lib/game/ranks.ts) | Rank tier definitions + helpers |
| [lib/game/odds.ts](../lib/game/odds.ts) | Odds calculation |
| [middleware.ts](../middleware.ts) | Route protection |
| [supabase/migrations/](../supabase/migrations/) | ประวัติ DB schema ทั้งหมด |

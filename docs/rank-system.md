# Rank System Spec

## Tiers

| tier (DB key) | name | ฉายา | emoji | minRep | color |
|---|---|---|---|---|---|
| ผู้มาใหม่ | Wanderer | เดาแต่โดน | 🌫️ | 0 | #94a3b8 |
| ผู้ตื่นรู้ | Awakened | ทรงนี้มาแน่ | 🌙 | 150 | #60a5fa |
| นักพยากรณ์ | Seer | คนมันแม่น | ⚡ | 500 | #34d399 |
| โหรมือทอง | Oracle | คนมีของ | 🎯 | 1,200 | #fbbf24 |
| เซียนทำนาย | Sage | ลูกรักจักรวาล | 🔮 | 3,000 | #f97316 |
| เทพทำนาย | Prophet | เทพทำนาย | 👁️ | 7,000 | #a855f7 |
| จักรวาลเลือก | Chosen | จักรวาลกระซิบ | 🌌 | 15,000 | #ec4899 |

## Source of truth

- `lib/game/ranks.ts` — RANKS array, getRank(), getNextRank(), getProgressToNext()
- `lib/supabase/types.ts` — RankTier union type (must match RANKS tiers)
- DB column `users.rank` — enum type `rank_tier` (must match both above)

เมื่ออยากเพิ่ม/เปลี่ยน tier ต้องแก้ทั้ง 3 จุดพร้อมกัน + เขียน migration

## Reputation thresholds (ใช้ใน migration / recalculate)

```sql
case
  when reputation >= 15000 then 'จักรวาลเลือก'
  when reputation >= 7000  then 'เทพทำนาย'
  when reputation >= 3000  then 'เซียนทำนาย'
  when reputation >= 1200  then 'โหรมือทอง'
  when reputation >= 500   then 'นักพยากรณ์'
  when reputation >= 150   then 'ผู้ตื่นรู้'
  else 'ผู้มาใหม่'
end::rank_tier
```

## Starting economy

- เริ่มต้น: **500 P** (coins)
- Login รายวัน: +20 P
- ทายถูก: +50–200 P (scale ตามความยาก)
- ทายผิด: −20–80 P (asymmetric — ขาดทุนน้อยกว่ากำไร)
- Streak 3 ครั้ง: +50 P bonus

## Wager cap by rank

| rank | max wager |
|---|---|
| ผู้มาใหม่ / ผู้ตื่นรู้ | 100 P |
| นักพยากรณ์ / โหรมือทอง | 300 P |
| เซียนทำนาย / เทพทำนาย | 800 P |
| จักรวาลเลือก | 2,000 P |

## Display format (UI)

```
{emoji} {name}  ·  "{title}"
```

ตัวอย่าง: `🎯 Oracle  ·  "คนมีของ"`

- ฉายาอยู่ใน `" "` เสมอ
- สีใช้ `rankDisplay.color` (inline style)
- แสดงบน: Feed leaderboard, Leaderboard page, Profile page

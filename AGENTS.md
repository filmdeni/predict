<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ภาวนา — Product Language Guide

ชื่อแอป: **ภาวนา** — แพลตฟอร์มทายผลเหตุการณ์ ไม่ใช่เว็บพนัน

## คำที่ห้ามใช้ → ใช้คำนี้แทน

| ❌ ห้ามใช้ | ✅ ใช้แทน |
|---|---|
| เดิมพัน / วางเดิมพัน | ทาย / วางการทาย |
| พนัน | ทายผล / ทำนาย |
| รางวัล | คะแนนที่ได้รับ |
| กำไร | คะแนนที่เพิ่มขึ้น |
| เงิน / เงินรางวัล | คะแนน (P) |
| ชนะ / แพ้ | ทายถูก / ทายผิด |
| odds | อัตราต่อรอง → โอกาส / ความน่าจะเป็น |
| pool / pool รวม | คะแนนรวม |

## คะแนน (coins) — Scale Spec

ห้ามคิดตัวเลขเอง ต้องอิง DB จริงเสมอ:

| สถานะ | coins |
|---|---|
| user ใหม่ ยังไม่เคยทาย | 10,000 (starting balance) |
| user จริงที่เล่นอยู่ | ~500–520 |
| mock ผู้มาใหม่ (เล่นบ้าง) | 440–510 |
| mock ผู้ตื่นรู้ | 158–240 |
| mock นักพยากรณ์ | 260–380 |
| mock โหรมือทอง | 410–580 |
| mock เซียนทำนาย | 620–920 |
| mock เทพทำนาย | 1,050–1,380 |
| mock จักรวาลเลือก | 1,540–1,820 |

> ตัวเลขอ้างอิงจาก DB snapshot (2026-05-10) — real users ≈ 500 coins

## Rank System — source of truth: `lib/game/ranks.ts`

| Tier (DB value) | English name | ฉายา | minRep |
|---|---|---|---|
| ผู้มาใหม่ | Wanderer | "เดาแต่โดน" | 0 |
| ผู้ตื่นรู้ | Awakened | "ทรงนี้มาแน่" | 150 |
| นักพยากรณ์ | Seer | "คนมันแม่น" | 500 |
| โหรมือทอง | Oracle | "คนมีของ" | 1,200 |
| เซียนทำนาย | Sage | "ลูกรักจักรวาล" | 3,000 |
| เทพทำนาย | Prophet | "ฟ้าประทานพร" | 7,000 |
| จักรวาลเลือก | Chosen | "จักรวาลกระซิบ" | 15,000 |

- **Tier** คือ value จริงใน DB (`users.rank`)
- **English name** คือ label ที่แสดงใน UI
- **ฉายา** คือ subtitle ใต้ rank — ห้ามใช้ซ้ำกับชื่อ tier

## tone & voice
- เป็นมิตร สนุก ไม่ซีเรียส
- เน้นความรู้สึก "ลุ้น" และ "ชุมชน" ไม่ใช่ "ได้เงิน"
- ใช้คำว่า "ทาย" "ลุ้น" "ฟันธง" ได้ตามบริบท

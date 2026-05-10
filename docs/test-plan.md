# Test Plan — ภาวนา Prediction Platform

**Version:** 1.0  
**Date:** 2026-05-10  
**Prepared by:** QA  
**Environment:** https://[production-url] / localhost:3000

---

## 1. Scope

ทดสอบ functional, UI, และ edge case ของแอป ภาวนา ซึ่งเป็นแพลตฟอร์มทายผลเหตุการณ์  
ครอบคลุม: Auth, Feed, Prediction, Profile, Leaderboard, Admin

---

## 2. Critical Path (Happy Path)

```
Login → ดู Feed → เลือกคำถาม → วางการทาย → ยืนยัน
→ ดู Profile → คะแนนลดลงถูกต้อง
→ Admin resolve คำถาม → คะแนนเข้าผู้ทายถูก
→ Leaderboard อัพเดต
```

---

## 3. Test Cases

### Module: Authentication

| TC ID | Test Case | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC-AUTH-001 | Login สำเร็จ | 1. เปิดแอป<br>2. กรอก email/password ที่ถูกต้อง<br>3. กด Login | เข้าสู่ Feed page, แสดงชื่อ user | High |
| TC-AUTH-002 | Login ด้วย email ผิด | กรอก email ที่ไม่มีในระบบ | แสดง error message ที่เข้าใจได้ | High |
| TC-AUTH-003 | Login ด้วย password ผิด | กรอก password ผิด | แสดง error message, ไม่เข้าระบบ | High |
| TC-AUTH-004 | Logout | กด logout จาก profile | กลับไปหน้า login, session ถูกลบ | High |
| TC-AUTH-005 | เข้าหน้า feed โดยไม่ login | พิมพ์ URL /feed โดยตรง | Redirect ไปหน้า login | Medium |
| TC-AUTH-006 | Session คงอยู่หลัง refresh | Login แล้ว refresh browser | ยังคง login อยู่, ไม่ถูก logout | Medium |

---

### Module: Feed

| TC ID | Test Case | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC-FEED-001 | แสดงรายการคำถาม | เข้าหน้า Feed | แสดงคำถามที่ active ทั้งหมด | High |
| TC-FEED-002 | Filter ตาม Sport | กด filter "กีฬา" | แสดงเฉพาะคำถามหมวดกีฬา | Medium |
| TC-FEED-003 | Filter ตาม Esport | กด filter "อีสปอร์ต" | แสดงเฉพาะคำถามหมวดอีสปอร์ต | Medium |
| TC-FEED-004 | Filter All | กด filter "ทั้งหมด" | แสดงคำถามทุกหมวด | Medium |
| TC-FEED-005 | Loading state | เปิด Feed ครั้งแรก | แสดง loading indicator ขณะโหลด | Low |
| TC-FEED-006 | Empty state | ไม่มีคำถาม active | แสดงข้อความแจ้งว่าไม่มีคำถาม | Low |

---

### Module: Prediction (วางการทาย)

| TC ID | Test Case | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC-PRED-001 | วางการทายสำเร็จ | 1. เลือกคำถาม<br>2. เลือกตัวเลือก<br>3. ใส่จำนวนคะแนน<br>4. กด Confirm | คะแนนลดลง, แสดง success message | High |
| TC-PRED-002 | วางการทายมากกว่าคะแนนที่มี | ใส่จำนวนมากกว่า P ที่มี | แสดง error, ไม่ให้ยืนยัน | High |
| TC-PRED-003 | วางการทาย 0 คะแนน | ใส่ 0 หรือค่าว่าง | แสดง error "ต้องใส่จำนวนมากกว่า 0" | High |
| TC-PRED-004 | ทายซ้ำในคำถามเดิม | วางการทายคำถามที่เคยทายแล้ว | แสดง error "คุณเคยทายคำถามนี้แล้ว" | High |
| TC-PRED-005 | ยกเลิกก่อน confirm | กด cancel ใน modal | modal ปิด, คะแนนไม่เปลี่ยน | Medium |
| TC-PRED-006 | คะแนนอัพเดต realtime | เปิด 2 tab, วางการทายใน tab 1 | tab 2 แสดงคะแนนใหม่โดยไม่ต้อง refresh | Medium |
| TC-PRED-007 | ทายคำถามที่หมดเวลา | พยายาม submit หลัง deadline | แสดง error "หมดเวลาทาย" | Medium |

---

### Module: Daily Bonus

| TC ID | Test Case | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC-BONUS-001 | รับ daily bonus ครั้งแรก | Login แล้วรับ bonus | คะแนนเพิ่มขึ้น, แสดง toast | High |
| TC-BONUS-002 | รับ daily bonus ซ้ำในวันเดียว | รับ bonus แล้วพยายามรับอีกครั้ง | ปุ่มถูก disable หรือแสดง "รับแล้ววันนี้" | High |
| TC-BONUS-003 | รับ bonus วันถัดไป | รอถึงวันใหม่แล้วรับ | รับได้อีกครั้ง, คะแนนเพิ่ม | Medium |

---

### Module: Profile

| TC ID | Test Case | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC-PROF-001 | แสดงข้อมูล profile | เข้าหน้า /profile/me | แสดงชื่อ, คะแนน, rank ถูกต้อง | High |
| TC-PROF-002 | แสดง rank tier ถูกต้อง | ดูหน้า profile | rank badge ตรงกับคะแนนที่มี | High |
| TC-PROF-003 | ประวัติการทาย | ดูรายการ prediction | แสดงรายการที่เคยทาย ถูก/ผิด | Medium |
| TC-PROF-004 | ดู profile ของคนอื่น | เข้า /profile/[username] | แสดงข้อมูล public ของ user นั้น | Medium |

---

### Module: Leaderboard

| TC ID | Test Case | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC-LB-001 | แสดง top predictors | เข้าหน้า Leaderboard | แสดงรายชื่อเรียงตามคะแนน | High |
| TC-LB-002 | อัพเดตหลัง resolve | Admin resolve คำถาม | leaderboard อัพเดตคะแนนใหม่ | Medium |
| TC-LB-003 | แสดง rank badge | ดู leaderboard | แต่ละคนมี rank badge ถูกต้อง | Low |

---

### Module: Admin

| TC ID | Test Case | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC-ADMIN-001 | เข้า admin โดยไม่ใช่ admin | login ด้วย account ทั่วไป แล้วเข้า /admin | Redirect หรือแสดง 403 | High |
| TC-ADMIN-002 | อนุมัติคำถาม | เข้า admin → approve คำถาม pending | คำถามแสดงใน Feed | High |
| TC-ADMIN-003 | ปฏิเสธคำถาม | reject คำถาม pending | คำถามไม่แสดงใน Feed | High |
| TC-ADMIN-004 | Resolve คำถาม | เลือก correct answer → resolve | คะแนนแจกให้ผู้ทายถูก | High |
| TC-ADMIN-005 | Resolve ซ้ำ | พยายาม resolve คำถามที่ resolved แล้ว | แสดง error หรือปุ่มถูก disable | Medium |

---

### Module: Submit Question (User)

| TC ID | Test Case | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC-SUB-001 | ส่งคำถามสำเร็จ | กรอกข้อมูลครบ → submit | แสดง "รอการอนุมัติ" | High |
| TC-SUB-002 | ส่งคำถามข้อมูลไม่ครบ | กรอกไม่ครบแล้ว submit | แสดง validation error | High |

---

## 4. Edge Cases & Exploratory Testing

| Scenario | วิธีทดสอบ | สิ่งที่ต้องระวัง |
|---|---|---|
| Network ช้า / หลุด | ใช้ Chrome DevTools → Network → Throttle | app แสดง error หรือ hang ไหม? |
| วางการทายพร้อมกัน 2 คน | เปิด 2 browser ทายพร้อมกัน | คะแนนรวม (pool) ถูกต้องไหม? |
| Input ภาษาพิเศษ | ใส่ emoji / script ในช่อง input | ไม่ crash, ไม่ XSS |
| Mobile view | ใช้ DevTools responsive mode | layout ไม่แตก, ปุ่มกดได้ |
| Session หมดอายุ | ปล่อยทิ้งนาน แล้วกลับมาใช้ | redirect ไป login ไม่ error แปลก |

---

## 5. Bug Report Template

```
Bug ID: BUG-XXX
Date: 
Reporter: 
Feature: 
Severity: Critical / High / Medium / Low

Environment:
  - Browser: Chrome 124 / Safari / Firefox
  - OS: macOS / Windows / iOS / Android
  - URL: 

Steps to Reproduce:
  1. 
  2. 
  3. 

Expected Result:
Actual Result:

Screenshot / Video: [แนบไฟล์]
Console Error: [แนบถ้ามี]
```

---

## 6. Severity Definition

| Severity | ความหมาย | ตัวอย่าง |
|---|---|---|
| **Critical** | app ใช้งานไม่ได้เลย | Login ไม่ได้, crash ทันที |
| **High** | feature หลักพัง | วางการทายแล้วคะแนนไม่ลด |
| **Medium** | feature รองพัง แต่มี workaround | filter ใช้งานไม่ได้ |
| **Low** | UI/UX เล็กน้อย | ตัวอักษรสีผิด, ขนาดไม่สม่ำเสมอ |

---

## 7. Test Environment Setup

```
1. Clone repo และ run: npm install && npm run dev
2. สร้าง test account ใน Supabase (หรือขอ staging credentials)
3. สร้าง admin account แยกต่างหาก
4. ใช้ Chrome DevTools สำหรับ network throttling และ console monitoring
```

---

## 8. Tools

| Tool | ใช้ทำอะไร |
|---|---|
| Chrome DevTools | Network, Console, Responsive mode |
| Postman | Test Supabase REST API โดยตรง |
| Loom | บันทึกวิดีโอ bug reproduction |
| Google Sheet | Track test case status |

---

*Test Plan นี้ครอบคลุม ภาวนา v1.0 — อัพเดตเมื่อมี feature ใหม่*

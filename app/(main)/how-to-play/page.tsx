import Link from 'next/link'
import { RANKS } from '@/lib/game/ranks'
import { ArrowRight } from 'lucide-react'

const STEPS = [
  {
    number: '01',
    emoji: '🔍',
    title: 'เลือกคำถามที่ชอบ',
    desc: 'เปิดฟีด แล้วเลือกคำถามที่น่าสนใจ — ผลบอล ดาราไทย ข่าวบ้านเมือง ครอบจักรวาล',
    tip: 'กรองตามหมวด เช่น กีฬา บันเทิง การเมือง ได้เลย',
  },
  {
    number: '02',
    emoji: '🎯',
    title: 'ฟันธงคำตอบที่คิดว่าถูก',
    desc: 'เลือกตัวเลือกที่ใจบอก แล้วใส่คะแนนที่อยากวาง — ยิ่งมั่นใจ ยิ่งวางเยอะได้',
    tip: 'เริ่มต้นด้วยน้อย ๆ ก่อนก็ได้ ไม่มีขั้นต่ำ',
  },
  {
    number: '03',
    emoji: '⏳',
    title: 'ลุ้นผลพร้อมกัน',
    desc: 'รอจนกว่าคำถามจะปิด เจ้าของคำถามประกาศผลแล้วคะแนนจะเข้าทันที',
    tip: 'ยิ่งคนวางน้อยฝั่งเดียวกับเรา ยิ่งได้เยอะถ้าทายถูก',
  },
  {
    number: '04',
    emoji: '🏆',
    title: 'สะสมคะแนน เลื่อนยศ',
    desc: 'ทายถูกบ่อย ๆ สะสมคะแนนให้มากขึ้น แล้วไต่ rank จากมือใหม่จนถึงเทพทำนาย',
    tip: 'streak ทายถูกต่อเนื่องให้ bonus พิเศษด้วย',
  },
]

const HOW_SCORES_WORK = [
  {
    icon: '✅',
    title: 'ทายถูก',
    desc: 'ได้คะแนนกลับคืน + ส่วนแบ่งจากคนที่ทายผิด ยิ่งสวนกระแสยิ่งได้เยอะ',
  },
  {
    icon: '❌',
    title: 'ทายผิด',
    desc: 'เสียคะแนนที่วางไว้ แต่ยังได้ประสบการณ์และ streak จะรีเซ็ต',
  },
  {
    icon: '🔥',
    title: 'Streak Bonus',
    desc: 'ทายถูกต่อเนื่องหลายครั้ง ได้ multiplier พิเศษ',
  },
  {
    icon: '📨',
    title: 'ชวนเพื่อน',
    desc: 'แชร์ลิงก์ถามเพื่อน ถ้าเพื่อนมาเล่น ได้ bonus คะแนนให้ทั้งคู่',
  },
]

export default function HowToPlayPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-8">

      {/* Hero */}
      <div className="text-center space-y-2 pt-2">
        <div className="text-5xl">🔮</div>
        <h1 className="text-2xl font-bold text-gray-900">วิธีเล่น ภาวนา</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          ทายผลเหตุการณ์จริง สะสมคะแนน แข่งกับเพื่อน<br />
          ไม่ต้องพนัน — แค่ฟันธงให้แม่น
        </p>
      </div>

      {/* Steps */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">ขั้นตอน</h2>
        <div className="space-y-3">
          {STEPS.map((step) => (
            <div key={step.number} className="bg-white rounded-2xl p-4 flex gap-4 shadow-sm">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl">
                {step.emoji}
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-gray-300">{step.number}</span>
                  <span className="font-semibold text-gray-900 text-sm">{step.title}</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
                <div className="flex items-start gap-1.5 mt-1">
                  <span className="text-xs text-indigo-500 font-medium flex-shrink-0">💡</span>
                  <span className="text-xs text-indigo-500">{step.tip}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Score system */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">ระบบคะแนน</h2>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {HOW_SCORES_WORK.map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-4">
              <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Payout formula callout */}
        <div className="bg-indigo-50 rounded-2xl p-4 space-y-1">
          <p className="text-xs font-semibold text-indigo-700">สูตรคำนวณคะแนนที่ได้</p>
          <p className="text-sm text-indigo-600 font-mono">
            คะแนนที่ได้ = (คะแนนที่วาง ÷ คะแนนฝั่งชนะ) × คะแนนรวมทั้งหมด
          </p>
          <p className="text-xs text-indigo-400 mt-1">
            ยิ่งสวนกระแส → ส่วนแบ่งมากกว่า → ได้คะแนนเยอะกว่า
          </p>
        </div>
      </section>

      {/* Ranks */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">ระดับยศ</h2>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {RANKS.map((rank, i) => (
            <div key={rank.tier} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl w-8 text-center">{rank.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-900">{rank.tier}</span>
                {i === 0 ? (
                  <span className="ml-2 text-xs text-gray-400">เริ่มต้นทุกคน</span>
                ) : (
                  <span className="ml-2 text-xs text-gray-400">≥ {rank.minRep.toLocaleString()} P</span>
                )}
              </div>
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: rank.color }}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center px-2">
          P = คะแนนสะสม (ทายถูกมากขึ้น → P เพิ่ม → ยศสูงขึ้น)
        </p>
      </section>

      {/* FAQ */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">คำถามที่พบบ่อย</h2>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {[
            {
              q: 'คะแนนสามารถถอนเป็นเงินได้ไหม?',
              a: 'ไม่ได้ — ภาวนาเป็นแพลตฟอร์มทายผลเพื่อความสนุก คะแนนใช้สำหรับแข่งลีดเดอร์บอร์ดและ unlock ยศเท่านั้น',
            },
            {
              q: 'ถ้าคำถามถูกยกเลิก คะแนนล่ะ?',
              a: 'คะแนนที่วางไว้จะคืนให้เต็มจำนวนทุกคน',
            },
            {
              q: 'ตั้งคำถามเองได้ไหม?',
              a: 'ได้ — กด "ส่งคำถาม" แล้วรอแอดมินตรวจสอบก่อนประกาศในฟีด',
            },
            {
              q: 'คะแนนเริ่มต้นเท่าไหร่?',
              a: 'สมาชิกใหม่ได้คะแนนตั้งต้น 100 P เพื่อให้ลองเล่นได้ทันที',
            },
          ].map(({ q, a }) => (
            <div key={q} className="px-4 py-3 space-y-1">
              <p className="text-sm font-semibold text-gray-900">{q}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="pb-4 space-y-3">
        <Link
          href="/feed"
          className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white rounded-2xl py-3.5 font-semibold text-sm hover:bg-gray-700 transition-colors"
        >
          เริ่มทายเลย <ArrowRight size={16} />
        </Link>
        <Link
          href="/leaderboard"
          className="flex items-center justify-center w-full text-gray-500 text-sm hover:text-gray-700 transition-colors py-1"
        >
          ดูอันดับผู้เล่น →
        </Link>
      </div>
    </div>
  )
}

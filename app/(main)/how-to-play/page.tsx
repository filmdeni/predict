'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, ArrowLeft, ChevronRight } from 'lucide-react'
import { RANKS } from '@/lib/game/ranks'

const STEPS = [
  {
    emoji: '🔮',
    bg: 'from-indigo-500 to-purple-600',
    textColor: 'text-indigo-600',
    bgLight: 'bg-indigo-50',
    title: 'ภาวนาคืออะไร?',
    subtitle: 'overview',
    desc: '',
    visual: (
      <div className="mt-3 space-y-2">
        {[
          { icon: '🎯', what: 'ทายผลเหตุการณ์จริง', get: 'ลุ้นสนุกทุกวัน' },
          { icon: '💰', what: 'วางคะแนนในสิ่งที่เชื่อ', get: 'ทายถูก = ได้คะแนนเพิ่ม' },
          { icon: '🏆', what: 'สะสมคะแนน', get: 'ไต่ยศ แข่งลีดเดอร์บอร์ด' },
        ].map((row) => (
          <div key={row.what} className="bg-white/20 rounded-xl px-3 py-2.5 flex items-center gap-3">
            <span className="text-xl flex-shrink-0">{row.icon}</span>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold leading-tight">{row.what}</p>
              <p className="text-white/70 text-xs leading-tight mt-0.5">→ {row.get}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    emoji: '🔍',
    bg: 'from-sky-500 to-blue-600',
    textColor: 'text-sky-600',
    bgLight: 'bg-sky-50',
    title: 'เลือกคำถามที่ชอบ',
    subtitle: 'ขั้นตอนที่ 1',
    desc: 'เปิดฟีด แล้วเลือกคำถามที่น่าสนใจ กรองตามหมวด เช่น กีฬา บันเทิง การเมือง ได้เลย',
    tip: 'มีคำถามใหม่ทุกวัน — รีบทายก่อนปิดรับ',
    visual: (
      <div className="space-y-2 mt-2">
        {['⚽ ใครชนะบอลคืนนี้?', '🎬 หนังเรื่องไหนทำเงินสูงสุด?'].map((q, i) => (
          <div
            key={i}
            className="bg-white rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-3 text-sm font-medium text-gray-700"
          >
            <span>{q}</span>
            <ChevronRight size={14} className="ml-auto text-gray-300" />
          </div>
        ))}
      </div>
    ),
  },
  {
    emoji: '🎯',
    bg: 'from-orange-500 to-rose-600',
    textColor: 'text-orange-600',
    bgLight: 'bg-orange-50',
    title: 'ฟันธงคำตอบ',
    subtitle: 'ขั้นตอนที่ 2',
    desc: 'เลือกตัวเลือกที่ใจบอก แล้วใส่คะแนนที่อยากวาง — ยิ่งมั่นใจ ยิ่งวางเยอะได้',
    tip: 'ยิ่งสวนกระแส ยิ่งได้เยอะถ้าทายถูก',
    visual: (
      <div className="mt-2">
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-xs text-gray-500 mb-2">⚽ ใครชนะบอลคืนนี้?</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'ทีม A', pct: '62%', active: true },
              { label: 'ทีม B', pct: '38%', active: false },
            ].map((opt) => (
              <div
                key={opt.label}
                className={`rounded-xl p-2.5 text-center text-sm font-semibold border-2 ${
                  opt.active
                    ? 'border-orange-400 bg-orange-50 text-orange-600'
                    : 'border-gray-100 bg-gray-50 text-gray-400'
                }`}
              >
                {opt.label}
                <div className="text-xs font-normal mt-0.5 opacity-70">{opt.pct}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    emoji: '⏳',
    bg: 'from-emerald-500 to-teal-600',
    textColor: 'text-emerald-600',
    bgLight: 'bg-emerald-50',
    title: 'ลุ้นผลพร้อมกัน',
    subtitle: 'ขั้นตอนที่ 3',
    desc: 'รอจนกว่าคำถามจะปิด เจ้าของคำถามประกาศผล แล้วคะแนนจะเข้าทันที',
    tip: 'เปิด notification เพื่อรับแจ้งเตือนผลทันที',
    visual: (
      <div className="mt-2 flex items-center justify-center">
        <div className="bg-white rounded-2xl px-6 py-4 shadow-md text-center">
          <div className="text-3xl mb-1 animate-pulse">🎉</div>
          <div className="text-sm font-bold text-emerald-600">ทายถูก!</div>
          <div className="text-xs text-gray-400 mt-1">+248 P</div>
        </div>
      </div>
    ),
  },
  {
    emoji: '🏆',
    bg: 'from-yellow-500 to-amber-600',
    textColor: 'text-yellow-600',
    bgLight: 'bg-yellow-50',
    title: 'สะสมคะแนน เลื่อนยศ',
    subtitle: 'ขั้นตอนที่ 4',
    desc: 'ทายถูกบ่อย ๆ สะสมคะแนนให้มากขึ้น แล้วไต่ rank จากผู้มาใหม่จนถึงจักรวาลเลือก',
    tip: 'streak ทายถูกต่อเนื่องให้ bonus พิเศษด้วย',
    visual: (
      <div className="mt-2 flex gap-1.5 flex-wrap justify-center">
        {RANKS.slice(0, 5).map((rank) => (
          <div key={rank.tier} className="flex flex-col items-center gap-1">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-base"
              style={{ backgroundColor: rank.color + '22', border: `2px solid ${rank.color}` }}
            >
              {rank.emoji}
            </div>
            <span className="text-[9px] text-gray-300 text-center leading-tight max-w-[40px]">{rank.tier}</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-1">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">+2</div>
        </div>
      </div>
    ),
  },
]

export default function HowToPlayPage() {
  const [step, setStep] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const [animDir, setAnimDir] = useState<'right' | 'left'>('right')

  function goTo(next: number, dir: 'right' | 'left') {
    setAnimDir(dir)
    setAnimKey((k) => k + 1)
    setStep(next)
  }

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col min-h-[calc(100vh-120px)]">
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(28px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-28px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .slide-right { animation: slideInRight 0.22s ease forwards; }
        .slide-left  { animation: slideInLeft  0.22s ease forwards; }
      `}</style>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-6">
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > step ? 'right' : 'left')}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? 'w-6 bg-gray-800' : 'w-2 bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Animated card */}
      <div
        key={animKey}
        className={`flex-1 flex flex-col ${animDir === 'right' ? 'slide-right' : 'slide-left'}`}
      >
        {/* Hero */}
        <div className={`rounded-3xl bg-gradient-to-br ${current.bg} p-6 text-white mb-4 shadow-lg`}>
          <p className="text-sm font-medium opacity-80 mb-1">{current.subtitle}</p>
          <div className="text-5xl mb-3">{current.emoji}</div>
          <h1 className="text-2xl font-bold leading-snug">{current.title}</h1>
          {current.visual && <div className="mt-4">{current.visual}</div>}
        </div>

        {/* Description */}
        {(current.desc || ('tip' in current && current.tip)) && (
          <div className={`rounded-2xl ${current.bgLight} p-4 space-y-3`}>
            {current.desc && <p className="text-gray-700 text-sm leading-relaxed">{current.desc}</p>}
            {'tip' in current && current.tip && (
              <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0">💡</span>
                <p className={`text-sm font-medium ${current.textColor}`}>{current.tip}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center gap-3">
        {step > 0 ? (
          <button
            onClick={() => goTo(step - 1, 'left')}
            className="w-12 h-12 rounded-2xl border-2 border-gray-200 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
        ) : (
          <div className="w-12 flex-shrink-0" />
        )}

        {isLast ? (
          <Link
            href="/feed"
            className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white rounded-2xl py-3.5 font-semibold text-sm hover:bg-gray-700 transition-colors"
          >
            เริ่มทายเลย <ArrowRight size={16} />
          </Link>
        ) : (
          <button
            onClick={() => goTo(step + 1, 'right')}
            className={`flex-1 flex items-center justify-center gap-2 bg-gradient-to-r ${current.bg} text-white rounded-2xl py-3.5 font-semibold text-sm hover:opacity-90 transition-opacity shadow-md`}
          >
            ถัดไป <ArrowRight size={16} />
          </button>
        )}
      </div>

      {!isLast && (
        <button
          onClick={() => goTo(STEPS.length - 1, 'right')}
          className="text-center text-xs text-gray-400 hover:text-gray-600 transition-colors mt-3 py-1"
        >
          ข้ามไปขั้นตอนสุดท้าย →
        </button>
      )}

      {/* Full reference section */}
      <div className="mt-10 space-y-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">รายละเอียดเพิ่มเติม</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Score system */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">ระบบคะแนน</h2>
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            {[
              { icon: '✅', title: 'ทายถูก', desc: 'ได้คะแนนกลับ + ส่วนแบ่งจากคนทายผิด ยิ่งสวนกระแสยิ่งได้เยอะ' },
              { icon: '❌', title: 'ทายผิด', desc: 'เสียคะแนนที่วาง แต่ได้ประสบการณ์ — streak รีเซ็ต' },
              { icon: '🔥', title: 'Streak Bonus', desc: 'ทายถูกต่อเนื่องหลายครั้ง ได้ multiplier พิเศษ' },
              { icon: '📨', title: 'ชวนเพื่อน', desc: 'แชร์ลิงก์ชวนเพื่อน ได้ bonus คะแนนให้ทั้งคู่' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-4">
                <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-indigo-50 rounded-2xl p-4 space-y-1">
            <p className="text-xs font-semibold text-indigo-700">สูตรคำนวณคะแนนที่ได้</p>
            <p className="text-sm text-indigo-600 font-mono">
              คะแนนที่ได้ = (คะแนนที่วาง ÷ คะแนนฝั่งชนะ) × คะแนนรวมทั้งหมด
            </p>
            <p className="text-xs text-indigo-400 mt-1">ยิ่งสวนกระแส → ส่วนแบ่งมากกว่า → ได้เยอะกว่า</p>
          </div>
        </section>

        {/* Ranks */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">ระดับยศ</h2>
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
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: rank.color }} />
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">คำถามที่พบบ่อย</h2>
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            {[
              { q: 'คะแนนถอนเป็นเงินได้ไหม?', a: 'ไม่ได้ — คะแนนใช้แข่งลีดเดอร์บอร์ดและ unlock ยศเท่านั้น' },
              { q: 'ถ้าคำถามถูกยกเลิก คะแนนล่ะ?', a: 'คะแนนที่วางจะคืนให้เต็มจำนวน' },
              { q: 'ตั้งคำถามเองได้ไหม?', a: 'ได้ — กด "ส่งคำถาม" แล้วรอแอดมินตรวจสอบ' },
              { q: 'คะแนนเริ่มต้นเท่าไหร่?', a: 'สมาชิกใหม่ได้คะแนนตั้งต้น 10,000 P' },
            ].map(({ q, a }) => (
              <div key={q} className="px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-gray-900">{q}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <Link
          href="/feed"
          className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white rounded-2xl py-3.5 font-semibold text-sm hover:bg-gray-700 transition-colors"
        >
          เริ่มทายเลย <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}

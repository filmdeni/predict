'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, X, ChevronRight } from 'lucide-react'
import { RANKS } from '@/lib/game/ranks'

const STORAGE_KEY = 'bawana_howtoplay_seen'

// ── Step 1: feed cards ────────────────────────────────────────────────────────
function VisualFeed() {
  const [selected, setSelected] = useState<number | null>(null)
  const cards = [
    { q: '⚽ ใครชนะบอลคืนนี้?', time: '2 ชม.' },
    { q: '🎬 หนังเรื่องไหนทำเงินสูงสุด?', time: '5 ชม.' },
  ]
  return (
    <div className="space-y-2 mt-2">
      {cards.map((c, i) => (
        <button
          key={i}
          onClick={() => setSelected(i)}
          className={`w-full rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-3 text-sm font-medium text-left transition-all active:scale-95 ${
            selected === i
              ? 'bg-sky-100 ring-2 ring-sky-400 text-sky-700'
              : 'bg-white text-gray-700'
          }`}
        >
          <span className="flex-1">{c.q}</span>
          <span className="text-xs text-gray-300 flex-shrink-0">{c.time}</span>
          <ChevronRight size={14} className={selected === i ? 'text-sky-400' : 'text-gray-300'} />
        </button>
      ))}
      {selected !== null && (
        <p className="text-center text-white/80 text-xs animate-pulse">👆 เลือกแล้ว ไปทายได้เลย!</p>
      )}
    </div>
  )
}

// ── Step 2: option picker ─────────────────────────────────────────────────────
function VisualPick() {
  const [picked, setPicked] = useState<string | null>(null)
  const [amount, setAmount] = useState(100)
  const opts = [
    { label: 'ทีม A', pct: '62%' },
    { label: 'ทีม B', pct: '38%' },
  ]
  return (
    <div className="mt-2 space-y-2">
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <p className="text-xs text-gray-500 mb-2">⚽ ใครชนะบอลคืนนี้?</p>
        <div className="grid grid-cols-2 gap-2">
          {opts.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setPicked(opt.label)}
              className={`rounded-xl p-2.5 text-center text-sm font-semibold border-2 transition-all active:scale-95 ${
                picked === opt.label
                  ? 'border-orange-400 bg-orange-50 text-orange-600 scale-105'
                  : 'border-gray-100 bg-gray-50 text-gray-400'
              }`}
            >
              {opt.label}
              <div className="text-xs font-normal mt-0.5 opacity-70">{opt.pct}</div>
            </button>
          ))}
        </div>
        {picked && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500 flex-shrink-0">วางคะแนน</span>
            <div className="flex-1 flex items-center gap-1">
              <button
                onClick={() => setAmount((a) => Math.max(10, a - 50))}
                className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm flex items-center justify-center active:scale-90 transition-transform"
              >−</button>
              <div className="flex-1 text-center text-sm font-bold text-orange-600">{amount} P</div>
              <button
                onClick={() => setAmount((a) => a + 50)}
                className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 font-bold text-sm flex items-center justify-center active:scale-90 transition-transform"
              >+</button>
            </div>
          </div>
        )}
      </div>
      {picked && (
        <p className="text-center text-white/80 text-xs animate-pulse">✅ เลือก {picked} วาง {amount} P</p>
      )}
    </div>
  )
}

// ── Step 3: result reveal ─────────────────────────────────────────────────────
function VisualResult() {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className="mt-2 flex flex-col items-center gap-2">
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="bg-white/20 hover:bg-white/30 active:scale-95 transition-all rounded-2xl px-5 py-3 text-white text-sm font-semibold"
        >
          🔔 ประกาศผล!
        </button>
      ) : (
        <div
          className="bg-white rounded-2xl px-8 py-4 shadow-md text-center"
          style={{ animation: 'bounceIn 0.4s cubic-bezier(0.34,1.4,0.64,1) forwards' }}
        >
          <div className="text-3xl mb-1">🎉</div>
          <div className="text-sm font-bold text-emerald-600">ทายถูก!</div>
          <div className="text-xs text-gray-400 mt-1">+248 P เข้าแล้ว</div>
        </div>
      )}
    </div>
  )
}

// ── Step 4: rank badges ───────────────────────────────────────────────────────
function VisualRanks() {
  const [active, setActive] = useState<number | null>(null)
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5 flex-wrap justify-center">
        {RANKS.slice(0, 5).map((rank, i) => (
          <button
            key={rank.tier}
            onClick={() => setActive(i === active ? null : i)}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-all ${
                active === i ? 'scale-125 shadow-lg' : ''
              }`}
              style={{
                backgroundColor: rank.color + (active === i ? '44' : '22'),
                border: `2px solid ${rank.color}`,
              }}
            >
              {rank.emoji}
            </div>
            <span className="text-[9px] text-gray-300 text-center leading-tight max-w-[40px]">{rank.tier}</span>
          </button>
        ))}
        <div className="flex flex-col items-center gap-1">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">+2</div>
        </div>
      </div>
      {active !== null && (
        <p className="text-center text-white/80 text-xs">
          {RANKS[active].tier} — ต้องการ {active === 0 ? 'เริ่มต้น' : `≥ ${RANKS[active].minRep.toLocaleString()} P`}
        </p>
      )}
    </div>
  )
}

// ── Step metadata ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    emoji: '🔮',
    bg: 'from-indigo-500 to-purple-600',
    textColor: 'text-indigo-600',
    bgLight: 'bg-indigo-50',
    title: 'ภาวนาคืออะไร?',
    subtitle: 'overview',
    desc: '',
    Visual: () => (
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
    Visual: VisualFeed,
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
    Visual: VisualPick,
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
    Visual: VisualResult,
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
    Visual: VisualRanks,
  },
]

export default function HowToPlayModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const [animDir, setAnimDir] = useState<'right' | 'left'>('right')

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true)
    }
  }, [])

  function close() {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  function goTo(next: number, dir: 'right' | 'left') {
    setAnimDir(dir)
    setAnimKey((k) => k + 1)
    setStep(next)
  }

  if (!open) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes bounceIn {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        .modal-in    { animation: modalIn      0.28s cubic-bezier(0.34,1.2,0.64,1) forwards; }
        .slide-right { animation: slideInRight 0.22s ease forwards; }
        .slide-left  { animation: slideInLeft  0.22s ease forwards; }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={close}
      >
        {/* Modal */}
        <div
          className="modal-in w-full max-w-sm bg-[#f5f5f5] rounded-3xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i, i > step ? 'right' : 'left')}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'w-5 bg-gray-800' : 'w-1.5 bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={close}
              className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          <div
            key={animKey}
            className={`px-4 pb-2 ${animDir === 'right' ? 'slide-right' : 'slide-left'}`}
          >
            {/* Hero */}
            <div className={`rounded-2xl bg-gradient-to-br ${current.bg} p-5 text-white shadow-lg`}>
              <p className="text-xs font-medium opacity-75 mb-1">{current.subtitle}</p>
              <div className="text-4xl mb-2">{current.emoji}</div>
              <h2 className="text-xl font-bold leading-snug">{current.title}</h2>
              <current.Visual />
            </div>

            {/* Description */}
            {(current.desc || ('tip' in current && current.tip)) && (
              <div className={`rounded-2xl ${current.bgLight} p-4 mt-3 space-y-2`}>
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
          <div className="px-4 pb-5 pt-3 flex items-center gap-3">
            {step > 0 ? (
              <button
                onClick={() => goTo(step - 1, 'left')}
                className="w-11 h-11 rounded-2xl border-2 border-gray-200 flex items-center justify-center text-gray-400 hover:border-gray-400 transition-colors flex-shrink-0"
              >
                <ArrowLeft size={16} />
              </button>
            ) : (
              <div className="w-11 flex-shrink-0" />
            )}

            {isLast ? (
              <Link
                href="/feed"
                onClick={close}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white rounded-2xl py-3 font-semibold text-sm hover:bg-gray-700 transition-colors"
              >
                เริ่มทายเลย <ArrowRight size={15} />
              </Link>
            ) : (
              <button
                onClick={() => goTo(step + 1, 'right')}
                className={`flex-1 flex items-center justify-center gap-2 bg-gradient-to-r ${current.bg} text-white rounded-2xl py-3 font-semibold text-sm hover:opacity-90 transition-opacity shadow-md`}
              >
                ถัดไป <ArrowRight size={15} />
              </button>
            )}
          </div>

          {!isLast && (
            <div className="text-center pb-4 -mt-2">
              <button onClick={close} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                ข้ามไปก่อน
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

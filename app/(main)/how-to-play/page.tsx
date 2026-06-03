'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { RANKS } from '@/lib/game/ranks'

const TABS = ['วิธีเล่น', 'ระบบคะแนน', 'ยศ & FAQ'] as const
type Tab = (typeof TABS)[number]

const STEPS = [
  {
    num: 1,
    emoji: '🔍',
    title: 'เลือกคำถามที่ชอบ',
    desc: 'เปิดฟีด แล้วเลือกคำถามที่น่าสนใจ กรองตามหมวด เช่น กีฬา บันเทิง การเมือง',
    tip: 'มีคำถามใหม่ทุกวัน — รีบทายก่อนปิดรับ',
  },
  {
    num: 2,
    emoji: '🎯',
    title: 'ฟันธงคำตอบ',
    desc: 'เลือกตัวเลือกที่ใจบอก แล้วใส่คะแนนที่อยากวาง — ยิ่งมั่นใจ ยิ่งวางเยอะได้',
    tip: 'ยิ่งสวนกระแส ยิ่งได้เยอะถ้าทายถูก',
  },
  {
    num: 3,
    emoji: '⏳',
    title: 'ลุ้นผลพร้อมกัน',
    desc: 'รอจนกว่าคำถามจะปิด เจ้าของคำถามประกาศผล คะแนนเข้าทันที',
    tip: 'เปิด notification เพื่อรับแจ้งเตือนผลทันที',
  },
  {
    num: 4,
    emoji: '🏆',
    title: 'สะสมคะแนน เลื่อนยศ',
    desc: 'ทายถูกบ่อยๆ สะสม rep ไต่ rank จากผู้มาใหม่จนถึงจักรวาลเลือก',
    tip: 'ทายถูกต่อเนื่อง ได้ streak bonus พิเศษ',
  },
]

const SCORE_ITEMS = [
  { icon: '✅', title: 'ทายถูก', desc: 'ได้คะแนนกลับ + ส่วนแบ่งจากคนทายผิด ยิ่งสวนกระแสยิ่งได้เยอะ' },
  { icon: '❌', title: 'ทายผิด', desc: 'เสียคะแนนที่วาง แต่ได้ประสบการณ์ — streak รีเซ็ต' },
  { icon: '🔥', title: 'Streak Bonus', desc: 'ทายถูกต่อเนื่องหลายครั้ง ได้ multiplier พิเศษ' },
  { icon: '📨', title: 'ชวนเพื่อน', desc: 'แชร์ลิงก์ชวนเพื่อน ได้ bonus คะแนนให้ทั้งคู่' },
]

const FAQ = [
  { q: 'คะแนนถอนเป็นเงินได้ไหม?', a: 'ไม่ได้ — คะแนนใช้แข่งลีดเดอร์บอร์ดและ unlock ยศเท่านั้น' },
  { q: 'ถ้าคำถามถูกยกเลิก คะแนนล่ะ?', a: 'คะแนนที่วางจะคืนให้เต็มจำนวน' },
  { q: 'ตั้งคำถามเองได้ไหม?', a: 'ได้ — กด "ส่งคำถาม" แล้วรอแอดมินตรวจสอบ' },
  { q: 'คะแนนเริ่มต้นเท่าไหร่?', a: 'สมาชิกใหม่ได้คะแนนตั้งต้น 10,000 P' },
]

export default function HowToPlayPage() {
  const [tab, setTab] = useState<Tab>('วิธีเล่น')

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-10">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">วิธีเล่น</h1>
        <p className="text-sm text-gray-500 mt-1">ภาวนา — แพลตฟอร์มทายผลเหตุการณ์</p>
      </div>

      {/* Video overview */}
      <div className="mb-6 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <video
          src="/videos/overview.mp4"
          controls
          playsInline
          className="w-full"
        />
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              tab === t
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab: วิธีเล่น */}
      {tab === 'วิธีเล่น' && (
        <div className="space-y-3">
          {STEPS.map((step) => (
            <div key={step.num} className="bg-white rounded-2xl shadow-sm p-4 flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                <span className="text-xl">{step.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">ขั้นตอนที่ {step.num}</span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 leading-snug">{step.title}</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
                <div className="flex items-start gap-1.5 mt-2">
                  <span className="text-xs flex-shrink-0">💡</span>
                  <p className="text-xs text-indigo-600 font-medium leading-relaxed">{step.tip}</p>
                </div>
              </div>
            </div>
          ))}

          <Link
            href="/feed"
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-indigo-500 to-indigo-700 text-white rounded-2xl py-3.5 font-semibold text-sm hover:opacity-90 transition-opacity shadow-md shadow-indigo-200 mt-4"
          >
            เริ่มทายเลย <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* Tab: ระบบคะแนน */}
      {tab === 'ระบบคะแนน' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            {SCORE_ITEMS.map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-4">
                <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-indigo-50 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-semibold text-indigo-700">📐 สูตรคำนวณคะแนนที่ได้</p>
            <p className="text-sm text-indigo-600 font-mono leading-relaxed">
              คะแนนที่ได้ = (คะแนนที่วาง ÷ คะแนนฝั่งชนะ) × คะแนนรวมทั้งหมด
            </p>
            <p className="text-xs text-indigo-400">ยิ่งสวนกระแส → ส่วนแบ่งมากกว่า → ได้เยอะกว่า</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 mb-3">ตัวอย่าง</p>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>คะแนนรวมทั้งหมด</span>
                <span className="font-semibold text-gray-900">1,000 P</span>
              </div>
              <div className="flex justify-between">
                <span>คะแนนฝั่งชนะรวม</span>
                <span className="font-semibold text-gray-900">380 P</span>
              </div>
              <div className="flex justify-between">
                <span>คะแนนที่เราวาง</span>
                <span className="font-semibold text-gray-900">100 P</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex justify-between">
                <span>คะแนนที่ได้กลับ</span>
                <span className="font-bold text-indigo-600">≈ 263 P</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: ยศ & FAQ */}
      {tab === 'ยศ & FAQ' && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">ระดับยศทั้งหมด</p>
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
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">คำถามที่พบบ่อย</p>
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
              {FAQ.map(({ q, a }) => (
                <div key={q} className="px-4 py-3 space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{q}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

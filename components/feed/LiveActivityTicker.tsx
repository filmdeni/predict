'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Database } from '@/lib/supabase/types'

type Question = Database['public']['Tables']['questions']['Row'] & {
  categories: { name_th: string; emoji: string; slug: string }
}

// Mock active usernames with rank flavour
const MOCK_USERS: { name: string; rank: string; color: string }[] = [
  { name: 'ดราม่าควีน', rank: 'Oracle', color: 'text-yellow-600' },
  { name: 'เซียนหุ้น88', rank: 'Sage', color: 'text-purple-600' },
  { name: 'ลุงโหร', rank: 'Prophet', color: 'text-rose-600' },
  { name: 'กาแฟดำ', rank: 'Awakened', color: 'text-sky-600' },
  { name: 'นกฮูกดึก', rank: 'Seer', color: 'text-emerald-600' },
  { name: 'ฟ้ามีตา', rank: 'Chosen', color: 'text-indigo-600' },
  { name: 'ขาลุ้น007', rank: 'Wanderer', color: 'text-gray-600' },
  { name: 'จักรวาลบอก', rank: 'Oracle', color: 'text-yellow-600' },
  { name: 'ตาดีมีเฮง', rank: 'Seer', color: 'text-emerald-600' },
  { name: 'โหรอินดี้', rank: 'Prophet', color: 'text-rose-600' },
]

type EventKind = 'flip' | 'big_wager' | 'consensus' | 'hot'

interface ActivityEvent {
  id: number
  kind: EventKind
  user?: { name: string; rank: string; color: string }
  questionTitle: string
  detail: string
  emoji: string
}

function truncate(s: string, n = 20) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

function buildEvents(questions: Question[], seed: number): ActivityEvent[] {
  if (questions.length === 0) return []
  const events: ActivityEvent[] = []
  let id = seed

  const open = questions.filter(q => q.status === 'open')
  const pool = open.length > 0 ? open : questions

  for (let i = 0; i < 12; i++) {
    const q = pool[(seed + i * 7) % pool.length]
    const user = MOCK_USERS[(seed + i * 3) % MOCK_USERS.length]
    const opts = q.options as { id: string; label: string }[]
    const isBinary = opts.length === 2

    const kind: EventKind = (['flip', 'big_wager', 'consensus', 'hot'] as const)[(seed + i * 2) % 4]

    if (kind === 'flip' && isBinary) {
      const fromLabel = i % 2 === 0 ? 'ไม่' : 'ใช่'
      const toLabel   = fromLabel === 'ไม่' ? 'ใช่' : 'ไม่'
      events.push({
        id: id++, kind, user,
        questionTitle: truncate(q.title),
        detail: `เปลี่ยนใจจาก ${fromLabel} → ${toLabel}`,
        emoji: '🔄',
      })
    } else if (kind === 'big_wager') {
      const amount = (200 + ((seed + i * 137) % 20) * 200).toLocaleString()
      events.push({
        id: id++, kind, user,
        questionTitle: truncate(q.title),
        detail: `ทุ่ม ${amount}P`,
        emoji: '💰',
      })
    } else if (kind === 'consensus') {
      const pct = 65 + ((seed + i * 11) % 30)
      const label = isBinary ? 'ใช่' : truncate(opts[0]?.label ?? '?', 10)
      events.push({
        id: id++, kind,
        questionTitle: truncate(q.title),
        detail: `${pct}% เลือก "${label}"`,
        emoji: '📊',
      })
    } else {
      const count = 8 + ((seed + i * 19) % 40)
      events.push({
        id: id++, kind,
        questionTitle: truncate(q.title),
        detail: `${count} คนทายในชั่วโมงนี้`,
        emoji: '🔥',
      })
    }
  }

  return events
}

export default function LiveActivityTicker({ questions, tickKey }: { questions: Question[]; tickKey?: number }) {
  const [visibleIdx, setVisibleIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const seedRef = useRef(Math.floor(Date.now() / 1000) % 997)

  const events = useMemo(
    () => buildEvents(questions, seedRef.current),
    [questions]
  )

  // Advance event every ~5s; bump seed occasionally via tickKey
  useEffect(() => {
    if (events.length === 0) return
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setVisibleIdx(i => (i + 1) % events.length)
        if (Math.random() < 0.15) seedRef.current = (seedRef.current + 37) % 997
        setVisible(true)
      }, 250)
    }, 5000)
    return () => clearInterval(t)
  }, [events.length])

  // When tick fires (live stats updated), inject a new event 30% of the time
  useEffect(() => {
    if (!tickKey || events.length === 0) return
    if (Math.random() < 0.3) {
      setVisible(false)
      setTimeout(() => {
        setVisibleIdx(i => (i + 1) % events.length)
        setVisible(true)
      }, 200)
    }
  }, [tickKey])

  if (events.length === 0) return null

  const ev = events[visibleIdx]

  return (
    <div className="mx-6 mt-2 mb-1">
      <div
        className={`flex items-center gap-2 text-[11px] bg-white border border-gray-100 rounded-full px-3 py-1.5 shadow-sm transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <span className="text-[11px]">{ev.emoji}</span>
        {ev.user && (
          <span className={`font-semibold ${ev.user.color} flex-shrink-0`}>
            {ev.user.name}
          </span>
        )}
        <span className="text-gray-500 flex-shrink-0">{ev.detail}</span>
        <span className="text-gray-300 flex-shrink-0">·</span>
        <span className="text-gray-400 truncate">{ev.questionTitle}</span>
      </div>
    </div>
  )
}

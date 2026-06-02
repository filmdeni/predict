'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ActivityEvent {
  id: string
  userName: string
  rank: string
  questionTitle: string
  optionLabel: string
  amount: number
}

function truncate(s: string, n = 22) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

const RANK_COLOR: Record<string, string> = {
  'ผู้มาใหม่':   'text-gray-600',
  'ผู้ตื่นรู้':  'text-sky-600',
  'นักพยากรณ์':  'text-emerald-600',
  'โหรมือทอง':   'text-yellow-600',
  'เซียนทำนาย':  'text-orange-600',
  'เทพทำนาย':    'text-purple-600',
  'จักรวาลเลือก':'text-indigo-600',
}

export default function LiveActivityTicker({ tickKey }: { tickKey?: number; questions?: unknown }) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const supabase = createClient()

  async function fetchEvents() {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { data } = await supabase
      .from('predictions')
      .select('id, coins_wagered, option_id, placed_at, users!user_id(display_name, rank), questions!question_id(title, options)')
      .gte('placed_at', since)
      .order('placed_at', { ascending: false })
      .limit(60)

    if (!data || data.length === 0) return

    const evts: ActivityEvent[] = data.flatMap((p) => {
      const user = p.users as { display_name: string; rank: string } | null
      const q = p.questions as { title: string; options: { id: string; label: string }[] } | null
      if (!user || !q) return []
      const opt = (q.options ?? []).find((o: { id: string; label: string }) => o.id === p.option_id)
      return [{
        id: p.id,
        userName: user.display_name ?? 'ไม่ระบุ',
        rank: user.rank ?? 'ผู้มาใหม่',
        questionTitle: q.title,
        optionLabel: opt?.label ?? '?',
        amount: p.coins_wagered,
      }]
    })
    setEvents(evts)
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  // bump to next event on tickKey change
  useEffect(() => {
    if (!tickKey || events.length === 0) return
    setVisible(false)
    setTimeout(() => { setIdx(i => (i + 1) % events.length); setVisible(true) }, 200)
  }, [tickKey])

  // cycle every 5s
  useEffect(() => {
    if (events.length === 0) return
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % events.length); setVisible(true) }, 250)
    }, 5000)
    return () => clearInterval(t)
  }, [events.length])

  if (events.length === 0) return null

  const ev = events[idx]

  return (
    <div className="mx-6 mt-2 mb-1">
      <div className={`flex items-center gap-2 text-[11px] bg-white border border-gray-100 rounded-full px-3 py-1.5 shadow-sm transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <span>🔮</span>
        <span className={`font-semibold flex-shrink-0 ${RANK_COLOR[ev.rank] ?? 'text-gray-600'}`}>
          {ev.userName}
        </span>
        <span className="text-gray-500 flex-shrink-0">ทาย "{truncate(ev.optionLabel, 12)}"</span>
        <span className="text-gray-300 flex-shrink-0">·</span>
        <span className="text-gray-400 truncate">{truncate(ev.questionTitle)}</span>
      </div>
    </div>
  )
}

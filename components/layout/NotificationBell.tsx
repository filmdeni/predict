'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

interface Notif {
  id: string
  questionTitle: string
  questionId: string
  isCorrect: boolean
  coinsWon: number
  resolvedAt: string
}

export default function NotificationBell() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setUser(data.user)
      loadNotifs(data.user.id)

      // subscribe to prediction resolutions
      const channel = supabase
        .channel(`notifs:${data.user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE', schema: 'public', table: 'predictions',
            filter: `user_id=eq.${data.user.id}`,
          },
          async (payload) => {
            if (payload.new.is_correct === null) return
            const { data: q } = await supabase
              .from('questions')
              .select('title')
              .eq('id', payload.new.question_id)
              .single()
            const qData = q as { title: string } | null
            const notif: Notif = {
              id: payload.new.id,
              questionTitle: qData?.title ?? '—',
              questionId: payload.new.question_id,
              isCorrect: payload.new.is_correct,
              coinsWon: payload.new.coins_won ?? 0,
              resolvedAt: payload.new.resolved_at,
            }
            setNotifs(prev => [notif, ...prev])
            setUnread(n => n + 1)
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })
  }, [])

  async function loadNotifs(userId: string) {
    const { data } = await supabase
      .from('predictions')
      .select('id, question_id, is_correct, coins_won, resolved_at, questions(title)')
      .eq('user_id', userId)
      .not('is_correct', 'is', null)
      .order('resolved_at', { ascending: false })
      .limit(10)

    if (!data) return
    setNotifs((data as any[]).map((p: any) => ({
      id: p.id,
      questionTitle: p.questions?.title ?? '—',
      questionId: p.question_id,
      isCorrect: p.is_correct,
      coinsWon: p.coins_won ?? 0,
      resolvedAt: p.resolved_at,
    })))
  }

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(o => !o); setUnread(0) }}
        className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors relative"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">การแจ้งเตือน</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีการแจ้งเตือน</p>
              ) : (
                notifs.map(n => (
                  <Link key={n.id} href={`/question/${n.questionId}`} onClick={() => setOpen(false)}>
                    <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50">
                      <span className="text-lg mt-0.5">{n.isCorrect ? '✅' : '❌'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-900 font-medium line-clamp-2">{n.questionTitle}</p>
                        <p className={`text-xs mt-0.5 font-semibold ${n.isCorrect ? 'text-green-600' : 'text-gray-400'}`}>
                          {n.isCorrect ? `ถูก! +${n.coinsWon.toLocaleString()} 🪙` : 'ทายผิด'}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
